"""Server-side SEO rendering for the single-port (VPS) deployment.

The site is a client-rendered React app, so without help every URL ships the
same <head> and an empty <div id="root">. Search engines then see one page
with no content and nothing to rank for individual products.

This module rewrites the built index.html per request so that:
  * every product has its own indexable URL (/products/<slug>) with its own
    title, description, canonical, Open Graph tags and Product structured data;
  * the real copy is present in the initial HTML (inside #root, where React
    replaces it on mount with the same content);
  * sitemap.xml, robots.txt and llms.txt list every product and follow the
    configured site URL, so moving the site to another domain is one env var.

Standard library only, so it can be unit-tested without the app's dependencies.
"""
import json
import os
import re
from datetime import date
from html import escape
from typing import Iterable, List, Optional
from urllib.parse import urlparse

BUILD_HOST = "https://halucinate.rakeshanjanappa.com"  # host hardcoded in index.html
DEFAULT_SITE_URL = BUILD_HOST

ORG_DESCRIPTION = (
    "Halucinate designs and delivers advanced VR attractions, immersive entertainment "
    "systems, automated kiosks, physical experiences and custom event activations for "
    "malls, entertainment centres, businesses and destinations across India."
)
CONTACT_LINE = "rakesh@halucinate.com · +91 96321 21215 · +91 98803 68600"

# Search-facing copy per product, keyed by slug. Titles lead with the phrase a
# buyer types ("free roam VR arena setup", "escape room manufacturer") and stay
# near 60 characters; descriptions stay near 155. Products added later in the
# admin console fall back to generated copy in product_meta().
PRODUCT_SEO = {
    "multiplayer-free-roam-vr": {
        "title": "Free Roam VR Arena Setup in India — Multiplayer VR | Halucinate",
        "description": "Turnkey multiplayer free roam VR arena for malls, gaming zones and FECs in India. Wireless headsets, laser tag and zombie games, installation and training. From ₹9,80,000.",
        "keywords": "free roam VR arena India, multiplayer VR setup cost, VR laser tag arena, VR gaming zone setup, VR arcade business India",
    },
    "single-player-vr-games": {
        "title": "VR Games for Malls & Gaming Zones — VR Cricket, Racing | Halucinate",
        "description": "Compact single-player VR attractions for malls, gaming centres and Tier 2 cities: VR cricket, VR shooting, racing simulators and horror. Installed across India from ₹3,00,000.",
        "keywords": "VR cricket machine price India, VR games for mall, VR racing simulator India, VR shooting game setup, VR game zone equipment",
    },
    "ai-photo-booth": {
        "title": "AI Photo Booth Kiosk for Malls & Events in India | Halucinate",
        "description": "Fully automated AI photo booth kiosk: AI portraits, face swap, photo strips and QR payments. Built for malls, events and tourist spots in India. ₹5,50,000.",
        "keywords": "AI photo booth India, AI photo booth price, photo booth kiosk for mall, automated photo booth, AI photo booth for events",
    },
    "physical-escape-rooms": {
        "title": "Escape Room Manufacturer & Designer in India | Halucinate",
        "description": "Custom-built physical escape rooms with themed interiors, electronic puzzles, sensors and automated control. Design, build and installation across India from ₹8,00,000 per room.",
        "keywords": "escape room manufacturer India, escape room setup cost, escape room designer, escape room builder India, start an escape room business",
    },
    "digital-scary-house": {
        "title": "Digital Scary House — Projection Horror Attraction India | Halucinate",
        "description": "A modern walkthrough horror attraction for malls and amusement centres: projection mapping, physical effects, sound and interactive puzzles. Installed across India from ₹15,00,000.",
        "keywords": "scary house setup India, haunted house attraction for mall, horror house manufacturer, projection mapping horror, digital haunted house",
    },
    "self-service-massage-chair-kiosk": {
        "title": "Self-Service Massage Chair Kiosk for Malls & Cinemas | Halucinate",
        "description": "Unattended QR-payment massage chair kiosk for malls, cinemas, airports and offices. Customers scan, pay and relax, with no staff needed. ₹4,25,000 for two chairs.",
        "keywords": "massage chair kiosk for mall, coin operated massage chair India, QR payment massage chair, massage chair vending business, commercial massage chair India",
    },
    "custom-event-activations": {
        "title": "Event Activations with VR & AI — Corporate & Mall Events | Halucinate",
        "description": "Technology-led event activations for corporate events, exhibitions, brand launches and mall promotions in India: VR games, AI photo booths, racing simulators and custom builds.",
        "keywords": "VR for corporate events India, brand activation agency India, mall activation ideas, VR rental for events, experiential marketing technology",
    },
    "super-reality-360-dome": {
        "title": "360 Dome Theatre & Projection Dome in India | Halucinate",
        "description": "Large-format 360 projection dome for malls, museums and tourist destinations. Structure, projectors, media servers, content and installation across India from ₹50,00,000.",
        "keywords": "360 dome theatre India, projection dome manufacturer, fulldome theatre cost, immersive dome India, dome theatre for mall",
    },
    "immersive-room": {
        "title": "Immersive Room & Projection Room Setup in India | Halucinate",
        "description": "Multi-wall projection immersive room for gaming, education, tourism and brand experiences. Projectors, spatial audio, content and installation across India from ₹15,00,000.",
        "keywords": "immersive room India, immersive projection room cost, projection mapping room, immersive experience room setup, interactive projection room",
    },
}


def site_url() -> str:
    """Public origin of the site, no trailing slash. SITE_URL wins over APP_URL."""
    raw = (os.environ.get("SITE_URL") or os.environ.get("APP_URL") or DEFAULT_SITE_URL).strip()
    return raw.rstrip("/") or DEFAULT_SITE_URL


def redirect_hosts() -> List[str]:
    """Hostnames that should 301 to site_url() (old domains, www variants)."""
    raw = os.environ.get("REDIRECT_HOSTS", "")
    canonical = urlparse(site_url()).netloc.lower()
    return [h.strip().lower() for h in raw.split(",") if h.strip() and h.strip().lower() != canonical]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")


def product_path(product: dict) -> str:
    return f"/products/{slugify(product.get('name', ''))}"


def find_product(products: Iterable[dict], slug: str) -> Optional[dict]:
    for p in products:
        if slugify(p.get("name", "")) == slug:
            return p
    return None


def _truncate(text: str, limit: int) -> str:
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",.;:") + "…"


def product_meta(product: dict) -> dict:
    slug = slugify(product.get("name", ""))
    preset = PRODUCT_SEO.get(slug)
    if preset:
        return preset
    name = product.get("name", "")
    return {
        "title": _truncate(f"{name} in India — Price & Installation | Halucinate", 70),
        "description": _truncate(product.get("description", "") or f"{name} by Halucinate.", 158),
        "keywords": ", ".join(h.lstrip("#") for h in product.get("hashtags", [])),
    }


def _price_number(label: str) -> Optional[str]:
    """'₹9,80,000 per room' -> '980000'. None when the label carries no rupee amount."""
    m = re.search(r"₹\s*([\d,]+)", label or "")
    if not m:
        return None
    digits = m.group(1).replace(",", "")
    return digits or None


def _abs(site: str, url: str) -> str:
    if not url:
        return ""
    return url if url.startswith("http") else site + (url if url.startswith("/") else "/" + url)


def product_jsonld(product: dict, site: str) -> dict:
    url = site + product_path(product)
    meta = product_meta(product)
    node = {
        "@type": "Product",
        "@id": url + "#product",
        "name": product.get("name", ""),
        "description": meta["description"],
        "url": url,
        "category": product.get("tag", "") or "Entertainment technology",
        "brand": {"@type": "Brand", "name": "Halucinate"},
        "manufacturer": {"@id": site + "/#organization"},
    }
    image = _abs(site, product.get("image_url", ""))
    if image:
        node["image"] = image
    price = _price_number(product.get("price_label", ""))
    if price:
        node["offers"] = {
            "@type": "Offer",
            "url": url,
            "priceCurrency": "INR",
            "price": price,
            "availability": "https://schema.org/InStock",
            "areaServed": "IN",
            "seller": {"@id": site + "/#organization"},
        }
    breadcrumb = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Halucinate", "item": site + "/"},
            {"@type": "ListItem", "position": 2, "name": "Products", "item": site + "/#products"},
            {"@type": "ListItem", "position": 3, "name": product.get("name", ""), "item": url},
        ],
    }
    return {"@context": "https://schema.org", "@graph": [node, breadcrumb]}


def catalogue_jsonld(products: List[dict], site: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Halucinate attractions",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": p.get("name", ""),
             "url": site + product_path(p)}
            for i, p in enumerate(products)
        ],
    }


# ---------------------------------------------------------------- body HTML
_SHELL = (
    '<div style="max-width:880px;margin:0 auto;padding:96px 20px 64px;'
    'font-family:system-ui,sans-serif;color:#cbd5e1;line-height:1.7">{inner}</div>'
)
_A = 'style="color:#00f0ff"'


def _product_links(products: List[dict], skip_slug: str = "") -> str:
    items = "".join(
        f'<li><a {_A} href="{escape(product_path(p))}">{escape(p.get("name", ""))}</a>'
        f'{" — from " + escape(p["price_label"]) if p.get("price_label") else ""}</li>'
        for p in products if slugify(p.get("name", "")) != skip_slug
    )
    return f"<ul>{items}</ul>" if items else ""


def product_body(product: dict, products: List[dict]) -> str:
    name = escape(product.get("name", ""))
    price = product.get("price_label", "")
    img = product.get("image_url", "")
    inner = (
        f'<p><a {_A} href="/">Halucinate</a> › <a {_A} href="/#products">Products</a> › {name}</p>'
        f'<h1 style="color:#fff">{name}</h1>'
        + (f"<p><strong>Starting price:</strong> {escape(price)}</p>" if price else "")
        + (f'<img src="{escape(img)}" alt="{name} by Halucinate" width="880" style="max-width:100%;height:auto;border-radius:16px">' if img else "")
        + f"<p>{escape(product.get('description', ''))}</p>"
        + f'<p><a {_A} href="/#enquiry">Request pricing for {name}</a> · {escape(CONTACT_LINE)}</p>'
        + '<h2 style="color:#fff">More Halucinate attractions</h2>'
        + _product_links(products, slugify(product.get("name", "")))
    )
    return _SHELL.format(inner=inner)


def home_body(products: List[dict]) -> str:
    inner = (
        '<h1 style="color:#fff">Halucinate — Immersive Entertainment, Engineered for Business</h1>'
        f"<p>{escape(ORG_DESCRIPTION)}</p>"
        '<h2 style="color:#fff">Products</h2>'
        + _product_links(products)
        + f"<p>Contact: {escape(CONTACT_LINE)}</p>"
    )
    return _SHELL.format(inner=inner)


def not_found_body(products: List[dict]) -> str:
    inner = (
        '<h1 style="color:#fff">Page not found</h1>'
        f'<p>That page does not exist. <a {_A} href="/">Go to the Halucinate home page</a> or pick a product:</p>'
        + _product_links(products)
    )
    return _SHELL.format(inner=inner)


# ---------------------------------------------------------------- index.html rewrite
def _set_meta(html: str, attr: str, key: str, content: str) -> str:
    pattern = re.compile(rf'(<meta\s+{attr}="{re.escape(key)}"\s+content=")[^"]*(")')
    return pattern.sub(lambda m: m.group(1) + escape(content, quote=True) + m.group(2), html, count=1)


def render_index(index_html: str, *, site: str, path: str = "/", title: str = "",
                 description: str = "", keywords: str = "", image: str = "",
                 og_type: str = "", jsonld: Optional[dict] = None, body: str = "",
                 noindex: bool = False) -> str:
    """Return index.html specialised for one URL. Empty arguments leave the build's value."""
    html = index_html.replace(BUILD_HOST, site)
    url = site + path
    if title:
        html = re.sub(r"<title>.*?</title>", lambda m: f"<title>{escape(title)}</title>", html, count=1, flags=re.S)
        html = _set_meta(html, "property", "og:title", title)
        html = _set_meta(html, "name", "twitter:title", title)
    if description:
        html = _set_meta(html, "name", "description", description)
        html = _set_meta(html, "property", "og:description", description)
        html = _set_meta(html, "name", "twitter:description", description)
    if keywords:
        html = _set_meta(html, "name", "keywords", keywords)
    if image:
        html = _set_meta(html, "property", "og:image", image)
        html = _set_meta(html, "name", "twitter:image", image)
    if og_type:
        html = _set_meta(html, "property", "og:type", og_type)
    if noindex:
        html = _set_meta(html, "name", "robots", "noindex, follow")
    html = re.sub(r'(<link rel="canonical" href=")[^"]*(")',
                  lambda m: m.group(1) + escape(url, quote=True) + m.group(2), html, count=1)
    html = _set_meta(html, "property", "og:url", url)
    if jsonld:
        # "</" must not appear raw inside a <script> block.
        payload = json.dumps(jsonld, ensure_ascii=False).replace("</", "<\\/")
        html = html.replace("</head>", f'<script type="application/ld+json">{payload}</script>\n  </head>', 1)
    if body:
        html = html.replace('<div id="root"></div>', f'<div id="root">{body}</div>', 1)
    return html


def render_home(index_html: str, products: List[dict], seo: Optional[dict], site: str) -> str:
    seo = seo or {}
    return render_index(
        index_html, site=site, path="/",
        title=seo.get("meta_title", ""), description=seo.get("meta_description", ""),
        keywords=seo.get("keywords", ""),
        jsonld=catalogue_jsonld(products, site) if products else None,
        body=home_body(products),
    )


def render_product(index_html: str, product: dict, products: List[dict], site: str) -> str:
    meta = product_meta(product)
    return render_index(
        index_html, site=site, path=product_path(product),
        title=meta["title"], description=meta["description"], keywords=meta.get("keywords", ""),
        image=_abs(site, product.get("image_url", "")), og_type="product",
        jsonld=product_jsonld(product, site), body=product_body(product, products),
    )


def render_not_found(index_html: str, products: List[dict], site: str, path: str) -> str:
    return render_index(index_html, site=site, path=path, title="Page not found | Halucinate",
                        body=not_found_body(products), noindex=True)


# ---------------------------------------------------------------- crawl files
def _lastmod(value) -> str:
    try:
        return value.date().isoformat()
    except AttributeError:
        return str(value)[:10] if value else date.today().isoformat()


def sitemap_xml(products: List[dict], site: str) -> str:
    newest = max((_lastmod(p.get("created_at")) for p in products), default=date.today().isoformat())
    rows = [f"  <url>\n    <loc>{escape(site)}/</loc>\n    <lastmod>{newest}</lastmod>\n  </url>"]
    for p in products:
        rows.append(
            f"  <url>\n    <loc>{escape(site + product_path(p))}</loc>\n"
            f"    <lastmod>{_lastmod(p.get('created_at'))}</lastmod>\n  </url>"
        )
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(rows) + "\n</urlset>\n")


def robots_txt(site: str) -> str:
    return ("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\n"
            f"Sitemap: {site}/sitemap.xml\n")


def llms_txt(products: List[dict], site: str) -> str:
    lines = ["# Halucinate", "", f"> {ORG_DESCRIPTION}", "", f"Website: {site}/", "",
             "## Products", ""]
    for p in products:
        price = f" Indicative price: {p['price_label']}." if p.get("price_label") else ""
        lines.append(f"- [{p.get('name', '')}]({site + product_path(p)}): "
                     f"{product_meta(p)['description']}{price}")
    lines += ["", "## Contact", "", "- Email: rakesh@halucinate.com",
              "- Phone: +91 96321 21215, +91 98803 68600", ""]
    return "\n".join(lines)
