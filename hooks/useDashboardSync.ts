"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

export type DayRow = { label: string; a: string; b: string; c: string; d: string };

export const emptyWeek = (): DayRow[] => [
  { label: "Lunedì", a: "", b: "", c: "", d: "" },
  { label: "Martedì", a: "", b: "", c: "", d: "" },
  { label: "Mercoledì", a: "", b: "", c: "", d: "" },
  { label: "Giovedì", a: "", b: "", c: "", d: "" },
  { label: "Venerdì", a: "", b: "", c: "", d: "" },
  { label: "Sabato", a: "", b: "", c: "", d: "" },
  { label: "Domenica", a: "", b: "", c: "", d: "" }
];

type DashboardDoc = {
  notes: string;
  week_current: DayRow[];
  week_next: DayRow[];
};

function readStoredWeek(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? emptyWeek();
  } catch {
    return emptyWeek();
  }
}

function writeLocal(all: DashboardDoc) {
  localStorage.setItem("dashboard_notes", all.notes ?? "");
  localStorage.setItem("week_current", JSON.stringify(all.week_current ?? emptyWeek()));
  localStorage.setItem("week_next", JSON.stringify(all.week_next ?? emptyWeek()));
}

export function useDashboardSync(uid: string | null) {
  const db = getFirestoreDb();
  const [loading, setLoading] = useState(true);
  const [refreshBump, setRefreshBump] = useState(0);
  const latest = useRef<DashboardDoc | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

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
          week_next: data.week_next ?? emptyWeek()
        };
        writeLocal(latest.current);
      } else {
        latest.current = {
          notes: localStorage.getItem("dashboard_notes") ?? "",
          week_current: readStoredWeek("week_current"),
          week_next: readStoredWeek("week_next")
        };
        await setDoc(ref, latest.current);
      }
      setLoading(false);
      setRefreshBump((value) => value + 1);
    })();

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as DashboardDoc;
      const merged: DashboardDoc = {
        notes: data.notes ?? "",
        week_current: data.week_current ?? emptyWeek(),
        week_next: data.week_next ?? emptyWeek()
      };
      latest.current = merged;
      writeLocal(merged);
      setRefreshBump((value) => value + 1);
    });

    return () => unsub();
  }, [db, uid]);

  const scheduleSave = useCallback(
    (next: Partial<DashboardDoc>) => {
      if (!db || !uid) return;

      latest.current = { ...(latest.current as DashboardDoc), ...next };
      writeLocal(latest.current);
      setRefreshBump((value) => value + 1);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await updateDoc(doc(db, "users", uid, "private", "dashboard"), next);
        } catch {
          await setDoc(doc(db, "users", uid, "private", "dashboard"), next, { merge: true });
        }
      }, 400);
    },
    [db, uid]
  );

  const setNotes = useCallback((val: string) => {
    scheduleSave({ notes: val });
  }, [scheduleSave]);

  const setWeekCurrent = useCallback((arr: DayRow[]) => {
    scheduleSave({ week_current: arr });
  }, [scheduleSave]);

  const setWeekNext = useCallback((arr: DayRow[]) => {
    scheduleSave({ week_next: arr });
  }, [scheduleSave]);

  const switchWeeks = useCallback(() => {
    const cur = latest.current ?? { notes: "", week_current: emptyWeek(), week_next: emptyWeek() };
    scheduleSave({ week_current: cur.week_next, week_next: emptyWeek() });
  }, [scheduleSave]);

  return {
    loading,
    refreshBump,
    notes: latest.current?.notes ?? "",
    setNotes,
    setWeekCurrent,
    setWeekNext,
    switchWeeks
  };
}
