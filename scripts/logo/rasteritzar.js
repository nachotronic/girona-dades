// Rasteriza los iconos y la imagen para compartir (Playwright). Uso: node scripts/logo/rasteritzar.js
const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
const A=__dirname, WEB=path.join(A,'..','..','web'), B=path.join(A,'build');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage();
  const png=async(svg,size,out)=>{
    await p.setViewportSize({width:size,height:size});
    await p.setContent(`<style>html,body{margin:0}</style><img src="data:image/svg+xml;base64,${Buffer.from(fs.readFileSync(path.join(B,svg))).toString('base64')}" width="${size}" height="${size}" style="display:block">`);
    await p.screenshot({path:out,omitBackground:false});
  };
  for (const s of [16,32,48]) await png('icona.svg',s,path.join(B,`ico-${s}.png`));
  await png('icona.svg',180,path.join(WEB,'apple-touch-icon.png'));
  await png('icona.svg',192,path.join(WEB,'icon-192.png'));
  await png('icona.svg',512,path.join(WEB,'icon-512.png'));
  await png('icona-maskable.svg',512,path.join(WEB,'icon-maskable-512.png'));
  await p.setViewportSize({width:1200,height:630});
  await p.goto('file://'+path.join(A,'og.html')); await p.waitForTimeout(400);
  await p.screenshot({path:path.join(WEB,'og.png')});
  await b.close(); console.log('ok');
})();
