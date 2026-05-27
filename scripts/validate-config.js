const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '..', 'usage-sources.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!Number.isFinite(Number(config.refreshIntervalMs)) || Number(config.refreshIntervalMs) < 10_000) {
  throw new Error('refreshIntervalMs must be a number >= 10000');
}
if (!Array.isArray(config.sources) || config.sources.length === 0) {
  throw new Error('sources must be a non-empty array');
}

const ids = new Set();
for (const source of config.sources) {
  if (!source.id || !/^[a-z0-9-]+$/.test(source.id)) throw new Error(`Invalid source id: ${source.id}`);
  if (ids.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
  ids.add(source.id);
  if (!source.label) throw new Error(`Missing label for ${source.id}`);
  const url = new URL(source.url);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error(`Invalid URL for ${source.id}`);
  if (!Array.isArray(source.patterns)) throw new Error(`patterns must be an array for ${source.id}`);
  for (const pattern of source.patterns) new RegExp(pattern, 'i');
}

console.log(`Validated ${config.sources.length} usage sources.`);
