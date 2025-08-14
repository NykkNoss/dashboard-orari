"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    // ascolta lo stato auth; se non loggato, manda alla home
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  // loading
  if (user === undefined) {
    return <div style={{ padding: 16 }}>Caricamento…</div>;
  }

  // se qui c'è user, mostriamo barra utente + children
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid #eee" }}>
        {user?.photoURL ? (
          <img src={user.photoURL} width={32} height={32} style={{ borderRadius: 999 }} alt="" />
        ) : null}
        <div style={{ flex: 1 }}>{user?.displayName ?? user?.email}</div>
        <button
          onClick={() => signOut(auth)}
          style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}
        >
          Esci
        </button>
      </div>
      {children}
    </div>
  );
}
