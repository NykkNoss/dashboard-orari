"use client";
export const dynamic = "force-dynamic";

import RequireAuth from "@/components/RequireAuth";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

type ShiftRow = {
  date: string;
  home: boolean;
  startA: string;
  endA: string;
  startB: string;
  endB: string;
};

type DashboardSyncDoc = {
  activeWeek?: string;
  weeks?: Record<string, ShiftRow[]>;
  outputText?: string;
};

const LEGACY_STORAGE_KEY = "shift_writer_rows";
const ACTIVE_WEEK_STORAGE_KEY = "shift_writer_active_week";
const WEEKS_STORAGE_KEY = "shift_writer_weeks";
const OUTPUT_STORAGE_KEY = "shift_writer_output";
const FIRESTORE_DOC_ID = "shift_writer";
const DAYS = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
const QUICK_LINKS = [
  {
    label: "Timbrature",
    href: "https://docs.google.com/spreadsheets/d/1Pbe4YP4eRCt-B9W2yHJ2lwHnv-eDjDGWw9oDlV6ESCQ/edit?gid=6862706#gid=6862706"
  },
  { label: "Email", href: "https://outlook.live.com/mail/0/" },
  { label: "Zucchetti", href: "https://saas.hrzucchetti.it/hrpitalianex/jsp/login.jsp" },
  { label: "Help Desk", href: "https://helpdesk.iegexpo.it/Login.jsp?navLanguage=it-IT" },
  { label: "Edenred", href: "https://beneficiari.edenred.it/mfe-nup-welfare/welfare-home" },
  {
    label: "Google Drive",
    href: "https://drive.google.com/drive/folders/1YRvmEwthcitEryaAmJVTI6If0RyYUSnm?hl=it"
  }
];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, amount: number) {
  const date = parseDateInput(value);
  date.setDate(date.getDate() + amount);
  return toDateInputValue(date);
}

function getNextMonday() {
  const date = new Date();
  const day = date.getDay();
  const distance = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + distance);
  return toDateInputValue(date);
}

function createWeek(startDate = getNextMonday()): ShiftRow[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: addDays(startDate, index),
    home: false,
    startA: "",
    endA: "",
    startB: "",
    endB: ""
  }));
}

function formatTime(value: string) {
  const clean = value.trim().replace(",", ".").replace(":", ".");
  if (!clean) return "";

  const [hour, minute] = clean.split(".");
  const hourNumber = Number(hour);
  if (!Number.isFinite(hourNumber)) return clean;
  if (!minute || Number(minute) === 0) return String(hourNumber);
  return `${hourNumber}.${minute.padStart(2, "0")}`;
}

function formatShift(row: ShiftRow) {
  const date = parseDateInput(row.date);
  const prefix = `${date.getDate()} ${DAYS[date.getDay()]}`;

  if (row.home) return `${prefix} casa`;

  const slots = [
    row.startA && row.endA ? `${formatTime(row.startA)}-${formatTime(row.endA)}` : "",
    row.startB && row.endB ? `${formatTime(row.startB)}-${formatTime(row.endB)}` : ""
  ].filter(Boolean);

  return slots.length ? `${prefix} ${slots.join(" ")}` : "";
}

function parseTimeToMinutes(value: string) {
  const clean = value.trim().replace(",", ".").replace(":", ".");
  if (!clean) return null;

  const [hour, minute = "0"] = clean.split(".");
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute.padEnd(2, "0").slice(0, 2));

  if (!Number.isFinite(hourNumber) || !Number.isFinite(minuteNumber)) return null;
  if (hourNumber < 0 || minuteNumber < 0 || minuteNumber > 59) return null;

  return hourNumber * 60 + minuteNumber;
}

function shiftMinutes(start: string, end: string) {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return 0;
  return Math.max(0, endMinutes - startMinutes);
}

function rowMinutes(row: ShiftRow) {
  if (row.home) return 0;
  return shiftMinutes(row.startA, row.endA) + shiftMinutes(row.startB, row.endB);
}

function formatTotalMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!remainingMinutes) return `${hours} ore`;
  return `${hours} ore e ${remainingMinutes} min`;
}

function loadInitialRows() {
  return loadWeekRows(loadInitialWeekStart());
}

function loadInitialWeekStart() {
  if (typeof window === "undefined") return getNextMonday();

  try {
    return localStorage.getItem(ACTIVE_WEEK_STORAGE_KEY) || getNextMonday();
  } catch {}

  return getNextMonday();
}

function loadWeeksArchive() {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(WEEKS_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Record<string, ShiftRow[]>;
  } catch {}

  return {};
}

function loadWeekRows(weekStart: string) {
  if (typeof window === "undefined") return createWeek(weekStart);

  const archive = loadWeeksArchive();
  const archivedRows = archive[weekStart];
  if (Array.isArray(archivedRows) && archivedRows.length > 0) return archivedRows;

  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const rows = JSON.parse(legacy) as ShiftRow[];
      if (Array.isArray(rows) && rows[0]?.date === weekStart) return rows;
    }
  } catch {}

  return createWeek(weekStart);
}

function makeOutput(rows: ShiftRow[]) {
  return rows.map(formatShift).filter(Boolean).join("\n");
}

function loadInitialOutput() {
  if (typeof window === "undefined") return "";

  try {
    const stored = localStorage.getItem(OUTPUT_STORAGE_KEY);
    if (stored !== null) return stored;
  } catch {}

  return "";
}

function saveLocalState(weekStart: string, rows: ShiftRow[], outputText: string) {
  const archive = loadWeeksArchive();
  archive[weekStart] = rows;
  localStorage.setItem(ACTIVE_WEEK_STORAGE_KEY, weekStart);
  localStorage.setItem(WEEKS_STORAGE_KEY, JSON.stringify(archive));
  localStorage.setItem(OUTPUT_STORAGE_KEY, outputText);
  return archive;
}

function applySyncedData(data: DashboardSyncDoc) {
  const nextWeekStart = data.activeWeek || getNextMonday();
  const nextArchive = data.weeks || {};
  const nextRows = nextArchive[nextWeekStart] || createWeek(nextWeekStart);
  const nextOutput = data.outputText || "";

  localStorage.setItem(ACTIVE_WEEK_STORAGE_KEY, nextWeekStart);
  localStorage.setItem(WEEKS_STORAGE_KEY, JSON.stringify(nextArchive));
  localStorage.setItem(OUTPUT_STORAGE_KEY, nextOutput);

  return { nextWeekStart, nextRows, nextOutput };
}

export default function DashboardPage() {
  const [weekStart, setWeekStart] = useState(loadInitialWeekStart);
  const [rows, setRows] = useState<ShiftRow[]>(loadInitialRows);
  const [outputText, setOutputText] = useState(loadInitialOutput);
  const [copied, setCopied] = useState(false);
  const uidRef = useRef<string | null>(null);
  const remoteReadyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef({ weekStart, rows, outputText });
  const weeklyTotalMinutes = rows.reduce((total, row) => total + rowMinutes(row), 0);

  latestStateRef.current = { weekStart, rows, outputText };

  useEffect(() => {
    try {
      const archive = saveLocalState(weekStart, rows, outputText);
      const uid = uidRef.current;
      const db = getFirestoreDb();
      if (!uid || !db || !remoteReadyRef.current) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setDoc(
          doc(db, "users", uid, "private", FIRESTORE_DOC_ID),
          {
            activeWeek: weekStart,
            weeks: archive,
            outputText,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        ).catch((error) => console.error("Salvataggio turni fallito:", error));
      }, 500);
    } catch {}
  }, [rows, outputText, weekStart]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!auth || !db) return;

    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = undefined;
      }

      uidRef.current = user?.uid ?? null;
      remoteReadyRef.current = false;

      if (!user) return;

      const ref = doc(db, "users", user.uid, "private", FIRESTORE_DOC_ID);
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        const { nextWeekStart, nextRows, nextOutput } = applySyncedData(
          snapshot.data() as DashboardSyncDoc
        );
        setWeekStart(nextWeekStart);
        setRows(nextRows);
        setOutputText(nextOutput);
      } else {
        const current = latestStateRef.current;
        const archive = saveLocalState(current.weekStart, current.rows, current.outputText);
        await setDoc(
          ref,
          {
            activeWeek: current.weekStart,
            weeks: archive,
            outputText: current.outputText,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }

      remoteReadyRef.current = true;

      unsubscribeSnapshot = onSnapshot(ref, (remoteSnapshot) => {
        if (!remoteSnapshot.exists()) return;
        const { nextWeekStart, nextRows, nextOutput } = applySyncedData(
          remoteSnapshot.data() as DashboardSyncDoc
        );
        setWeekStart(nextWeekStart);
        setRows(nextRows);
        setOutputText(nextOutput);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateRow = <K extends keyof ShiftRow>(index: number, key: K, value: ShiftRow[K]) => {
    setCopied(false);
    setRows((current) => {
      const nextRows = current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
              ...(key === "home" && value ? { startA: "", endA: "", startB: "", endB: "" } : {})
            }
          : row
      );
      return nextRows;
    });
  };

  const openWeek = (date: string) => {
    setCopied(false);
    setWeekStart(date);
    setRows(loadWeekRows(date));
  };

  const clearTimes = () => {
    setCopied(false);
    const nextRows = rows.map((row) => ({
      ...row,
      home: false,
      startA: "",
      endA: "",
      startB: "",
      endB: ""
    }));
    setRows(nextRows);
  };

  const printWeek = () => {
    const weekText = makeOutput(rows);
    if (!weekText) return;

    setCopied(false);
    setOutputText((current) => {
      const trimmedCurrent = current.trimEnd();
      return trimmedCurrent ? `${trimmedCurrent}\n${weekText}` : weekText;
    });
  };

  const copyOutput = async () => {
    if (!outputText.trim()) return;

    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <RequireAuth>
      <main className="min-h-dvh bg-[#f6f2ea] text-[#1f2933]">
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-[#d7cfc0] bg-white shadow-sm">
            <div className="grid gap-3 border-b border-[#e5ded2] px-4 py-3 xl:flex xl:items-center xl:justify-between">
              <div>
                <h1 className="text-xl font-bold">Dashboard Orari</h1>
                <p className="text-sm text-[#667085]">Compila la settimana e copia il testo pronto.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <label className="col-span-2 text-sm font-medium text-[#475467] sm:col-span-1" htmlFor="week-start">
                  Inizio
                </label>
                <input
                  id="week-start"
                  type="date"
                  value={weekStart}
                  onChange={(event) => openWeek(event.target.value)}
                  className="col-span-2 h-10 rounded-md border border-[#c9c1b4] bg-white px-3 text-sm sm:col-span-1"
                />
                <button
                  type="button"
                  onClick={printWeek}
                  className="h-10 rounded-md bg-[#2364aa] px-3 text-sm font-semibold text-white hover:bg-[#1f5b99]"
                >
                  Stampa settimana
                </button>
                <button
                  type="button"
                  onClick={clearTimes}
                  className="h-10 rounded-md border border-[#c9c1b4] bg-white px-3 text-sm font-semibold hover:bg-[#f8f4ed]"
                >
                  Svuota
                </button>
              </div>
            </div>

            <div className="text-sm">
              <div className="hidden grid-cols-[minmax(118px,1.5fr)_80px_repeat(4,minmax(58px,1fr))] gap-3 bg-[#f8f4ed] px-4 py-3 font-semibold text-[#475467] md:grid">
                <div>Giorno</div>
                <div>Casa</div>
                <div>Entrata</div>
                <div>Uscita</div>
                <div>Entrata</div>
                <div>Uscita</div>
              </div>

              {rows.map((row, index) => {
                const date = parseDateInput(row.date);
                const dayLabel = `${date.getDate()} ${DAYS[date.getDay()]}`;

                return (
                  <div
                    key={row.date}
                    className="grid grid-cols-2 items-end gap-3 border-t border-[#eee7dc] px-4 py-4 md:grid-cols-[minmax(118px,1.5fr)_80px_repeat(4,minmax(58px,1fr))] md:items-center md:py-3"
                  >
                    <div className="col-span-2 md:col-span-1">
                      <div className="font-semibold">{dayLabel}</div>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(event) => updateRow(index, "date", event.target.value)}
                        className="mt-1 h-9 w-full rounded-md border border-[#d7cfc0] px-2 text-sm text-[#667085]"
                      />
                    </div>
                    <label className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7cfc0] px-3 font-medium">
                      <input
                        type="checkbox"
                        checked={row.home}
                        onChange={(event) => updateRow(index, "home", event.target.checked)}
                        className="h-4 w-4 accent-[#2364aa]"
                      />
                      casa
                    </label>
                    {(["startA", "endA", "startB", "endB"] as const).map((key, fieldIndex) => (
                      <label key={key} className="grid gap-1">
                        <span className="text-xs font-semibold text-[#667085] md:hidden">
                          {fieldIndex % 2 === 0 ? "Entrata" : "Uscita"}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="--"
                          value={row[key]}
                          disabled={row.home}
                          onChange={(event) => updateRow(index, key, event.target.value)}
                          className="h-10 w-full min-w-0 rounded-md border border-[#d7cfc0] bg-white px-2 disabled:bg-[#f2eee7] disabled:text-[#98a2b3]"
                        />
                      </label>
                    ))}
                  </div>
                );
              })}

              <div className="flex items-center justify-between border-t border-[#d7cfc0] bg-[#f8f4ed] px-4 py-4">
                <span className="font-bold">Totale settimana</span>
                <span className="rounded-md bg-white px-4 py-2 font-bold text-[#2364aa] shadow-sm">
                  {formatTotalMinutes(weeklyTotalMinutes)}
                </span>
              </div>
            </div>
          </section>

          <div className="grid gap-5">
            <aside className="rounded-lg border border-[#d7cfc0] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e5ded2] px-4 py-3">
                <h2 className="font-bold">Testo pronto</h2>
                <button
                  type="button"
                  onClick={copyOutput}
                  disabled={!outputText.trim()}
                  className="h-10 rounded-md bg-[#2364aa] px-4 text-sm font-semibold text-white hover:bg-[#1f5b99] disabled:cursor-not-allowed disabled:bg-[#a7b4c4]"
                >
                  {copied ? "Copiato" : "Copia"}
                </button>
              </div>
              <textarea
                value={outputText}
                placeholder=""
                onChange={(event) => {
                  setCopied(false);
                  setOutputText(event.target.value);
                }}
                className="min-h-[260px] w-full resize-none bg-[#fbfaf7] p-4 font-mono text-sm leading-6 outline-none lg:min-h-[430px]"
              />
            </aside>

            <section className="rounded-lg border border-[#d7cfc0] bg-white shadow-sm">
              <div className="border-b border-[#e5ded2] px-4 py-3">
                <h2 className="font-bold">Collegamenti</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-2">
                {QUICK_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#c9c1b4] bg-white px-3 py-3 text-center text-sm font-semibold hover:bg-[#f8f4ed]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
