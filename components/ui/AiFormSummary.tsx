"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Markdown } from "@/components/ui/Markdown";

/* ────────────────────────────────────────────────────────────────────
   تلخيص استمارة بالذكاء الاصطناعي — زر مدمج في صفحة الاستمارة يولّد
   ملخصًا ونقاط قوة/تطوير وتوصية اعتمادًا على بيانات الاستمارة المُعبّأة.
   ──────────────────────────────────────────────────────────────────── */
export function AiFormSummary({
  formType,
  formData,
}: {
  formType: string;
  formData: unknown;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!token) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-summarize-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, formType, formData }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error ?? "تعذّر التلخيص.");
      else setSummary(data?.summary ?? "");
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="no-print rounded-2xl border border-gold/20 bg-gradient-to-l from-gold/[0.05] to-transparent overflow-hidden">
      <button
        onClick={() => (summary ? setOpen((v) => !v) : generate())}
        disabled={loading}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-black/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="icon-orb !w-9 !h-9 bg-gold/15">
            {loading ? <Loader2 size={17} className="animate-spin text-gold-dark" /> : <Sparkles size={17} className="text-gold-dark" />}
          </span>
          <span className="text-sm font-bold text-primary">
            {summary ? "ملخّص الذكاء الاصطناعي" : "لخّص هذه الاستمارة بالذكاء الاصطناعي"}
          </span>
        </span>
        {summary && <ChevronDown size={18} className={`text-[#7A6A58] transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="flex items-center gap-2 text-[#7A6A58] py-3">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">يحلّل بيانات الاستمارة…</span>
            </div>
          )}
          {error && <p className="text-sm text-red-600 py-2">{error}</p>}
          {summary && !loading && (
            <div className="bg-white rounded-xl border border-black/[0.05] p-4">
              <Markdown content={summary} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
