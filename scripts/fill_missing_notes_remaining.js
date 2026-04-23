require('dotenv').config();
// Script para rellenar las notas de los cafés que aún no tienen, usando OpenAI
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const OpenAI = require('openai');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateNotes(cafe) {
  const prompt = `Genera una breve nota de cata para un café con estas características:\nNombre: ${cafe.nombre}\nOrigen: ${cafe.pais || ''}\nTostador: ${cafe.roaster || ''}\nFormato: ${cafe.formato || ''}\nDescripción: ${cafe.descripcion || ''}\nNotas:`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 40,
    temperature: 0.7,
  });
  return completion.choices[0].message.content.trim();
}

async function fillNotes() {
  const snapshot = await db.collection('cafes').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const cafe = doc.data();
    if (cafe.notas === null || cafe.notas === undefined || cafe.notas === '') {
      try {
        const notas = await generateNotes(cafe);
        await doc.ref.update({ notas });
        console.log(`Actualizado: ${cafe.nombre} -> ${notas}`);
        count++;
      } catch (e) {
        console.error(`Error con ${cafe.nombre}:`, e.message);
      }
    }
  }
  console.log(`Notas rellenadas en ${count} cafés.`);
  process.exit(0);
}

fillNotes().catch((e) => {
  console.error(e);
  process.exit(1);
});
