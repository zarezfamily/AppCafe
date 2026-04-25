// Import L'OR capsules from JSON to Firestore using firebase-admin
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const cafes = require('./cafe-import-lor-capsulas-real.json');

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function computeSca(cafe) {
  let score = 68; // base for supermarket capsule
  if (cafe.notas && cafe.notas.split(',').length >= 2) score += 2;
  if (cafe.isBio) score += 2;
  if (cafe.origen) score += 3; // single origin
  if (cafe.species === 'arabica') score += 1.5;
  if (cafe.decaf) score -= 2;
  if (cafe.intensidad >= 10) score += 1;
  const reasons = ['Café de supermercado', 'Formato cápsulas', 'Marca identificada'];
  if (cafe.isBio) reasons.push('Certificación BIO');
  if (cafe.origen) reasons.push('Origen único');
  if (cafe.species === 'arabica') reasons.push('Especie arábica');
  return {
    score: Math.round(score * 10) / 10,
    type: 'estimated',
    confidence: 0.4,
    officialScore: null,
    reasons,
    signals: {
      category: 'supermarket',
      format: 'capsules',
      roastLevel: cafe.roastLevel || 'medium',
      origin: !!cafe.origen,
      process: false,
      variety: false,
      altitude: false,
      notesCount: cafe.notas ? cafe.notas.split(',').length : 0,
      species: cafe.species || 'arabica',
      decaf: !!cafe.decaf,
    },
    lastCalculatedAt: new Date().toISOString(),
  };
}

(async () => {
  const now = new Date().toISOString();
  let added = 0,
    skipped = 0;

  for (const cafe of cafes) {
    const docRef = db.collection('cafes').doc(cafe.id);
    const existing = await docRef.get();
    if (existing.exists) {
      console.log(`  SKIP ${cafe.id} (already exists)`);
      skipped++;
      continue;
    }

    // Build document
    const doc = {
      ...cafe,
      fuente: 'lorespresso',
      fuentePais: 'ES',
      fuenteUrl: cafe.urlProducto,
      bestPhoto: cafe.officialPhoto,
      imageUrl: cafe.officialPhoto,
      imagenUrl: cafe.officialPhoto,
      foto: cafe.officialPhoto,
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      provisional: false,
      appVisible: true,
      scannerVisible: true,
      adminReviewedAt: now,
      updatedAt: now,
      approvedAt: now,
      createdAt: now,
      fecha: now,
    };

    // Compute SCA score
    const sca = computeSca(cafe);
    doc.sca = sca;

    await docRef.set(doc);
    console.log(`  ✓ ${cafe.id} — ${cafe.nombre} (SCA ${sca.score})`);
    added++;
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped.`);
  process.exit(0);
})();
