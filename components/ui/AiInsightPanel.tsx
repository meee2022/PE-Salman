"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, RefreshCw, Printer } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import { Markdown } from "@/components/ui/Markdown";

/* ────────────────────────────────────────────────────────────────────
   لوحة رؤى الذكاء الاصطناعي — زر يطلب تحليلًا/تقريرًا من endpoint معيّن
   ويعرض الناتج بصيغة Markdown مع نسخ وطباعة وإعادة توليد.
   ──────────────────────────────────────────────────────────────────── */
export function AiInsightPanel({
  endpoint,
  title,
  buttonLabel,
  hint,
  resultKey = "report",
}: {
  endpoint: string;
  title: string;
  buttonLabel: string;
  hint?: string;
  resultKey?: "report" | "summary";
}) {
  const { token } = useAuth();
  const year = useActiveYear();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, academicYear: year }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "تعذّر إنشاء التحليل.");
      } else {
        setResult(data?.[resultKey] ?? "");
      }
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function print() {
    if (!result) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:'Cairo','Segoe UI',sans-serif;line-height:1.9;color:#2A1418;max-width:800px;margin:32px auto;padding:0 24px}
        h1,h2,h3{color:#5C1523} table{width:100%;border-collapse:collapse;margin:12px 0}
        th{background:#5C1523;color:#fff;padding:8px;text-align:right} td{border:1px solid #ddd;padding:8px;text-align:right}
        h1{border-bottom:3px solid #C9A96E;padding-bottom:8px}
      </style></head><body>${mdToHtml(result)}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="card-glass rounded-3xl border border-gold/20 overflow-hidden no-print-inner">
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-l from-[#5C1523]/[0.04] to-transparent border-b border-black/[0.05]">
        <div className="flex items-center gap-2.5">
          <span className="icon-orb !w-10 !h-10 bg-gold/15">
            <Sparkles size={19} className="text-gold-dark" />
          </span>
          <div>
            <h3 className="font-extrabold text-primary text-[15px]">{title}</h3>
            {hint && <p className="text-[11px] text-[#7A6A58]">{hint}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 no-print">
          {result && (
            <>
              <button onClick={copy} title="نسخ" className="p-2 rounded-xl text-[#7A6A58] hover:bg-black/[0.04] hover:text-primary transition-colors">
                {copied ? <Check size={17} className="text-emerald-600" /> : <Copy size={17} />}
              </button>
              <button onClick={print} title="طباعة" className="p-2 rounded-xl text-[#7A6A58] hover:bg-black/[0.04] hover:text-primary transition-colors">
                <Printer size={17} />
              </button>
              <button onClick={generate} disabled={loading} title="إعادة التوليد" className="p-2 rounded-xl text-[#7A6A58] hover:bg-black/[0.04] hover:text-primary transition-colors disabled:opacity-40">
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-5">
        {!result && !loading && !error && (
          <div className="text-center py-6">
            <p className="text-sm text-[#7A6A58] mb-4">اضغط لتوليد {title} اعتمادًا على بيانات النظام الحقيقية.</p>
            <button
              onClick={generate}
              disabled={!token}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] text-white text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50"
            >
              <Sparkles size={17} className="text-gold" /> {buttonLabel}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#7A6A58]">
            <Loader2 size={28} className="animate-spin text-gold-dark" />
            <p className="text-sm font-medium">يحلّل البيانات ويصوغ التقرير…</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={generate} className="text-sm font-bold text-primary hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {result && !loading && (
          <div className="ai-result max-h-[640px] overflow-y-auto pl-1">
            <Markdown content={result} />
          </div>
        )}
      </div>
    </div>
  );
}

/* تحويل Markdown مبسّط إلى HTML للطباعة */
function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let tbl: string[] = [];
  const flushTbl = () => {
    if (!tbl.length) return;
    const rows = tbl.filter((r) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(r))
      .map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
    const [h, ...b] = rows;
    html += "<table>";
    if (h) html += "<tr>" + h.map((c) => `<th>${esc(c)}</th>`).join("") + "</tr>";
    b.forEach((r) => { html += "<tr>" + r.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>"; });
    html += "</table>";
    tbl = [];
  };
  for (const raw of lines) {
    const t = raw.trim();
    if (t.startsWith("|")) { tbl.push(t); continue; } else flushTbl();
    const bold = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    if (/^#{1,6}\s/.test(t)) {
      if (inList) { html += "</ul>"; inList = false; }
      const lvl = t.match(/^#+/)![0].length;
      html += `<h${Math.min(lvl, 4)}>${bold(t.replace(/^#+\s/, ""))}</h${Math.min(lvl, 4)}>`;
    } else if (/^[-*]\s/.test(t) || /^\d+[.)]\s/.test(t)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${bold(t.replace(/^[-*]\s/, "").replace(/^\d+[.)]\s/, ""))}</li>`;
    } else if (t === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${bold(t)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  flushTbl();
  return html;
}
