/**
 * Generates the desktop app icon: the Slate PDF mark — three white rules on a
 * black slate. Monochrome by design, so it stays crisp at every size the OS
 * renders it.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const size = 1024;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// The mark is authored on a 64x64 grid; scale it up to the icon canvas.
const s = size / 64;

// Black slate with rounded corners
ctx.fillStyle = '#000000';
ctx.beginPath();
const r = 14 * s;
ctx.moveTo(r, 0);
ctx.lineTo(size - r, 0);
ctx.arcTo(size, 0, size, r, r);
ctx.lineTo(size, size - r);
ctx.arcTo(size, size, size - r, size, r);
ctx.lineTo(r, size);
ctx.arcTo(0, size, 0, size - r, r);
ctx.lineTo(0, r);
ctx.arcTo(0, 0, r, 0, r);
ctx.closePath();
ctx.fill();

// Three white rules: a heading, a full line, a short last line.
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 5 * s;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(16 * s, 21 * s); ctx.lineTo(36 * s, 21 * s);
ctx.moveTo(16 * s, 32 * s); ctx.lineTo(48 * s, 32 * s);
ctx.moveTo(16 * s, 43 * s); ctx.lineTo(41 * s, 43 * s);
ctx.stroke();

const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(path.join(buildDir, 'icon.png'), canvas.toBuffer('image/png'));
console.log('Wrote build/icon.png (1024x1024)');
