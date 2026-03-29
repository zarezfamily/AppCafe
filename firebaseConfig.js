import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tu configuración de Firebase (Extraída de tu repositorio)
const firebaseConfig = {
  apiKey: "AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24",
  authDomain: "miappdecafe.firebaseapp.com",
  projectId: "miappdecafe",
  storageBucket: "miappdecafe.firebasestorage.app",
  messagingSenderId: "274010206666",
  appId: "1:274010206666:web:d86abc7543e3772f8c9f33"
};

// Lógica de inicialización: 
// Si la App ya está iniciada en memoria, la reutiliza. Si no, la crea.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Exportamos la base de datos (Firestore) para usarla en App.js
const db = getFirestore(app);

export { db };
