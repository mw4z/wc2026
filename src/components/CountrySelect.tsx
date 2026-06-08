"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, type Country } from "@/lib/countries";

export function isoToFlag(iso: string): string {
  return [...iso.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = COUNTRIES.find((c) => c.iso === value) ?? COUNTRIES[0]!;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.calling.includes(term.replace(/\D/g, "")) ||
        c.iso.toLowerCase().includes(term),
    );
  }, [q]);

  function pick(c: Country) {
    onChange(c.iso);
    setOpen(false);
    setQ("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between gap-2 text-right"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{isoToFlag(selected.iso)}</span>
          <span>{selected.name}</span>
          <span className="text-slate-400" dir="ltr">+{selected.calling}</span>
        </span>
        <span className="text-slate-500">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-white/15 bg-navy-800 shadow-card">
          <div className="sticky top-0 bg-navy-800 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن الدولة..."
              className="input"
            />
          </div>
          {filtered.map((c) => (
            <button
              key={c.iso}
              type="button"
              onClick={() => pick(c)}
              className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm hover:bg-white/10"
            >
              <span className="text-lg">{isoToFlag(c.iso)}</span>
              <span className="flex-1">{c.name}</span>
              <span className="text-slate-400" dir="ltr">+{c.calling}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="p-3 text-center text-sm text-slate-500">لا توجد نتائج</p>
          )}
        </div>
      )}
    </div>
  );
}
