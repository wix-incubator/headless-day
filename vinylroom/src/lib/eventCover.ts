import type { Sleeve } from "@/data/rooms";

type CoverInput = {
  title: string;
  genre: string;
  moods: string[];
  sleeve: Sleeve;
};

const SIZE = 1200;

function drawMotif(ctx: CanvasRenderingContext2D, sleeve: Sleeve) {
  const scale = SIZE / 100;
  const x = (value: number) => value * scale;

  ctx.save();
  ctx.strokeStyle = sleeve.accent;
  ctx.fillStyle = sleeve.accent;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (sleeve.motif) {
    case "circle":
      [[26, 8, 0.72], [17, 5, 0.42]].forEach(([radius, width, alpha]) => {
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(x(50), x(43), x(radius), 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(x(50), x(43), x(4), 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bars":
      [26, 36, 46, 56, 66, 76].forEach((position, index) => {
        ctx.globalAlpha = 0.48 + (index % 3) * 0.16;
        const top = 30 + (index % 2) * 8;
        const height = 44 - (index % 3) * 12;
        ctx.fillRect(x(position), x(top), x(4), x(height));
      });
      break;
    case "horizon":
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(x(50), x(46), x(18), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = x(0.7);
      ctx.beginPath();
      ctx.arc(x(50), x(46), x(18), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.52;
      ctx.lineWidth = x(0.6);
      ctx.beginPath();
      ctx.moveTo(x(14), x(64));
      ctx.lineTo(x(86), x(64));
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = x(0.4);
      ctx.beginPath();
      ctx.moveTo(x(22), x(70));
      ctx.lineTo(x(78), x(70));
      ctx.stroke();
      break;
    case "split":
      ctx.globalAlpha = 0.64;
      ctx.lineWidth = x(0.9);
      ctx.beginPath();
      ctx.moveTo(x(20), x(78));
      ctx.lineTo(x(50), x(22));
      ctx.lineTo(x(80), x(78));
      ctx.stroke();
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = x(0.55);
      ctx.beginPath();
      ctx.moveTo(x(32), x(78));
      ctx.lineTo(x(50), x(44));
      ctx.lineTo(x(68), x(78));
      ctx.stroke();
      break;
    case "grid":
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          ctx.globalAlpha = 0.3 + ((row + column) % 3) * 0.2;
          ctx.lineWidth = x(0.65);
          ctx.strokeRect(x(30 + column * 16), x(26 + row * 16), x(10), x(10));
        }
      }
      break;
    case "arc":
      [[34, 0.85, 0.65], [24, 0.55, 0.42]].forEach(([radius, width, alpha]) => {
        ctx.globalAlpha = alpha;
        ctx.lineWidth = x(width);
        ctx.beginPath();
        ctx.arc(x(50), x(74), x(radius), Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x(50), x(74), x(3), 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

/** Render the same collectible sleeve language used by the live preview as a Wix-ready PNG. */
export async function createEventCoverPng({ title, genre, moods, sleeve }: CoverInput) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not prepare the event cover.");

  const background = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  background.addColorStop(0, sleeve.from);
  background.addColorStop(1, sleeve.to);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const vignette = ctx.createRadialGradient(SIZE * 0.48, SIZE * 0.38, 0, SIZE * 0.5, SIZE * 0.5, SIZE * 0.75);
  vignette.addColorStop(0, "rgba(255,255,255,0.055)");
  vignette.addColorStop(0.58, "rgba(0,0,0,0.08)");
  vignette.addColorStop(1, "rgba(0,0,0,0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, SIZE, SIZE);

  drawMotif(ctx, sleeve);

  const sheen = ctx.createLinearGradient(SIZE * 0.1, SIZE, SIZE * 0.9, 0);
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.09)");
  sheen.addColorStop(0.64, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Fine deterministic print grain: enough texture to feel physical without a heavy asset.
  let seed = [...`${title}${genre}`].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
  for (let index = 0; index < 900; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const px = (seed / 0xffffffff) * SIZE;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const py = (seed / 0xffffffff) * SIZE;
    ctx.fillStyle = index % 3 === 0 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)";
    ctx.fillRect(px, py, 1.5, 1.5);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

  // A discreet imprint keeps generated covers identifiable when viewed outside the site.
  ctx.fillStyle = "rgba(255,248,231,0.55)";
  ctx.font = "600 22px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("VINYL ROOMS", 68, 1100);
  ctx.fillStyle = "rgba(255,248,231,0.38)";
  ctx.font = "500 17px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`${genre.toUpperCase()} · ${(moods[0] || "LISTENING SESSION").toUpperCase()}`, 68, 1138);

  return await new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The event cover could not be rendered."));
          return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("The event cover could not be read."));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      },
      "image/png",
      0.92,
    );
  });
}
