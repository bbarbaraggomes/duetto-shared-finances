import puppeteer from 'puppeteer';

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 680px; height: 680px; background: #1A1A2E; display: flex; align-items: center; justify-content: center; }
  .card { width: 680px; height: 680px; background: #1A1A2E; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; overflow: hidden; }
  .bg-circle-1 { position: absolute; top: -60px; right: -60px; width: 360px; height: 360px; border-radius: 50%; background: #C8A96E; opacity: 0.08; }
  .bg-circle-2 { position: absolute; bottom: -40px; left: -40px; width: 280px; height: 280px; border-radius: 50%; background: #C8A96E; opacity: 0.06; }
  .avatars { display: flex; align-items: center; gap: -20px; margin-bottom: 24px; }
  .avatar { width: 104px; height: 104px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: Georgia, serif; font-size: 42px; font-weight: 700; }
  .avatar-light { background: #F7F6F3; color: #1A1A2E; margin-right: -20px; z-index: 1; }
  .avatar-gold { background: #C8A96E; color: #1A1A2E; }
  .amp { font-family: Georgia, serif; font-size: 22px; color: #F7F6F3; opacity: 0.9; margin: 0 8px; z-index: 2; }
  .title { font-family: Georgia, serif; font-size: 52px; color: #F7F6F3; letter-spacing: 2px; margin-bottom: 12px; }
  .badge { background: #C8A96E; color: #1A1A2E; font-family: Georgia, serif; font-size: 13px; font-weight: 700; letter-spacing: 3px; padding: 6px 20px; border-radius: 20px; margin-bottom: 28px; }
  .divider { width: 280px; height: 1px; background: #C8A96E; opacity: 0.4; margin-bottom: 24px; }
  .tagline { font-family: Georgia, serif; font-size: 20px; color: #F7F6F3; opacity: 0.7; margin-bottom: 20px; }
  .features { font-family: Georgia, serif; font-size: 14px; color: #C8A96E; opacity: 0.9; margin-bottom: 36px; }
  .price { font-family: Georgia, serif; font-size: 36px; color: #F7F6F3; }
  .price span { font-size: 18px; opacity: 0.6; }
  .footer { position: absolute; bottom: 28px; font-family: Georgia, serif; font-size: 12px; color: #C8A96E; opacity: 0.5; letter-spacing: 2px; }
  .footer-line { position: absolute; bottom: 48px; width: 400px; height: 1px; background: #C8A96E; opacity: 0.3; }
</style>
</head>
<body>
<div class="card">
  <div class="bg-circle-1"></div>
  <div class="bg-circle-2"></div>
  <div class="avatars">
    <div class="avatar avatar-light">D</div>
    <div class="amp">&amp;</div>
    <div class="avatar avatar-gold" style="font-size:28px; font-weight:400;">♡</div>
  </div>
  <div class="title">Duetto</div>
  <div class="badge">PRO</div>
  <div class="divider"></div>
  <div class="tagline">Finanças a dois, simples assim.</div>
  <div class="features">Despesas partilhadas · Metas do casal · Relatórios</div>
  <div class="price">5,49€ <span>/mês por casal</span></div>
  <div class="footer-line"></div>
  <div class="footer">DUETTO</div>
</div>
</body>
</html>
`;

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 680, height: 680 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.screenshot({ path: 'duetto-pro.png', type: 'png' });
await browser.close();
console.log('✅ duetto-pro.png criado!');