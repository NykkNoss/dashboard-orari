"use client";

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

          {/* Colonna destra: pulsanti sopra, Note sotto */}
          <div className="grid items-start gap-4">
            <div className="w-full lg:w-1/2 max-w-[720px] grid gap-3">
              {/* Timbrature */}
              <a
                href="https://docs.google.com/spreadsheets/d/1Pbe4YP4eRCt-B9W2yHJ2lwHnv-eDjDGWw9oDlV6ESCQ/edit?gid=6862706#gid=6862706"
                target="_blank"
                rel="noreferrer"
                className="block w-full px-4 py-3 rounded-2xl border border-gray-300 shadow-sm bg-white/90 backdrop-blur hover:bg-white text-lg font-semibold text-gray-900 text-center"
              >
                Timbrature
              </a>

              {/* Switch Settimana (stesso stile) */}
              <button
                onClick={switchWeeks}
                className="block w-full px-4 py-3 rounded-2xl border border-gray-300 shadow-sm bg-white/90 backdrop-blur hover:bg-white text-lg font-semibold text-gray-900 text-center"
                title="Copia 'Prossima settimana' in 'Settimana corrente' e svuota 'Prossima settimana'"
              >
                Switch Settimana
              </button>

              {/* Note con bottone 'Pulisci' nell'intestazione */}
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
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
