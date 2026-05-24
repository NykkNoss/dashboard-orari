"use client";
export const dynamic = "force-dynamic";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  async function handleLogin() {
    const auth = getFirebaseAuth();
    if (!auth) {
      console.error("Firebase Auth non disponibile (SSR o init non completato)");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err) {
      console.error("Errore login Google:", err);
      alert("Login non riuscito. Riprova.");
    }
  }

  return (
    <main
      className="min-h-dvh relative flex items-center justify-center"
      style={{
        backgroundImage: "url('/home-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-[min(92vw,520px)] rounded-lg border border-white/50 bg-white/95 p-6 text-center text-gray-900 shadow-xl backdrop-blur">
        <h1 className="mb-2 text-2xl font-bold">Dashboard Orari</h1>
        <p className="text-sm text-gray-600 mb-5 text-center">
          Accedi e prepara il testo dei tuoi turni da copiare.
        </p>

        <button
          onClick={handleLogin}
          className="w-full rounded-md border border-gray-300 bg-white py-3 font-semibold hover:bg-gray-50"
        >
          Accedi
        </button>
      </div>
    </main>
  );
}
