"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { exportElementToPdf } from "@/lib/exportPdf";

// زر تصدير PDF مطابق للشاشة بالضبط (يصوّر الاستمارة كما هي بلا إعادة ترتيب الطباعة)
export function PdfButton({
  target = "[data-pdf-root]",
  filename = "استمارة",
  label = "تصدير PDF",
}: {
  target?: string;
  filename?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    const el = document.querySelector(target) as HTMLElement | null;
    if (!el) { alert("تعذّر العثور على الاستمارة للتصدير"); return; }
    setBusy(true);
    try {
      // اسم الملف من عنوان الاستمارة إن وُجد
      const title = el.querySelector("h1")?.textContent?.trim();
      await exportElementToPdf(el, (title || filename).slice(0, 80));
    } catch (e) {
      console.error("PDF export error:", e);
      alert("تعذّر إنشاء ملف PDF — حاول مجددًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={run} disabled={busy} className="btn-ghost no-print" title="تصدير نسخة مطابقة للتصميم الأصلي">
      {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
      {busy ? "جارٍ التصدير..." : label}
    </button>
  );
}
