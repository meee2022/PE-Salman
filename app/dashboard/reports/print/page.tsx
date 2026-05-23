"use client";

/**
 * صفحة الطباعة / تصدير PDF الاحترافي
 * ────────────────────────────────────
 * تُفتح من زر "طباعة PDF" في صفحة التقارير
 * تعرض تقريراً منسقاً كاملاً جاهزاً للطباعة
 * يمكن حفظه PDF من خلال "Print → Save as PDF"
 */

import { useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import Link from "next/link";

/* ── كود الخط العربي ───────────────────────────────────────────── */
const FONT_URL = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap";

/* ── ألوان النظام ───────────────────────────────────────────────── */
const C = {
  primary: "#5C1523",
  gold:    "#C9A96E",
  goldDk:  "#A8853A",
  cream:   "#FCF9F2",
  text:    "#1C0E0E",
  muted:   "#7A6A58",
  border:  "#E8DDD5",
  green:   "#059669",
  orange:  "#EA580C",
  blue:    "#0284C7",
};

const CODE_GROUPS = [
  { key: ["VS","CL"],      label: "زيارات ميدانية",  color: C.green },
  { key: ["OF"],           label: "أعمال مكتبية",    color: C.primary },
  { key: ["TR","MT","OL"], label: "تطوير مهني",       color: C.blue },
  { key: ["AC","SP","VP"], label: "أنشطة متنوعة",    color: C.goldDk },
  { key: ["LV","SL","WP"], label: "إجازات وأذونات",  color: C.orange },
  { key: ["AB"],           label: "غياب",             color: "#EF4444" },
];

/* ════════════════════════════════════════════════════════════════ */
export default function PrintReportPage() {
  const { token } = useAuth();
  const YEAR      = useActiveYear();

  const coverage  = useQuery(api.coverage.listByYear,  token ? { academicYear: YEAR, token } : "skip");
  const summaries = useQuery(api.activity.summaries,   token ? { academicYear: YEAR, token } : "skip");
  const org       = useQuery(api.settings.org,         token ? { token } : "skip");

  const today = new Date().toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  });

  /* ── حساب الإحصاءات ────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!coverage || !summaries) return null;

    const sumMap = new Map(summaries.map(s => [s.supervisorId, s]));

    const ranked = [...coverage]
      .sort((a, b) => b.coverageRate - a.coverageRate)
      .map((r) => {
        const act    = sumMap.get(r.supervisorId);
        const visits = (act?.VS ?? 0) + (act?.CL ?? 0) + (act?.VP ?? 0);
        const office = act?.OF ?? 0;
        const develop = (act?.TR ?? 0) + (act?.MT ?? 0) + (act?.OL ?? 0);
        const total  = Object.values(act ?? {}).reduce((s: number, v) =>
          typeof v === "number" ? s + v : s, 0) - (act?.supervisorId ? 0 : 0);
        const actTotal = visits + office + develop +
          (act?.AC ?? 0) + (act?.SP ?? 0) +
          (act?.LV ?? 0) + (act?.SL ?? 0) + (act?.WP ?? 0) + (act?.AB ?? 0);
        return { ...r, visits, office, develop, actTotal };
      });

    const totalSupervisors = ranked.length;
    const totalSchools     = ranked.reduce((s, r) => s + r.schoolsRequired, 0);
    const totalCovered     = ranked.reduce((s, r) => s + r.schoolsCovered, 0);
    const totalForms       = ranked.reduce((s, r) => s + r.formsCount, 0);
    const totalVisits      = ranked.reduce((s, r) => s + r.visits, 0);
    const avgCoverage      = totalSupervisors
      ? Math.round(ranked.reduce((s, r) => s + r.coverageRate, 0) / totalSupervisors)
      : 0;
    const fullCount = ranked.filter(r => r.coverageRate >= 100).length;

    const actGroups = CODE_GROUPS.map(g => ({
      ...g,
      count: summaries.reduce((s, r) => s + g.key.reduce((ss, k) => ss + ((r as any)[k] ?? 0), 0), 0),
    }));
    const grandTotal = actGroups.reduce((s, g) => s + g.count, 0);

    return {
      ranked, totalSupervisors, totalSchools, totalCovered,
      totalForms, totalVisits, avgCoverage, fullCount,
      actGroups, grandTotal,
    };
  }, [coverage, summaries]);

  const isLoading = !coverage || !summaries || !stats;

  /* ── طباعة تلقائية اختيارية بعد التحميل ──────────────────── */
  // نترك المستخدم يقرر متى يطبع بنفسه

  /* ════════════════════════════════════════════════════════════ */
  if (isLoading) {
    return (
      <div style={styles.loadWrap}>
        <div style={styles.spinner} />
        <p style={{ color: C.muted, fontSize: 14, marginTop: 16, fontFamily: "Cairo, sans-serif" }}>
          جارٍ تحضير التقرير…
        </p>
      </div>
    );
  }

  const { ranked, actGroups, grandTotal } = stats;
  const head    = org?.["org.headName"];
  const manager = org?.["org.managerName"];
  const ministry = org?.["org.ministry"] ?? "وزارة التربية والتعليم";
  const dept     = org?.["org.department"] ?? "إدارة التوجيه التربوي";
  const section  = org?.["org.section"] ?? "قسم التربية البدنية";

  return (
    <>
      {/* حقن الخط عبر style tag */}
      <style>{`
        @import url('${FONT_URL}');
        @keyframes spin { to { transform: rotate(360deg); } }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Cairo', 'Arial', sans-serif; background: #f5f0eb; }

        .report-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          padding: 16mm 14mm;
          direction: rtl;
          color: ${C.text};
          font-family: 'Cairo', 'Arial', sans-serif;
        }

        /* ── الطباعة ─────────────────────────────── */
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .report-page { width: 100%; margin: 0; padding: 10mm 12mm; box-shadow: none; }
          .page-break { page-break-before: always; }
        }

        @media screen {
          .report-page { box-shadow: 0 4px 40px rgba(0,0,0,0.12); }
        }

        /* ── جدول التقرير ────────────────────────── */
        .rtable { width: 100%; border-collapse: collapse; font-size: 10pt; }
        .rtable th {
          background: ${C.primary};
          color: #fff;
          padding: 6px 10px;
          font-weight: 700;
          text-align: right;
          font-size: 9.5pt;
        }
        .rtable td {
          padding: 5px 10px;
          border-bottom: 1px solid ${C.border};
          font-size: 9.5pt;
          vertical-align: middle;
        }
        .rtable tr:nth-child(even) td { background: #FAF7F3; }
        .rtable tr:last-child td { border-bottom: none; }

        /* شريط تقدم مصغّر */
        .pbar { height: 6px; border-radius: 3px; background: #ede8e0; overflow: hidden; }
        .pbar-fill { height: 100%; border-radius: 3px; }
      `}</style>

      {/* ── شريط التحكم — يختفي عند الطباعة ──────────────────── */}
      <div className="no-print" style={styles.toolbar}>
        <Link href="/dashboard/reports" style={styles.btnBack}>
          ← العودة للتقارير
        </Link>
        <button onClick={() => window.print()} style={styles.btnPrint}>
          🖨 طباعة / حفظ PDF
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── ورقة التقرير ─────────────────────────────────────── */}
      <div className="report-page">

        {/* ①  الترويسة الرسمية */}
        <div style={styles.header}>
          <div>
            <p style={{ fontWeight: 900, fontSize: 13, color: C.primary }}>{ministry}</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{dept}</p>
            <p style={{ fontSize: 11, color: C.muted }}>{section}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            {/* شعار / عنوان التقرير */}
            <div style={styles.seal}>
              <span style={{ fontSize: 22 }}>🏆</span>
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 11, color: C.muted }}>التاريخ: {today}</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>العام: {YEAR}</p>
          </div>
        </div>

        {/* خط فاصل ذهبي */}
        <div style={{ height: 2, background: `linear-gradient(to left, ${C.gold}, ${C.primary})`, margin: "10px 0 14px", borderRadius: 2 }} />

        {/* عنوان التقرير */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 17, fontWeight: 900, color: C.primary }}>
            تقرير الأداء الشامل للموجهين التربويين
          </h1>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            العام الدراسي {YEAR} — {section}
          </p>
        </div>

        {/* ②  بطاقات KPI */}
        <div style={styles.kpiGrid}>
          <KpiBox label="إجمالي الموجهين"   value={stats.totalSupervisors} color={C.primary} />
          <KpiBox label="مدارس مغطّاة"      value={`${stats.totalCovered} / ${stats.totalSchools}`} color={C.goldDk} />
          <KpiBox label="متوسط التغطية"     value={`${stats.avgCoverage}%`} color={stats.avgCoverage >= 80 ? C.green : C.orange} />
          <KpiBox label="تغطية كاملة 100%"  value={stats.fullCount} color={C.green} />
          <KpiBox label="إجمالي الزيارات"   value={stats.totalVisits} color={C.blue} />
          <KpiBox label="إجمالي الاستمارات" value={stats.totalForms} color={C.primary} />
        </div>

        {/* ③  ملخص أكواد النشاط */}
        <SectionTitle text="ملخص توزيع أيام النشاط الإجمالي" />
        <div style={styles.actGrid}>
          {actGroups.map(g => (
            <div key={g.label} style={{ ...styles.actCard, borderTop: `3px solid ${g.color}` }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: g.color }}>{g.count}</p>
              <p style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{g.label}</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: C.text, marginTop: 1 }}>
                {grandTotal > 0 ? Math.round((g.count / grandTotal) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>

        {/* شريط نسبي للنشاط */}
        <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", margin: "8px 0 18px", gap: 1 }}>
          {actGroups.filter(g => g.count > 0).map(g => (
            <div
              key={g.label}
              style={{
                flex: g.count,
                background: g.color,
                transition: "flex 1s",
              }}
              title={`${g.label}: ${g.count}`}
            />
          ))}
        </div>

        {/* ④  جدول ترتيب الموجهين */}
        <SectionTitle text="الترتيب الكامل لأداء الموجهين التربويين" />

        <table className="rtable">
          <thead>
            <tr>
              <th style={{ width: 30, textAlign: "center" }}>#</th>
              <th>الموجه التربوي</th>
              <th style={{ textAlign: "center" }}>المدارس</th>
              <th style={{ textAlign: "center" }}>الاستمارات</th>
              <th style={{ textAlign: "center" }}>الزيارات</th>
              <th style={{ width: 110 }}>نسبة التغطية</th>
              <th style={{ textAlign: "center" }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => {
              const pct = Math.round(row.coverageRate);
              const barColor =
                pct >= 100 ? C.green :
                pct >= 80  ? C.primary :
                             C.orange;
              const statusLabel =
                pct >= 100 ? "مكتمل" :
                pct >= 80  ? "قريب" :
                pct >= 50  ? "متقدم" :
                             "يحتاج متابعة";
              const statusColor =
                pct >= 100 ? C.green :
                pct >= 80  ? C.blue :
                pct >= 50  ? C.goldDk :
                             C.orange;

              return (
                <tr key={row._id}>
                  <td style={{ textAlign: "center", fontWeight: 800 }}>
                    {i + 1 === 1 ? "🥇" : i + 1 === 2 ? "🥈" : i + 1 === 3 ? "🥉" : i + 1}
                  </td>
                  <td>
                    <p style={{ fontWeight: 700, fontSize: 10 }}>{row.supervisor?.name ?? "—"}</p>
                    <p style={{ fontSize: 9, color: C.muted }}>{row.supervisor?.jobTitle ?? "موجه تربوي"}</p>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>
                    {row.schoolsCovered} / {row.schoolsRequired}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: C.goldDk }}>
                    {row.formsCount}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: C.blue }}>
                    {row.visits}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="pbar" style={{ flex: 1 }}>
                        <div className="pbar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: barColor, minWidth: 36, textAlign: "right" }}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 9,
                      fontWeight: 700,
                      background: `${statusColor}18`,
                      color: statusColor,
                      border: `1px solid ${statusColor}30`,
                    }}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ⑤  التوقيعات */}
        {(head || manager) && (
          <>
            <div style={{ height: 1, background: C.border, margin: "28px 0 20px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 40 }}>
              {head && (
                <SignatureBox title="رئيس قسم التوجيه التربوي" name={head} />
              )}
              {manager && (
                <SignatureBox title="مدير إدارة التوجيه التربوي" name={manager} />
              )}
            </div>
          </>
        )}

        {/* تذييل */}
        <div style={{ marginTop: 24, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
          <p style={{ fontSize: 8, color: C.muted }}>
            تم إنشاء هذا التقرير تلقائياً من نظام إدارة التوجيه التربوي
          </p>
          <p style={{ fontSize: 8, color: C.muted }}>{today}</p>
        </div>

      </div>
      {/* نهاية ورقة التقرير */}

    </>
  );
}

/* ════ مكوّنات مساعدة ════════════════════════════════════════════ */

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ margin: "16px 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: C.primary, flexShrink: 0 }} />
      <h2 style={{ fontSize: 12, fontWeight: 800, color: C.primary }}>{text}</h2>
    </div>
  );
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      border: `1.5px solid ${color}30`,
      borderTop: `3px solid ${color}`,
      borderRadius: 10,
      padding: "10px 14px",
      background: `${color}06`,
    }}>
      <p style={{ fontSize: 18, fontWeight: 900, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      <p style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{label}</p>
    </div>
  );
}

function SignatureBox({ title, name }: { title: string; name: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <p style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{title}</p>
      <div style={{ height: 1, background: C.border, margin: "20px 0 8px" }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{name}</p>
    </div>
  );
}

/* ── Inline Styles ────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  loadWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: "60vh",
  },
  spinner: {
    width: 40, height: 40, borderRadius: "50%",
    border: "3px solid #E8DDD5",
    borderTopColor: C.primary,
    animation: "spin 0.9s linear infinite",
  },
  toolbar: {
    position: "sticky" as const, top: 0, zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 24px",
    background: "rgba(252,249,242,0.95)",
    backdropFilter: "blur(8px)",
    borderBottom: `1px solid ${C.border}`,
    fontFamily: "Cairo, sans-serif",
  },
  btnBack: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 700, color: C.muted,
    textDecoration: "none",
    padding: "6px 14px",
    borderRadius: 20,
    border: `1px solid ${C.border}`,
    background: "#fff",
  },
  btnPrint: {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontSize: 13, fontWeight: 800, color: "#fff",
    padding: "8px 20px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    background: `linear-gradient(135deg, ${C.primary}, #3B0A14)`,
    boxShadow: `0 4px 14px ${C.primary}40`,
    fontFamily: "Cairo, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  seal: {
    width: 56, height: 56,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.gold}30, ${C.primary}20)`,
    border: `2px solid ${C.gold}60`,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    margin: "0 0 16px",
  },
  actGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 8,
    marginBottom: 8,
  },
  actCard: {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#FAF7F3",
    textAlign: "center" as const,
  },
};
