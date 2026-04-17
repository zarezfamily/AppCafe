const fetch = require('node-fetch');
const cafes = require('../data/cafes.js');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function uploadCafes() {
  console.log('🔥 Subiendo cafés a Firestore...\n');

  for (const cafe of cafes) {
    const res = await fetch(`${BASE_URL}/cafes?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(cafe).map(([k, v]) => [
            k,
            typeof v === 'number'
              ? { integerValue: String(v) }
              : v === null
                ? { nullValue: null }
                : { stringValue: String(v) },
          ])
        ),
      }),
    });

    if (!res.ok) {
      console.log('❌ Error subiendo:', cafe.nombre);
      continue;
    }

    console.log('✅', cafe.nombre);
  }

  console.log('\n🚀 Seed completado');
}

uploadCafes();
