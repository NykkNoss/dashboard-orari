"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  async function handleLogin() {
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
        backgroundPosition: "center",
      }}
    >
      {/* overlay per contrasto */}
      <div className="absolute inset-0 bg-black/40" />

      {/* card centrale */}
      <div className="relative z-10 w-[min(92vw,520px)] bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-white/50 p-6 text-gray-900">
        <h1 className="text-2xl font-bold mb-2">Benvenuto Nico</h1>
        <p className="text-sm text-gray-600 mb-5">
          Accedi per entrare nella tua dashboard.
        </p>

        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
        >
          Accedi
        </button>
      </div>
    </main>
  );
}
