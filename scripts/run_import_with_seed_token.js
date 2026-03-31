const fs = require('fs');

const envLines = fs
  .readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => line.trim().startsWith('#') === false);

const env = Object.fromEntries(
  envLines.map((line) => {
    const idx = line.indexOf('=');
    return [line.slice(0, idx), line.slice(idx + 1)];
  })
);

const seedSource = fs.readFileSync('seed5.js', 'utf8');
const tokenMatch = seedSource.match(/const TOKEN = '([^']+)'/);

if (!tokenMatch) {
  console.error('No se encontro TOKEN en seed5.js');
  process.exit(1);
}

process.env.FIREBASE_PROJECT_ID = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
process.env.FIREBASE_API_KEY = env.EXPO_PUBLIC_FIREBASE_API_KEY;
process.env.FIREBASE_AUTH_TOKEN = tokenMatch[1];
process.env.IMPORT_LIMIT = process.env.IMPORT_LIMIT || '100';

require('./import_top_es_real.js');
