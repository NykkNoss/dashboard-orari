// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

let app;
if (!getApps().length) {
  app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  });
} else {
  app = getApp();
}

export function getFirebaseAuth() {
  try { return getAuth(app); } catch { return null; }
}

let _db: ReturnType<typeof getFirestore> | null = null;
export function getFirestoreDb() {
  if (_db) return _db;
  try {
    const db = getFirestore(app);
    // Abilita cache offline (ignora errori per tab multiple)
    enableIndexedDbPersistence(db).catch(() => {});
    _db = db;
    return db;
  } catch {
    return null;
  }
}
