// Generates PNG app icons using only Node.js built-ins (no npm packages)
// Draws the same pot design as public/icons/icon.svg

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";

// --- CRC32 (required by PNG format) ---
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makeIcon(size) {
  const rgb = Buffer.alloc(size * size * 3);

  const BG = [13, 17, 23];        // #0d1117
  const ACCENT = [74, 144, 217];  // #4a90d9
  const STEAM = [88, 166, 255];   // #58a6ff
  const DARK = [58, 123, 200];    // #3a7bc8

  // Fill background
  for (let i = 0; i < size * size; i++) {
    rgb[i * 3] = BG[0]; rgb[i * 3 + 1] = BG[1]; rgb[i * 3 + 2] = BG[2];
  }

  // Draw a rectangle in 512-coordinate space, scaled to `size`
  function rect(x1, y1, x2, y2, col) {
    const sc = size / 512;
    const px0 = Math.round(x1 * sc), py0 = Math.round(y1 * sc);
    const px1 = Math.round(x2 * sc), py1 = Math.round(y2 * sc);
    for (let y = py0; y < py1; y++) {
      for (let x = px0; x < px1; x++) {
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const i = (y * size + x) * 3;
        rgb[i] = col[0]; rgb[i + 1] = col[1]; rgb[i + 2] = col[2];
      }
    }
  }

  // Pot rim
  rect(116, 210, 396, 238, ACCENT);
  // Pot body
  rect(136, 238, 376, 378, ACCENT);
  // Pot bottom highlight
  rect(136, 378, 376, 402, DARK);
  // Left handle
  rect(72, 218, 124, 238, ACCENT);
  // Right handle
  rect(388, 218, 440, 238, ACCENT);
  // Steam lines
  rect(191, 148, 201, 195, STEAM);
  rect(251, 141, 261, 188, STEAM);
  rect(311, 148, 321, 195, STEAM);

  // Build raw scanlines: filter byte (0) + RGB row
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: None
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", makeIcon(192));
writeFileSync("public/icons/icon-512.png", makeIcon(512));
writeFileSync("public/icons/apple-touch-icon.png", makeIcon(180));
console.log("Generated: icon-192.png, icon-512.png, apple-touch-icon.png");
