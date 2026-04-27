const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function query(roaster) {
  const url = `${BASE}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'cafes' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'roaster' },
          op: 'EQUAL',
          value: { stringValue: roaster },
        },
      },
      limit: 50,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  const data = await query('Nomad Coffee');

  console.log(`Found ${data.filter((d) => d.document).length} Nomad Coffee docs\n`);

  for (const item of data) {
    if (!item.document) continue;
    const f = item.document.fields;
    const nombre = f.nombre?.stringValue || '';
    const id = item.document.name.split('/').pop();

    const foto = f.foto?.stringValue || '';
    const image = f.image?.stringValue || '';
    const imageUrl = f.imageUrl?.stringValue || '';
    const bestPhoto = f.bestPhoto?.stringValue || '';
    const officialPhoto = f.officialPhoto?.stringValue || '';
    const photosMap = f.photos?.mapValue?.fields || null;
    const selected = photosMap?.selected?.stringValue || '';
    const officialArr = photosMap?.official?.arrayValue?.values || [];
    const userArr = photosMap?.user?.arrayValue?.values || [];

    const hasAnyPhoto = foto || image || imageUrl || bestPhoto || officialPhoto || selected;

    console.log(`[${id}] ${nombre}`);
    console.log(`  foto:          ${foto || '(empty)'}`);
    console.log(`  image:         ${image || '(empty)'}`);
    console.log(`  imageUrl:      ${imageUrl || '(empty)'}`);
    console.log(`  bestPhoto:     ${bestPhoto || '(empty)'}`);
    console.log(`  officialPhoto: ${officialPhoto || '(empty)'}`);
    console.log(`  photos.selected: ${selected || '(empty)'}`);
    console.log(`  photos.official: [${officialArr.map((v) => v.stringValue || '').join(', ')}]`);
    console.log(`  photos.user:     [${userArr.map((v) => v.stringValue || '').join(', ')}]`);
    console.log(`  → HAS VISIBLE PHOTO: ${hasAnyPhoto ? 'YES' : '*** NO ***'}`);
    console.log('');
  }
}

main().catch(console.error);
