"use client";

/**
 * صفحة التقارير والإحصائيات الشاملة
 * ────────────────────────────────────
 * ① KPI Bar        — 4 مؤشرات رئيسية سريعة
 * ② Champion       — بطل الموجهين (الأول + الثاني + الثالث)
 * ③ Coverage Chart — مخطط شريطي أفقي: نسبة التغطية لكل موجه
 * ④ Activity Chart — مخطط نشاط: زيارات / مكتب / تطوير لكل موجه
 * ⑤ Rankings Table — جدول ترتيب كامل مع شرائط تقدم
 */

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/Motion";
import { motion } from "framer-motion";
import {
  Trophy, Medal, Users, School, ClipboardCheck,
  TrendingUp, Star, Award, Eye, ChevronLeft, Download,
} from "lucide-react";
import Link from "next/link";
import { useActiveYear } from "@/hooks/useActiveYear";
import { exportToExcel } from "@/lib/exportExcel";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ── ألوان الرسوم البيانية ─────────────────────────────────────── */
const CHART_TOOLTIP = {
  borderRadius: 16,
  border: "1px solid rgba(201,169,110,0.18)",
  fontSize: 12,
  fontFamily: "'Cairo', sans-serif",
  boxShadow: "0 8px 30px -10px rgba(0,0,0,0.12)",
};

/* ════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { token } = useAuth();
  const YEAR = useActiveYear();
  const coverage  = useQuery(api.coverage.listByYear,  token ? { academicYear: YEAR, token } : "skip");
  const summaries = useQuery(api.activity.summaries,   token ? { academicYear: YEAR, token } : "skip");

  /* ── حساب المؤشرات المشتقة ──────────────────────────────────── */
  const stats = useMemo(() => {
    if (!coverage || !summaries) return null;

    const totalSupervisors = coverage.length;
    const totalSchools     = coverage.reduce((s, r) => s + r.schoolsRequired, 0);
    const totalCovered     = coverage.reduce((s, r) => s + r.schoolsCovered, 0);
    const totalForms       = coverage.reduce((s, r) => s + r.formsCount, 0);

    // إجمالي الزيارات من ملخصات النشاط
    const totalVisits = summaries.reduce(
      (s, r) => s + (r.VS ?? 0) + (r.VP ?? 0),
      0
    );

    const avgCoverage = totalSupervisors
      ? Math.round(coverage.reduce((s, r) => s + r.coverageRate, 0) / totalSupervisors)
      : 0;

    // ترتيب الموجهين تنازلياً حسب نسبة التغطية
    const ranked = [...coverage].sort((a, b) => b.coverageRate - a.coverageRate);

    // دمج بيانات النشاط مع التغطية
    const sumMap = new Map(summaries.map((s) => [s.supervisorId, s]));

    const merged = ranked.map((r) => {
      const act = sumMap.get(r.supervisorId);
      const visits = (act?.VS ?? 0) + (act?.VP ?? 0);
      const office = act?.OF ?? 0;
      const develop = (act?.TR ?? 0) + (act?.MT ?? 0);
      return { ...r, visits, office, develop };
    });

    return {
      totalSupervisors, totalSchools, totalCovered,
      totalForms, totalVisits, avgCoverage, ranked: merged,
    };
  }, [coverage, summaries]);

  /* ── بيانات الرسوم البيانية ──────────────────────────────────────
     shortLabel: كلمتان فقط بحد أقصى 14 حرفاً ← يضمن عدم التفاف
     fullName: للـ Tooltip فقط                                    */
  const shortLabel = (full?: string | null) => {
    if (!full) return "—";
    const words = full.trim().split(/\s+/);
    const label = words.slice(0, 2).join(" ");
    return label.length > 14 ? label.slice(0, 13) + "…" : label;
  };

  const coverageChartData = useMemo(
    () =>
      (stats?.ranked ?? []).map((r) => ({
        name: shortLabel(r.supervisor?.name),
        fullName: r.supervisor?.name ?? "—",
        نسبة: Math.round(r.coverageRate),
        supId: r.supervisorId,
      })),
    [stats]
  );

  const activityChartData = useMemo(
    () =>
      (stats?.ranked ?? []).map((r) => ({
        name: shortLabel(r.supervisor?.name),
        fullName: r.supervisor?.name ?? "—",
        زيارات: r.visits,
        مكتب: r.office,
        تطوير: r.develop,
      })),
    [stats]
  );

  if (!coverage || !summaries || !stats) return <Loading />;

  const [gold, silver, bronze] = stats.ranked;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="التقارير والإحصائيات"
          subtitle={`تحليل شامل لأداء الموجهين — العام الدراسي ${YEAR}`}
          icon={<TrendingUp size={26} />}
          action={stats ? (
            <button
              onClick={() => exportToExcel(
                stats.ranked.map((r) => ({
                  name: r.supervisor?.name ?? "—",
                  required: r.schoolsRequired,
                  covered: r.schoolsCovered,
                  forms: r.formsCount,
                  coverageRate: `${Math.round(r.coverageRate)}%`,
                  visits: r.visits,
                  office: r.office,
                  develop: r.develop,
                  status: r.status ?? "—",
                })),
                [
                  { key: "name",         label: "الموجه" },
                  { key: "required",     label: "المدارس المطلوبة" },
                  { key: "covered",      label: "المدارس المغطاة" },
                  { key: "forms",        label: "الاستمارات" },
                  { key: "coverageRate", label: "نسبة التغطية" },
                  { key: "visits",       label: "الزيارات" },
                  { key: "office",       label: "أيام مكتبية" },
                  { key: "develop",      label: "تطوير مهني" },
                  { key: "status",       label: "الحالة" },
                ],
                `التقارير_${YEAR}`
              )}
              className="btn-ghost text-xs !py-2 !px-3 no-print"
            >
              <Download size={14} /> Excel
            </button>
          ) : undefined}
        />
        <Link
          href="/dashboard/reports/print"
          target="_blank"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-extrabold text-sm text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #5C1523, #3B0A14)", boxShadow: "0 4px 16px rgba(92,21,35,0.35)" }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
            />
          </svg>
          تصدير PDF
        </Link>
      </div>

      {/* ① KPI Bar ─────────────────────────────────────────────── */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StaggerItem>
          <KpiTile
            icon={<Users size={20} />}
            label="إجمالي الموجهين"
            value={stats.totalSupervisors}
            color="primary"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            icon={<School size={20} />}
            label="مدارس مغطّاة"
            value={`${stats.totalCovered} / ${stats.totalSchools}`}
            color="gold"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            icon={<Eye size={20} />}
            label="إجمالي الزيارات"
            value={stats.totalVisits}
            color="blue"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            icon={<ClipboardCheck size={20} />}
            label="الاستمارات المنجزة"
            value={stats.totalForms}
            color="green"
          />
        </StaggerItem>
      </Stagger>

      {/* ① بوابة التقارير التفصيلية ───────────────────────────────── */}
      <FadeIn delay={0.02}>
        <Link
          href="/dashboard/reports/field-visits"
          className="group card-luxurious p-4 sm:p-5 flex items-center gap-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="icon-orb !w-12 !h-12 shrink-0 bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white shadow-md shadow-gold/20">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[#2A1418] text-sm leading-snug">حصر الزيارات الميدانية</p>
            <p className="text-xs text-[#8A7A72] font-semibold mt-0.5 leading-relaxed">
              جميع الاستمارات والزيارات مجمّعة حسب الموجه — مع فلتر النوع والحالة وخيار الطباعة PDF
            </p>
          </div>
          <ChevronLeft size={18} className="text-gold-dark group-hover:text-primary transition-colors shrink-0" />
        </Link>
      </FadeIn>

      {/* ② Champion Section ─────────────────────────────────────── */}
      <FadeIn>
        <div className="space-y-4">
          <SectionLabel icon={<Trophy size={15} />} text="لوحة شرف الأداء — أفضل الموجهين" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* البطل الأول */}
            {gold && (
              <motion.div
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="lg:col-span-1 relative overflow-hidden rounded-3xl p-6
                  bg-gradient-to-br from-[#5C1523] to-[#3B0A14]
                  border border-[#C9A96E]/20 shadow-2xl shadow-[#5C1523]/30"
              >
                <div className="pattern-arabesque absolute inset-0 opacity-30 pointer-events-none" />
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#C9A96E]/10 blur-3xl" />

                <div className="relative space-y-4">
                  {/* شارة الذهب */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-[#C9A96E]/20 border border-[#C9A96E]/30 text-[#DFC48E] text-xs font-extrabold px-3 py-1.5 rounded-full">
                      <Trophy size={13} className="text-[#C9A96E]" />
                      الأول — أفضل أداء
                    </span>
                  </div>

                  {/* الاسم والمسمى */}
                  <div>
                    <p className="text-xl font-extrabold text-white leading-snug">
                      {gold.supervisor?.name ?? "—"}
                    </p>
                    <p className="text-xs text-white/50 mt-1">{gold.supervisor?.jobTitle ?? "موجه تربوي"}</p>
                  </div>

                  {/* الإحصاءات */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <ChampStat value={`${Math.round(gold.coverageRate)}%`} label="تغطية" highlight />
                    <ChampStat value={gold.schoolsCovered} label="مدرسة" />
                    <ChampStat value={gold.formsCount} label="استمارة" />
                  </div>

                  {/* شريط تقدم */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-white/50">
                      <span>نسبة التغطية الكاملة</span>
                      <span className="text-[#DFC48E] font-bold">{Math.round(gold.coverageRate)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(gold.coverageRate, 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
                        className="h-full rounded-full bg-gradient-to-l from-[#DFC48E] to-[#C9A96E]"
                      />
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/supervisors/${gold.supervisorId}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#DFC48E] hover:text-white transition-colors"
                  >
                    <Star size={12} /> عرض الملف الكامل
                  </Link>
                </div>
              </motion.div>
            )}

            {/* الثاني والثالث */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { row: silver, rank: 2, label: "الثاني", icon: <Medal size={14} />, accent: "#A8A8B8", bg: "from-[#4A4458]/10 to-[#3A3448]/5", border: "border-[#9090A8]/20", badge: "bg-[#E8E8F0] text-[#5A5A7A]" },
                { row: bronze,  rank: 3, label: "الثالث", icon: <Award  size={14} />, accent: "#C17B3A", bg: "from-[#7A4A1A]/10 to-[#5A3410]/5", border: "border-[#C17B3A]/20", badge: "bg-[#FAE8D0] text-[#7A4A1A]" },
              ].map(({ row, rank, label, icon, accent, bg, border, badge }) =>
                row ? (
                  <RunnerUp
                    key={rank}
                    row={row}
                    rank={rank}
                    label={label}
                    icon={icon}
                    accent={accent}
                    bg={bg}
                    border={border}
                    badge={badge}
                  />
                ) : null
              )}

              {/* متوسط الأداء */}
              <FadeIn delay={0.1} className="sm:col-span-2">
                <div className="card-luxurious p-5 flex items-center gap-5 bg-gradient-to-l from-gold/5 to-transparent">
                  <div className="icon-orb bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white shadow-md shrink-0">
                    <TrendingUp size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#8A7A72]">متوسط التغطية الكلي للقسم</p>
                    <p className="text-3xl font-extrabold text-[#2A1418] font-sans leading-none mt-1">
                      {stats.avgCoverage}
                      <span className="text-base text-[#8A7A72] font-bold">%</span>
                    </p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(stats.avgCoverage, 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
                        className="h-full rounded-full bg-gradient-to-l from-[#A8853A] to-[#DFC48E]"
                      />
                    </div>
                    <p className="text-[10px] text-[#A89A92] mt-1.5 text-center">من أصل 100%</p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ③ + ④ الرسوم البيانية ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── نسبة تغطية المدارس — شرائط HTML مخصصة ──────────────── */}
        <FadeIn delay={0.05}>
          <div className="card-luxurious p-5 flex flex-col">
            <SectionLabel icon={<School size={15} />} text="نسبة تغطية المدارس لكل موجه" className="mb-4" />
            <div className="overflow-y-auto space-y-2.5" style={{ maxHeight: 460 }}>
              {coverageChartData.map((row, i) => (
                <CoverageBar key={row.supId} rank={i} name={row.fullName} pct={row.نسبة} />
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ── توزيع النشاط — شرائط HTML مخصصة ────────────────────── */}
        <FadeIn delay={0.1}>
          <div className="card-luxurious p-5 flex flex-col">
            <SectionLabel icon={<Eye size={15} />} text="توزيع النشاط: زيارات / مكتب / تطوير" className="mb-3" />
            {/* مفتاح */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {([["#5C1523","زيارات"],["#C9A96E","مكتب"],["#7AB8C9","تطوير"]] as const).map(([c,l])=>(
                <span key={l} className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b5a52]">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{background:c}}/>
                  {l}
                </span>
              ))}
            </div>
            <div className="overflow-y-auto space-y-2.5" style={{ maxHeight: 430 }}>
              {activityChartData.map((row, i) => (
                <ActivityBar
                  key={i}
                  name={row.fullName}
                  visits={row.زيارات}
                  office={row.مكتب}
                  develop={row.تطوير}
                />
              ))}
            </div>
          </div>
        </FadeIn>

      </div>

      {/* ⑤ توزيع أكواد النشاط — دوائر SVG ─────────────────────── */}
      <FadeIn delay={0.05}>
        <div className="space-y-3">
          <SectionLabel icon={<TrendingUp size={15} />} text="توزيع أيام النشاط الإجمالي لكل الموجهين" />
          <div className="card-luxurious p-6 bg-white/80">
            <ActivityDonutGrid summaries={summaries} />
          </div>
        </div>
      </FadeIn>

      {/* ⑥ Rankings Table ───────────────────────────────────────── */}
      <FadeIn delay={0.05}>
        <div className="space-y-3">
          <SectionLabel icon={<Users size={15} />} text="الترتيب الكامل لجميع الموجهين" />

          {/* جدول سطح المكتب */}
          <div className="hidden md:block glass-table-container">
            <table className="glass-table w-full">
              <thead>
                <tr>
                  <th className="text-center w-14">#</th>
                  <th className="text-right">الموجه</th>
                  <th className="text-center">المدارس</th>
                  <th className="text-center">الاستمارات</th>
                  <th className="text-center">الزيارات</th>
                  <th className="text-center w-48">نسبة التغطية</th>
                  <th className="text-center">الحالة</th>
                  <th className="text-center w-10"> </th>
                </tr>
              </thead>
              <tbody>
                {stats.ranked.map((row, i) => (
                  <motion.tr
                    key={row._id}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.35, ease: EASE, delay: i * 0.04 }}
                    className="group"
                  >
                    <td className="text-center">
                      <span className={`crown-badge mx-auto ${
                        i === 0 ? "crown-gold"
                        : i === 1 ? "crown-silver"
                        : i === 2 ? "crown-bronze"
                        : "bg-black/[0.04] text-[#A89A92] border border-black/[0.06]"
                      }`}>
                        {i + 1}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                          {row.supervisor?.name?.split(" ").slice(0, 2).map((w) => w[0]).join("") ?? "—"}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#2A1418] text-sm leading-snug">
                            {row.supervisor?.name ?? "—"}
                          </p>
                          <p className="text-[11px] text-[#A89A92]">{row.supervisor?.jobTitle ?? "موجه"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-xl border border-primary/5 font-sans">
                        <span className="font-extrabold text-primary text-sm">{row.schoolsCovered}</span>
                        <span className="text-[#C0B3AA] text-xs">/ {row.schoolsRequired}</span>
                      </span>
                    </td>

                    <td className="text-center">
                      <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-xl bg-gold/10 text-gold-dark font-extrabold text-sm border border-gold/10 font-sans">
                        {row.formsCount}
                      </span>
                    </td>

                    <td className="text-center">
                      <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 font-extrabold text-sm border border-sky-100 font-sans">
                        {row.visits}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center gap-2.5 px-2">
                        <div className="flex-1 h-2 rounded-full bg-black/[0.05] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.min(row.coverageRate, 100)}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.03 }}
                            className={`h-full rounded-full ${
                              row.coverageRate >= 100 ? "bg-gradient-to-l from-emerald-400 to-emerald-500"
                              : row.coverageRate >= 80  ? "bg-gradient-to-l from-[#5C1523] to-[#7A1E30]"
                              : "bg-gradient-to-l from-orange-400 to-orange-500"
                            }`}
                          />
                        </div>
                        <span className={`text-sm font-black font-sans w-11 text-left ${
                          row.coverageRate >= 100 ? "text-emerald-600"
                          : row.coverageRate >= 80  ? "text-primary"
                          : "text-orange-500"
                        }`}>
                          {Math.round(row.coverageRate)}%
                        </span>
                      </div>
                    </td>

                    <td className="text-center">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="text-center">
                      <Link
                        href={`/dashboard/supervisors/${row.supervisorId}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-[#C0B3AA] hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* بطاقات الموبايل */}
          <Stagger className="md:hidden space-y-3">
            {stats.ranked.map((row, i) => (
              <StaggerItem key={row._id}>
                <MobileRankCard row={row} rank={i + 1} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </FadeIn>
    </div>
  );
}

/* ════ مكوّنات مساعدة ════════════════════════════════════════════ */

function KpiTile({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "primary" | "gold" | "blue" | "green";
}) {
  const orbCls = {
    primary: "bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] text-[#DFC48E]",
    gold:    "bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white",
    blue:    "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
    green:   "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white",
  }[color];
  const bar = {
    primary: "from-[#5C1523] to-[#7A1E30]",
    gold:    "from-[#A8853A] to-[#DFC48E]",
    blue:    "from-sky-500 to-sky-400",
    green:   "from-emerald-500 to-emerald-400",
  }[color];

  return (
    <div className="card-luxurious relative overflow-hidden p-5 flex items-center gap-4">
      <div className={`absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-l ${bar}`} />
      <div className={`icon-orb ${orbCls} shadow-md shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#8A7A72] truncate">{label}</p>
        <p className="text-2xl font-extrabold text-[#2A1418] font-sans leading-none mt-1">{value}</p>
      </div>
    </div>
  );
}

function ChampStat({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-extrabold font-sans ${highlight ? "text-[#DFC48E]" : "text-white/80"}`}>
        {value}
      </p>
      <p className="text-[10px] font-bold text-white/40 mt-0.5">{label}</p>
    </div>
  );
}

function RunnerUp({ row, rank, label, icon, accent, bg, border, badge }: {
  row: ReturnType<typeof Array.prototype.find>; rank: number;
  label: string; icon: React.ReactNode; accent: string;
  bg: string; border: string; badge: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={`card-luxurious p-5 bg-gradient-to-br ${bg} border ${border} overflow-hidden`}
    >
      <div className="space-y-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full ${badge}`}>
          {icon} {label}
        </span>
        <div>
          <p className="font-extrabold text-[#2A1418] leading-snug text-sm">
            {row?.supervisor?.name ?? "—"}
          </p>
          <p className="text-xs text-[#A89A92] mt-0.5">{row?.supervisor?.jobTitle ?? "موجه"}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/[0.05]">
          <div className="text-center">
            <p className="text-base font-extrabold font-sans" style={{ color: accent }}>
              {Math.round(row?.coverageRate ?? 0)}%
            </p>
            <p className="text-[10px] text-[#A89A92]">تغطية</p>
          </div>
          <div className="text-center">
            <p className="text-base font-extrabold text-[#2A1418] font-sans">{row?.schoolsCovered ?? 0}</p>
            <p className="text-[10px] text-[#A89A92]">مدرسة</p>
          </div>
          <div className="text-center">
            <p className="text-base font-extrabold text-[#2A1418] font-sans">{row?.formsCount ?? 0}</p>
            <p className="text-[10px] text-[#A89A92]">استمارة</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${Math.min(row?.coverageRate ?? 0, 100)}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(to left, ${accent}, ${accent}88)` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function MobileRankCard({ row, rank }: { row: any; rank: number }) {
  return (
    <Link
      href={`/dashboard/supervisors/${row.supervisorId}`}
      className="card-luxurious p-4 flex items-center gap-4 hover:shadow-lg transition-shadow duration-300 block"
    >
      <span className={`crown-badge shrink-0 ${
        rank === 1 ? "crown-gold"
        : rank === 2 ? "crown-silver"
        : rank === 3 ? "crown-bronze"
        : "bg-black/[0.04] text-[#A89A92] border border-black/[0.06]"
      }`}>
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[#2A1418] text-sm truncate">{row.supervisor?.name ?? "—"}</p>
        <div className="flex items-center gap-3 mt-2.5">
          <div className="flex-1 h-[7px] bg-black/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#A8853A] to-[#DFC48E]"
              style={{ width: `${Math.min(row.coverageRate, 100)}%` }}
            />
          </div>
          <span className="text-xs font-black text-[#2A1418] font-sans w-10 text-left">
            {Math.round(row.coverageRate)}%
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8A7A72]">
          <span>مدارس: <strong className="text-primary">{row.schoolsCovered}/{row.schoolsRequired}</strong></span>
          <span>·</span>
          <span>استمارات: <strong className="text-gold-dark">{row.formsCount}</strong></span>
          <span>·</span>
          <span>زيارات: <strong className="text-sky-600">{row.visits}</strong></span>
        </div>
      </div>

      <StatusBadge status={row.status} />
    </Link>
  );
}

/* ── شريط تغطية واحد ─────────────────────────────────────────── */
const BAR_COLORS = ["#C9A96E", "#A8853A", "#C17B3A"];

function CoverageBar({ rank, name, pct }: { rank: number; name: string; pct: number }) {
  const fill = rank < 3 ? BAR_COLORS[rank] : "#5C1523";
  const opacity = rank < 3 ? 1 : 0.82;
  return (
    <div className="flex items-center gap-3 group">
      {/* رقم الترتيب */}
      <span className={`shrink-0 w-6 text-center text-[11px] font-extrabold font-sans ${
        rank === 0 ? "text-[#C9A96E]" : rank === 1 ? "text-[#A8853A]" : rank === 2 ? "text-[#C17B3A]" : "text-[#A89A92]"
      }`}>{rank + 1}</span>

      {/* الاسم — CSS truncate يعمل هنا بعكس SVG */}
      <span className="w-36 shrink-0 text-[11px] font-bold text-[#5b4a3e] truncate text-right" title={name}>
        {name}
      </span>

      {/* الشريط */}
      <div className="flex-1 h-4 rounded-full bg-black/[0.05] overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(pct, 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16,1,0.3,1], delay: rank * 0.02 }}
          style={{ background: fill, opacity }}
        />
      </div>

      {/* النسبة */}
      <span className={`shrink-0 w-10 text-left text-[11px] font-extrabold font-sans ${
        pct >= 100 ? "text-emerald-600" : pct >= 80 ? "text-[#5C1523]" : "text-orange-500"
      }`}>{pct}%</span>
    </div>
  );
}

/* ── شريط نشاط واحد (٣ أجزاء ملوّنة) ───────────────────────── */
function ActivityBar({ name, visits, office, develop }: {
  name: string; visits: number; office: number; develop: number;
}) {
  const total = Math.max(visits + office + develop, 1);
  const vPct  = (visits  / total) * 100;
  const oPct  = (office  / total) * 100;
  const dPct  = (develop / total) * 100;
  const maxVal = Math.max(visits, office, develop, 1);

  return (
    <div className="flex items-center gap-3 group">
      {/* الاسم */}
      <span className="w-36 shrink-0 text-[11px] font-bold text-[#5b4a3e] truncate text-right" title={name}>
        {name}
      </span>

      {/* الشريط المقسّم */}
      <div className="flex-1 flex h-4 rounded-full overflow-hidden gap-px bg-black/[0.04]">
        {vPct > 0 && (
          <motion.div
            className="h-full"
            style={{ background: "#5C1523", width: `${vPct}%` }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            title={`زيارات: ${visits}`}
          />
        )}
        {oPct > 0 && (
          <motion.div
            className="h-full"
            style={{ background: "#C9A96E", width: `${oPct}%` }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            title={`مكتب: ${office}`}
          />
        )}
        {dPct > 0 && (
          <motion.div
            className="h-full"
            style={{ background: "#7AB8C9", width: `${dPct}%` }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            title={`تطوير: ${develop}`}
          />
        )}
      </div>

      {/* إجمالي الأيام */}
      <span className="shrink-0 w-8 text-left text-[11px] font-extrabold font-sans text-[#2A1418]">
        {visits + office + develop}
      </span>
    </div>
  );
}

const CODE_GROUPS = [
  { key: ["VS"],                label: "زيارات ميدانية", color: "#10b981", bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200/60" },
  { key: ["OF"],                label: "عمل مكتبي",      color: "#7A1E30", bg: "bg-rose-50",     text: "text-rose-800",     border: "border-rose-200/60"    },
  { key: ["TR","MT","OL"],      label: "تطوير مهني",     color: "#0ea5e9", bg: "bg-sky-50",      text: "text-sky-700",      border: "border-sky-200/60"     },
  { key: ["AC","SP","VP"],      label: "أنشطة ومهام",    color: "#f59e0b", bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200/60"   },
  { key: ["LV","SL","WP","CL"], label: "إجازات وأذونات", color: "#fb923c", bg: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-200/60"  },
  { key: ["AB"],                label: "غياب",            color: "#ef4444", bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200/60"     },
];

const TTP_STYLE = {
  background: "rgba(255,255,255,0.97)",
  border: "1px solid rgba(201,169,110,0.18)",
  borderRadius: 14,
  fontSize: 12,
  fontFamily: "'Cairo', sans-serif",
  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)",
  direction: "rtl" as const,
};

function ActivityDonutGrid({ summaries }: { summaries: any[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const totals = CODE_GROUPS.map(g => ({
    ...g,
    count: summaries.reduce((s, r) => s + g.key.reduce((ss, k) => ss + (r[k] ?? 0), 0), 0),
  }));
  const grand = totals.reduce((s, g) => s + g.count, 0);

  const pieData = totals.map(g => ({
    name: g.label,
    value: g.count,
    color: g.color,
  }));

  // بيانات الأشرطة المكدّسة لكل موجه
  const supRows = summaries
    .filter((s: any) => s.supervisor?.name)
    .map((s: any) => {
      const get = (keys: string[]) => keys.reduce((t, k) => t + ((s as Record<string,number>)[k] ?? 0), 0);
      const total = CODE_GROUPS.reduce((t, g) => t + get(g.key), 0);
      const row: Record<string, unknown> = {
        name: (s.supervisor.name as string).split(" ").slice(0, 2).join(" "),
        fullName: s.supervisor.name as string,
        total,
      };
      CODE_GROUPS.forEach(g => { row[g.label] = get(g.key); });
      return row;
    })
    .filter((s: any) => s.total > 0)
    .sort((a: any, b: any) => (b.total as number) - (a.total as number));

  return (
    <div className="space-y-8">

      {/* ── قسم 1: دائرة + بطاقات ── */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Pie Chart */}
        <div className="relative shrink-0 w-full lg:w-60">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={62} outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                onMouseEnter={(_: unknown, i: number) => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                    style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                  />
                ))}
              </Pie>
              <RTooltip
                contentStyle={TTP_STYLE}
                formatter={(v: number, name: string) => [
                  `${v} يوم — ${grand > 0 ? Math.round(v / grand * 100) : 0}%`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-[26px] font-black text-[#2A1418] font-sans leading-none">{grand.toLocaleString("en-US")}</p>
              <p className="text-[11px] font-bold text-[#A89A92] mt-1">إجمالي الأيام</p>
            </div>
          </div>
        </div>

        {/* بطاقات الفئات */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full self-center">
          {totals.map((g, i) => {
            const pct = grand > 0 ? Math.round((g.count / grand) * 100) : 0;
            return (
              <div
                key={g.label}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                className={`relative overflow-hidden rounded-2xl p-4 border transition-all duration-200 cursor-default
                  ${g.bg} ${g.border}
                  ${activeIdx === i ? "shadow-md scale-[1.02]" : "shadow-sm hover:shadow-md"}`}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: g.color }} />
                <div className="flex items-start justify-between gap-1">
                  <p className={`text-[11px] font-bold leading-tight ${g.text}`}>{g.label}</p>
                  <span className="text-[11px] font-black shrink-0" style={{ color: g.color }}>{pct}%</span>
                </div>
                <p className="text-[26px] font-black text-[#2A1418] font-sans leading-none mt-2">{g.count}</p>
                <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, background: g.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── قسم 2: شريط مكدّس أفقي لكل موجه ── */}
      {supRows.length > 0 && (
        <div className="space-y-4 border-t border-black/[0.05] pt-6">
          {/* رأس القسم */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-gold" />
            <p className="text-sm font-extrabold text-[#1C1008]">توزيع أيام كل موجه على حدة</p>
            <span className="text-[10px] font-bold text-[#A89A92] bg-black/[0.04] px-2 py-0.5 rounded-full">{supRows.length} موجه</span>
          </div>

          {/* مفتاح الألوان */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pb-1">
            {CODE_GROUPS.map(g => (
              <div key={g.label} className="flex items-center gap-1.5">
                <div className="w-3 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                <span className="text-[10px] font-bold text-[#7A6A58]">{g.label}</span>
              </div>
            ))}
          </div>

          {/* الأشرطة */}
          <div className="space-y-2.5">
            {(supRows as any[]).map((row, i) => {
              const total = (row.total as number) || 0;
              return (
                <div key={i} className="flex items-center gap-3 group">
                  {/* الاسم — عرض ثابت RTL */}
                  <p
                    className="text-[11px] font-extrabold text-[#1C1008] text-right shrink-0 leading-tight"
                    style={{ width: 148, direction: "rtl" }}
                    title={row.fullName as string}
                  >
                    {(row.fullName as string).split(" ").slice(0, 3).join(" ")}
                  </p>
                  {/* الشريط المكدّس */}
                  <div className="flex-1 flex h-6 rounded-lg overflow-hidden bg-black/[0.04]">
                    {CODE_GROUPS.map(g => {
                      const val = (row[g.label] as number) ?? 0;
                      const pct = total > 0 ? (val / total) * 100 : 0;
                      return pct >= 1 ? (
                        <div
                          key={g.label}
                          style={{ width: `${pct}%`, background: g.color }}
                          title={`${g.label}: ${val} يوم`}
                          className="transition-opacity duration-200 group-hover:opacity-90 first:rounded-r-lg last:rounded-l-lg"
                        />
                      ) : null;
                    })}
                  </div>
                  {/* الإجمالي */}
                  <span className="shrink-0 text-[11px] font-extrabold text-[#2A1418] font-sans w-7 text-left">
                    {total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon, text, className = "" }: { icon: React.ReactNode; text: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#5C1523] bg-[#5C1523]/[0.06] border border-[#5C1523]/10 rounded-full px-3 py-1.5">
        <span className="text-gold-dark">{icon}</span>
        {text}
      </span>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-gold/10 border-t-gold animate-spin" />
        <div className="absolute inset-2 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1s" }} />
      </div>
    </div>
  );
}
