"use client";
import { useMemo, useState, useEffect } from "react";

type DayRow = { label: string; a: string; b: string; c: string; d: string };

function parseToMinutes(v: string): number {
  const s = (v ?? "").trim();
  if (!s) return 0;
  if (s.includes(":")) {
    const [hh, mm] = s.split(":").map(Number);
    if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
    return 0;
  }
  const num = Number(s.replace(",", "."));
  if (!Number.isFinite(num)) return 0;
  const hh = Math.trunc(num);
  const mm = Math.round((num - hh) * 60);
  return hh * 60 + mm;
}
function minutesToHM(min: number): string {
  const m = Math.max(min, 0);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, "0")}`;
}

export default function WeeklyTable({
  title,
  storageKey,
}: {
  title: string;
  storageKey: string;
}) {
  const initial: DayRow[] = [
    { label: "Lunedì", a: "", b: "", c: "", d: "" },
    { label: "Martedì", a: "", b: "", c: "", d: "" },
    { label: "Mercoledì", a: "", b: "", c: "", d: "" },
    { label: "Giovedì", a: "", b: "", c: "", d: "" },
    { label: "Venerdì", a: "", b: "", c: "", d: "" },
    { label: "Sabato", a: "", b: "", c: "", d: "" },
    { label: "Domenica", a: "", b: "", c: "", d: "" },
  ];

  // ⬇️ Legge SUBITO da localStorage (solo al primo render sul client)
  const [rows, setRows] = useState<DayRow[]>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as DayRow[];
    } catch {}
    return initial;
  });

  // ⬇️ Salva ogni volta che rows cambia
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {}
  }, [rows, storageKey]);

  const totals = useMemo(
    () =>
      rows.map((r) => {
        const a = parseToMinutes(r.a),
          b = parseToMinutes(r.b),
          c = parseToMinutes(r.c),
          d = parseToMinutes(r.d);
        return Math.max(0, b - a) + Math.max(0, d - c);
      }),
    [rows]
  );
  const grandTotal = totals.reduce((s, t) => s + t, 0);

  const setCell = (i: number, key: "a" | "b" | "c" | "d", value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  return (
    <div className="w-full max-w-lg bg-white text-gray-900 border border-gray-200 rounded-2xl shadow-md overflow-hidden">
      <div className="px-4 py-3 bg-blue-600 text-white font-semibold text-sm uppercase tracking-wide">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-blue-50 text-gray-700">
          <tr className="[&>th]:py-2 [&>th]:px-3">
            <th className="text-left w-32">Giorno</th>
            <th className="text-center">A</th>
            <th className="text-center">B</th>
            <th className="text-center">C</th>
            <th className="text-center">D</th>
            <th className="text-center w-20">Totale</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className={i % 2 ? "bg-gray-50" : "bg-white"}>
              <td className="px-3 py-2 font-medium">{r.label}</td>
              {(["a", "b", "c", "d"] as const).map((k) => (
                <td key={k} className="px-2 py-2">
                  <input
                    className="w-16 text-center px-2 py-1 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={r[k]}
                    onChange={(e) => setCell(i, k, e.target.value)}
                  />
                </td>
              ))}
              <td className="px-2 py-2 text-center font-semibold">
                {minutesToHM(totals[i])}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="px-3 py-2 text-right font-semibold bg-blue-600 text-white">
              Totale
            </td>
            <td className="px-2 py-2 text-center font-bold bg-blue-600 text-white">
              {minutesToHM(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
