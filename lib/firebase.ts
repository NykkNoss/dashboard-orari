// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Log non sensibili per capire se le ENV arrivano nel client
function sanityLog() {
  if (typeof window === "undefined") return; // log solo client
  const missing = Object.entries(config)
    .filter(([_, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.error(
      "[Firebase ENV] Mancano variabili:",
      missing.join(", "),
      "| apiKey.length=" + (config.apiKey ? String(config.apiKey).length : 0)
    );
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  sanityLog();
  if (!config.apiKey) return null; // evita errori se ENV assenti
  return getApps().length ? getApp() : initializeApp(config);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export const app = getFirebaseApp();
export const auth = app ? getAuth(app) : null;
