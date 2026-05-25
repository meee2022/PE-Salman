"use client";

import { useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

export interface Option { id: string; name: string; sub?: string }

export function SearchSelect({ label, value, onSelect, options, placeholder, required, allowCustom, searchPlaceholder }: {
  label: string;
  value: string;
  onSelect: (name: string, id: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;       // يسمح بكتابة اسم غير موجود في القائمة
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").trim();
  const filtered = q ? options.filter((o) => norm(o.name).includes(norm(q))) : options;
  const exactMatch = options.some((o) => norm(o.name) === norm(q));
  const showCustom = allowCustom && q.trim().length > 0 && !exactMatch;

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-[#1C1008] mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</label>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="field flex items-center justify-between text-right">
        <span className={value ? "text-[#1C1008]" : "text-[#B0A298]"}>{value || placeholder || "اختر..."}</span>
        <ChevronDown size={16} className={`text-[#A89A92] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#E7E1D6] rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-[#F1ECE2]">
              <div className="relative">
                <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B0A298]" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder || "ابحث..."}
                  onKeyDown={(e) => { if (e.key === "Enter" && showCustom) { onSelect(q.trim(), ""); setOpen(false); setQ(""); } }}
                  className="w-full pr-8 pl-2 py-2 rounded-lg border border-[#E7E1D6] text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {showCustom && (
                <button type="button" onClick={() => { onSelect(q.trim(), ""); setOpen(false); setQ(""); }}
                  className="w-full text-right px-3.5 py-2 text-sm hover:bg-gold/10 flex items-center gap-2 text-primary font-bold border-b border-[#F1ECE2]">
                  <Check size={14} className="shrink-0" /> استخدام: «{q.trim()}»
                </button>
              )}
              {filtered.length === 0 && !showCustom ? (
                <p className="px-3 py-3 text-xs text-[#A89A92] text-center">لا توجد نتائج</p>
              ) : filtered.slice(0, 100).map((o) => (
                <button key={o.id} type="button"
                  onClick={() => { onSelect(o.name, o.id); setOpen(false); setQ(""); }}
                  className={`w-full text-right px-3.5 py-2 text-sm hover:bg-gold/10 flex items-center justify-between gap-2 ${value === o.name ? "bg-primary/[0.04] font-bold text-primary" : "text-[#2A1418]"}`}>
                  <span className="truncate">{o.name}</span>
                  {o.sub && <span className="text-[10px] text-[#A89A92] shrink-0">{o.sub}</span>}
                  {value === o.name && <Check size={14} className="text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
