'use strict';
// Erzeugt die App-Icons ohne externe Bildbibliothek.
// Motiv: goldenes "S" auf dunklem Grund, gerundetes Quadrat.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const BG = [15, 17, 21], FG = [200, 162, 74];

/** Sehr einfacher PNG-Writer: RGBA, keine Filter, eine IDAT. */
function png(width, height, pixel) {
  const roh = Buffer.alloc((width * 4 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    roh[p++] = 0;                                  // Filtertyp "None"
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      roh[p++] = r; roh[p++] = g; roh[p++] = b; roh[p++] = a;
    }
  }
  const chunk = (typ, daten) => {
    const laenge = Buffer.alloc(4); laenge.writeUInt32BE(daten.length);
    const koerper = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(koerper) >>> 0);
    return Buffer.concat([laenge, koerper, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(roh, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const TAB = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

/**
 * Zeichnet das Motiv als Vorzeichenfunktion (>0 = Vordergrund).
 * Das "S" entsteht aus zwei Kreisringhaelften und einer Verbindung -
 * genug fuer ein Icon, das in 48 Pixeln erkennbar bleibt.
 */
function motiv(size) {
  const r = size * 0.5;
  return (x, y) => {
    // gerundetes Quadrat als Maske
    const rand = size * 0.22;
    const dx = Math.max(Math.abs(x - r) - (r - rand), 0);
    const dy = Math.max(Math.abs(y - r) - (r - rand), 0);
    if (Math.hypot(dx, dy) > rand) return [0, 0, 0, 0];

    const u = (x - r) / (size * 0.5), v = (y - r) / (size * 0.5);   // -1..1
    const dicke = 0.15;
    const ring = (cx, cy, rad, vonUnten) => {
      const d = Math.abs(Math.hypot(u - cx, v - cy) - rad);
      if (d > dicke / 2) return false;
      return vonUnten ? (v - cy) > -0.02 : (v - cy) < 0.02;
    };
    const oben = ring(0, -0.28, 0.30, false);
    const unten = ring(0, 0.28, 0.30, true);
    const brueckeL = Math.abs(u + 0.30) < dicke / 2 && v > -0.30 && v < -0.24;
    const brueckeR = Math.abs(u - 0.30) < dicke / 2 && v > 0.24 && v < 0.30;

    const drin = oben || unten || brueckeL || brueckeR;
    return drin ? [...FG, 255] : [...BG, 255];
  };
}

for (const size of [192, 512]) {
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), png(size, size, motiv(size)));
}

// SVG-Variante fuer das Browser-Tab.
fs.writeFileSync(path.join(OUT, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f1115"/>
  <text x="32" y="45" font-family="system-ui,sans-serif" font-size="38" font-weight="800"
        fill="#c8a24a" text-anchor="middle">S</text>
</svg>\n`);

console.log('Icons erzeugt: icon-192.png, icon-512.png, icon.svg');
