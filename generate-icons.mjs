import puppeteer from 'puppeteer';

const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 512px; height: 512px; background: #1A1A2E; display: flex; align-items: center; justify-content: center; }
  .card { width: 512px; height: 512px; background: #1A1A2E; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
  .avatars { display: flex; align-items: center; }
  .avatar { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: Georgia, serif; font-size: 52px; font-weight: 700; }
  .avatar-light { background: #F7F6F3; color: #1A1A2E; margin-right: -20px; z-index: 1; }
  .avatar-gold { background: #C8A96E; color: #1A1A2E; }
  .title { font-family: Georgia, serif; font-size: 64px; color: #F7F6F3; letter-spacing: 2px; }
  .tagline { font-family: Georgia, serif; font-size: 18px; color: #C8A96E; opacity: 0.8; }
</style>
</head>
<body>
<div class="card">
  <div class="avatars">
    <div class="avatar avatar-light">D</div>
    <div class="avatar avatar-gold" style="font-size:36px;">♡</div>
  </div>
  <div class="title">Duetto</div>
  <div class="tagline">Finanças a dois</div>
</div>
</body>
</html>
`;

const browser = await puppeteer.launch();
const page = await browser.newPage();

// 512x512
await page.setViewport({ width: 512, height: 512 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.screenshot({ path: 'public/icons/icon-512.png', type: 'png' });

// 192x192
await page.setViewport({ width: 192, height: 192 });
await page.evaluate(() => {
  document.body.style.width = '192px';
  document.body.style.height = '192px';
  document.querySelector('.card').style.width = '192px';
  document.querySelector('.card').style.height = '192px';
  document.querySelector('.card').style.gap = '6px';
  document.querySelectorAll('.avatar').forEach(a => { a.style.width = '45px'; a.style.height = '45px'; a.style.fontSize = '20px'; });
  document.querySelector('.avatar-gold').style.fontSize = '14px';
  document.querySelector('.title').style.fontSize = '24px';
  document.querySelector('.tagline').style.fontSize = '7px';
});
await page.screenshot({ path: 'public/icons/icon-192.png', type: 'png' });

await browser.close();
console.log('✅ Ícones criados em public/icons/');