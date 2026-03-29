import * as FirebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24",
  authDomain: "miappdecafe.firebaseapp.com",
  projectId: "miappdecafe",
  shadowProjectId: "miappdecafe", // Añadimos esto por si Hermes busca 'S' de Settings/Shadow
  storageBucket: "miappdecafe.firebasestorage.app",
  messagingSenderId: "274010206666",
  appId: "1:274010206666:web:d86abc7543e3772f8c9f33"
};

// Inicialización directa sin constantes intermedias que Hermes pueda renombrar
export const db = getFirestore(FirebaseApp.initializeApp(firebaseConfig));