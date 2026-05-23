"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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

  if (user === undefined && !denied) {
    return <div style={{ padding: 16 }}>Caricamento…</div>;
  }

  if (denied) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h2>Accesso negato</h2>
        <p>Questo account non è autorizzato a visualizzare la dashboard.</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderBottom: "1px solid #eee"
        }}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            width={32}
            height={32}
            style={{ borderRadius: 999 }}
            alt=""
          />
        ) : null}

        <div style={{ flex: 1 }}>{user.displayName ?? user.email}</div>

        <button
          onClick={() => {
            const auth = getFirebaseAuth();
            if (auth) signOut(auth);
          }}
          style={{
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Esci
        </button>
      </div>

      {children}
    </div>
  );
}
