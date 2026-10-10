# Halucinate — Immersive Entertainment Website + Admin Console

## Original Problem Statement
Rebuild https://halucinate.rakeshanjanappa.com/ with identical content and functionality, plus:
- Admin page to add/edit products, details, and photo uploads (reusing existing photos)
- Enquiry auto-emailed to the customer and to rakesh@halucinate.com
- Telegram bot notifications (bot token + chat id provided by user)
- Entertainment-industry look, fully dynamic, "crazy 3D visualization" (VR headset, motion graphics), black + neon blue theme, company logo
- Admin SEO settings: hashtags, competitor tracking, AI-search (ChatGPT/Claude/Perplexity) optimization
- Added later: "Bruce" RAG AI chatbot on the side — answers product questions instantly from curated data, no name/email asked upfront; asks for name+email only when a proper quotation is requested, then captures the lead
- Full 3D motion graphics website

## Architecture
- **Frontend**: Vite + React 19 + TS, Tailwind v4, shadcn/ui, motion (framer), lenis smooth scroll, three.js + @react-three/fiber + drei (interactive 3D VR-headset hero that follows cursor, particles, grid, halo rings)
- **Backend**: FastAPI + motor (MongoDB), JWT auth (httpOnly cookie `hlc_token`, bcrypt, 5-attempt/15-min lockout), Resend managed email (Emergent proxy), Telegram Bot API alerts, Emergent object storage for admin photo uploads, emergentintegrations LlmChat (gpt-5.4) for Bruce chat (SSE streaming) and SEO hashtag/competitor suggestions
- **Data**: MongoDB collections — products, enquiries, seo (singleton), admins, files, chat_sessions, login_attempts

## User Personas
- **Venue owner / event manager** (mall, gaming centre, resort): browses products, pricing, FAQ; submits enquiry; chats with Bruce
- **Admin (Rakesh)**: manages products/photos, views inquiries, tunes SEO + hashtags, runs AI competitor/hashtag discovery

## Core Requirements (static)
1. Landing page replicating original content: hero, 9 products with prices, pricing table, FAQ, enquiry form (multi-product select, budget, space, date, consent)
2. Admin CRUD for products + photo upload
3. Enquiry → email customer + owner, Telegram alert
4. Bruce RAG chatbot with lead capture
5. SEO: meta/OG/Twitter/JSON-LD (Organization + FAQPage), robots.txt, llms.txt, admin-managed hashtags
6. Black (#050811) + neon blue (#00F0FF) theme, Halucinate glitch logo, 3D hero

## Implemented (2026-10-10)
- Full landing page: kinetic masked-reveal hero, marquee, dynamic product bento (API-driven w/ fallback), pricing table, parallax experience section, FAQ accordion, enquiry form, footer w/ live hashtags, lenis smooth scroll
- Hero visual (v2, 2026-10-10): photo-realistic AI-generated "head-turn rig" — the same man in a VR headset rendered in 11 consistent poses (center/left/right/up/down/diagonals/profiles), cross-faded by smoothed cursor position so his head naturally follows the pointer; idle auto-sway when the mouse is still; layered over a Three.js ambient scene (particles, rotating neon halo rings, infinite grid). Replaced the earlier procedural 3D head per user feedback
- All 9 original products seeded with original copy, prices and original photos (downloaded + re-hosted locally)
- Admin console at /admin (login /admin/login): Products CRUD + object-storage photo upload, Inquiries viewer, SEO tab (meta, keywords, hashtag editor, competitor tracker, AI "Generate with AI" suggestions)
- Enquiry pipeline: MongoDB save → customer confirmation email + owner notification (reply-to customer) + Telegram message — all verified end-to-end (email 202, Telegram 200)
- Bruce chatbot: knocking avatar launcher, greeting bubble, streaming SSE answers from live product catalogue + FAQ knowledge base, LEAD_CAPTURED marker → auto-creates enquiry + notifications
- SEO package (v2, 2026-10-10 — production domain halucinate.com CONFIRMED by user): canonical, og:url, og:image, twitter:image (summary_large_image), JSON-LD Organization (url, logo, email, 2 phone contactPoints) + WebSite + FAQPage, sitemap.xml, robots.txt with Sitemap line, llms.txt with url + phones, noscript, SVG glitch favicon, transparent logo mark
- Enquiry pipeline (2026-10-10): status field (new/contacted/closed) on enquiries, PUT /api/admin/enquiries/{id}/status (validated, auth-only), admin Inquiries tab with stage filter chips + counts + per-card stage move buttons
- Smarter owner alerts (2026-10-10): on Bruce lead capture a second LLM pass writes a 3-line AI deal summary (want / budget-location-timeline / follow-up); stored on enquiry (chat_summary) + chat session; rendered in owner email (purple block), Telegram alert, and admin cards
- Bruce chat history in admin (2026-10-10): GET /api/admin/chats (+ /{id}) — new "Bruce Chats" tab lists every conversation with lead badge, AI summary, expandable full thread
- SEO "Add Everything to Website" (2026-10-10): one click merges all AI-suggested hashtags + competitors into settings and saves — live in footer + /api/seo instantly
- Monthly auto SEO refresh (2026-10-10): platform cron `.emergent/crons.yml` (seo-refresh, 1st of month 09:00 IST = "30 3 1 * *" UTC) → POST /api/cron/seo-refresh (Bearer WEBHOOK_CRON_SECRET, hmac compare, run_id idempotency in db.cron_runs, immediate 2xx + background work). Background task generates AI suggestions and AUTO-APPLIES them to db.seo (dedup, caps 60 hashtags / 25 competitors), records proposal in db.seo_proposals, and notifies owner via Telegram + email when new tags were added. Admin SEO tab shows "Last monthly AI scan" banner (GET /api/admin/seo/proposals/latest)
- Infra fix (2026-10-10): background tasks now keep strong refs (fire_and_forget helper) — raw asyncio.create_task was being garbage-collected mid-flight, silently dropping notifications
- Admin SEO meta now applies live to page title/description/keywords client-side (Home.tsx effect); crawlers still see the static index.html head
- Hero idle life (2026-10-10): breathing scale motion, periodic visor glint sweep, random micro head-glances when cursor idle
- Contact phones (+91 9632121215, +91 9880368600 — user-provided) added to enquiry section, footer, JSON-LD, noscript, llms.txt
- REMAINING for full go-live: attach halucinate.com to this deployment (user action in platform settings), enable "Search Engine Crawling"/prerender toggle on deploy, verify crawlers with Googlebot/OAI-SearchBot/Claude-SearchBot/PerplexityBot UAs, submit sitemap in Google Search Console
- Auth: seeded admin rakesh@halucinate.com, bcrypt, JWT cookie, brute-force lockout

## Verified
- curl: 9 products, enquiry 201, login 401/200, /auth/me, admin enquiries, product create/update/delete, upload + file serve (200 image/png), unauth 401, robots.txt 200
- Backend logs: both emails 202 Accepted, Telegram 200 OK
- Bruce SSE stream answers correctly with live pricing
- Screenshots: hero (3D headset), products grid, experience section, Bruce chat answering, admin login, admin products, admin SEO
- `yarn typecheck` clean

## Pending / Notes
- Emails send from platform's default sender address (user approved); reply-to is rakesh@halucinate.com
- Admin SEO meta fields are stored/documented in DB; the served static head uses the same defaults (hardcoded in index.html) — dynamic head-injection would need SSR or deploy-time prerender
- Canonical/sitemap/OG all point to https://halucinate.com (confirmed); preview host still serves the app until the domain is attached

## Backlog
- P0: Attach halucinate.com domain + enable crawler prerender toggle on deploy + GSC sitemap submission (manual platform steps)
- P1: Bruce conversation history viewer in admin
- P1: Auto-apply admin SEO meta changes to served head (build-time inject or prerender)
- P2: Multi-image galleries per product; product reorder drag-and-drop; WhatsApp delivery for enquiry alerts
- P2: Analytics dashboard (enquiries per week, top products, pipeline conversion)

## Next Tasks
1. Domain attach + prerender toggle + GSC submission (production steps)
2. Bruce lead-quality summary (LLM-summarized chat attached to owner email)
3. Product video loops on hover
