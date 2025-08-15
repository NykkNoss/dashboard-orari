"use client";
export const dynamic = "force-dynamic";

import RequireAuth from "@/components/RequireAuth";
import WeeklyTable from "@/components/WeeklyTable";
import { useDashboardSync } from "@/hooks/useDashboardSync"; // hook creato per Firestore sync
import { useEffect, useState } from "react";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type DayRow = { label: string; a: string; b: string; c: string; d: string };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  // Prendo UID utente autenticato
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Hook di sync con Firestore (lasciamo gestire NOTE e refresh)
  const {
    notes,
    setNotes,
    // switchWeeks: NON lo usiamo dall'hook, lo implementiamo qui per usare i key correnti
    refreshBump, // per forzare il rerender di WeeklyTable (comunque facciamo anche un reload event)
  } = useDashboardSync(user?.uid ?? null);

  // --- SWITCH SETTIMANA: copia week_next -> week_current e svuota week_next
  const switchWeeks = async () => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!auth || !db) {
      alert("Firestore/Auth non inizializzati.");
      return;
    }
    const u = auth.currentUser;
    if (!u) {
      alert("Devi essere loggato per usare lo switch.");
      return;
    }

    try {
      const uid = u.uid;
      const currKey = "week_current";
      const nextKey = "week_next";

      const nextRef = doc(db, "users", uid, "private", nextKey);
      const currRef = doc(db, "users", uid, "private", currKey);

      const snap = await getDoc(nextRef);
      const emptyWeek: DayRow[] = [
        { label: "Lunedì", a: "", b: "", c: "", d: "" },
        { label: "Martedì", a: "", b: "", c: "", d: "" },
        { label: "Mercoledì", a: "", b: "", c: "", d: "" },
        { label: "Giovedì", a: "", b: "", c: "", d: "" },
        { label: "Venerdì", a: "", b: "", c: "", d: "" },
        { label: "Sabato", a: "", b: "", c: "", d: "" },
        { label: "Domenica", a: "", b: "", c: "", d: "" },
      ];

      const nextData: DayRow[] =
        snap.exists() && Array.isArray(snap.data().data)
          ? (snap.data().data as DayRow[])
          : emptyWeek;

      await Promise.all([
        setDoc(
          currRef,
          { data: nextData, updatedAt: serverTimestamp() },
          { merge: true }
        ),
        setDoc(
          nextRef,
          { data: emptyWeek, updatedAt: serverTimestamp() },
          { merge: true }
        ),
      ]);

      // Aggiorna cache locale
      try {
        localStorage.setItem(currKey, JSON.stringify(nextData));
        localStorage.setItem(nextKey, JSON.stringify(emptyWeek));
      } catch {}

      // Forza il reload delle due tabelle (WeeklyTable ascolta questo evento)
      const emit = (docId: string) =>
        window.dispatchEvent(
          new CustomEvent("weeklytable:reload", { detail: { docId } })
        );
      emit(currKey);
      emit(nextKey);
    } catch (e) {
      console.error("Switch settimane fallito:", e);
      alert("Switch fallito. Controlla connessione, login e regole Firestore.");
    }
  };

  const btnClass =
    "block w-[190px] px-4 py-3 rounded-2xl border border-gray-300 shadow-sm " +
    "bg-white/90 backdrop-blur hover:bg-white text-lg font-semibold text-gray-900 text-center";

  return (
    <RequireAuth>
      <div
        className="min-h-dvh bg-cover bg-center relative"
        style={{ backgroundImage: "url('/home-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/20" />

        <main className="relative z-10 p-4 grid gap-6 lg:grid-cols-[520px_1fr]">
          {/* Colonna sinistra: tabelle */}
          <div className="grid gap-6">
            <WeeklyTable
              key={`current-${refreshBump}`}
              title="Settimana corrente"
              storageKey="week_current"
            />
            <WeeklyTable
              key={`next-${refreshBump}`}
              title="Prossima settimana"
              storageKey="week_next"
            />
          </div>

          {/* Colonna destra */}
          <div className="grid gap-4 lg:grid-cols-[340px_1fr] items-start">
            {/* Bottoni */}
            <div className="grid gap-3 content-start">
              <a
                href="https://docs.google.com/spreadsheets/d/1Pbe4YP4eRCt-B9W2yHJ2lwHnv-eDjDGWw9oDlV6ESCQ/edit?gid=6862706#gid=6862706"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Timbrature
              </a>
              <a
                href="https://outlook.live.com/mail/0/"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Email
              </a>
              <a
                href="https://saas.hrzucchetti.it/hrpitalianex/jsp/login.jsp"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Zucchetti
              </a>
              <a
                href="https://helpdesk.iegexpo.it/Login.jsp?navLanguage=it-IT"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Help Desk
              </a>
              <a
                href="https://beneficiari.edenred.it/mfe-nup-welfare/welfare-home"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Edenred
              </a>
              <a
                href="https://drive.google.com/drive/folders/1YRvmEwthcitEryaAmJVTI6If0RyYUSnm?hl=it"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Google Drive
              </a>
              <button
                onClick={switchWeeks}
                className={btnClass}
                title="Copia 'Prossima settimana' in 'Settimana corrente' e svuota 'Prossima settimana'"
              >
                Switch Settimana
              </button>
            </div>

            {/* Note */}
            <div className="bg-white/90 backdrop-blur text-gray-900 border border-gray-200 rounded-2xl overflow-hidden shadow-md">
              <div className="px-3 py-2 bg-gray-100/90 font-semibold flex justify-between items-center">
                <span>Note:</span>
                <button
                  onClick={() => setNotes("")}
                  className="px-2 py-1 text-sm border border-gray-400 rounded hover:bg-gray-200"
                >
                  Pulisci
                </button>
              </div>
              <textarea
                className="w-full h-[520px] p-3 outline-none bg-transparent"
                placeholder="Scrivi qui…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
