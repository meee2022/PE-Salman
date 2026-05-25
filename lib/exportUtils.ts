// أدوات مشتركة لتصدير البيانات: CSV (Excel) + طباعة/PDF
// تحترم البيانات الممرَّرة كما هي (أي بعد الفلترة)

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number;
  align?: "right" | "center" | "left";
};

// ─── تصدير CSV يفتح في Excel ────────────────────────────────────────
export function exportToCSV<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv =
    "﻿" +
    [
      columns.map((c) => esc(c.header)).join(","),
      ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(",")),
    ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── طباعة / حفظ PDF عبر نافذة مستقلة منسّقة ─────────────────────────
export function printTable<T>(opts: {
  title: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  meta?: { label: string; value: string | number }[];
}) {
  const { title, subtitle, columns, rows, meta } = opts;
  const C = { primary: "#5C1523", primaryLt: "#7A1E30", gold: "#C9A96E", goldDk: "#A8853A", cream: "#FCF9F2", text: "#2A1A18", muted: "#8A7A72", border: "#EADfd6" };

  const headRow = columns
    .map(
      (c) =>
        `<th style="padding:11px 12px;color:#fff;font-weight:800;font-size:11.5px;text-align:${c.align ?? "right"};border:none;white-space:nowrap;letter-spacing:.2px;">${c.header}</th>`
    )
    .join("");

  const bodyRows = rows
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 === 0 ? "#fff" : C.cream};">` +
        columns
          .map(
            (c) => {
              const val = String(c.value(r) ?? "—");
              const isName = c.header === "اسم المعلم" || c.header === "اسم المدرسة";
              return `<td style="padding:8px 12px;font-size:11px;color:${isName ? C.primary : C.text};font-weight:${isName ? 800 : 500};text-align:${c.align ?? "right"};border-bottom:1px solid ${C.border};">${val}</td>`;
            }
          )
          .join("") +
        `</tr>`
    )
    .join("");

  const metaHtml = meta && meta.length
    ? `<div style="display:flex;gap:12px;margin-bottom:20px;">${meta
        .map(
          (m, idx) =>
            `<div style="flex:1;border:1px solid ${C.border};background:${idx === 0 ? "linear-gradient(135deg,#FCF6EC,#F7EFE0)" : C.cream};border-radius:14px;padding:14px 10px;text-align:center;box-shadow:0 1px 3px rgba(92,21,35,.05);">
              <div style="font-size:26px;font-weight:900;color:${C.primary};line-height:1;font-family:Cairo,sans-serif;">${m.value}</div>
              <div style="font-size:11px;color:${C.muted};font-weight:700;margin-top:5px;">${m.label}</div>
            </div>`
        )
        .join("")}</div>`
    : "";

  const today = new Date().toLocaleDateString("ar-QA-u-nu-latn", { dateStyle: "long" });

  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Cairo',Arial,sans-serif;color:${C.text};background:#F4F1EB;direction:rtl;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .sheet{max-width:1140px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(92,21,35,.18);}
  table{border-collapse:collapse;width:100%;}
  thead th{position:sticky;top:0;}
  tbody tr{transition:none;}
  .no-print{position:fixed;top:14px;left:14px;display:flex;gap:8px;z-index:99;}
  @media print{
    .no-print{display:none!important;}
    body{padding:0;background:#fff;}
    .sheet{box-shadow:none;border-radius:0;max-width:100%;}
    thead{display:table-header-group;}
    tr{page-break-inside:avoid;}
    @page{size:A4 landscape;margin:10mm;}
  }
</style></head><body>
  <div class="no-print">
    <button onclick="window.print()" style="background:linear-gradient(135deg,${C.primaryLt},${C.primary});color:#fff;border:none;border-radius:12px;padding:10px 20px;font-family:Cairo,sans-serif;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 14px -4px rgba(92,21,35,.5);">🖨️ طباعة / حفظ PDF</button>
    <button onclick="window.close()" style="background:#fff;color:${C.text};border:1px solid #e5e7eb;border-radius:12px;padding:10px 20px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ إغلاق</button>
  </div>

  <div class="sheet">
    <!-- ترويسة فاخرة -->
    <div style="position:relative;background:linear-gradient(135deg,${C.primary},#3B0A14);padding:22px 28px;overflow:hidden;">
      <div style="position:absolute;left:-30px;top:-30px;width:160px;height:160px;border-radius:50%;background:rgba(201,169,110,.12);"></div>
      <div style="position:relative;display:flex;align-items:center;gap:16px;">
        <div style="width:58px;height:58px;border-radius:16px;background:rgba(255,255,255,.1);border:1px solid rgba(201,169,110,.4);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🏃</div>
        <div style="flex:1;">
          <p style="font-size:10.5px;color:rgba(255,255,255,.7);font-weight:600;">وزارة التربية والتعليم والتعليم العالي — دولة قطر</p>
          <p style="font-size:11.5px;color:${C.gold};font-weight:700;margin-top:1px;">إدارة التوجيه التربوي — قسم التربية البدنية</p>
          <h1 style="font-size:20px;font-weight:900;color:#fff;margin-top:5px;">${title}</h1>
        </div>
        <div style="text-align:left;flex-shrink:0;">
          <div style="font-size:10px;color:rgba(255,255,255,.6);">تاريخ الإصدار</div>
          <div style="font-size:11.5px;color:#fff;font-weight:700;margin-top:2px;">${today}</div>
        </div>
      </div>
      ${subtitle ? `<div style="position:relative;margin-top:14px;display:inline-block;background:rgba(201,169,110,.18);border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:5px 16px;font-size:12px;color:#fff;font-weight:700;">${subtitle}</div>` : ""}
    </div>

    <div style="padding:22px 26px;">
      ${metaHtml}
      <div style="border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
        <table>
          <thead><tr style="background:linear-gradient(135deg,${C.primary},${C.primaryLt});">${headRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid ${C.border};">
        <p style="font-size:10px;color:${C.muted};font-weight:600;">قسم التربية البدنية — إدارة التوجيه التربوي</p>
        <p style="font-size:10px;color:${C.muted};font-weight:700;">إجمالي السجلات: ${rows.length}</p>
      </div>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},650);};</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("الرجاء السماح بالنوافذ المنبثقة للطباعة");
    return;
  }
  w.document.write(html);
  w.document.close();
}

// ─── طباعة الخطة الإجرائية (مجمّعة: مجال ← هدف ← إجراءات) ────────────
export type OpPlanRow = {
  domain: string; domainOrder: number;
  objective: string; objectiveOrder: number;
  action: string; endDate: string; responsible: string; outputs: string; kpi: string;
};

export function printOperationalPlan(opts: { year: string; rows: OpPlanRow[] }) {
  const { year, rows } = opts;
  const C = { primary: "#5C1523", primaryLt: "#7A1E30", gold: "#C9A96E", goldDk: "#A8853A", cream: "#FCF9F2", text: "#2A1A18", muted: "#8A7A72", border: "#EADfd6" };
  const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");

  // جمّع حسب المجال ثم الهدف
  const domains = Array.from(new Set(rows.slice().sort((a, b) => a.domainOrder - b.domainOrder).map(r => r.domain)));

  let sections = "";
  for (const dom of domains) {
    const domRows = rows.filter(r => r.domain === dom);
    const objectives = Array.from(new Set(domRows.sort((a, b) => a.objectiveOrder - b.objectiveOrder).map(r => r.objective)));

    let objBlocks = "";
    for (const obj of objectives) {
      const acts = domRows.filter(r => r.objective === obj);
      const bodyRows = acts.map((a, i) => `
        <tr style="background:${i % 2 === 0 ? "#fff" : C.cream};">
          <td style="padding:8px 10px;font-size:10.5px;border-bottom:1px solid ${C.border};text-align:right;font-weight:600;color:${C.text};">${esc(a.action)}</td>
          <td style="padding:8px 8px;font-size:10px;border-bottom:1px solid ${C.border};text-align:center;color:${C.goldDk};font-weight:700;white-space:nowrap;">${esc(a.endDate) || "—"}</td>
          <td style="padding:8px 8px;font-size:10px;border-bottom:1px solid ${C.border};text-align:center;color:${C.primary};font-weight:700;">${esc(a.responsible) || "—"}</td>
          <td style="padding:8px 10px;font-size:10px;border-bottom:1px solid ${C.border};text-align:right;color:${C.text};">${esc(a.outputs) || "—"}</td>
          <td style="padding:8px 10px;font-size:10px;border-bottom:1px solid ${C.border};text-align:right;color:${C.text};">${esc(a.kpi) || "—"}</td>
        </tr>`).join("");

      objBlocks += `
        <div style="margin-bottom:14px;border:1px solid ${C.border};border-radius:12px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:${C.cream};border-right:4px solid ${C.gold};padding:9px 14px;font-size:12px;font-weight:800;color:${C.primary};">
            🎯 الهدف: ${esc(obj)}
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:linear-gradient(135deg,${C.primary},${C.primaryLt});">
                <th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:800;text-align:right;width:30%;">الإجراءات</th>
                <th style="padding:9px 8px;color:#fff;font-size:11px;font-weight:800;text-align:center;width:11%;">تاريخ الانتهاء</th>
                <th style="padding:9px 8px;color:#fff;font-size:11px;font-weight:800;text-align:center;width:14%;">المنفذ/المسؤول</th>
                <th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:800;text-align:right;width:22%;">المخرجات المتوقَّعة</th>
                <th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:800;text-align:right;width:23%;">مؤشر الأداء والقيم المستهدفة</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>`;
    }

    sections += `
      <div style="margin-top:20px;page-break-inside:avoid;">
        <div style="background:linear-gradient(135deg,${C.primary},#3B0A14);border-radius:12px;padding:11px 18px;margin-bottom:12px;">
          <span style="color:${C.gold};font-size:14px;font-weight:900;">${esc(dom)}</span>
        </div>
        ${objBlocks}
      </div>`;
  }

  const today = new Date().toLocaleDateString("ar-QA-u-nu-latn", { dateStyle: "long" });
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>الخطة الإجرائية ${year}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Cairo',Arial,sans-serif;color:${C.text};background:#F4F1EB;direction:rtl;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .sheet{max-width:1180px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(92,21,35,.18);}
  .no-print{position:fixed;top:14px;left:14px;display:flex;gap:8px;z-index:99;}
  @media print{.no-print{display:none!important;}body{padding:0;background:#fff;}.sheet{box-shadow:none;border-radius:0;max-width:100%;}@page{size:A4 landscape;margin:9mm;}}
</style></head><body>
  <div class="no-print">
    <button onclick="window.print()" style="background:linear-gradient(135deg,${C.primaryLt},${C.primary});color:#fff;border:none;border-radius:12px;padding:10px 20px;font-family:Cairo,sans-serif;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 14px -4px rgba(92,21,35,.5);">🖨️ طباعة / حفظ PDF</button>
    <button onclick="window.close()" style="background:#fff;color:${C.text};border:1px solid #e5e7eb;border-radius:12px;padding:10px 20px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ إغلاق</button>
  </div>
  <div class="sheet">
    <div style="position:relative;background:linear-gradient(135deg,${C.primary},#3B0A14);padding:22px 28px;overflow:hidden;">
      <div style="position:absolute;left:-30px;top:-30px;width:160px;height:160px;border-radius:50%;background:rgba(201,169,110,.12);"></div>
      <div style="position:relative;display:flex;align-items:center;gap:16px;">
        <div style="width:58px;height:58px;border-radius:16px;background:rgba(255,255,255,.1);border:1px solid rgba(201,169,110,.4);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🏃</div>
        <div style="flex:1;">
          <p style="font-size:10.5px;color:rgba(255,255,255,.7);font-weight:600;">وزارة التربية والتعليم والتعليم العالي — دولة قطر</p>
          <p style="font-size:11.5px;color:${C.gold};font-weight:700;margin-top:1px;">إدارة التوجيه التربوي — قسم التربية البدنية</p>
          <h1 style="font-size:20px;font-weight:900;color:#fff;margin-top:5px;">الخطة الإجرائية العامة لقسم التربية البدنية</h1>
        </div>
        <div style="text-align:left;flex-shrink:0;">
          <div style="font-size:10px;color:rgba(255,255,255,.6);">العام الأكاديمي</div>
          <div style="font-size:13px;color:#fff;font-weight:800;margin-top:2px;">${year}</div>
        </div>
      </div>
    </div>
    <div style="padding:20px 26px;">
      ${sections}
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid ${C.border};">
        <p style="font-size:10px;color:${C.muted};font-weight:600;">قسم التربية البدنية — إدارة التوجيه التربوي · طُبع في ${today}</p>
        <p style="font-size:10px;color:${C.muted};font-weight:700;">إجمالي الإجراءات: ${rows.length}</p>
      </div>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},700);};</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("الرجاء السماح بالنوافذ المنبثقة للطباعة"); return; }
  w.document.write(html);
  w.document.close();
}
