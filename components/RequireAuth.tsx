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
    return <div className="p-4 text-sm text-slate-700">Caricamento...</div>;
  }

  if (denied) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f6f2ea] p-8 text-center text-[#1f2933]">
        <div className="rounded-lg border border-[#d7cfc0] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Accesso negato</h2>
          <p className="mt-2 text-sm text-[#667085]">
            Questo account non e autorizzato a visualizzare la dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-[#e5ded2] bg-white px-4 py-3 text-sm text-[#1f2933]">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} width={32} height={32} className="rounded-full" alt="" />
        ) : null}

        <div className="min-w-0 flex-1 truncate">{user.displayName ?? user.email}</div>

        <button
          type="button"
          onClick={() => {
            const auth = getFirebaseAuth();
            if (auth) signOut(auth);
          }}
          className="h-9 rounded-md border border-[#c9c1b4] bg-white px-3 font-semibold hover:bg-[#f8f4ed]"
        >
          Esci
        </button>
      </div>

      {children}
    </div>
  );
}
