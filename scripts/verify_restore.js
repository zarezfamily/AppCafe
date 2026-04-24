const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').get();
  let fields = {};
  snap.forEach((d) => {
    const data = d.data();
    ['imagenUrl', 'bestPhoto', 'officialPhoto', 'imageUrl', 'foto', 'photos'].forEach((f) => {
      if (f === 'photos') {
        if (
          data.photos &&
          (data.photos.selected || data.photos.original || data.photos.bgRemoved)
        ) {
          fields['photos.*'] = (fields['photos.*'] || 0) + 1;
        }
      } else if (data[f] && typeof data[f] === 'string' && data[f].startsWith('http')) {
        fields[f] = (fields[f] || 0) + 1;
      }
    });
  });
  console.log('Total docs:', snap.size);
  console.log('Photo field counts:', JSON.stringify(fields, null, 2));

  // Check what 90 extra docs are
  const backupIds = require('../data/backup_cafes_2026-04-24T17-16-42-914Z.json').map((c) => c.id);
  const backupSet = new Set(backupIds);
  let extra = 0;
  snap.forEach((d) => {
    if (!backupSet.has(d.id)) {
      extra++;
      const data = d.data();
      console.log('EXTRA:', d.id, '=>', data.nombre || 'no-name');
    }
  });
  console.log('Extra docs (not in backup):', extra);
  process.exit(0);
})();
