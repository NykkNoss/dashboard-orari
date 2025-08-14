"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// Legge l'email autorizzata dalle env (mettila in .env.local e su Vercel)
const ALLOWED_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL?.toLowerCase();

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [denied, setDenied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setDenied(false);
        router.replace("/");
        return;
      }

      const email = u.email?.toLowerCase();
      if (!email || email !== ALLOWED_EMAIL) {
        // Utente non autorizzato → sloggalo e mostra messaggio
        await signOut(auth);
        setUser(null);
        setDenied(true);
        return;
      }

      setDenied(false);
      setUser(u);
    });

    return () => unsub();
  }, [router]);

  // Stato di caricamento
  if (user === undefined && !denied) {
    return <div style={{ padding: 16 }}>Caricamento…</div>;
  }

  // Accesso negato
  if (denied) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h2>Accesso negato</h2>
        <p>Questo account non è autorizzato a visualizzare la dashboard.</p>
      </div>
    );
  }

  // Se non c'è utente, il redirect avviene già nell'useEffect
  if (!user) {
    return null;
  }

  // Utente autorizzato → mostra barra utente + children
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderBottom: "1px solid #eee",
        }}
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            width={32}
            height={32}
            style={{ borderRadius: 999 }}
            alt=""
          />
        ) : null}

        <div style={{ flex: 1 }}>
          {user?.displayName ?? user?.email}
        </div>

        <button
          onClick={() => {
            const auth = getFirebaseAuth();
            if (auth) signOut(auth);
          }}
          style={{
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Esci
        </button>
      </div>

      {children}
    </div>
  );
}
