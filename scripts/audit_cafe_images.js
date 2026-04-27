#!/usr/bin/env node
/**
 * audit_cafe_images.js
 *
 * Genera un informe HTML con todas las fotos de cafés en Firestore.
 * Abre el fichero en el navegador para revisar visualmente cuáles
 * tienen fondos feos y necesitan procesado con remove.bg.
 *
 * Uso:  node scripts/audit_cafe_images.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

/** Same priority chain as getCafePhoto() in src/core/utils.js */
function getCafePhoto(cafe) {
  if (!cafe) return null;
  const sel = cafe.photos?.selected;
  if (sel && typeof sel === 'string' && sel.length > 10) return sel;
  for (const url of [cafe.bestPhoto, cafe.officialPhoto, cafe.imageUrl, cafe.foto, cafe.image]) {
    if (typeof url === 'string' && url.startsWith('http') && url.length > 10) return url;
  }
  return null;
}

async function main() {
  console.log('📸 Descargando cafés de Firestore…');
  const snap = await db.collection('cafes').get();
  console.log(`   ${snap.size} documentos.`);

  const items = [];
  snap.forEach((doc) => {
    const d = doc.data();
    const photo = getCafePhoto(d);
    items.push({
      id: doc.id,
      nombre: d.nombre || d.name || '(sin nombre)',
      marca: d.marca || d.roaster || '',
      photo,
    });
  });

  const withPhoto = items.filter((i) => i.photo);
  const noPhoto = items.filter((i) => !i.photo);
  console.log(`   ${withPhoto.length} con foto, ${noPhoto.length} sin foto.`);

  // Sort by marca for easier visual grouping
  withPhoto.sort((a, b) => a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre));

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Auditoría de fotos de cafés – etiove</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1410; color: #e8ddd0; padding: 24px; }
  h1 { text-align: center; margin-bottom: 8px; font-size: 24px; }
  .stats { text-align: center; color: #a09080; margin-bottom: 24px; font-size: 14px; }
  .instructions { text-align: center; color: #c8a97c; margin-bottom: 24px; font-size: 13px; max-width: 700px; margin-left: auto; margin-right: auto; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .card { background: #2a2018; border-radius: 12px; overflow: hidden; cursor: pointer; border: 3px solid transparent; transition: border-color 0.2s; }
  .card.selected { border-color: #e74c3c; }
  .card:hover { border-color: #c8a97c; }
  .card .img-wrap { width: 100%; height: 180px; background: #f4efe9; display: flex; align-items: center; justify-content: center; }
  .card img { max-width: 90%; max-height: 170px; object-fit: contain; }
  .card .info { padding: 8px 10px; }
  .card .name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card .brand { font-size: 11px; color: #a09080; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card .id { font-size: 10px; color: #706050; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .toolbar { position: fixed; bottom: 0; left: 0; right: 0; background: #2a2018; border-top: 2px solid #c8a97c; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
  .toolbar button { background: #c8a97c; color: #1a1410; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
  .toolbar button:hover { background: #e0c090; }
  #counter { font-size: 14px; font-weight: 600; }
  .spacer { height: 70px; }
</style>
</head>
<body>
<h1>📸 Auditoría de fotos de cafés</h1>
<p class="stats">${withPhoto.length} cafés con foto · ${noPhoto.length} sin foto · ${snap.size} total</p>
<p class="instructions">
  Haz clic en las fotos que tengan fondos feos o no uniformes para seleccionarlas.<br>
  Cuando termines, pulsa "Copiar IDs" para obtener la lista de IDs a procesar con remove.bg.
</p>

<div class="grid">
${withPhoto
  .map(
    (c) => `  <div class="card" data-id="${c.id}" onclick="toggleCard(this)">
    <div class="img-wrap"><img src="${c.photo}" loading="lazy" onerror="this.parentElement.innerHTML='<span style=\\'color:#999\\'>❌ Error</span>'"></div>
    <div class="info">
      <div class="name">${escapeHtml(c.nombre)}</div>
      <div class="brand">${escapeHtml(c.marca)}</div>
      <div class="id">${c.id}</div>
    </div>
  </div>`
  )
  .join('\n')}
</div>

<div class="spacer"></div>

<div class="toolbar">
  <span id="counter">0 seleccionadas</span>
  <div>
    <button onclick="selectAll()">Seleccionar todas</button>
    <button onclick="clearAll()">Limpiar</button>
    <button onclick="copyIds()">📋 Copiar IDs</button>
  </div>
</div>

<script>
const selected = new Set();
function toggleCard(el) {
  const id = el.dataset.id;
  if (selected.has(id)) { selected.delete(id); el.classList.remove('selected'); }
  else { selected.add(id); el.classList.add('selected'); }
  document.getElementById('counter').textContent = selected.size + ' seleccionadas';
}
function selectAll() {
  document.querySelectorAll('.card').forEach(el => { selected.add(el.dataset.id); el.classList.add('selected'); });
  document.getElementById('counter').textContent = selected.size + ' seleccionadas';
}
function clearAll() {
  selected.clear();
  document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
  document.getElementById('counter').textContent = '0 seleccionadas';
}
function copyIds() {
  const ids = Array.from(selected);
  if (!ids.length) { alert('Selecciona al menos una foto'); return; }
  const text = ids.join('\\n');
  navigator.clipboard.writeText(text).then(() => alert(ids.length + ' IDs copiados al portapapeles.\\n\\nPégalos en un fichero ids_to_process.txt y ejecuta:\\nnode scripts/remove_bg_cafes.js'));
}
</script>
</body>
</html>`;

  const outPath = path.join(__dirname, '..', 'data', 'audit_cafe_images.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`\n✅ Informe generado: ${outPath}`);
  console.log('   Ábrelo en el navegador para revisar las fotos.');

  // Also try to open it
  const { exec } = require('child_process');
  exec(`open "${outPath}"`);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
