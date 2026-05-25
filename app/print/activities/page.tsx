"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap";

const C = {
  primary: "#5C1523",
  gold:    "#C9A96E",
  goldDk:  "#A8853A",
  cream:   "#FCF9F2",
  text:    "#1C0E0E",
  muted:   "#7A6A58",
  border:  "#E8DDD5",
};

const GENDER_MAP: Record<string, string> = { male: "بنين", female: "بنات", both: "جميع الفئات" };
const STAGE_MAP:  Record<string, string> = { primary: "ابتدائي", middle: "إعدادي", secondary: "ثانوي", all: "جميع المراحل", model: "نموذجي" };

function PrintContent() {
  const params = useSearchParams();
  const YEAR   = params.get("year") ?? "2025-2026";

  // نجيب التوكن من localStorage
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    // AuthProvider يحفظ التوكن في localStorage بـ key "auth_token"
    const stored = localStorage.getItem("pe_token");
    setToken(stored);
  }, []);

  const activities = useQuery(
    api.activityPlans.listByYear,
    token !== null ? { academicYear: YEAR, token: token ?? undefined } : "skip"
  );
  const org = useQuery(
    api.settings.org,
    token ? { token } : "skip"
  );

  if (token === null || activities === undefined) {
    return (
      <div style={{ fontFamily: "Cairo, sans-serif", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${C.gold}`, borderTopColor: C.primary, animation: "spin 1s linear infinite" }} />
        <p style={{ color: C.muted, fontWeight: 700 }}>جاري التحميل…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const dept   = activities.filter(a => a.type === "department");
  const school = activities.filter(a => a.type === "school");

  const ministry    = org?.["org.ministry"]    ?? "وزارة التربية والتعليم والتعليم العالي — دولة قطر";
  const department  = org?.["org.department"]  ?? "إدارة التوجيه التربوي";
  const section     = org?.["org.section"]     ?? "قسم التربية البدنية";
  const headName    = org?.["org.headName"]    ?? "";
  const managerName = org?.["org.managerName"] ?? "";

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", background: "#fff", minHeight: "100vh" }}>
      <style>{`
        @import url('${FONT_URL}');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Cairo', Arial, sans-serif; }
        .no-print { position: fixed; top: 12px; left: 12px; z-index: 9999; display: flex; gap: 8px; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        @page { size: A4; margin: 15mm 12mm; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid ${C.border}; }
      `}</style>

      {/* ── أزرار الطباعة ─────────────────────────────────────────── */}
      <div className="no-print">
        <button onClick={() => window.print()} style={{
          background: C.primary, color: "#fff", border: "none", borderRadius: 10,
          padding: "9px 18px", fontFamily: "Cairo, sans-serif", fontWeight: 800,
          fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(92,21,35,0.3)"
        }}>🖨️ طباعة / PDF</button>
        <button onClick={() => window.close()} style={{
          background: "#f3f4f6", color: C.text, border: "1px solid #e5e7eb",
          borderRadius: 10, padding: "9px 18px", fontFamily: "Cairo, sans-serif",
          fontWeight: 700, fontSize: 13, cursor: "pointer"
        }}>✕ إغلاق</button>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── ترويسة ─────────────────────────────────────────────── */}
        <table style={{ border: "none", marginBottom: 20 }}>
          <tbody>
            <tr>
              <td style={{ border: "none", textAlign: "center", padding: "0 0 16px" }}>
                {/* شعار */}
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, #7A1E30)`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 26 }}>🏃</span>
                </div>
                <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, margin: "2px 0" }}>{ministry}</p>
                <p style={{ fontSize: 12, color: C.primary, fontWeight: 700, margin: "2px 0" }}>{department}</p>
                <p style={{ fontSize: 13, color: C.primary, fontWeight: 800, margin: "2px 0" }}>{section}</p>
                <div style={{ width: 60, height: 3, background: C.gold, borderRadius: 2, margin: "10px auto 0" }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── العنوان الرئيسي ─────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `3px solid ${C.gold}` }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: C.primary, margin: "0 0 6px" }}>
            خطة الأنشطة اللاصفية المعتمدة للمدارس
          </h1>
          <p style={{ fontSize: 14, color: C.goldDk, fontWeight: 800, margin: 0 }}>
            للعام الأكاديمي {YEAR}
          </p>
        </div>

        {/* ── بطاقات إحصائية ─────────────────────────────────────── */}
        <table style={{ border: "none", marginBottom: 24, width: "100%" }}>
          <tbody>
            <tr>
              {[
                { label: "إجمالي الأنشطة",  value: activities.length, color: C.primary },
                { label: "فعاليات القسم",    value: dept.length,       color: "#0284C7" },
                { label: "فعاليات المدارس",  value: school.length,     color: "#059669" },
              ].map((s, i) => (
                <td key={i} style={{ border: `1.5px solid ${C.border}`, background: C.cream, textAlign: "center", padding: "10px 8px", borderRadius: 8, width: "33%" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* ══ فعاليات القسم ══════════════════════════════════════════ */}
        <ActivityTable
          title="أولاً: فعاليات القسم"
          subtitle={`الفعاليات التي ينظمها قسم التربية البدنية (${dept.length} نشاط)`}
          rows={dept}
          accentColor={C.primary}
        />

        {/* ══ فعاليات المدارس ════════════════════════════════════════ */}
        {school.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <ActivityTable
              title="ثانياً: فعاليات المدارس"
              subtitle={`الفعاليات التي تنظمها المدارس باعتماد القسم (${school.length} نشاط)`}
              rows={school}
              accentColor="#059669"
            />
          </div>
        )}

        {/* ── توقيعات ─────────────────────────────────────────────── */}
        {(headName || managerName) && (
          <table style={{ border: "none", marginTop: 44, width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ border: "none", textAlign: "center", padding: "0 24px", verticalAlign: "top" }}>
                  <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 40 }}>رئيس قسم التربية البدنية</p>
                  <div style={{ borderBottom: `1.5px dashed ${C.border}`, marginBottom: 6 }} />
                  <p style={{ fontSize: 12, fontWeight: 800, color: C.primary, margin: 0 }}>{headName}</p>
                </td>
                <td style={{ border: "none", width: 40 }} />
                <td style={{ border: "none", textAlign: "center", padding: "0 24px", verticalAlign: "top" }}>
                  <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 40 }}>مدير إدارة التوجيه التربوي</p>
                  <div style={{ borderBottom: `1.5px dashed ${C.border}`, marginBottom: 6 }} />
                  <p style={{ fontSize: 12, fontWeight: 800, color: C.primary, margin: 0 }}>{managerName}</p>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* ── تذييل ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 32, paddingTop: 12, borderTop: `1.5px solid ${C.border}`, textAlign: "center" }}>
          <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: "0 0 3px" }}>
            {section} — {department} | {ministry}
          </p>
          <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
            طُبع من نظام التوجيه التربوي — {new Date().toLocaleDateString("ar-QA-u-nu-latn", { dateStyle: "long" })}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActivityTable({ title, subtitle, rows, accentColor }: {
  title: string; subtitle: string; rows: any[]; accentColor: string;
}) {
  if (!rows.length) return null;
  const headerBg = accentColor === "#059669"
    ? "linear-gradient(135deg, #065F46, #059669)"
    : `linear-gradient(135deg, ${C.primary}, #7A1E30)`;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 5, height: 38, background: accentColor, borderRadius: 4, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.primary }}>{title}</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{subtitle}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr style={{ background: headerBg }}>
            {["#", "اسم النشاط", "الجهة المنظمة", "الشراكة", "التاريخ", "الفئة", "المرحلة"].map((h, i) => (
              <th key={i} style={{
                padding: "9px 10px", color: C.gold, fontWeight: 800, fontSize: 11,
                textAlign: i === 0 || i >= 4 ? "center" : "right",
                border: "none", borderBottom: `2px solid ${C.gold}`, whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a._id} style={{ background: i % 2 === 0 ? "#fff" : C.cream }}>
              <td style={{ padding: "7px 8px", textAlign: "center", color: C.muted, fontSize: 11, fontWeight: 700 }}>{i + 1}</td>
              <td style={{ padding: "7px 10px", fontWeight: 800, color: accentColor, fontSize: 12 }}>{a.activityName}</td>
              <td style={{ padding: "7px 10px", fontWeight: 700, color: C.text, fontSize: 11 }}>{a.organizer}</td>
              <td style={{ padding: "7px 10px", color: C.muted, fontSize: 10 }}>{a.partnership ?? "—"}</td>
              <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, color: C.text, whiteSpace: "nowrap" }}>{a.dateText}</td>
              <td style={{ padding: "7px 8px", textAlign: "center" }}>
                <span style={genderStyle(a.gender)}>{GENDER_MAP[a.gender] ?? a.gender}</span>
              </td>
              <td style={{ padding: "7px 8px", textAlign: "center" }}>
                <span style={stageStyle(a.stage)}>{STAGE_MAP[a.stage] ?? a.stage}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function genderStyle(g: string): React.CSSProperties {
  const m: Record<string, [string,string]> = { male: ["#EFF6FF","#1D4ED8"], female: ["#FDF2F8","#BE185D"], both: ["#F5F3FF","#6D28D9"] };
  const [bg, color] = m[g] ?? ["#f3f4f6","#374151"];
  return { background: bg, color, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" as const };
}
function stageStyle(s: string): React.CSSProperties {
  const m: Record<string, [string,string]> = { primary: ["#ECFDF5","#065F46"], middle: ["#FFFBEB","#92400E"], secondary: ["#FFF1F2","#9F1239"], all: ["#FEFCE8","#854D0E"], model: ["#EEF2FF","#3730A3"] };
  const [bg, color] = m[s] ?? ["#f3f4f6","#374151"];
  return { background: bg, color, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" as const };
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div style={{ fontFamily: "Cairo, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "#7A6A58", fontWeight: 700 }}>جاري التحميل…</p>
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
