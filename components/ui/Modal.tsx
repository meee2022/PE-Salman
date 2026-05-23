"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";

export function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-[#2A1418]/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-hidden max-h-[90vh] overflow-y-auto`}
        style={{ position: "relative", zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] overflow-hidden">
          <div className="pattern-arabesque absolute inset-0 opacity-50" />
          <button onClick={onClose} className="absolute left-4 top-4 text-white/60 hover:text-white"><X size={18} /></button>
          <h3 className="relative font-extrabold text-white">{title}</h3>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ModalFooter({ onClose, onSave, saving, saveLabel = "حفظ", disabled }: {
  onClose: () => void; onSave: () => void; saving?: boolean; saveLabel?: string; disabled?: boolean;
}) {
  return (
    <div className="px-6 pb-5 flex gap-3 justify-end">
      <button onClick={onClose} className="btn-ghost">إلغاء</button>
      <button onClick={onSave} disabled={saving || disabled} className="btn-primary">
        {saving ? "جارٍ الحفظ..." : <><Check size={15} /> {saveLabel}</>}
      </button>
    </div>
  );
}

export function TxtField({ label, value, onChange, placeholder, ltr, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; ltr?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1C1008] mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field" placeholder={placeholder} dir={ltr ? "ltr" : undefined} />
    </div>
  );
}

export function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1C1008] mb-1.5">{label}</label>
      <input type="number" min={0} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)} className="field" dir="ltr" />
    </div>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1C1008] mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="field">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };
  const node = toast ? (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in" style={{ zIndex: 9999 }}>
      <Check size={16} /> {toast}
    </div>
  ) : null;
  return { show, node };
}
