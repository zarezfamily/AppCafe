import * as FirebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";

// Las credenciales se cargan desde el fichero .env (nunca subas .env a GitHub)
// Crea un fichero .env en la raíz con estas variables:
//
// EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
// EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
// EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto
// EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
// EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
// EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const db = getFirestore(FirebaseApp.initializeApp(firebaseConfig));
