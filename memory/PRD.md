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
- Full landing page: kinetic masked-reveal hero with interactive Three.js VR headset (cursor-tracking), marquee, dynamic product bento (API-driven w/ fallback), pricing table, parallax experience section, FAQ accordion, enquiry form, footer w/ live hashtags, lenis smooth scroll
- All 9 original products seeded with original copy, prices and original photos (downloaded + re-hosted locally)
- Admin console at /admin (login /admin/login): Products CRUD + object-storage photo upload, Inquiries viewer, SEO tab (meta, keywords, hashtag editor, competitor tracker, AI "Generate with AI" suggestions)
- Enquiry pipeline: MongoDB save → customer confirmation email + owner notification (reply-to customer) + Telegram message — all verified end-to-end (email 202, Telegram 200)
- Bruce chatbot: knocking avatar launcher, greeting bubble, streaming SSE answers from live product catalogue + FAQ knowledge base, LEAD_CAPTURED marker → auto-creates enquiry + notifications
- SEO package: static head meta/OG/Twitter, JSON-LD Organization + FAQPage, noscript fallback, robots.txt (AI-crawler groups), llms.txt, SVG glitch favicon, transparent logo mark
- Auth: seeded admin rakesh@halucinate.com, bcrypt, JWT cookie, brute-force lockout

## Verified
- curl: 9 products, enquiry 201, login 401/200, /auth/me, admin enquiries, product create/update/delete, upload + file serve (200 image/png), unauth 401, robots.txt 200
- Backend logs: both emails 202 Accepted, Telegram 200 OK
- Bruce SSE stream answers correctly with live pricing
- Screenshots: hero (3D headset), products grid, experience section, Bruce chat answering, admin login, admin products, admin SEO
- `yarn typecheck` clean

## Pending / Notes
- Canonical/og:url/sitemap.xml/og:image intentionally OMITTED — production domain not confirmed (preview host must not be shipped as canonical). Add when custom domain is attached; then enable "Search Engine Crawling" toggle on deploy and re-verify with Googlebot/OAI-SearchBot/Claude-SearchBot/PerplexityBot UAs
- Emails send from platform's default sender address (user approved); reply-to is rakesh@halucinate.com
- Admin SEO meta fields are stored/documented in DB; the served static head uses the same defaults (hardcoded in index.html) — dynamic head-injection would need SSR or deploy-time prerender

## Backlog
- P0: Attach production domain → add canonical/og:url/sitemap.xml/og:image; enable crawler prerender toggle; submit sitemap in Google Search Console
- P1: Bruce conversation history viewer in admin; mark enquiry as contacted/archived
- P1: Auto-apply admin SEO meta changes to served head (build-time inject or prerender)
- P2: Multi-image galleries per product; product reorder drag-and-drop; WhatsApp delivery for enquiry alerts
- P2: Analytics dashboard (enquiries per week, top products)

## Next Tasks
1. Domain + full SEO activation (canonical, sitemap, prerender toggle, GSC submission)
2. Enquiry workflow states in admin (new/contacted/closed)
3. Bruce lead-quality summary (LLM-summarized chat attached to owner email)
