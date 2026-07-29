import { readFileSync, writeFileSync } from 'fs';
import { deflateSync, inflateSync } from 'zlib';

// ── Read & parse source PNG ──────────────────────────────────
const src = readFileSync('frontend/public/logo.png');
let pos = 8;
const chunks = [];
while (pos < src.length - 4) {
  const len = src.readUInt32BE(pos);
  const type = src.toString('ascii', pos + 4, pos + 8);
  const data = src.subarray(pos + 8, pos + 8 + len);
  chunks.push({ type, data });
  pos += 12 + len;
  if (type === 'IEND') break;
}

// Extract IHDR info
const ihdr = chunks.find(c => c.type === 'IHDR').data;
const srcW = ihdr.readUInt32BE(0);
const srcH = ihdr.readUInt32BE(4);
const bitDepth = ihdr[8];
const colorType = ihdr[9];

// Concatenate & decompress IDAT
const compressed = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data));
const raw = inflateSync(compressed);

// Scanline stride = filter byte + pixel data per row
const bpp = colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : 1;
const stride = 1 + Math.ceil(srcW * bpp * bitDepth / 8);

// ── Find bounding box of content (alpha > 10) ────────────────
let minX = srcW, minY = srcH, maxX = 0, maxY = 0;
for (let y = 0; y < srcH; y++) {
  const row = y * stride + 1;
  for (let x = 0; x < srcW; x++) {
    const alpha = colorType === 6 ? raw[row + x * 4 + 3] : 255;
    if (alpha > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
console.log(`Cropping from ${srcW}×${srcH} → ${cropW}×${cropH}`);
console.log(`Offset: left=${minX}, top=${minY}, right=${srcW-1-maxX}, bottom=${srcH-1-maxY}`);

// ── Build new pixel buffer (cropped) ──────────────────────────
const newBpp = 4;
const newStride = 1 + cropW * newBpp; // 1 filter byte + RGBA
const out = Buffer.alloc(newStride * cropH, 0);

for (let y = 0; y < cropH; y++) {
  const srcRow = (minY + y) * stride + 1;
  const dstRow = y * newStride + 1;
  for (let x = 0; x < cropW; x++) {
    const si = srcRow + (minX + x) * bpp;
    const di = dstRow + x * 4;
    if (colorType === 6) {
      out[di] = raw[si];
      out[di + 1] = raw[si + 1];
      out[di + 2] = raw[si + 2];
      out[di + 3] = raw[si + 3];
    } else {
      out[di] = raw[si];
      out[di + 1] = raw[si + 1];
      out[di + 2] = raw[si + 2];
      out[di + 3] = 255;
    }
  }
}

// ── Compress cropped data ─────────────────────────────────────
const compressedOut = deflateSync(out);

// ── Build new PNG file ────────────────────────────────────────
function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  // CRC-32 table-based
  const table = makeCRC32Table();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < crcData.length; i++) {
    crc = table[(crc ^ crcData[i]) & 0xFF] ^ (crc >>> 8);
  }
  crc = (crc ^ 0xFFFFFFFF) >>> 0;
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc);
  return Buffer.concat([len, typeB, data, crcB]);
}

function makeCRC32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const newIhdr = Buffer.alloc(13);
newIhdr.writeUInt32BE(cropW, 0);
newIhdr.writeUInt32BE(cropH, 4);
newIhdr[8] = 8;  // bit depth
newIhdr[9] = 6;  // RGBA
newIhdr[10] = 0; // compression
newIhdr[11] = 0; // filter
newIhdr[12] = 0; // interlace

const png = Buffer.concat([
  signature,
  makeChunk('IHDR', newIhdr),
  makeChunk('IDAT', compressedOut),
  makeChunk('IEND', Buffer.alloc(0)),
]);

// ── Write & report ────────────────────────────────────────────
writeFileSync('frontend/public/logo-cropped.png', png);
console.log('✅ Saved logo-cropped.png');

// Also replace original
writeFileSync('frontend/public/logo.png', png);
console.log('✅ Replaced original logo.png with cropped version');

// Final stats
const oldW = srcW, oldH = srcH;
const areaBefore = oldW * oldH;
const areaAfter = cropW * cropH;
console.log(`\nAspect ratio: ${(oldW/oldH).toFixed(2)} → ${(cropW/cropH).toFixed(2)}`);
console.log(`Area reduction: ${(100*(1-areaAfter/areaBefore)).toFixed(1)}%`);
console.log(`\nIn a 90px square container:`);
console.log(`  Before: visible art ≈ 75×60px (constrained by landscape aspect)`);
console.log(`  After:  visible art ≈ ${Math.round(cropW*90/cropH)}×90px or 90×${Math.round(cropH*90/cropW)}px`);
