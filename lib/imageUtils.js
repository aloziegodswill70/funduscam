// lib/imageUtils.js
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Convert to green-channel red-free (returns dataURL)
 */
export async function toGreenChannelDataUrl(dataUrl) {
  const img = await loadImage(dataUrl);
  const canvas = makeCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = d[i + 1];
    d[i] = g;
    d[i + 1] = g;
    d[i + 2] = g;
  }
  ctx.putImageData(im, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Fast CLAHE-like enhancement.
 * - tileSize: number of pixels per tile (e.g., 64)
 * - clipLimit: fraction to clip histogram (0.01..0.1)
 */
export async function claheDataUrl(dataUrl, { tileSize = 64, clipLimit = 0.01 } = {}) {
  const img = await loadImage(dataUrl);
  const canvas = makeCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const w = canvas.width, h = canvas.height;
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  // operate on luminance (approx) - we'll convert to Y, modify, and remap RGB by scale
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    lum[j] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  }

  const tilesX = Math.ceil(w / tileSize);
  const tilesY = Math.ceil(h / tileSize);

  // create LUT for each tile
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(w, x0 + tileSize);
      const y1 = Math.min(h, y0 + tileSize);

      // histogram 0-255
      const hist = new Uint32Array(256);
      let pixels = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[lum[y * w + x]]++;
          pixels++;
        }
      }
      // clip histogram
      const maxClip = Math.max(1, Math.floor(clipLimit * pixels));
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > maxClip) {
          excess += hist[i] - maxClip;
          hist[i] = maxClip;
        }
      }
      // redistribute excess (simple equal distribution)
      const add = Math.floor(excess / 256);
      if (add > 0) {
        for (let i = 0; i < 256; i++) hist[i] += add;
      }

      // CDF -> LUT
      const lut = new Uint8ClampedArray(256);
      let cdf = 0;
      for (let i = 0; i < 256; i++) {
        cdf += hist[i];
        lut[i] = Math.round((cdf / pixels) * 255);
      }

      // Map tile pixels using LUT (write back to lum)
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          lum[y * w + x] = lut[lum[y * w + x]];
        }
      }
    }
  }

  // Blend tiles smoothly by simple bilinear interpolation at tile borders
  // For speed, we'll write lum back to RGB by scaling factor between new lum and old luminance
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i4 = idx * 4;
      const oldL = Math.round(0.299 * d[i4] + 0.587 * d[i4 + 1] + 0.114 * d[i4 + 2]);
      const newL = lum[idx] || oldL;
      // avoid division by zero
      const scale = oldL > 0 ? newL / oldL : 1.0;
      d[i4] = Math.min(255, Math.round(d[i4] * scale));
      d[i4 + 1] = Math.min(255, Math.round(d[i4 + 1] * scale));
      d[i4 + 2] = Math.min(255, Math.round(d[i4 + 2] * scale));
    }
  }

  ctx.putImageData(im, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Ellipse crop: crops the image to ellipse defined by center and radii,
 * returns dataURL of the result with transparent background outside ellipse.
 * - srcDataUrl: input
 * - cx, cy, rx, ry: center and radii in image pixel coords
 * - rotation: radians (optional)
 */
export async function ellipseCropDataUrl(srcDataUrl, { cx, cy, rx, ry, rotation = 0 } = {}) {
  const img = await loadImage(srcDataUrl);
  const canvas = makeCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw ellipse path
  ctx.save();
  ctx.beginPath();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(rx, ry);
  ctx.arc(0, 0, 1, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.restore();

  // create mask
  const maskCanvas = makeCanvas(img.width, img.height);
  const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });
  mctx.fillStyle = "black";
  mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  mctx.save();
  mctx.translate(cx, cy);
  mctx.rotate(rotation);
  mctx.scale(rx, ry);
  mctx.beginPath();
  mctx.arc(0, 0, 1, 0, Math.PI * 2);
  mctx.closePath();
  mctx.fillStyle = "white";
  mctx.fill();
  mctx.restore();

  // draw original image
  ctx.drawImage(img, 0, 0);

  // apply mask: copy pixels where mask is white, set others transparent
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = mctx.getImageData(0, 0, canvas.width, canvas.height);
  const sd = src.data;
  const md = mask.data;
  for (let i = 0; i < sd.length; i += 4) {
    const alpha = md[i] / 255; // mask red channel 0..255
    sd[i + 3] = Math.round(sd[i + 3] * alpha);
  }
  ctx.putImageData(src, 0, 0);

  // Optionally crop to bounding box to reduce file size
  const left = Math.max(0, Math.floor(cx - rx));
  const top = Math.max(0, Math.floor(cy - ry));
  const width = Math.min(canvas.width - left, Math.ceil(rx * 2));
  const height = Math.min(canvas.height - top, Math.ceil(ry * 2));

  const outCanvas = makeCanvas(width, height);
  const outCtx = outCanvas.getContext("2d", { willReadFrequently: true });
  outCtx.drawImage(canvas, left, top, width, height, 0, 0, width, height);

  return outCanvas.toDataURL("image/png");
}
