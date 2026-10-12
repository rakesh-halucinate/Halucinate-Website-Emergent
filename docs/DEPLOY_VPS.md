# Deploy Halucinate on your own VPS (Ubuntu 22.04/24.04)

## Architecture & ports (site lives on ONE port — 3000)

| Piece | Port | Public? | Notes |
|---|---|---|---|
| Cloudflare tunnel | — | YES | outbound only; no firewall ports to open |
| FastAPI backend | **3000** | tunnel only | uvicorn — single-port mode serves the ENTIRE site (frontend + /api). Port 3000 is held by your old `pm2 halucinate-web` — the new site replaces it (see step 4 note) |
| WhatsApp service | **3102** | no (localhost) | Node + Baileys; PORT env configurable; never expose |
| MongoDB | 27017 | no (localhost) | free on your VPS; or use MongoDB Atlas |
| Vite dev server | — | dev only | not used in production (we serve the built `dist`) |

Cloudflare note: you already run 3 cloudflared tunnels. You can serve this site
the same way — point a tunnel at nginx (http://localhost:80) and skip opening
80/443 in the firewall entirely. Direct nginx + certbot works too; both are below.

## 1. Server prep

```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv nginx curl gnupg
# Node 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g yarn
# MongoDB (or use Atlas and skip this)
sudo apt install -y mongodb-org   # follow official MongoDB install for your Ubuntu version
```

## 2. Code & dependencies

```bash
cd /var/www && git clone https://github.com/rakesh-halucinate/Halucinate-Website-Emergent.git halucinate
cd halucinate

# backend
cd backend && python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# frontend (build static bundle)
cd ../frontend && yarn install && yarn build   # outputs frontend/dist

# whatsapp service
cd ../whatsapp-service && yarn install
```

## 3. Environment — create /var/www/halucinate/backend/.env

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="halucinate"
CORS_ORIGINS="https://halucinate.rakeshanjanappa.com"
APP_URL=https://halucinate.rakeshanjanappa.com
JWT_SECRET="<generate: openssl rand -hex 32>"
ADMIN_EMAIL="rakesh@halucinate.com"
ADMIN_PASSWORD="<choose a strong password>"
OWNER_EMAIL="rakesh@halucinate.com"
EMERGENT_EMAIL_KEY="<your email/integration key>"
EMAIL_FROM_NAME="Halucinate"
EMAIL_REPLY_TO="rakesh@halucinate.com"
TELEGRAM_BOT_TOKEN="<bot token>"
TELEGRAM_CHAT_ID="<chat id>"
EMERGENT_LLM_KEY="<your universal LLM key>"
WEBHOOK_CRON_SECRET="<generate: openssl rand -hex 24>"
WHATSAPP_SERVICE_URL="http://localhost:3102"
WHATSAPP_ALERT_NUMBERS="+919632121215,+919880368600"
```

Note: `EMERGENT_*` keys and the managed email service are Emergent-platform features.
For full self-hosting, replace email with your own SMTP/Resend key and the LLM key
with an OpenAI API key (small code change in backend/server.py).

## 4. systemd services

**/etc/systemd/system/halucinate-backend.service**
```
[Unit]
Description=Halucinate FastAPI backend
After=network.target mongod.service

[Service]
WorkingDirectory=/var/www/halucinate/backend
ExecStart=/var/www/halucinate/backend/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**/etc/systemd/system/halucinate-whatsapp.service**
```
[Unit]
Description=Halucinate WhatsApp alert service
After=network.target

[Service]
WorkingDirectory=/var/www/halucinate/whatsapp-service
Environment=PORT=3102
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload

# free up port 3000 from the OLD Halucinate website first:
pm2 stop halucinate-web && pm2 delete halucinate-web && pm2 save

sudo systemctl enable --now halucinate-backend halucinate-whatsapp
```

## 5. One port is enough (recommended for your Cloudflare setup)

After `yarn build` (step 2), the backend automatically serves the built frontend
plus the API from the SAME process — no nginx needed:

**Your Cloudflare tunnel target is simply: `http://localhost:3000`**

```
Public hostname: halucinate.rakeshanjanappa.com  →  Service: http://localhost:3000
```

That's the only port you configure in Cloudflare. The firewall never sees it
(tunnels connect outbound). Skip to section 7.

<details>
<summary>Alternative: nginx on port 80 (only if you prefer it)</summary>

/etc/nginx/sites-available/halucinate:
```nginx
server {
    listen 80;
    server_name halucinate.rakeshanjanappa.com;

    root /var/www/halucinate/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_buffering off;            # required for Bruce chat SSE streaming
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri /index.html;     # SPA fallback
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/halucinate /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
</details>

## 6. Cloudflare tunnel config (matches your existing setup)

If you used the single-port mode in section 5, just add a public hostname in your
EXISTING tunnel dashboard — nothing else to install:

```
Public hostname: halucinate.rakeshanjanappa.com  →  Service: http://localhost:3000
```

CLI equivalent (new tunnel):
```bash
cloudflared tunnel create halucinate-site
# ~/.cloudflared/config-halucinate.yml:
#   tunnel: <tunnel-id>
#   credentials-file: /root/.cloudflared/<tunnel-id>.json
#   ingress:
#     - hostname: halucinate.rakeshanjanappa.com
#       service: http://localhost:3000
#     - service: http_status:404
cloudflared tunnel route dns halucinate-site halucinate.rakeshanjanappa.com
# run it alongside your other tunnels, e.g.:
cloudflared --config ~/.cloudflared/config-halucinate.yml service install
```
In Cloudflare Zero Trust → Networks → Tunnels:
Public Hostname = `halucinate.rakeshanjanappa.com` → Service `http://localhost:3000`.
Set SSL/TLS mode to **Full** for the rakeshanjanappa.com zone.

## 6b. Redirect halucinate.com → halucinate.rakeshanjanappa.com

In the halucinate.com Cloudflare zone (add the domain to Cloudflare if not yet):
1. DNS: create a proxied A record `halucinate.com` → `192.0.2.1` (dummy — the redirect intercepts it; proxied = orange cloud ON)
2. Rules → Redirect Rules → create rule: hostname equals `halucinate.com` → **301** to `https://halucinate.rakeshanjanappa.com` (preserve query string ON)
3. (optional) same for `www.halucinate.com`

This keeps https://halucinate.rakeshanjanappa.com as the canonical site (all SEO tags already point there).

**Alternative — direct (no tunnel):** open firewall 80/443, certbot:
```bash
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d halucinate.rakeshanjanappa.com
```
DNS: A record `halucinate.rakeshanjanappa.com` → VPS IP.

## 7. Monthly SEO cron (replaces .emergent/crons.yml on a VPS)

```bash
crontab -e
# 1st of every month, 09:00 IST (03:30 UTC)
30 3 1 * * curl -s -X POST https://halucinate.rakeshanjanappa.com/api/cron/seo-refresh -H "Authorization: Bearer <WEBHOOK_CRON_SECRET>" -H "Content-Type: application/json" -d "{\"run_id\":\"cron-$(date +\%Y\%m)\"}"
```

## 8. First-run checklist

1. `curl https://halucinate.rakeshanjanappa.com/api/` → `{"message":"Halucinate API"}`
2. Admin: https://halucinate.rakeshanjanappa.com/admin/login (ADMIN_EMAIL / ADMIN_PASSWORD)
3. WhatsApp: Admin → WhatsApp tab → scan QR (Linked Devices)
4. Submit enquiry on the site → confirm email + Telegram + WhatsApp arrive
5. Submit sitemap in Google Search Console: https://halucinate.rakeshanjanappa.com/sitemap.xml

## Updating

```bash
cd /var/www/halucinate && git pull
cd backend && source .venv/bin/activate && pip install -r requirements.txt
cd ../frontend && yarn install && yarn build
cd ../whatsapp-service && yarn install
sudo systemctl restart halucinate-backend halucinate-whatsapp
```
