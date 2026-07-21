import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';

// Box-average downscale (good enough for flat illustrations), re-encode PNG.
function downscale(path, maxW) {
  const src = PNG.sync.read(readFileSync(path));
  if (src.width <= maxW) { console.log('skip (small)', path, src.width); return; }
  const scale = maxW / src.width;
  const tw = maxW, th = Math.round(src.height * scale);
  const out = new PNG({ width: tw, height: th });
  const bx = src.width / tw, by = src.height / th;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * bx), x1 = Math.min(src.width, Math.ceil((x + 1) * bx));
      const y0 = Math.floor(y * by), y1 = Math.min(src.height, Math.ceil((y + 1) * by));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
        const i = (sy * src.width + sx) * 4;
        const af = src.data[i + 3] / 255;
        r += src.data[i] * af; g += src.data[i + 1] * af; b += src.data[i + 2] * af;
        a += src.data[i + 3]; n++;
      }
      const di = (y * tw + x) * 4;
      const alpha = a / n;
      const aw = alpha > 0 ? (a / 255) : 1;
      out.data[di] = Math.round(r / aw); out.data[di + 1] = Math.round(g / aw); out.data[di + 2] = Math.round(b / aw);
      out.data[di + 3] = Math.round(alpha);
    }
  }
  const buf = PNG.sync.write(out, { deflateLevel: 9 });
  writeFileSync(path, buf);
  console.log('downscaled', path, `${src.width}→${tw} (${(buf.length / 1024) | 0}kb)`);
}

downscale('public/about/before.png', 1200);
downscale('public/about/after.png', 1200);
downscale('public/about/story.png', 1100);
for (const f of readdirSync('public/thankyou')) if (f.endsWith('.png')) downscale(`public/thankyou/${f}`, 640);
