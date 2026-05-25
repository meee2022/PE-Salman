"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
  const { token } = useAuth();
  const params    = useSearchParams();
  const yearParam = params.get("year");

  // نجيب السنة النشطة من الإعدادات إذا مش موجودة في الـ URL
  const activeYear = useQuery(api.settings.activeYear);
  const YEAR = yearParam ?? activeYear ?? "2025-2026";

  const activities = useQuery(
    api.activityPlans.listByYear,
    YEAR ? { academicYear: YEAR, token: token ?? undefined } : "skip"
  );

  const org = useQuery(api.settings.org, token ? { token } : "skip");

  const dept   = activities?.filter(a => a.type === "department") ?? [];
  const school = activities?.filter(a => a.type === "school")     ?? [];

  if (!activities) {
    return (
      <div style={{ fontFamily: "Cairo, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: C.muted }}>جاري التحميل…</div>
      </div>
    );
  }

  const ministry   = org?.["org.ministry"]   ?? "وزارة التربية والتعليم والتعليم العالي — دولة قطر";
  const department = org?.["org.department"] ?? "إدارة التوجيه التربوي";
  const section    = org?.["org.section"]    ?? "قسم التربية البدنية";
  const headName   = org?.["org.headName"]   ?? "";
  const managerName = org?.["org.managerName"] ?? "";

  return (
    <>
      <link rel="stylesheet" href={FONT_URL} />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Cairo', 'Arial', sans-serif; background: #fff; color: ${C.text}; direction: rtl; }
        .no-print { position: fixed; top: 16px; left: 16px; z-index: 999; display: flex; gap: 8px; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .page-break { page-break-before: always; }
          table { page-break-inside: avoid; }
        }
        @page { size: A4; margin: 15mm 12mm; }
      `}</style>

      {/* ── شريط أدوات الطباعة ──────────────────────────────────── */}
      <div className="no-print">
        <button onClick={() => window.print()}
          style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          🖨️ طباعة / حفظ PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background: "#f3f4f6", color: C.text, border: "none", borderRadius: 12, padding: "10px 20px", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          إغلاق
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── ترويسة الوزارة ─────────────────────────────────────── */}
        <header style={{ textAlign: "center", marginBottom: 24, paddingBottom: 16, borderBottom: `3px solid ${C.gold}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10 }}>
            {/* شعار دائري */}
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, #7A1E30)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: C.gold, fontSize: 22, fontWeight: 900 }}>🏃</span>
            </div>
            <div>
              <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 2 }}>{ministry}</p>
              <p style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>{department}</p>
              <p style={{ fontSize: 14, color: C.primary, fontWeight: 900 }}>{section}</p>
            </div>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: C.primary, marginTop: 8 }}>
            خطة الأنشطة اللاصفية المعتمدة للمدارس
          </h1>
          <p style={{ fontSize: 13, color: C.goldDk, fontWeight: 700, marginTop: 4 }}>
            للعام الأكاديمي {YEAR}
          </p>
        </header>

        {/* ── ملخص إحصائي ────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "إجمالي الأنشطة", value: activities.length, color: C.primary },
            { label: "فعاليات القسم",  value: dept.length,       color: "#0284C7" },
            { label: "فعاليات المدارس", value: school.length,     color: "#059669" },
          ].map(s => (
            <div key={s.label} style={{ background: C.cream, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ══════════════ جدول فعاليات القسم ══════════════════════ */}
        <SectionTable
          title="أولاً: فعاليات القسم"
          subtitle="الفعاليات والأنشطة التي ينظمها قسم التربية البدنية"
          rows={dept}
          accentColor={C.primary}
        />

        {/* ══════════════ جدول فعاليات المدارس ═══════════════════ */}
        <div style={{ marginTop: 28 }} className={dept.length > 8 ? "page-break" : ""}>
          <SectionTable
            title="ثانياً: فعاليات المدارس"
            subtitle="الفعاليات التي تنظمها المدارس باعتماد القسم"
            rows={school}
            accentColor="#059669"
          />
        </div>

        {/* ── توقيعات ─────────────────────────────────────────────── */}
        {(headName || managerName) && (
          <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, paddingTop: 20, borderTop: `2px solid ${C.border}` }}>
            <SignBlock label="رئيس قسم التربية البدنية" name={headName} />
            <SignBlock label="مدير إدارة التوجيه التربوي" name={managerName} />
          </div>
        )}

        {/* ── تذييل ───────────────────────────────────────────────── */}
        <footer style={{ marginTop: 32, paddingTop: 12, borderTop: `1.5px solid ${C.border}`, textAlign: "center" }}>
          <p style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>
            {section} — {department} | {ministry}
          </p>
          <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            طُبع من نظام التوجيه التربوي — {new Date().toLocaleDateString("ar-QA", { dateStyle: "long" })}
          </p>
        </footer>
      </div>
    </>
  );
}

// ── مكون جدول قسم ─────────────────────────────────────────────────
function SectionTable({ title, subtitle, rows, accentColor }: {
  title: string; subtitle: string;
  rows: any[]; accentColor: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      {/* عنوان القسم */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 5, height: 36, background: accentColor, borderRadius: 4, flexShrink: 0 }} />
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: C.primary }}>{title}</h2>
          <p style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{subtitle} ({rows.length} نشاط)</p>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: `linear-gradient(135deg, ${C.primary}, #7A1E30)` }}>
            {["#", "اسم النشاط", "الجهة المنظمة", "الشراكة", "التاريخ", "الفئة", "المرحلة"].map((h, i) => (
              <th key={i} style={{
                padding: "8px 10px", color: C.gold, fontWeight: 800, fontSize: 11,
                textAlign: i === 0 || i >= 4 ? "center" : "right",
                whiteSpace: "nowrap", borderBottom: `2px solid ${C.gold}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a._id} style={{ background: i % 2 === 0 ? "#fff" : C.cream }}>
              <td style={{ padding: "7px 8px", textAlign: "center", color: C.muted, fontSize: 11, fontWeight: 700 }}>{i + 1}</td>
              <td style={{ padding: "7px 10px", fontWeight: 800, color: accentColor }}>{a.activityName}</td>
              <td style={{ padding: "7px 10px", fontWeight: 700, color: C.text, fontSize: 11 }}>{a.organizer}</td>
              <td style={{ padding: "7px 10px", color: C.muted, fontSize: 10 }}>{a.partnership ?? "—"}</td>
              <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, color: C.text, whiteSpace: "nowrap" }}>{a.dateText}</td>
              <td style={{ padding: "7px 8px", textAlign: "center" }}>
                <GenderChip gender={a.gender} />
              </td>
              <td style={{ padding: "7px 8px", textAlign: "center" }}>
                <StageChip stage={a.stage} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GenderChip({ gender }: { gender: string }) {
  const cfg: Record<string, [string, string]> = {
    male:   ["#EFF6FF", "#1D4ED8"],
    female: ["#FDF2F8", "#BE185D"],
    both:   ["#F5F3FF", "#6D28D9"],
  };
  const [bg, color] = cfg[gender] ?? ["#f3f4f6", "#374151"];
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 6 }}>{GENDER_MAP[gender] ?? gender}</span>;
}
function StageChip({ stage }: { stage: string }) {
  const cfg: Record<string, [string, string]> = {
    primary:   ["#ECFDF5", "#065F46"],
    middle:    ["#FFFBEB", "#92400E"],
    secondary: ["#FFF1F2", "#9F1239"],
    all:       ["#FEFCE8", "#854D0E"],
    model:     ["#EEF2FF", "#3730A3"],
  };
  const [bg, color] = cfg[stage] ?? ["#f3f4f6", "#374151"];
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 6 }}>{STAGE_MAP[stage] ?? stage}</span>;
}
function SignBlock({ label, name }: { label: string; name: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 8 }}>{label}</p>
      <div style={{ height: 40, borderBottom: `1.5px dashed ${C.border}`, marginBottom: 6 }} />
      <p style={{ fontSize: 12, fontWeight: 800, color: C.primary }}>{name}</p>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div style={{ fontFamily: "Cairo, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "#7A6A58" }}>جاري التحميل…</p>
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
