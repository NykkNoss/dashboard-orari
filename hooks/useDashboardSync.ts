"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  doc, getDoc, onSnapshot, setDoc, updateDoc,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

export type DayRow = { label: string; a: string; b: string; c: string; d: string };
export const emptyWeek = (): DayRow[] => ([
  { label: "Lunedì", a: "", b: "", c: "", d: "" },
  { label: "Martedì", a: "", b: "", c: "", d: "" },
  { label: "Mercoledì", a: "", b: "", c: "", d: "" },
  { label: "Giovedì", a: "", b: "", c: "", d: "" },
  { label: "Venerdì", a: "", b: "", c: "", d: "" },
  { label: "Sabato", a: "", b: "", c: "", d: "" },
  { label: "Domenica", a: "", b: "", c: "", d: "" },
]);

type DashboardDoc = {
  notes: string;
  week_current: DayRow[];
  week_next: DayRow[];
  // puoi aggiungere altre cose qui in futuro
};

function writeLocal(all: DashboardDoc) {
  localStorage.setItem("dashboard_notes", all.notes ?? "");
  localStorage.setItem("week_current", JSON.stringify(all.week_current ?? emptyWeek()));
  localStorage.setItem("week_next", JSON.stringify(all.week_next ?? emptyWeek()));
}

export function useDashboardSync(uid: string | null) {
  const db = getFirestoreDb();
  const [loading, setLoading] = useState(true);
  const [refreshBump, setRefreshBump] = useState(0); // per forzare ricarico WeeklyTable
  const latest = useRef<DashboardDoc | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // carica + subscribe realtime
  useEffect(() => {
    if (!db || !uid) return;
    setLoading(true);

    const ref = doc(db, "users", uid, "private", "dashboard");
    (async () => {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as DashboardDoc;
        latest.current = {
          notes: data.notes ?? "",
          week_current: data.week_current ?? emptyWeek(),
          week_next: data.week_next ?? emptyWeek(),
        };
        writeLocal(latest.current);
      } else {
        // inizializza documento
        latest.current = {
          notes: localStorage.getItem("dashboard_notes") ?? "",
          week_current: JSON.parse(localStorage.getItem("week_current") || "null") ?? emptyWeek(),
          week_next: JSON.parse(localStorage.getItem("week_next") || "null") ?? emptyWeek(),
        };
        await setDoc(ref, latest.current);
      }
      setLoading(false);
      setRefreshBump(x => x + 1);
    })();

    // realtime updates da Firestore (altri device)
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as DashboardDoc;
      const merged: DashboardDoc = {
        notes: data.notes ?? "",
        week_current: data.week_current ?? emptyWeek(),
        week_next: data.week_next ?? emptyWeek(),
      };
      latest.current = merged;
      writeLocal(merged);
      setRefreshBump(x => x + 1);
    });

    return () => unsub();
  }, [db, uid]);

  // update helpers (debounced)
  const scheduleSave = useCallback((docRef: any, next: Partial<DashboardDoc>) => {
    if (!db || !uid) return;
    // merge locale
    latest.current = { ...(latest.current as DashboardDoc), ...next };
    // mirror su localStorage
    writeLocal(latest.current!);
    setRefreshBump(x => x + 1);
    // debounce scrittura cloud
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await updateDoc(doc(db, "users", uid, "private", "dashboard"), next as any); }
      catch {
        // se update fallisce su doc nuovo, prova setDoc merge
        await setDoc(doc(db, "users", uid, "private", "dashboard"), next, { merge: true });
      }
    }, 400);
  }, [db, uid]);

  const setNotes = useCallback((val: string) => {
    const cur = latest.current ?? { notes: "", week_current: emptyWeek(), week_next: emptyWeek() };
    scheduleSave(null, { notes: val });
  }, [scheduleSave]);

  const setWeekCurrent = useCallback((arr: DayRow[]) => {
    scheduleSave(null, { week_current: arr });
  }, [scheduleSave]);

  const setWeekNext = useCallback((arr: DayRow[]) => {
    scheduleSave(null, { week_next: arr });
  }, [scheduleSave]);

  const switchWeeks = useCallback(() => {
    const cur = latest.current ?? { notes: "", week_current: emptyWeek(), week_next: emptyWeek() };
    scheduleSave(null, { week_current: cur.week_next, week_next: emptyWeek() });
  }, [scheduleSave]);

  return {
    loading,
    refreshBump,     // aumenta quando arrivano update → usalo come key alle tabelle
    notes: latest.current?.notes ?? "",
    setNotes,
    setWeekCurrent,
    setWeekNext,
    switchWeeks,
  };
}
