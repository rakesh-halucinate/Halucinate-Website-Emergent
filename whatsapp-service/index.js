const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let qrDataUrl = null;
let connected = false;
let connecting = false;

async function init() {
  if (connecting) return;
  connecting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState('/app/whatsapp-service/auth_info');
    sock = makeWASocket({
      auth: state,
      browser: ['Halucinate Alerts', 'Chrome', '1.0.0'],
      logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', async (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        try {
          qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
          console.log('QR ready — waiting for scan');
        } catch (e) {
          console.error('QR render error', e.message);
        }
      }
      if (connection === 'open') {
        connected = true;
        connecting = false;
        qrDataUrl = null;
        console.log('WhatsApp connected as', sock.user && sock.user.id);
      }
      if (connection === 'close') {
        connected = false;
        const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output
          ? lastDisconnect.error.output.statusCode : null;
        if (code === DisconnectReason.loggedOut) {
          connecting = false;
          console.log('WhatsApp logged out — delete auth_info and rescan');
        } else {
          console.log('Connection closed, reconnecting…');
          setTimeout(() => { connecting = false; init(); }, 4000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (e) {
    console.error('init error:', e.message);
    setTimeout(() => { connecting = false; init(); }, 8000);
  }
}

app.get('/status', (req, res) => {
  res.json({ connected, user: connected && sock && sock.user ? sock.user.id : null, needs_scan: !!qrDataUrl });
});

app.get('/qr', (req, res) => {
  res.json({ qr: qrDataUrl });
});

app.post('/send', async (req, res) => {
  const { numbers, message } = req.body || {};
  if (!connected || !sock) {
    return res.status(409).json({ success: false, error: 'WhatsApp not connected — scan the QR in the admin panel' });
  }
  if (!Array.isArray(numbers) || !numbers.length || !message) {
    return res.status(422).json({ success: false, error: 'numbers[] and message required' });
  }
  const results = [];
  for (const n of numbers) {
    const jid = String(n).replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    try {
      await sock.sendMessage(jid, { text: message });
      results.push({ number: n, ok: true });
    } catch (e) {
      results.push({ number: n, ok: false, error: e.message });
    }
  }
  res.json({ success: results.every((r) => r.ok), results });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`WhatsApp alert service on :${PORT}`);
  init();
});
