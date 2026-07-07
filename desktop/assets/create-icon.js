/**
 * EDITH Icon Generator
 * Creates a simple icon PNG that you can convert to .ico
 * Run: node create-icon.js
 * 
 * Or replace assets/icon.ico with your own 256x256 .ico file.
 */

const { createCanvas } = require('canvas'); // npm install canvas
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;

  // Rounded rectangle
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Letter E
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.55}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

try {
  const sizes = [16, 32, 48, 64, 128, 256];
  for (const s of sizes) {
    const buf = generateIcon(s);
    fs.writeFileSync(path.join(__dirname, `icon-${s}.png`), buf);
    console.log(`Generated icon-${s}.png`);
  }
  console.log('\nNow convert icon-256.png to icon.ico using:');
  console.log('  https://convertio.co/png-ico/');
  console.log('  or: npx png-to-ico icon-256.png > icon.ico');
} catch (e) {
  console.log('canvas module not available — use a custom icon.ico file');
  console.log('Place a 256x256 .ico file at: desktop/assets/icon.ico');
}
