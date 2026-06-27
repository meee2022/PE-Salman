"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { AiInsightPanel } from "@/components/ui/AiInsightPanel";
import { KpiCard } from "@/components/ui/KpiCard";
import { MiniSparkline } from "@/components/ui/MiniSparkline";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FadeIn, Stagger, StaggerItem, motion } from "@/components/ui/Motion";
import { Trophy, ChevronLeft, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  IconSupervisors, IconSchools, IconForms, IconCoverage,
  IconActivity, IconReports, IconMetrics, IconRemote,
  IconInterviews, IconSettings,
} from "@/components/ui/DashIcons";
import { useActiveYear } from "@/hooks/useActiveYear";

/* ── مكوّن: دائرة نسبة مئوية (SVG Ring) ──────────────────────────── */
function RingChart({ pct, size = 80, stroke = 8, color = "#C9A96E", label, sub }:
  { pct: number; size?: number; stroke?: number; color?: string; label: string; sub?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-black/[0.06]" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.16,1,.3,1)" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-[#2A1418] font-sans leading-none">{Math.round(pct)}%</span>
        </div>
      </div>
      <p className="text-xs font-bold text-[#2A1418] text-center">{label}</p>
      {sub && <p className="text-[10px] text-[#A89A92] font-semibold text-center">{sub}</p>}
    </div>
  );
}

/* ── مكوّن: شريط أفقي مع نسبة ──────────────────────────────────── */
function HBar({ name, pct, color, value, max }: { name: string; pct: number; color: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3 group">
      <p className="text-xs font-bold text-[#2A1418] w-28 shrink-0 truncate text-right">{name}</p>
      <div className="flex-1 h-5 bg-black/[0.04] rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all duration-1000 ease-out flex items-center"
          style={{ width: `${Math.max((pct / Math.max(max, 1)) * 100, 4)}%`, background: color }}>
        </div>
      </div>
      <span className="text-xs font-black text-[#2A1418] font-sans w-10 text-left shrink-0">{Math.round(pct)}%</span>
    </div>
  );
}

/* ── مكوّن: بطاقة تنبيه ─────────────────────────────────────────── */
function AlertCard({ name, pct, href }: { name: string; pct: number; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-2xl bg-red-50/60 border border-red-200/50 hover:bg-red-50 transition-colors group">
      <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
        <span className="text-red-500 font-black text-xs font-sans">{Math.round(pct)}%</span>
      </div>
      <p className="text-xs font-bold text-red-700 flex-1 truncate">{name}</p>
      <ChevronLeft size={14} className="text-red-400 group-hover:-translate-x-0.5 transition-transform" />
    </Link>
  );
}

// مكوّن صغير لعرض الفرق مقارنةً بالعام الماضي
function Delta({ curr, prev }: { curr: number; prev: number | null | undefined }) {
  if (prev == null || prev === 0) return null;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.5) return <span className="text-[10px] font-bold text-[#C0B3AA] flex items-center gap-0.5"><Minus size={10} />مثل العام الماضي</span>;
  const up = diff > 0;
  return (
    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}{Math.round(diff)}{typeof curr === "number" && curr <= 100 && curr >= 0 ? "%" : ""} من العام الماضي
    </span>
  );
}

/* ── مكوّن: شارة فرق سنوي ──────────────────────────────────────────── */
function DeltaBadge({ diff, suffix = "" }: { diff: number | null; suffix?: string }) {
  if (diff === null) return <span className="text-[11px] font-bold text-[#C0B3AA]">لا يوجد</span>;
  if (Math.abs(diff) < 0.5) return (
    <span className="text-[11px] font-bold text-[#A89A92] flex items-center gap-0.5">
      <Minus size={10} />مثل العام الماضي
    </span>
  );
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${up ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? "+" : ""}{Math.round(diff)}{suffix}
    </span>
  );
}

/* ── مكوّن: مقارنة سنة بسنة ───────────────────────────────────────── */
function YearCompare({
  year, prevYear, totalForms, prevTotalForms, avgCoverage, prevAvgCoverage,
  totalSupervisors, prevCoverageLoaded,
}: {
  year: string; prevYear: string;
  totalForms: number; prevTotalForms: number | null;
  avgCoverage: number; prevAvgCoverage: number | null;
  totalSupervisors: number; prevCoverageLoaded: boolean;
}) {
  const hasPrev = prevTotalForms != null && (prevTotalForms > 0 || prevAvgCoverage != null);

  const diffForms = hasPrev && prevTotalForms != null ? totalForms - prevTotalForms : null;
  const diffCov   = hasPrev && prevAvgCoverage != null ? avgCoverage - prevAvgCoverage : null;

  return (
    <div className="card-luxurious p-5 bg-white/80">
      {/* رأس القسم */}
      <div className="flex items-center justify-between border-b border-gold/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-gold/20 to-primary/20 flex items-center justify-center">
            <TrendingUp size={14} className="text-gold-dark" />
          </div>
          <div>
            <h3 className="font-extrabold text-[#1C1008] text-sm leading-none">مقارنة سنة بسنة</h3>
            <p className="text-[10px] text-[#A89A92] mt-0.5 font-medium">التغيّر بين {prevYear} و {year}</p>
          </div>
        </div>
        {!hasPrev && prevCoverageLoaded && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full">
            ⚠ لا توجد بيانات للعام السابق
          </span>
        )}
        {!prevCoverageLoaded && (
          <span className="text-[10px] font-bold text-[#A89A92]">جارٍ التحميل…</span>
        )}
      </div>

      {/* خلايا المقارنة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* الاستمارات */}
        <div className="rounded-2xl border border-gold/10 bg-gold/[0.03] p-4 flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[#7A6A58]">إجمالي الاستمارات</p>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] text-[#A89A92] font-medium">{prevYear}</p>
              <p className="text-lg font-black text-[#2A1418] font-sans leading-none mt-0.5">
                {hasPrev && prevTotalForms != null ? prevTotalForms.toLocaleString("en-US") : "—"}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-[#C9A96E]/40 to-transparent" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-[#A89A92] font-medium">{year}</p>
              <p className="text-lg font-black text-primary font-sans leading-none mt-0.5">
                {totalForms.toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <DeltaBadge diff={diffForms} />
        </div>

        {/* متوسط التغطية */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-4 flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[#7A6A58]">متوسط التغطية</p>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] text-[#A89A92] font-medium">{prevYear}</p>
              <p className="text-lg font-black text-[#2A1418] font-sans leading-none mt-0.5">
                {prevAvgCoverage != null ? `${prevAvgCoverage}%` : "—"}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-sky-300/40 to-transparent" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-[#A89A92] font-medium">{year}</p>
              <p className="text-lg font-black text-sky-700 font-sans leading-none mt-0.5">{avgCoverage}%</p>
            </div>
          </div>
          <DeltaBadge diff={diffCov} suffix="%" />
        </div>

        {/* الموجهون */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[#7A6A58]">الموجهون النشطون</p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 space-y-1.5">
              {/* شريط العام الحالي */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[#A89A92]">{year}</span>
                  <span className="text-[11px] font-black text-emerald-700 font-sans">{totalSupervisors}</span>
                </div>
                <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              {/* نسبة التغطية كمؤشر بصري */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[#A89A92]">تغطية كاملة ≥100%</span>
                  <span className="text-[11px] font-black text-primary font-sans">
                    {hasPrev ? `${Math.round((avgCoverage / 100) * totalSupervisors)} موجه` : "—"}
                  </span>
                </div>
                <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(avgCoverage, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-[#A89A92] font-medium mt-1">
            متوسط التغطية الكلية للفريق: <strong className="text-primary">{avgCoverage}%</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const supervisors   = useQuery(api.supervisors.list, token ? { token } : "skip");
  const coverage      = useQuery(api.coverage.listByYear, token ? { academicYear: YEAR, token } : "skip");
  const schools       = useQuery(api.schools.list, token ? { academicYear: YEAR, token } : "skip");
  const monthlyData   = useQuery(api.activity.monthlyTotals, token ? { academicYear: YEAR, token } : "skip");

  // العام الماضي
  const prevYear = YEAR.split("-").map((y) => String(parseInt(y) - 1)).join("-");
  const prevCoverage = useQuery(api.coverage.listByYear, token ? { academicYear: prevYear, token } : "skip");

  // التنبيهات
  const alerts = useQuery(api.alerts.list, token ? { academicYear: YEAR, token } : "skip");

  // نظام ترحيب تفاعلي ذكي يتغير حسب أوقات اليوم
  const [greeting, setGreeting] = useState("مرحباً بك");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("صباح الخير والنشاط البدني المميّز ☀️");
    } else if (hour >= 12 && hour < 17) {
      setGreeting("طاب يومك بكل خير وهمّة عالية ⚡");
    } else {
      setGreeting("مساء الخير والتميّز والرفعة 🌙");
    }
  }, []);

  const loading = supervisors === undefined || coverage === undefined || schools === undefined;
  if (loading) return <Loading />;

  const totalSupervisors = supervisors.length;
  const totalSchools     = schools.length;
  const totalForms       = coverage.reduce((s, r) => s + r.formsCount, 0);
  const avgCoverage      = coverage.length
    ? Math.round(coverage.reduce((s, r) => s + r.coverageRate, 0) / coverage.length) : 0;

  // مقارنة بالعام الماضي — null = لا بيانات بعد (تحميل أو لا يوجد عام سابق)
  const prevAvgCoverage = prevCoverage?.length
    ? Math.round(prevCoverage.reduce((s, r) => s + r.coverageRate, 0) / prevCoverage.length) : null;
  const prevTotalForms = prevCoverage?.length
    ? prevCoverage.reduce((s, r) => s + r.formsCount, 0) : null;

  const ranked = [...coverage].sort((a, b) => b.coverageRate - a.coverageRate);
  const top = ranked[0];

  // إحصائيات التغطية
  const fullCoverage   = coverage.filter(r => r.coverageRate >= 100).length;
  const nearCoverage   = coverage.filter(r => r.coverageRate >= 75 && r.coverageRate < 100).length;
  const lowCoverage    = coverage.filter(r => r.coverageRate < 75).length;
  const avgFormsRate   = coverage.length ? Math.round(coverage.reduce((s,r) => s + (r.formsRate ?? 0), 0) / coverage.length) : 0;

  // توزيع الحالات
  const statusCounts = {
    "🏆متميز":  coverage.filter(r => r.status === "🏆متميز").length,
    "✅ممتاز":  coverage.filter(r => r.status === "✅ممتاز").length,
    "✅مكتمل":  coverage.filter(r => r.status === "✅مكتمل").length,
    "⚠️قريب":   coverage.filter(r => r.status === "⚠️قريب").length,
  };

  // موجهون تحت 50% تغطية (تنبيهات)
  const lowPerformers = ranked.filter(r => r.coverageRate < 50).slice(0, 3);

  // عناصر "يحتاج إجراء الآن"
  const uncoveredSchools = coverage.reduce((s, r) => s + Math.max(0, (r.schoolsRequired - r.schoolsCovered)), 0);
  const noFormsSups = coverage.filter(r => (r.formsCount ?? 0) === 0).length;
  const actionItems = [
    { n: uncoveredSchools, label: "مدرسة لم تُغطَّ بعد", href: "/dashboard/coverage", tone: "red" as const },
    { n: lowCoverage, label: "موجّه تحت 75% تغطية", href: "/dashboard/coverage", tone: "amber" as const },
    { n: noFormsSups, label: "موجّه بلا استمارات", href: "/dashboard/reports", tone: "primary" as const },
  ].filter(x => x.n > 0);
  const ACTION_TONE = {
    red: "bg-red-50 border-red-200/70 text-red-700",
    amber: "bg-amber-50 border-amber-200/70 text-amber-700",
    primary: "bg-primary/5 border-primary/15 text-primary",
  };

  return (
    <div className="space-y-7">
      {/* البانر الترحيبي الفاخر (The Hero Banner) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="hero-gradient-premium relative overflow-hidden p-6 sm:p-8 rounded-3xl border-none shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="pattern-arabesque absolute inset-0 opacity-[0.45] pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 bottom-0 w-32 h-32 rounded-full bg-primary-light/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-gold bg-white/10 backdrop-blur-sm border border-white/5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            العام الدراسي {YEAR}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 leading-tight">
            {greeting}، {user?.name?.split(" ")[0] ?? "بك"}
          </h1>
          <p className="text-white/70 text-sm font-medium">
            نظرة عامة وشاملة على أداء قسم وموجهي التربية البدنية
          </p>
        </div>

        {top?.supervisor && (
          <div className="relative z-10 flex items-center gap-3 bg-white/10 ring-1 ring-white/20 rounded-2xl px-4 py-3 backdrop-blur-md shadow-lg shrink-0 transform hover:scale-[1.03] hover:-rotate-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-light to-gold-dark flex items-center justify-center text-white shadow-md animate-bounce">
              <Trophy size={19} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gold-light tracking-wide">الموجه الأعلى أداءً</p>
              <p className="text-xs font-extrabold text-white truncate max-w-32 mt-0.5">{top.supervisor.name}</p>
            </div>
          </div>
        )}
      </motion.section>

      {/* ── بانر التنبيهات ── */}
      {alerts && alerts.length > 0 && (
        <div className="card-luxurious border-r-4 !border-r-red-400 bg-red-50/80 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm font-extrabold text-red-800">
              {alerts.length} تنبيه يحتاج إجراء فورياً
            </p>
            <Link href="/dashboard/coverage" className="mr-auto text-xs font-bold text-red-600 hover:underline">
              عرض التغطية ←
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.slice(0, 6).map((a, i) => (
              <Link
                key={i}
                href={`/dashboard/supervisors/${a.supervisorId}`}
                className="text-[11px] font-bold text-red-700 bg-white/80 px-3 py-1.5 rounded-xl border border-red-200/60 hover:bg-red-50 transition-colors"
              >
                {a.supervisorName} — {a.type === "low_coverage" ? `تغطية ${Math.round(a.coverageRate)}%` : "لا استمارات"}
              </Link>
            ))}
            {alerts.length > 6 && (
              <span className="text-[11px] font-bold text-red-500 px-3 py-1.5">
                +{alerts.length - 6} آخرون
              </span>
            )}
          </div>
        </div>
      )}

      {/* ملخّص تنفيذي ذكي — للأدمن */}
      {["admin", "superadmin"].includes(user?.role ?? "") && (
        <AiInsightPanel
          endpoint="/api/ai-analysis"
          title="الملخّص التنفيذي الذكي"
          buttonLabel="اكتب ملخّص اليوم وأهم الإجراءات"
          hint="حالة القسم وأبرز المتغيرات وأهم الإجراءات المطلوبة — من بيانات اليوم"
        />
      )}

      {/* ── يحتاج إجراء الآن ── */}
      {actionItems.length > 0 && (
        <section className="card-luxurious p-5 bg-white/70 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="icon-orb !w-8 !h-8 bg-red-50 text-red-600"><AlertTriangle size={16} /></span>
            <h2 className="text-sm font-black text-[#1C1008]">يحتاج إجراء الآن</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {actionItems.map((a, i) => (
              <Link key={i} href={a.href}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-transform hover:-translate-y-0.5 ${ACTION_TONE[a.tone]}`}>
                <span className="text-2xl font-black font-sans">{a.n}</span>
                <span className="text-xs font-bold leading-tight flex-1">{a.label}</span>
                <ChevronLeft size={16} className="opacity-50" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* بطاقات مؤشرات الأداء السريعة (KPIs) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <KpiCard
          title="الموجهون"
          value={totalSupervisors}
          sub={`${supervisors.filter((s) => s.gender === "male").length} ذكور · ${supervisors.filter((s) => s.gender === "female").length} إناث`}
          svgIcon={<IconSupervisors size={52} />}
          color="primary"
          href="/dashboard/supervisors"
          delay={50}
        />
        <KpiCard
          title="المدارس"
          value={totalSchools}
          sub={`${schools.filter((s) => s.gender === "male").length} بنين · ${schools.filter((s) => s.gender === "female").length} بنات`}
          svgIcon={<IconSchools size={52} />}
          color="gold"
          href="/dashboard/schools"
          delay={100}
        />
        <KpiCard
          title="الاستمارات المنجزة"
          value={totalForms}
          sub={prevTotalForms != null ? <Delta curr={totalForms} prev={prevTotalForms} /> : "إجمالي التقارير المرفوعة"}
          svgIcon={<IconForms size={52} />}
          color="green"
          href="/dashboard/coverage"
          delay={150}
          sparkline={monthlyData && (
            <MiniSparkline
              data={monthlyData.map((m) => ({ month: m.month, value: m.visits + m.develop }))}
              color="#10b981"
            />
          )}
        />
        <KpiCard
          title="متوسط التغطية"
          value={`${avgCoverage}%`}
          sub={prevAvgCoverage != null ? <Delta curr={avgCoverage} prev={prevAvgCoverage} /> : "معدل الزيارات الشاملة"}
          svgIcon={<IconCoverage size={52} />}
          color="blue"
          href="/dashboard/coverage"
          delay={200}
          sparkline={monthlyData && (
            <MiniSparkline
              data={monthlyData.map((m) => ({ month: m.month, value: m.visits }))}
              color="#0ea5e9"
            />
          )}
        />
      </section>

      {/* ── مقارنة سنة بسنة ─────────────────────────────────────────── */}
      <FadeIn>
        <YearCompare
          year={YEAR}
          prevYear={prevYear}
          totalForms={totalForms}
          prevTotalForms={prevTotalForms}
          avgCoverage={avgCoverage}
          prevAvgCoverage={prevAvgCoverage}
          totalSupervisors={totalSupervisors}
          prevCoverageLoaded={prevCoverage !== undefined}
        />
      </FadeIn>

      {/* ── لوحة التحليل الإحصائي السريع ─────────────────────────────── */}
      <FadeIn>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* بطاقة 1: دوائر النسب */}
          <div className="card-luxurious p-5 bg-white/80 col-span-1 space-y-4">
            <div className="flex items-center gap-2 border-b border-gold/10 pb-3">
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <h3 className="font-extrabold text-[#1C1008] text-sm">نسب التغطية الكلية</h3>
            </div>
            <div className="flex justify-around items-end py-2">
              <RingChart pct={avgCoverage}     color="#5C1523" label="متوسط التغطية" sub="الموجهون" />
              <RingChart pct={avgFormsRate}    color="#C9A96E" label="معدل الاستمارات" sub="التقارير" size={72} />
              <RingChart pct={coverage.length ? (fullCoverage / coverage.length) * 100 : 0} color="#10b981" label="مكتملو التغطية" sub={`${fullCoverage} موجه`} size={72} />
            </div>
          </div>

          {/* بطاقة 2: أعلى 5 موجهين */}
          <div className="card-luxurious p-5 bg-white/80 col-span-1 space-y-3">
            <div className="flex items-center justify-between border-b border-gold/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h3 className="font-extrabold text-[#1C1008] text-sm">أعلى الموجهين أداءً</h3>
              </div>
              <Link href="/dashboard/reports" className="text-[10px] font-bold text-primary hover:underline">عرض الكل</Link>
            </div>
            <div className="space-y-2.5">
              {ranked.slice(0, 5).map((row, i) => (
                <HBar
                  key={row._id}
                  name={row.supervisor?.name?.split(" ").slice(0,2).join(" ") ?? "—"}
                  pct={row.coverageRate}
                  max={100}
                  value={row.coverageRate}
                  color={i === 0 ? "linear-gradient(90deg,#C9A96E,#A8853A)" : i === 1 ? "linear-gradient(90deg,#7A1E30,#5C1523)" : "linear-gradient(90deg,#38bdf8,#0284c7)"}
                />
              ))}
            </div>
          </div>

          {/* بطاقة 3: توزيع الحالات + تنبيهات */}
          <div className="card-luxurious p-5 bg-white/80 col-span-1 space-y-4">
            <div className="flex items-center gap-2 border-b border-gold/10 pb-3">
              <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <h3 className="font-extrabold text-[#1C1008] text-sm">توزيع حالات الموجهين</h3>
            </div>
            {/* توزيع الحالات */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "متميز 🏆", count: statusCounts["🏆متميز"], color: "bg-amber-500/10 text-amber-700 border-amber-300/40" },
                { label: "ممتاز ✅", count: statusCounts["✅ممتاز"],  color: "bg-emerald-500/10 text-emerald-700 border-emerald-300/40" },
                { label: "مكتمل ✅", count: statusCounts["✅مكتمل"],  color: "bg-sky-500/10 text-sky-700 border-sky-300/40" },
                { label: "قريب ⚠️",  count: statusCounts["⚠️قريب"],   color: "bg-orange-500/10 text-orange-700 border-orange-300/40" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.color}`}>
                  <p className="text-xl font-black font-sans">{s.count}</p>
                  <p className="text-[11px] font-bold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {/* تنبيهات */}
            {lowPerformers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-wide">⚠ يحتاجون متابعة</p>
                {lowPerformers.map(r => (
                  <AlertCard key={r._id} name={r.supervisor?.name ?? "—"} pct={r.coverageRate} href={`/dashboard/supervisors/${r.supervisor?._id}`} />
                ))}
              </div>
            )}
          </div>

        </section>
      </FadeIn>

      {/* الأقسام المنظمة تفاعلياً (Dashboard Navigation Sections) */}
      <section className="space-y-5">
        <div className="border-b border-[#2A1418]/5 pb-2 px-1">
          <h2 className="text-lg font-black text-[#1C1008] tracking-wide">أقسام المنصة الذكية</h2>
          <p className="text-xs text-[#7A6A58] mt-0.5">وصول سريع ومنظم لكافة أجهزة وأدوات المتابعة والتقييم الرياضي</p>
        </div>

        <div className="space-y-6">
          {/* الفئة الأولى: الإدارة والملفات */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-primary bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              منصة الإدارة والملفات الأساسية
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SectionCard href="/dashboard/supervisors" title="الموجهون" desc="ملفات الموجهين والتقييم الذاتي للأداء" count={totalSupervisors} svgIcon={<IconSupervisors size={44} />} color="primary" />
              <SectionCard href="/dashboard/schools" title="المدارس والتوزيع" desc="إسناد المدارس وحصص التغطية الجغرافية" count={totalSchools} svgIcon={<IconSchools size={44} />} color="gold" />
              <SectionCard href="/dashboard/activity" title="سجل النشاط الرياضي" desc="إدخال ومراجعة التقارير الشهرية والأنشطة" svgIcon={<IconActivity size={44} />} color="blue" />
            </div>
          </div>

          {/* الفئة الثانية: المؤشرات والتقارير */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gold-dark bg-gold/5 w-fit px-3 py-1 rounded-full border border-gold/10 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-dark animate-pulse" />
              المؤشرات والتحليلات الإحصائية
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SectionCard href="/dashboard/reports" title="التقارير والإحصائيات" desc="أفضل الموجهين، المقارنات، والرسوم البيانية الشاملة" svgIcon={<IconReports size={44} />} color="gold" />
              <SectionCard href="/dashboard/coverage" title="التغطية والمؤشرات" desc="تحليلات دقيقة لمعدلات ونسب التغطية" svgIcon={<IconMetrics size={44} />} color="green" />
              <SectionCard href="/dashboard/forms" title="الاستمارات والتقارير" desc="إصدار وإدارة الاستمارات الرقمية بنقرة" svgIcon={<IconForms size={44} />} color="primary" />
              <SectionCard href="/dashboard/remote" title="التعلم عن بعد" desc="إحصائيات واستطلاعات الرأي الرقمية الشاملة" svgIcon={<IconRemote size={44} />} color="blue" />
            </div>
          </div>

          {/* الفئة الثالثة: العمليات والتهيئة العامة */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-sky-800 bg-sky-50 w-fit px-3 py-1 rounded-full border border-sky-200/50 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              العمليات العامة والتهيئة
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SectionCard href="/dashboard/interviews" title="المقابلات والتوظيف" desc="تقييم وفرز المرشحين لوظائف التوجيه" svgIcon={<IconInterviews size={44} />} color="gold" />
              <SectionCard href="/dashboard/settings" title="الإعدادات والصلاحيات" desc="تهيئة النظام والتحكم بصلاحيات المستخدمين" svgIcon={<IconSettings size={44} />} color="primary" />
            </div>
          </div>
        </div>
      </section>

      {/* لوحة شرف الموجهين الأفضل تغطيةً (Supervisors Leaderboard) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1 border-b border-[#2A1418]/5 pb-2">
          <div>
            <h2 className="text-lg font-black text-[#1C1008]">لوحة شرف الأداء والتغطية</h2>
            <p className="text-xs text-[#7A6A58] mt-0.5">ترتيب الموجهين الأقسام حسب أعلى نسبة تغطية للمدارس</p>
          </div>
          <Link href="/dashboard/coverage" className="text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2 flex items-center gap-1 transition-colors border border-primary/10 shadow-sm">
            <span>عرض التقرير الكامل</span>
            <ChevronLeft size={14} className="transform hover:-translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* الموبايل: بطاقات سجلات فائقة الأناقة واللمعان */}
        <Stagger className="space-y-3 lg:hidden">
          {ranked.slice(0, 6).map((row, i) => (
            <StaggerItem key={row._id} className="card-luxurious p-4 flex items-center gap-4 hover:shadow-lg transition-shadow duration-300">
              <span className={`shrink-0 crown-badge ${
                i === 0 ? "crown-gold" : i === 1 ? "crown-silver" : i === 2 ? "crown-bronze" : "bg-black/[0.04] text-[#A89A92] border border-black/[0.05]"
              }`}>
                {i + 1}
              </span>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[#1C1008] text-sm truncate">{row.supervisor?.name ?? "—"}</p>
                  <StatusBadge status={row.status} />
                </div>
                
                <div className="flex items-center gap-2.5 mt-2.5">
                  <div className="progress-track flex-1 h-[7px] bg-black/[0.06] rounded-full overflow-hidden">
                    <div className="progress-fill h-full rounded-full bg-gradient-to-r from-gold-dark to-gold" style={{ width: `${Math.min(row.coverageRate, 100)}%` }} />
                  </div>
                  <span className="text-xs font-black text-[#1C1008] w-10 text-left font-sans">{Math.round(row.coverageRate)}%</span>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-[#7A6A58] mt-2 border-t border-black/[0.03] pt-2">
                  <span>المدارس: <strong className="text-primary font-bold">{row.schoolsCovered}</strong> / {row.schoolsRequired}</span>
                  <span>الاستمارات: <strong className="text-gold-dark font-bold">{row.formsCount}</strong></span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* سطح المكتب: جدول زجاجي كريستالي مذهل */}
        <FadeIn className="glass-table-container hidden lg:block">
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th className="!text-center !w-16">الترتيب</th>
                  <th className="text-right">الموجّه التربوي</th>
                  <th className="text-center">المدارس المغطاة / المطلوبة</th>
                  <th className="text-center">الاستمارات المرفوعة</th>
                  <th className="text-center">نسبة التغطية الكلية</th>
                  <th className="text-center">حالة الزيارات</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((row, i) => (
                  <tr key={row._id} className="group">
                    <td className="text-center">
                      <div className="flex justify-center">
                        <span className={`crown-badge ${
                          i === 0 ? "crown-gold" : i === 1 ? "crown-silver" : i === 2 ? "crown-bronze" : "bg-black/[0.04] text-[#A89A92] border border-black/[0.05]"
                        }`}>
                          {i + 1}
                        </span>
                      </div>
                    </td>
                    <td className="font-bold text-[#1C1008]">
                      {row.supervisor ? (
                        <Link href={`/dashboard/supervisors/${row.supervisor._id}`} className="hover:text-primary hover:underline transition-colors decoration-wavy decoration-gold">
                          {row.supervisor.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-center">
                      <div className="inline-flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-xl border border-primary/5">
                        <span className="font-extrabold text-primary font-sans">{row.schoolsCovered}</span>
                        <span className="text-[#C0B3AA] text-xs">/ {row.schoolsRequired}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-xl bg-gold/10 text-gold-dark font-extrabold text-xs border border-gold/10 font-sans">
                        {row.formsCount}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="progress-track w-28 h-2 bg-black/[0.05] rounded-full overflow-hidden">
                          <div className="progress-fill h-full rounded-full bg-gradient-to-r from-gold-dark to-gold" style={{ width: `${Math.min(row.coverageRate, 100)}%` }} />
                        </div>
                        <span className="text-xs font-black text-[#1C1008] w-10 text-left font-sans">{Math.round(row.coverageRate)}%</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-gold/10 border-t-gold animate-spin" />
        <div className="absolute inset-2 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin" style={{ animationDirection: "reverse", animationDuration: "1s" }} />
      </div>
    </div>
  );
}
