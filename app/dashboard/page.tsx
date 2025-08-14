"use client";
export const dynamic = "force-dynamic";

import RequireAuth from "@/components/RequireAuth";
import WeeklyTable from "@/components/WeeklyTable";
import { useEffect, useState } from "react";

type DayRow = { label: string; a: string; b: string; c: string; d: string };

const emptyWeek = (): DayRow[] => ([
  { label: "Lunedì", a: "", b: "", c: "", d: "" },
  { label: "Martedì", a: "", b: "", c: "", d: "" },
  { label: "Mercoledì", a: "", b: "", c: "", d: "" },
  { label: "Giovedì", a: "", b: "", c: "", d: "" },
  { label: "Venerdì", a: "", b: "", c: "", d: "" },
  { label: "Sabato", a: "", b: "", c: "", d: "" },
  { label: "Domenica", a: "", b: "", c: "", d: "" },
]);

export default function DashboardPage() {
  const [note, setNote] = useState("");
  const [refresh, setRefresh] = useState(0); // per rimontare le tabelle

  // Note: load + save su localStorage
  useEffect(() => {
    const raw = localStorage.getItem("dashboard_notes");
    if (raw) setNote(raw);
  }, []);
  useEffect(() => {
    localStorage.setItem("dashboard_notes", note);
  }, [note]);

  function switchWeeks() {
    const nextRaw = localStorage.getItem("week_next");
    const next = nextRaw ? nextRaw : JSON.stringify(emptyWeek());
    localStorage.setItem("week_current", next);                     // copia
    localStorage.setItem("week_next", JSON.stringify(emptyWeek())); // svuota
    setRefresh((r) => r + 1); // forza ricarica tabelle
  }

  function clearNotes() {
    setNote("");
    localStorage.setItem("dashboard_notes", "");
  }

  // stile condiviso per i bottoni “corti ma alti uguali”
  const btnClass =
    "block w-[190px] px-4 py-3 rounded-2xl border border-gray-300 shadow-sm " +
    "bg-white/90 backdrop-blur hover:bg-white text-lg font-semibold text-gray-900 text-center";

  return (
    <RequireAuth>
      {/* Wrapper con sfondo + overlay */}
      <div
        className="min-h-dvh bg-cover bg-center relative"
        style={{ backgroundImage: "url('/home-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/20" />

        {/* Contenuto dashboard */}
        <main className="relative z-10 p-4 grid gap-6 lg:grid-cols-[520px_1fr]">
          {/* Colonna sinistra: tabelle */}
          <div className="grid gap-6">
            <WeeklyTable
              key={`current-${refresh}`}
              title="Settimana corrente"
              storageKey="week_current"
            />
            <WeeklyTable
              key={`next-${refresh}`}
              title="Prossima settimana"
              storageKey="week_next"
            />
          </div>

          {/* Colonna destra: due colonne -> sinistra bottoni (stretti), destra Note (grande) */}
          <div className="grid gap-4 lg:grid-cols-[340px_1fr] items-start">
            {/* Colonna bottoni */}
            <div className="grid gap-3 content-start">
              {/* Timbrature (invariato, solo larghezza ridotta) */}
              <a
                href="https://docs.google.com/spreadsheets/d/1Pbe4YP4eRCt-B9W2yHJ2lwHnv-eDjDGWw9oDlV6ESCQ/edit?gid=6862706#gid=6862706"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Timbrature
              </a>

              {/* Email */}
              <a
                href="https://outlook.live.com/mail/0/"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Email
              </a>

              {/* Zucchetti */}
              <a
                href="https://saas.hrzucchetti.it/hrpitalianex/jsp/login.jsp"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Zucchetti
              </a>

              {/* Help Desk */}
              <a
                href="https://helpdesk.iegexpo.it/Login.jsp?navLanguage=it-IT"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Help Desk
              </a>

              {/* Edenred */}
              <a
                href="https://beneficiari.edenred.it/mfe-nup-welfare/welfare-home"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Edenred
              </a>

              {/* Google Drive */}
              <a
                href="https://drive.google.com/drive/folders/1YRvmEwthcitEryaAmJVTI6If0RyYUSnm?hl=it"
                target="_blank"
                rel="noreferrer"
                className={btnClass}
              >
                Google Drive
              </a>

              {/* Switch Settimana (invariato, stesso stile bottoni) */}
              <button
                onClick={switchWeeks}
                className={btnClass}
                title="Copia 'Prossima settimana' in 'Settimana corrente' e svuota 'Prossima settimana'"
              >
                Switch Settimana
              </button>
            </div>

            {/* Colonna Note (a destra, stessa dimensione “grande”) */}
            <div className="bg-white/90 backdrop-blur text-gray-900 border border-gray-200 rounded-2xl overflow-hidden shadow-md">
              <div className="px-3 py-2 bg-gray-100/90 font-semibold flex justify-between items-center">
                <span>Note:</span>
                <button
                  onClick={clearNotes}
                  className="px-2 py-1 text-sm border border-gray-400 rounded hover:bg-gray-200"
                >
                  Pulisci
                </button>
              </div>
              <textarea
                className="w-full h-[520px] p-3 outline-none bg-transparent"
                placeholder="Scrivi qui…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
