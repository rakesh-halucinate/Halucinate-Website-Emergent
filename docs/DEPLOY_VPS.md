# Deploy Halucinate on your own VPS (Ubuntu 22.04/24.04)

## Architecture & ports

| Piece | Port | Public? | Notes |
|---|---|---|---|
| nginx | 80 / 443 | YES | Serves built frontend, proxies `/api` → backend |
| FastAPI backend | 8001 | no (localhost) | uvicorn |
| WhatsApp service | 3002 | no (localhost) | Node + Baileys; never expose publicly |
| MongoDB | 27017 | no (localhost) | or use MongoDB Atlas |
| Vite dev server | 3000 | dev only | not used in production |

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
CORS_ORIGINS="https://halucinate.com"
APP_URL=https://halucinate.com
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
WHATSAPP_SERVICE_URL="http://localhost:3002"
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
ExecStart=/var/www/halucinate/backend/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
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
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now halucinate-backend halucinate-whatsapp
```

## 5. nginx — /etc/nginx/sites-available/halucinate

```nginx
server {
    listen 80;
    server_name halucinate.com www.halucinate.com;

    root /var/www/halucinate/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
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
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d halucinate.com -d www.halucinate.com
```

Point your DNS: A record `halucinate.com` → VPS IP (and `www` CNAME → `halucinate.com`).

## 6. Monthly SEO cron (replaces .emergent/crons.yml on a VPS)

```bash
crontab -e
# 1st of every month, 09:00 IST (03:30 UTC)
30 3 1 * * curl -s -X POST https://halucinate.com/api/cron/seo-refresh \
  -H "Authorization: Bearer <WEBHOOK_CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"run_id":"cron-$(date +\%Y\%m)":"'"$(date +%Y%m)"'"}'
```
(simpler: use a fixed suffix per month, e.g. `-d "{\"run_id\":\"cron-$(date +\\%Y\\%m)\"}"`)

## 7. First-run checklist

1. `curl https://halucinate.com/api/` → `{"message":"Halucinate API"}`
2. Admin: https://halucinate.com/admin/login (ADMIN_EMAIL / ADMIN_PASSWORD)
3. WhatsApp: Admin → WhatsApp tab → scan QR (Linked Devices)
4. Submit enquiry on the site → confirm email + Telegram + WhatsApp arrive
5. Submit sitemap in Google Search Console: https://halucinate.com/sitemap.xml

## Updating

```bash
cd /var/www/halucinate && git pull
cd backend && source .venv/bin/activate && pip install -r requirements.txt
cd ../frontend && yarn install && yarn build
cd ../whatsapp-service && yarn install
sudo systemctl restart halucinate-backend halucinate-whatsapp
```
