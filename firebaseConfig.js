import { initializeApp } from "firebase/app";
// IMPORTANTE: Forzamos la versión Lite aquí también
import { getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24",
  authDomain: "miappdecafe.firebaseapp.com",
  projectId: "miappdecafe",
  storageBucket: "miappdecafe.firebasestorage.app",
  messagingSenderId: "274010206666",
  appId: "1:274010206666:web:d86abc7543e3772f8c9f33"
};

// Inicialización ultra-simple
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);