/**
 * Audit ALL cafes in Firestore: check which ones have broken photo URLs (HTTP != 200).
 * Reports broken URLs and counts.
 */

const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function extractStr(field) {
  return field?.stringValue || '';
}

function getPhotoUrl(fields) {
  // Same priority as getCafePhoto in utils.js
  const selected = fields.photos?.mapValue?.fields?.selected?.stringValue || '';
  if (selected && selected.startsWith('http') && selected.length > 10) return selected;

  for (const key of ['bestPhoto', 'officialPhoto', 'imageUrl', 'foto', 'image']) {
    const val = extractStr(fields[key]);
    if (val && val.startsWith('http') && val.length > 10) return val;
  }
  return '';
}

async function fetchAllCafes() {
  let allDocs = [];
  let pageToken = '';

  while (true) {
    const url = `${BASE}/cafes?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.documents) {
      allDocs.push(...data.documents);
    }

    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
    } else {
      break;
    }
  }

  return allDocs;
}

async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return res.status;
  } catch (e) {
    return e.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
  }
}

async function main() {
  console.log('Fetching all cafes...');
  const docs = await fetchAllCafes();
  console.log(`Total docs: ${docs.length}\n`);

  // Group by unique photo URL for efficiency
  const urlToDocs = new Map();
  let noPhotoCount = 0;

  for (const doc of docs) {
    const id = doc.name.split('/').pop();
    const nombre = extractStr(doc.fields.nombre);
    const roaster = extractStr(doc.fields.roaster) || extractStr(doc.fields.marca);
    const photoUrl = getPhotoUrl(doc.fields);

    if (!photoUrl) {
      noPhotoCount++;
      continue;
    }

    if (!urlToDocs.has(photoUrl)) {
      urlToDocs.set(photoUrl, []);
    }
    urlToDocs.get(photoUrl).push({ id, nombre, roaster });
  }

  console.log(`Unique photo URLs to check: ${urlToDocs.size}`);
  console.log(`Docs with no photo URL: ${noPhotoCount}\n`);
  console.log('Checking URLs (this takes a moment)...\n');

  const urls = Array.from(urlToDocs.keys());
  const BATCH = 20;
  const brokenUrls = new Map();
  let checked = 0;

  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (url) => {
        const status = await checkUrl(url);
        return { url, status };
      })
    );

    for (const { url, status } of results) {
      if (status !== 200 && status !== 301 && status !== 302) {
        brokenUrls.set(url, { status, docs: urlToDocs.get(url) });
      }
    }

    checked += batch.length;
    process.stdout.write(
      `  Checked ${checked}/${urls.length} URLs, ${brokenUrls.size} broken so far\r`
    );
  }

  console.log('\n');

  // Report
  let totalBrokenDocs = 0;
  const brokenByDomain = {};

  for (const [url, info] of brokenUrls) {
    totalBrokenDocs += info.docs.length;
    const domain = new URL(url).hostname;
    if (!brokenByDomain[domain]) brokenByDomain[domain] = { count: 0, docs: [] };
    brokenByDomain[domain].count += info.docs.length;
    brokenByDomain[domain].docs.push(...info.docs.map((d) => ({ ...d, url, status: info.status })));
  }

  console.log('=== BROKEN PHOTO SUMMARY ===');
  console.log(`Total docs with broken photos: ${totalBrokenDocs}`);
  console.log(`Unique broken URLs: ${brokenUrls.size}\n`);

  console.log('By domain:');
  for (const [domain, info] of Object.entries(brokenByDomain).sort(
    (a, b) => b[1].count - a[1].count
  )) {
    console.log(`  ${domain}: ${info.count} docs`);
  }

  console.log('\nDetailed broken list:');
  for (const [domain, info] of Object.entries(brokenByDomain).sort(
    (a, b) => b[1].count - a[1].count
  )) {
    console.log(`\n--- ${domain} (${info.count} docs) ---`);
    for (const doc of info.docs.slice(0, 10)) {
      console.log(`  [${doc.id}] ${doc.roaster} — ${doc.nombre} (HTTP ${doc.status})`);
      console.log(`    URL: ${doc.url}`);
    }
    if (info.docs.length > 10) {
      console.log(`  ... and ${info.docs.length - 10} more`);
    }
  }
}

main().catch(console.error);
