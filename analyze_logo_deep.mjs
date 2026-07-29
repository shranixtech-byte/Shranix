import { readFileSync, writeFileSync } from 'fs';
import { inflateSync } from 'zlib';

const buf = readFileSync('frontend/public/logo.png');

// Parse PNG structure manually
let pos = 8; // Skip PNG signature (8 bytes)
const chunks = [];

while (pos < buf.length - 4) {
  const length = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.subarray(pos + 8, pos + 8 + length);
  chunks.push({ type, length, data });
  pos += 12 + length; // length(4) + type(4) + data(length) + CRC(4)
  
  if (type === 'IEND') break;
}

// Find IHDR and IDAT chunks
let width = 0, height = 0, bitDepth = 0, colorType = 0;
const idatChunks = [];

for (const chunk of chunks) {
  if (chunk.type === 'IHDR') {
    width = chunk.data.readUInt32BE(0);
    height = chunk.data.readUInt32BE(4);
    bitDepth = chunk.data[8];
    colorType = chunk.data[9];
    console.log(`IHDR: ${width}x${height}, bitDepth=${bitDepth}, colorType=${colorType}`);
  }
  if (chunk.type === 'IDAT') {
    idatChunks.push(chunk.data);
  }
}

// Concatenate all IDAT data and decompress
const compressedData = Buffer.concat(idatChunks);
const rawData = inflateSync(compressedData);

// Calculate bytes per pixel based on color type
let bytesPerPixel;
switch (colorType) {
  case 6: bytesPerPixel = 4; break; // RGBA
  case 2: bytesPerPixel = 3; break; // RGB
  case 4: bytesPerPixel = 2; break; // Grayscale+Alpha
  case 0: bytesPerPixel = 1; break; // Grayscale
  default: bytesPerPixel = 4;
}

const scanlineLength = Math.ceil(width * bytesPerPixel * bitDepth / 8) + 1; // +1 for filter byte

// Find bounding box of non-transparent pixels
let minX = width, minY = height, maxX = 0, maxY = 0;
let nonTransparentPixels = 0;

for (let y = 0; y < height; y++) {
  const rowStart = y * scanlineLength + 1; // skip filter byte
  for (let x = 0; x < width; x++) {
    let alpha;
    if (colorType === 6) {
      alpha = rawData[rowStart + x * 4 + 3];
    } else if (colorType === 4) {
      alpha = rawData[rowStart + x * 2 + 1];
    } else {
      alpha = 255; // no alpha, assume fully opaque
    }
    
    if (alpha > 10) {
      nonTransparentPixels++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const visibleWidth = maxX - minX + 1;
const visibleHeight = maxY - minY + 1;
const visibleArea = visibleWidth * visibleHeight;
const totalArea = width * height;

console.log('\n=== DEEP LOGO ANALYSIS ===');
console.log(`Logo dimensions: ${width} x ${height}px`);
console.log(`\n--- Visible Content Bounding Box ---`);
console.log(`Left transparent margin: ${minX}px`);
console.log(`Top transparent margin: ${minY}px`);
console.log(`Right transparent margin: ${width - 1 - maxX}px`);
console.log(`Bottom transparent margin: ${height - 1 - maxY}px`);
console.log(`\nTrue visible content: ${visibleWidth} x ${visibleHeight}px`);
console.log(`Visible width ratio: ${(visibleWidth * 100 / width).toFixed(1)}% of canvas`);
console.log(`Visible height ratio: ${(visibleHeight * 100 / height).toFixed(1)}% of canvas`);
console.log(`Total transparent area: ${(100 * (1 - visibleArea / totalArea)).toFixed(1)}%`);
console.log(`\nWhen displayed at 90px height in a badge:`);
console.log(`  The logo art will be roughly ${Math.round(90 * visibleWidth / height)}px wide`);
console.log(`  (because the content is ${visibleWidth}px wide in a ${height}px tall canvas)`);
console.log(`\n--- ROOT CAUSE ---`);
console.log(`The PNG canvas (${width}x${height}) has ${(100 - (visibleWidth * 100 / width)).toFixed(1)}% horizontal `);
console.log(`and ${(100 - (visibleHeight * 100 / height)).toFixed(1)}% vertical transparent margins.`);
console.log(`This is why the logo looks small despite the container size.`);
