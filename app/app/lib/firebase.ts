// Inicialización de Firebase para el cliente (navegador)
import { initializeApp, getApps, getApp } from "firebase/app";

import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Solo inicializa si no hay apps
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export { app };

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Habilitar persistencia offline para Firestore
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }).catch((err) => {
    if (err.code === "failed-precondition") {
      console.log("[Firebase] Múltiples pestañas abiertas, persistencia no disponible");
    } else if (err.code === "unimplemented") {
      console.log("[Firebase] El navegador no soporta IndexedDB");
    } else {
      console.error("[Firebase] Error al habilitar persistencia:", err);
    }
  });
}
