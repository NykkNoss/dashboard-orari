// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// Config da ENV (tutte devono essere settate su .env.local e su Vercel)
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

/**
 * Ritorna l'istanza di FirebaseApp SOLO lato client.
 * In SSR/prerender (build su Vercel) ritorna null per evitare errori.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  return getApps().length ? getApp() : initializeApp(config);
}

/**
 * Ritorna l'Auth SOLO lato client. In SSR torna null.
 */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

// Compat: se preferisci importare direttamente { app, auth }
export const app = getFirebaseApp();
export const auth = app ? getAuth(app) : null;
