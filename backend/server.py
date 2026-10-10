import asyncio
import ipaddress
import json
import logging
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

import bcrypt
import httpx
import jwt
import requests
from dotenv import load_dotenv
from fastapi import (APIRouter, Depends, FastAPI, File, HTTPException, Request,
                     Response, UploadFile)
from fastapi.responses import Response as RawResponse
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from lib.db import client, db, ensure_indexes

logger = logging.getLogger(__name__)

_background_tasks: set = set()


def fire_and_forget(coro) -> None:
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Halucinate")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "halucinate"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------- email gate
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: Optional[str] = None) -> Optional[str]:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        try:
            code = e.response.json().get("code", "")
        except ValueError:
            code = ""
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning(f"Email paused: {code} ({e.response.status_code})")
            raise HTTPException(status_code=503, detail="Email is temporarily unavailable")
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")


# ---------------------------------------------------------------- models
class ProductIn(BaseModel):
    name: str
    tag: str = ""
    description: str = ""
    price_label: str = ""
    image_url: str = ""
    hashtags: List[str] = Field(default_factory=list)
    sort_order: int = 0


class Product(ProductIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InquiryCreate(BaseModel):
    products: List[str] = Field(default_factory=list)
    name: str
    company: Optional[str] = ""
    email: EmailStr
    mobile: str
    city: Optional[str] = ""
    state: Optional[str] = ""
    budget: Optional[str] = ""
    space: Optional[str] = ""
    install_date: Optional[str] = ""
    message: str
    consent: bool = False
    chat_summary: Optional[str] = ""


class Inquiry(InquiryCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "new"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


VALID_STAGES = ("new", "contacted", "closed")


class StageIn(BaseModel):
    status: str


class LoginIn(BaseModel):
    email: str
    password: str


class SeoSettings(BaseModel):
    meta_title: str = ""
    meta_description: str = ""
    keywords: str = ""
    hashtags: List[str] = Field(default_factory=list)
    competitors: List[str] = Field(default_factory=list)


class SuggestIn(BaseModel):
    location: str = ""
    notes: str = ""


class ChatIn(BaseModel):
    session_id: str
    message: str


# ---------------------------------------------------------------- auth
def _create_token(email: str) -> str:
    payload = {"sub": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_admin(request: Request) -> dict:
    token = request.cookies.get("hlc_token")
    auth_header = request.headers.get("Authorization", "")
    if not token and auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.admins.find_one({"email": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Admin not found")
    return user


# ---------------------------------------------------------------- knowledge base
FAQ_KB = [
    ("Are these complete turnkey solutions?",
     "Yes. Every Halucinate product is delivered turnkey: hardware, software, networking, installation, operator training and technical support are all included."),
    ("Are the displayed prices final?",
     "No. All prices are indicative starting prices and may vary based on specifications, hardware configuration, space, location, transportation, installation, customisation and applicable taxes. GST is charged additionally wherever applicable."),
    ("Do you provide installation across India?",
     "Yes. Halucinate designs, ships and installs attractions across India for malls, entertainment centres, resorts and destinations."),
    ("Can the products be customised?",
     "Yes. Themes, game content, branding, room concepts and configurations can all be customised to your space, audience and budget."),
    ("Do you provide support after installation?",
     "Yes. Every installation includes operator training and ongoing technical support, and new games and experiences can be added as platforms expand."),
    ("Which products are suitable for Tier 2 cities?",
     "Single-Player VR Games, the AI Photo Booth and the Self-Service Massage Chair Kiosk are compact, affordable attractions designed especially for Tier 2 cities and new entertainment businesses."),
    ("Can I request multiple products in one quotation?",
     "Yes. Customers can select one or more products in the enquiry form and the team responds with combined options, general pricing and next steps."),
    ("Are event activations available for short-term rental?",
     "Yes. Custom Event Activations can be designed for anything from a one-day corporate engagement to a month-long mall activation."),
]


async def build_knowledge() -> str:
    products = await db.products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    parts = ["=== HALUCINATE PRODUCT CATALOGUE (live data) ==="]
    for p in products:
        parts.append(
            f"\n## {p['name']} ({p.get('tag', '')})\n"
            f"Starting price: {p.get('price_label', 'On request')}\n"
            f"{p.get('description', '')}\n"
            f"Related hashtags: {', '.join(p.get('hashtags', []))}"
        )
    parts.append("\n=== FREQUENTLY ASKED QUESTIONS ===")
    for q, a in FAQ_KB:
        parts.append(f"Q: {q}\nA: {a}")
    parts.append(
        "\n=== COMPANY ===\n"
        "Halucinate designs and delivers advanced VR attractions, immersive entertainment systems, "
        "automated kiosks, physical experiences and custom event activations for malls, entertainment "
        "centres, businesses and destinations across India. Contact email: rakesh@halucinate.com. "
        "All prices are indicative starting prices; GST extra where applicable."
    )
    return "\n".join(parts)


BRUCE_RULES = """You are Bruce, the friendly AI assistant of Halucinate (immersive VR entertainment company, India).
STRICT RULES:
- Answer ONLY questions about Halucinate, its products, pricing, installation, events and entertainment technology. Politely decline anything unrelated.
- NEVER ask for the visitor's name, email or phone number in normal conversation. Chat freely.
- You MAY quote the indicative starting prices from the knowledge base.
- If (and only if) the visitor asks for a proper/formal quotation, proposal, exact final pricing or a site plan, THEN ask them to share their name and email address so the Halucinate team can send a formal quotation.
- When the visitor has provided BOTH their name and email address in the conversation, thank them warmly, confirm the team will reach out, and append EXACTLY ONE final line in this exact format:
LEAD_CAPTURED|name=<their full name>|email=<their email>
- Keep replies concise (2-5 sentences), friendly and energetic. Use plain text, no markdown headers.
- If you don't know something, say the team can confirm it and point them to the enquiry form on the page.

KNOWLEDGE BASE:
"""


# ---------------------------------------------------------------- seed data
SEED_PRODUCTS = [
    {
        "name": "Multiplayer Free Roam VR", "tag": "Most Selling", "sort_order": 1,
        "price_label": "₹9,80,000", "image_url": "/assets/products/missionx-keyart.png",
        "hashtags": ["#FreeRoamVR", "#VRGaming", "#MultiplayerVR", "#VRIndia"],
        "description": "Multiplayer Free Roam VR transforms an open play area into a completely wireless virtual gaming arena where four or more players can move, compete and interact together. The system supports multiplayer laser tag, zombie shooting, team battles, scary experiences and virtual escape-room adventures. Players wear wireless VR headsets and use specially designed controllers or VR weapons without being restricted by cables. It is ideal for gaming centres, malls, resorts, family entertainment centres and high-footfall attractions. The complete turnkey system includes hardware, gaming software, networking, installation, operator training and technical support. New games and experiences can also be introduced as the platform expands.",
    },
    {
        "name": "Single-Player VR Games", "tag": "Compact Attractions", "sort_order": 2,
        "price_label": "₹3,00,000 onwards", "image_url": "/assets/products/single-player-vr.jpg",
        "hashtags": ["#VRGames", "#VRCricket", "#Tier2Cities", "#GamingCenter"],
        "description": "Halucinate's Single-Player VR Games are affordable, compact entertainment attractions designed especially for Tier 2 cities, smaller gaming centres, malls and new entertainment businesses. The portfolio includes VR cricket with a wireless bat, VR shooting with a haptic-feedback gun, Horror Sofa experiences, racing car simulators, VR archery, Walk the Plank and other immersive games. Each attraction can operate independently and requires less space than a large multiplayer arena. Customers can begin with one or two products and expand gradually based on demand. These systems are easy to operate, commercially practical and designed to provide engaging, repeatable experiences for customers across different age groups.",
    },
    {
        "name": "AI Photo Booth", "tag": "AI Experiences", "sort_order": 3,
        "price_label": "₹5,50,000", "image_url": "/assets/products/ai-photo-booth.jpg",
        "hashtags": ["#AIPhotoBooth", "#EventTech", "#AIMarketing", "#PhotoBooth"],
        "description": "The Halucinate AI Photo Booth is a fully automated photo experience developed for malls, events, tourist destinations, retail spaces and entertainment centres. Customers can select AI portraits, face-swap experiences, creative background transformations or regular photo-strip formats. The system manages customer selection, payment, image capture, AI processing, printing and digital delivery through a simple touchscreen interface. AI processing can run locally on a powerful computer inside the booth, reducing cloud dependency and improving privacy and response time. Dynamic QR payments, automated printing, WhatsApp delivery, branded templates and multiple visual themes can be integrated. The booth creates an engaging customer experience while also operating as a scalable revenue-generating attraction.",
    },
    {
        "name": "Physical Escape Rooms", "tag": "Escape Rooms", "sort_order": 4,
        "price_label": "₹8,00,000 per room", "image_url": "/assets/products/escape-rooms.jpg",
        "hashtags": ["#EscapeRooms", "#EscapeRoomIndia", "#TeamBuilding", "#MysteryRooms"],
        "description": "Halucinate designs and builds complete Physical Escape Rooms combining storytelling, themed interiors, mechanical challenges, electronic puzzles, sensors, sound effects, lighting and automated control systems. Every room can be developed around a customised concept such as horror, mystery, adventure, science fiction, treasure hunting or family entertainment. Players must work together to discover clues, solve puzzles and complete the mission within a specified time. The system can include automated hint controls, magnetic locks, RFID technology, hidden compartments, projection effects and a central operator dashboard. Physical Escape Rooms are suitable for malls, resorts, entertainment centres and standalone attractions seeking a high-engagement group experience with strong repeat and referral potential.",
    },
    {
        "name": "Digital Scary House", "tag": "Immersive Attractions", "sort_order": 5,
        "price_label": "₹15,00,000, depending on area", "image_url": "/assets/products/scary-house.jpg",
        "hashtags": ["#ScaryHouse", "#HauntedHouse", "#ProjectionMapping", "#HorrorExperience"],
        "description": "The Digital Scary House combines projection mapping, digital horror content, physical effects, immersive sound, interactive puzzles and automated control technology to create a modern walkthrough attraction. The experience can include projection-based rooms, themed physical rooms, digital characters, frightening soundscapes, smoke effects, UV lighting, hidden triggers and puzzle-based challenges. Each project is designed according to the available area, expected customer capacity and preferred level of intensity. The system can be developed as a compact attraction or a larger multi-room experience for malls, amusement destinations, exhibitions and entertainment centres. Halucinate manages concept development, technical design, content integration, hardware, installation, testing and operator training.",
    },
    {
        "name": "Self-Service Massage Chair Kiosk", "tag": "Automated Kiosks", "sort_order": 6,
        "price_label": "₹4,25,000 for two chairs", "image_url": "/assets/products/massage-kiosk.jpg",
        "hashtags": ["#MassageChair", "#AutomatedKiosk", "#PassiveIncome", "#MallBusiness"],
        "description": "The Halucinate Self-Service Massage Chair Kiosk is a completely automated relaxation and revenue solution designed for cinemas, malls, airports, hospitals, corporate spaces and high-footfall public locations. Customers scan a QR code, select a massage duration, complete payment and use the chair without staff assistance. The system can support multiple time packages, payment confirmation, automated activation, WhatsApp receipts, usage tracking, remote monitoring and real-time operational alerts. The dashboard records payments, chair status and system uptime. Optional features can include automated sanitisation, live camera access and power-failure protection. The standard package includes two commercial massage chairs, payment integration, kiosk infrastructure and the required automation platform.",
    },
    {
        "name": "Custom Event Activations", "tag": "Event Activations", "sort_order": 7,
        "price_label": "Based on requirement", "image_url": "/assets/products/event-activation.jpg",
        "hashtags": ["#EventActivation", "#BrandActivation", "#CorporateEvents", "#ExperientialMarketing"],
        "description": "Halucinate creates customised technology-based event activations for malls, corporate events, exhibitions, brand launches, festivals, schools and private celebrations. Experiences can include multiplayer VR, VR cricket, racing simulators, AI photo booths, digital games, projection-based attractions, interactive competitions, digital snake and ladder, sports challenges and customised branded installations. Every activation is planned according to the event objective, available space, expected audience, duration and budget. Halucinate can manage concept creation, software development, hardware, branding, transportation, installation, staffing and technical support. Whether the requirement is a one-day corporate engagement or a month-long mall activation, the solution can be designed to deliver strong participation, visual attraction and measurable customer engagement.",
    },
    {
        "name": "Super Reality 360 Dome", "tag": "Large-Format Attractions", "sort_order": 8,
        "price_label": "₹50,00,000", "image_url": "/assets/products/dome.jpg",
        "hashtags": ["#360Dome", "#ImmersiveDome", "#Fulldome", "#ProjectionDome"],
        "description": "The Super Reality 360 Dome is a large-format immersive attraction where projection surrounds visitors across the dome walls, creating a powerful shared visual experience. It is designed for malls, tourist destinations, amusement centres, exhibitions, museums and high-footfall entertainment locations. Multiple high-lumen projectors, specialised projection surfaces, media servers, content systems and audio equipment work together to create a seamless panoramic environment. The dome can present educational films, fantasy journeys, space experiences, underwater adventures, branded content and cinematic attractions. Depending on the final configuration, it can accommodate groups of visitors during each show cycle. Halucinate provides the structure, projection system, content integration, installation, calibration, training and technical support.",
    },
    {
        "name": "Immersive Room", "tag": "Projection Environments", "sort_order": 9,
        "price_label": "₹15,00,000", "image_url": "/assets/products/immersive-room.jpg",
        "hashtags": ["#ImmersiveRoom", "#ProjectionMapping", "#ImmersiveExperience", "#LocationBasedEntertainment"],
        "description": "The Halucinate Immersive Room converts a compact physical space into a projection-based environment using synchronised visuals across multiple walls and, where required, the floor. The room can be used for gaming, education, storytelling, tourism, wellness, brand experiences and location-based entertainment. Ultra-short-throw projectors, curved projection surfaces, spatial audio, content servers and calibration software create a seamless visual environment with minimal shadows. The experience can be designed for seated groups, interactive participation or guided presentations. Room dimensions, seating capacity, projector configuration and content can be customised according to the location. Halucinate provides structural planning, projection hardware, content integration, installation, calibration, testing and operator training.",
    },
]

DEFAULT_SEO = {
    "id": "seo",
    "meta_title": "Halucinate — VR Games, Immersive Rooms & Escape Rooms",
    "meta_description": "Halucinate builds multiplayer free-roam VR arenas, escape rooms, AI photo booths, 360 domes and immersive entertainment systems for malls and venues across India.",
    "keywords": "VR games India, free roam VR arena, escape room manufacturer, AI photo booth, immersive room, 360 dome theatre, entertainment technology, mall attractions India",
    "hashtags": ["#Halucinate", "#VirtualReality", "#VRGaming", "#ImmersiveEntertainment",
                 "#EscapeRooms", "#AIPhotoBooth", "#360Dome", "#EntertainmentTechnology",
                 "#MallEntertainment", "#VRIndia", "#GamingCenter", "#FamilyEntertainment"],
    "competitors": [],
}


async def seed_data():
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    existing = await db.admins.find_one({"email": admin_email})
    hashed = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    if existing is None:
        await db.admins.insert_one({"email": admin_email, "password_hash": hashed,
                                    "role": "admin",
                                    "created_at": datetime.now(timezone.utc)})
    elif not bcrypt.checkpw(admin_password.encode("utf-8"), existing["password_hash"].encode("utf-8")):
        await db.admins.update_one({"email": admin_email}, {"$set": {"password_hash": hashed}})

    if await db.products.count_documents({}) == 0:
        for p in SEED_PRODUCTS:
            await db.products.insert_one(Product(**p).model_dump())
    if await db.seo.find_one({"id": "seo"}) is None:
        await db.seo.insert_one(dict(DEFAULT_SEO))


# ---------------------------------------------------------------- app
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.index_task = asyncio.create_task(ensure_indexes())
    try:
        await seed_data()
    except Exception as e:
        logger.error(f"Seed failed: {e}")
    try:
        await asyncio.to_thread(init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    yield
    client.close()


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------- public
@api_router.get("/")
async def root():
    return {"message": "Halucinate API"}


@api_router.get("/products", response_model=List[Product])
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return [Product(**d) for d in docs]


@api_router.get("/seo")
async def get_public_seo():
    doc = await db.seo.find_one({"id": "seo"}, {"_id": 0})
    return doc or DEFAULT_SEO


def _customer_html(inq: dict) -> str:
    items = "".join(
        f"<li style='margin:4px 0;color:#cfe9ff'>{escape(p)}</li>" for p in inq["products"]
    ) or "<li style='margin:4px 0;color:#cfe9ff'>General enquiry</li>"
    return (
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0'>"
        "<tr><td style='padding:32px;font-family:Arial,sans-serif;background:#050811;color:#e6f6ff'>"
        "<p style='font-size:26px;letter-spacing:6px;color:#00f0ff;margin:0 0 24px 0'>halucinate</p>"
        f"<p>Hi {escape(inq['name'])},</p>"
        "<p>Thank you for your enquiry. Our team has received your requirement and will contact "
        "you shortly with suitable product options, general pricing and the next steps.</p>"
        "<p style='margin:20px 0 6px 0'><strong>Products you are interested in:</strong></p>"
        f"<ul style='padding-left:18px'>{items}</ul>"
        f"<p style='margin-top:20px'><strong>Your message:</strong><br/>{escape(inq['message'])}</p>"
        "<p style='margin-top:28px;font-size:12px;color:#8ba2c1'>Sent by Halucinate — Immersive "
        "Entertainment, Engineered for Business. We never ask for passwords or card details by email.</p>"
        "</td></tr></table>"
    )


def _owner_html(inq: dict) -> str:
    rows = [
        ("Name", inq["name"]), ("Company", inq.get("company") or "—"),
        ("Email", inq["email"]), ("Mobile", inq["mobile"]),
        ("City", inq.get("city") or "—"), ("State", inq.get("state") or "—"),
        ("Budget", inq.get("budget") or "—"), ("Available space", inq.get("space") or "—"),
        ("Expected installation date", inq.get("install_date") or "—"),
        ("Products", ", ".join(inq["products"]) or "General enquiry"),
        ("Message", inq["message"]),
    ]
    trs = "".join(
        f"<tr><td style='padding:8px 12px;border:1px solid #1e293b;color:#8ba2c1;vertical-align:top'>{escape(k)}</td>"
        f"<td style='padding:8px 12px;border:1px solid #1e293b;color:#e6f6ff'>{escape(str(v))}</td></tr>"
        for k, v in rows
    )
    summary_block = ""
    if (inq.get("chat_summary") or "").strip():
        summary_html = escape(inq["chat_summary"].strip()).replace("\n", "<br/>")
        summary_block = (
            "<div style='margin-top:18px;padding:14px 16px;border:1px solid #7928ca;"
            "background:#150b26;border-radius:8px'>"
            "<p style='margin:0 0 8px 0;font-size:11px;letter-spacing:2px;color:#c29bff'>BRUCE AI DEAL SUMMARY</p>"
            f"<p style='margin:0;color:#e6f6ff;line-height:1.6'>{summary_html}</p>"
            "</div>"
        )
    return (
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0'>"
        "<tr><td style='padding:32px;font-family:Arial,sans-serif;background:#050811;color:#e6f6ff'>"
        "<p style='font-size:22px;letter-spacing:4px;color:#00f0ff;margin:0 0 18px 0'>New Halucinate enquiry</p>"
        f"<table style='border-collapse:collapse;width:100%'>{trs}</table>"
        f"{summary_block}"
        "<p style='margin-top:24px;font-size:12px;color:#8ba2c1'>Reply directly to this email to reach the customer. Sent by Halucinate.</p>"
        "</td></tr></table>"
    )


async def send_telegram(text: str) -> None:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            resp = await c.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"},
            )
            if resp.status_code != 200:
                logger.error(f"Telegram send failed: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"Telegram send error: {e}")


async def dispatch_notifications(inq: dict) -> None:
    try:
        await send_email(to=inq["email"],
                         subject="We received your enquiry — Halucinate",
                         html=_customer_html(inq))
    except Exception as e:
        logger.error(f"Customer email failed: {e}")
    if OWNER_EMAIL:
        try:
            await send_email(to=OWNER_EMAIL,
                             subject=f"New enquiry: {inq['name']} — {', '.join(inq['products'][:3]) or 'General'}",
                             html=_owner_html(inq),
                             reply_to=inq["email"])
        except Exception as e:
            logger.error(f"Owner email failed: {e}")
    tg = (
        "<b>New Halucinate Enquiry</b>\n\n"
        f"<b>Name:</b> {escape(inq['name'])}\n"
        f"<b>Company:</b> {escape(inq.get('company') or '—')}\n"
        f"<b>Email:</b> {escape(inq['email'])}\n"
        f"<b>Mobile:</b> {escape(inq['mobile'])}\n"
        f"<b>City/State:</b> {escape(inq.get('city') or '—')} / {escape(inq.get('state') or '—')}\n"
        f"<b>Budget:</b> {escape(inq.get('budget') or '—')}\n"
        f"<b>Space:</b> {escape(inq.get('space') or '—')}\n"
        f"<b>Install date:</b> {escape(inq.get('install_date') or '—')}\n"
        f"<b>Products:</b> {escape(', '.join(inq['products']) or 'General')}\n"
        f"<b>Message:</b> {escape(inq['message'])}"
    )
    if (inq.get("chat_summary") or "").strip():
        tg += "\n\n<b>Bruce AI summary:</b>\n" + escape(inq["chat_summary"].strip())
    await send_telegram(tg)


@api_router.post("/enquiries", status_code=201)
async def create_enquiry(body: InquiryCreate):
    if not body.consent:
        raise HTTPException(status_code=422, detail="Consent is required")
    inq = Inquiry(**body.model_dump())
    doc = inq.model_dump()
    await db.enquiries.insert_one(doc)
    doc.pop("_id", None)
    fire_and_forget(dispatch_notifications(doc))
    return {"status": "success", "id": inq.id}


# ---------------------------------------------------------------- bruce chat
LEAD_RE = re.compile(r"LEAD_CAPTURED\|name=([^|\n]+)\|email=([^\s|\n]+)")


async def summarize_chat(transcript: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"summary-{uuid.uuid4()}",
        system_message=(
            "You write crisp internal deal summaries for the owner of Halucinate, an immersive "
            "entertainment company. Given a customer chat transcript, output exactly 3 short bullet "
            "lines, each starting with '- ': (1) what the customer wants, (2) budget, location or "
            "timeline signals ('not shared' if none), (3) recommended follow-up action. Plain text only."
        ),
    ).with_model("openai", "gpt-5.4")
    out = ""
    async for ev in chat.stream_message(UserMessage(text=f"Transcript:\n{transcript[-4000:]}")):
        if isinstance(ev, TextDelta):
            out += ev.content
        elif isinstance(ev, StreamDone):
            break
    return out.strip()


@api_router.post("/chat")
async def bruce_chat(body: ChatIn):
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

    sess = await db.chat_sessions.find_one({"id": body.session_id}, {"_id": 0})
    history = (sess or {}).get("messages", [])[-10:]
    knowledge = await build_knowledge()
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in history)
    user_text = (f"Conversation so far:\n{transcript}\n\nCustomer: {body.message}"
                 if transcript else f"Customer: {body.message}")

    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"bruce-{uuid.uuid4()}",
        system_message=BRUCE_RULES + knowledge,
    ).with_model("openai", "gpt-5.4")

    async def event_stream():
        full = ""
        pending = ""
        HOLD_BACK = 120
        try:
            async for ev in chat.stream_message(UserMessage(text=user_text)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    pending += ev.content
                    if len(pending) > HOLD_BACK:
                        safe, pending = pending[:-HOLD_BACK], pending[-HOLD_BACK:]
                        yield f"data: {json.dumps({'t': safe})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.error(f"Bruce stream error: {e}")
            if not full:
                yield f"data: {json.dumps({'t': 'Sorry, I had a glitch. Please try again in a moment.'})}\n\n"

        lead = LEAD_RE.search(full)
        tail = LEAD_RE.sub("", pending).strip()
        if tail:
            yield f"data: {json.dumps({'t': tail})}\n\n"

        visible = LEAD_RE.sub("", full).strip()
        now = datetime.now(timezone.utc)
        await db.chat_sessions.update_one(
            {"id": body.session_id},
            {"$push": {"messages": {"$each": [
                {"role": "customer", "content": body.message, "ts": now},
                {"role": "bruce", "content": visible, "ts": now},
            ]}}, "$setOnInsert": {"id": body.session_id, "created_at": now}},
            upsert=True,
        )
        if lead:
            name = lead.group(1).strip()
            email = lead.group(2).strip()
            full_transcript = (transcript + "\n" if transcript else "") + \
                f"customer: {body.message}\nbruce: {visible}"
            ai_summary = ""
            try:
                ai_summary = await summarize_chat(full_transcript)
            except Exception as e:
                logger.error(f"Chat summary failed: {e}")
            recent = " | ".join(f"{m['role']}: {m['content']}" for m in history[-6:])
            inq = Inquiry(
                products=[], name=name, email=email, mobile="—",
                message=f"Quotation requested via Bruce chatbot. Recent chat: {recent[:1200]}",
                chat_summary=ai_summary, consent=True,
            )
            doc = inq.model_dump()
            await db.enquiries.insert_one(doc)
            doc.pop("_id", None)
            await db.chat_sessions.update_one(
                {"id": body.session_id},
                {"$set": {"lead": {"name": name, "email": email}, "summary": ai_summary}},
            )
            fire_and_forget(dispatch_notifications(doc))
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------- auth routes
@api_router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    ident = f"{request.client.host if request.client else 'unknown'}:{email}"
    now = datetime.now(timezone.utc)
    attempt = await db.login_attempts.find_one({"id": ident})
    if attempt and attempt.get("count", 0) >= 5:
        last = attempt.get("last")
        if last is not None and last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if last and (now - last).total_seconds() < 900:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    user = await db.admins.find_one({"email": email})
    if not user or not bcrypt.checkpw(body.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        await db.login_attempts.update_one(
            {"id": ident}, {"$inc": {"count": 1}, "$set": {"last": now}}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"id": ident})
    token = _create_token(email)
    response.set_cookie("hlc_token", token, httponly=True, secure=True,
                        samesite="lax", max_age=86400, path="/")
    return {"email": email, "role": "admin"}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("hlc_token", path="/")
    return {"status": "logged_out"}


@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_admin)):
    return admin


# ---------------------------------------------------------------- admin routes
@api_router.get("/admin/enquiries", response_model=List[Inquiry])
async def list_enquiries(admin: dict = Depends(get_admin)):
    docs = await db.enquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Inquiry(**d) for d in docs]


@api_router.put("/admin/enquiries/{eid}/status")
async def set_enquiry_status(eid: str, body: StageIn, admin: dict = Depends(get_admin)):
    if body.status not in VALID_STAGES:
        raise HTTPException(status_code=422, detail=f"Status must be one of {VALID_STAGES}")
    result = await db.enquiries.update_one({"id": eid}, {"$set": {"status": body.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"id": eid, "status": body.status}


@api_router.get("/admin/chats")
async def list_chats(admin: dict = Depends(get_admin)):
    docs = await db.chat_sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    out = []
    for d in docs:
        msgs = d.get("messages", [])
        first_customer = next((m for m in msgs if m.get("role") == "customer"), None)
        out.append({
            "id": d["id"],
            "created_at": d.get("created_at"),
            "message_count": len(msgs),
            "preview": (first_customer or {}).get("content", "")[:140],
            "lead": d.get("lead"),
            "summary": d.get("summary", ""),
        })
    return out


@api_router.get("/admin/chats/{cid}")
async def get_chat(cid: str, admin: dict = Depends(get_admin)):
    doc = await db.chat_sessions.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Chat not found")
    return doc


@api_router.post("/admin/products", response_model=Product, status_code=201)
async def create_product(body: ProductIn, admin: dict = Depends(get_admin)):
    product = Product(**body.model_dump())
    await db.products.insert_one(product.model_dump())
    return product


@api_router.put("/admin/products/{pid}", response_model=Product)
async def update_product(pid: str, body: ProductIn, admin: dict = Depends(get_admin)):
    existing = await db.products.find_one({"id": pid})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.products.update_one({"id": pid}, {"$set": body.model_dump()})
    doc = await db.products.find_one({"id": pid}, {"_id": 0})
    return Product(**doc)


@api_router.delete("/admin/products/{pid}", status_code=204)
async def delete_product(pid: str, admin: dict = Depends(get_admin)):
    result = await db.products.delete_one({"id": pid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return None


@api_router.get("/admin/seo")
async def get_seo(admin: dict = Depends(get_admin)):
    doc = await db.seo.find_one({"id": "seo"}, {"_id": 0})
    return doc or DEFAULT_SEO


@api_router.put("/admin/seo")
async def update_seo(body: SeoSettings, admin: dict = Depends(get_admin)):
    doc = {"id": "seo", **body.model_dump()}
    await db.seo.update_one({"id": "seo"}, {"$set": doc}, upsert=True)
    return doc


async def generate_seo_suggestions(location: str = "", notes: str = "") -> dict:
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

    seo = await db.seo.find_one({"id": "seo"}, {"_id": 0}) or DEFAULT_SEO
    products = await db.products.find({}, {"_id": 0, "name": 1, "tag": 1}).to_list(50)
    product_names = ", ".join(p["name"] for p in products)
    prompt = (
        "You are an SEO strategist for Halucinate, an Indian immersive-entertainment company that "
        f"builds and installs: {product_names}. "
        f"Target location/market: {location or 'India (malls, gaming centres, resorts)'}. "
        f"Known competitors or nearby businesses: {', '.join(seo.get('competitors', [])) or 'not specified'}. "
        f"Extra context: {notes or 'none'}. "
        "Task: (1) list 20 high-impact hashtags for organic reach on Google and AI answer engines "
        "(ChatGPT, Claude, Perplexity, Gemini), each on its own line starting with #. "
        "(2) Then list 5 short 'AI search keyword phrases' a potential customer would type into an AI "
        "chatbot when looking for these attractions, prefixed with '- '. "
        "(3) Then list up to 5 likely competitor types or names to track in this market, prefixed with '> '."
    )
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"seo-{uuid.uuid4()}",
        system_message="You are a concise SEO strategist for location-based VR entertainment businesses in India.",
    ).with_model("openai", "gpt-5.4")
    out = ""
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            out += ev.content
        elif isinstance(ev, StreamDone):
            break
    hashtags = re.findall(r"#[\w]+", out)
    keywords = [ln.lstrip("- ").strip() for ln in out.splitlines() if ln.strip().startswith("- ")]
    competitors = [ln.lstrip("> ").strip() for ln in out.splitlines() if ln.strip().startswith("> ")]
    return {"hashtags": hashtags[:20], "keywords": keywords[:5], "competitors": competitors[:5], "raw": out}


@api_router.post("/admin/seo/suggest")
async def suggest_hashtags(body: SuggestIn, admin: dict = Depends(get_admin)):
    return await generate_seo_suggestions(body.location, body.notes)


@api_router.get("/admin/seo/proposals/latest")
async def latest_proposal(admin: dict = Depends(get_admin)):
    doc = await db.seo_proposals.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    if not doc:
        raise HTTPException(status_code=404, detail="No proposals yet")
    return doc


MAX_HASHTAGS = 60
MAX_COMPETITORS = 25


async def _run_seo_refresh(run_id: str) -> None:
    try:
        result = await generate_seo_suggestions("", "Monthly scheduled scan — propose fresh, currently relevant tags")
        seo = await db.seo.find_one({"id": "seo"}, {"_id": 0}) or dict(DEFAULT_SEO)

        existing_tags = list(seo.get("hashtags", []))
        merged_tags = list(existing_tags)
        for h in result["hashtags"]:
            tag = h if h.startswith("#") else f"#{h}"
            if tag not in merged_tags:
                merged_tags.append(tag)
        merged_tags = merged_tags[:MAX_HASHTAGS]
        new_tags = [t for t in merged_tags if t not in existing_tags]

        existing_comps = list(seo.get("competitors", []))
        merged_comps = list(existing_comps)
        for c in result["competitors"]:
            clean = c.strip()
            if clean and clean not in merged_comps:
                merged_comps.append(clean)
        merged_comps = merged_comps[:MAX_COMPETITORS]
        new_comps = [c for c in merged_comps if c not in existing_comps]

        seo["hashtags"] = merged_tags
        seo["competitors"] = merged_comps
        seo["id"] = "seo"
        await db.seo.update_one({"id": "seo"}, {"$set": seo}, upsert=True)

        proposal = {"id": str(uuid.uuid4()), "run_id": run_id, **result,
                    "applied": True, "new_hashtags": new_tags, "new_competitors": new_comps,
                    "created_at": datetime.now(timezone.utc)}
        await db.seo_proposals.insert_one(proposal)
        logger.info(f"SEO auto-refresh applied: +{len(new_tags)} hashtags, +{len(new_comps)} competitors")

        if new_tags or new_comps:
            logger.info("SEO refresh: sending telegram notification")
            await send_telegram(
                "<b>Monthly SEO scan applied automatically</b>\n\n"
                f"Added {len(new_tags)} fresh hashtags and {len(new_comps)} competitors to halucinate.com.\n\n"
                f"<b>New hashtags:</b> {escape(' '.join(new_tags[:20]) or '—')}\n"
                f"<b>New competitors:</b> {escape(', '.join(new_comps) or '—')}"
            )
            logger.info("SEO refresh: telegram notification sent")
            if OWNER_EMAIL:
                tags_html = " ".join(
                    f"<span style='display:inline-block;margin:2px;padding:3px 10px;border:1px solid #00f0ff;border-radius:20px;color:#00f0ff;font-size:12px'>{escape(t)}</span>"
                    for t in new_tags
                ) or "<span style='color:#8ba2c1'>No new hashtags this month</span>"
                comps_html = "".join(
                    f"<li style='margin:3px 0;color:#e6f6ff'>{escape(c)}</li>" for c in new_comps
                ) or "<li style='color:#8ba2c1'>No new competitors this month</li>"
                html = (
                    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0'>"
                    "<tr><td style='padding:32px;font-family:Arial,sans-serif;background:#050811;color:#e6f6ff'>"
                    "<p style='font-size:22px;letter-spacing:4px;color:#00f0ff;margin:0 0 18px 0'>Monthly SEO scan applied</p>"
                    "<p>The scheduled AI scan ran and updated your website automatically.</p>"
                    f"<p style='margin:18px 0 8px 0'><strong>{len(new_tags)} new hashtags now live:</strong></p>"
                    f"<div>{tags_html}</div>"
                    f"<p style='margin:18px 0 8px 0'><strong>{len(new_comps)} new competitors added to tracking:</strong></p>"
                    f"<ul style='padding-left:18px'>{comps_html}</ul>"
                    "<p style='margin-top:24px;font-size:12px;color:#8ba2c1'>You can review or remove any of these in the admin panel under SEO &amp; AI Search. Sent by Halucinate.</p>"
                    "</td></tr></table>"
                )
                try:
                    await send_email(to=OWNER_EMAIL,
                                     subject=f"Monthly SEO scan applied — {len(new_tags)} new hashtags live",
                                     html=html)
                except Exception as e:
                    logger.error(f"SEO refresh email failed: {e}")
    except Exception as e:
        logger.error(f"SEO refresh failed: {e}")


@api_router.post("/cron/seo-refresh")
async def cron_seo_refresh(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    import hmac

    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not secret or not token or not hmac.compare_digest(token, secret):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        envelope = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    run_id = (envelope or {}).get("run_id") or request.headers.get("X-Webhook-Id") or str(uuid.uuid4())
    if await db.cron_runs.find_one({"run_id": run_id}):
        return {"status": "duplicate", "run_id": run_id}
    await db.cron_runs.insert_one({"run_id": run_id, "received_at": datetime.now(timezone.utc)})
    fire_and_forget(_run_seo_refresh(run_id))
    return {"status": "accepted", "run_id": run_id}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(get_admin)):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=422, detail="Only JPG, PNG, WEBP or GIF images are allowed")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image must be under 10 MB")
    ext = (file.filename or "img").split(".")[-1].lower()
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    try:
        result = await asyncio.to_thread(put_object, path, data, content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=502, detail="Upload failed")
    record = {"id": str(uuid.uuid4()), "storage_path": result["path"],
              "original_filename": file.filename, "content_type": content_type,
              "size": result.get("size", len(data)), "is_deleted": False,
              "created_at": datetime.now(timezone.utc)}
    await db.files.insert_one(record)
    record.pop("_id", None)
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = await asyncio.to_thread(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found in storage")
    return RawResponse(content=data, media_type=record.get("content_type", content_type),
                       headers={"Cache-Control": "public, max-age=31536000, immutable"})


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
