const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'README.md',
  'package.json',
  'usage-sources.json',
  'src/main.js',
  'src/preload.js',
  'src/renderer.html',
  'src/renderer.js',
  'src/styles.css',
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing ${file}`);
  const stat = fs.statSync(fullPath);
  if (stat.size === 0) throw new Error(`${file} is empty`);
}

const html = fs.readFileSync(path.join(root, 'src/renderer.html'), 'utf8');
if (!html.includes('Content-Security-Policy')) throw new Error('renderer.html must define CSP');

const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
if (!main.includes('alwaysOnTop')) throw new Error('main window must support always-on-top mode');
if (!main.includes('persist:ai-usage-monitor')) throw new Error('usage windows must use persistent login partition');

console.log('Smoke checks passed.');
