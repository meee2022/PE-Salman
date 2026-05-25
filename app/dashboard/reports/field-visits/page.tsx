"use client";

import { useMemo, useState, Fragment } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton, PrintHeader } from "@/components/ui/PrintReport";
import {
  School, CheckCircle2, MapPin, Users, ChevronLeft,
  TrendingUp, Building2, BookOpen,
} from "lucide-react";
import Link from "next/link";

/* ── ترتيب المراحل وألوانها ────────────────────────────────────── */
const STAGE_META: Record<string, { order: number; bg: string; text: string; dot: string }> = {
  "ابتدائي بنين":  { order: 0,  bg: "bg-sky-50",     text: "text-sky-800",    dot: "bg-sky-400"    },
  "إعدادي بنين":   { order: 1,  bg: "bg-emerald-50",  text: "text-emerald-800", dot: "bg-emerald-400" },
  "ثانوي بنين":    { order: 2,  bg: "bg-violet-50",   text: "text-violet-800",  dot: "bg-violet-400"  },
  "مشتركة بنين":   { order: 3,  bg: "bg-orange-50",   text: "text-orange-800",  dot: "bg-orange-400"  },
  "تخصصية بنين":   { order: 4,  bg: "bg-red-50",      text: "text-red-800",     dot: "bg-red-400"     },
  "نموذجية":       { order: 5,  bg: "bg-amber-50",    text: "text-amber-800",   dot: "bg-amber-400"   },
  "ابتدائي بنات":  { order: 6,  bg: "bg-pink-50",     text: "text-pink-800",    dot: "bg-pink-400"    },
  "إعدادي بنات":   { order: 7,  bg: "bg-teal-50",     text: "text-teal-800",    dot: "bg-teal-400"    },
  "ثانوي بنات":    { order: 8,  bg: "bg-purple-50",   text: "text-purple-800",  dot: "bg-purple-400"  },
  "مشتركة بنات":   { order: 9,  bg: "bg-lime-50",     text: "text-lime-800",    dot: "bg-lime-400"    },
  "تخصصية بنات":   { order: 10, bg: "bg-rose-50",     text: "text-rose-800",    dot: "bg-rose-400"    },
};

const DEFAULT_META = { order: 99, bg: "bg-stone-50", text: "text-stone-700", dot: "bg-stone-400" };

function stageMeta(level: string) {
  return STAGE_META[level] ?? DEFAULT_META;
}

/* ── مكوّن خلية العدد ──────────────────────────────────────────── */
function CountCell({ n }: { n: number }) {
  if (n === 0)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold text-stone-300 bg-stone-50 border border-stone-100">
        —
      </span>
    );
  const color =
    n >= 3
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-sky-700 bg-sky-50 border-sky-200";
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-extrabold border ${color}`}
    >
      {n}
    </span>
  );
}

/* ── الصفحة الرئيسية ──────────────────────────────────────────── */
type SchoolRow = {
  seq: number;
  id: string;
  name: string;
  level: string;
  gender: "male" | "female";
  pe: number;
  deputy: number;
  principal: number;
};

export default function FieldVisitsPage() {
  const { token } = useAuth();
  const year = useActiveYear();

  const data = useQuery(
    api.reports.schoolVisitCounts,
    token && year ? { academicYear: year, token } : "skip"
  ) as SchoolRow[] | null | undefined;

  /* فلتر إظهار المدارس (كل / مزورة فقط / غير مزورة) */
  const [filter, setFilter] = useState<"all" | "visited" | "notvisited">("all");

  /* تجميع حسب المرحلة */
  const groups = useMemo(() => {
    if (!data) return [];
    const filtered =
      filter === "visited"
        ? data.filter((r) => r.pe > 0 || r.deputy > 0 || r.principal > 0)
        : filter === "notvisited"
        ? data.filter((r) => r.pe === 0 && r.deputy === 0 && r.principal === 0)
        : data;

    const map = new Map<string, SchoolRow[]>();
    for (const row of filtered) {
      const stage = row.level || "غير محدد";
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(row);
    }

    return Array.from(map.entries())
      .sort((a, b) => {
        const oa = stageMeta(a[0]).order;
        const ob = stageMeta(b[0]).order;
        return oa - ob;
      })
      .map(([stage, rows]) => ({
        stage,
        rows,
        totalPe: rows.reduce((s, r) => s + r.pe, 0),
        totalDeputy: rows.reduce((s, r) => s + r.deputy, 0),
        totalPrincipal: rows.reduce((s, r) => s + r.principal, 0),
        visitedCount: rows.filter((r) => r.pe > 0 || r.deputy > 0 || r.principal > 0).length,
      }));
  }, [data, filter]);

  /* الإجماليات الكبرى */
  const grand = useMemo(
    () => ({
      total: data?.length ?? 0,
      visited: data?.filter((r) => r.pe > 0 || r.deputy > 0 || r.principal > 0).length ?? 0,
      pe: data?.reduce((s, r) => s + r.pe, 0) ?? 0,
      deputy: data?.reduce((s, r) => s + r.deputy, 0) ?? 0,
      principal: data?.reduce((s, r) => s + r.principal, 0) ?? 0,
    }),
    [data]
  );

  if (data === undefined)
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <PageHeader
          title="حصر الزيارات الميدانية"
          subtitle={`السنة الدراسية ${year ?? "—"}`}
          icon={<MapPin className="text-primary" size={20} />}
        />
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports"
            className="btn-ghost text-xs flex items-center gap-1"
          >
            <ChevronLeft size={14} />
            التقارير
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* عنوان الطباعة */}
      <PrintHeader
        title={`حصر عدد الزيارات المدرسية — التربية البدنية`}
        subtitle={`السنة الدراسية ${year ?? ""}`}
      />

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
        <KpiCard
          icon={<Building2 size={18} />}
          label="إجمالي المدارس"
          value={grand.total}
          color="text-stone-700"
          bg="bg-stone-50"
        />
        <KpiCard
          icon={<CheckCircle2 size={18} />}
          label="مدارس مزارة"
          value={grand.visited}
          color="text-emerald-700"
          bg="bg-emerald-50"
          sub={grand.total ? `${Math.round((grand.visited / grand.total) * 100)}%` : undefined}
        />
        <KpiCard
          icon={<MapPin size={18} />}
          label="زيارات التربية البدنية"
          value={grand.pe}
          color="text-primary"
          bg="bg-primary/5"
        />
        <KpiCard
          icon={<Users size={18} />}
          label="متابعة النائب الأكاديمي"
          value={grand.deputy}
          color="text-sky-700"
          bg="bg-sky-50"
        />
        <KpiCard
          icon={<School size={18} />}
          label="متابعة مدير المدرسة"
          value={grand.principal}
          color="text-violet-700"
          bg="bg-violet-50"
        />
      </div>

      {/* فلتر */}
      <div className="flex items-center gap-2 no-print flex-wrap">
        {(
          [
            { v: "all", l: "جميع المدارس" },
            { v: "visited", l: "المزارة فقط" },
            { v: "notvisited", l: "غير المزارة" },
          ] as const
        ).map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filter === v
                ? "bg-primary text-white border-primary shadow"
                : "bg-white text-stone-600 border-stone-200 hover:border-primary/40"
            }`}
          >
            {l}
          </button>
        ))}
        <span className="text-[11px] text-stone-400 font-semibold me-auto">
          {groups.reduce((s, g) => s + g.rows.length, 0)} مدرسة
        </span>
      </div>

      {/* الجدول */}
      <div className="card-luxurious overflow-hidden">
        <table className="w-full text-sm border-collapse">
          {/* رأس الجدول */}
          <thead>
            <tr className="bg-[#5C1523] text-white text-[11px] font-extrabold">
              <th className="px-3 py-3 text-center w-10">م</th>
              <th className="px-4 py-3 text-right">اسم المدرسة</th>
              <th className="px-3 py-3 text-center hidden sm:table-cell">المرحلة</th>
              <th className="px-3 py-3 text-center">
                <span className="hidden sm:inline">التربية البدنية</span>
                <span className="sm:hidden">تر.ب</span>
              </th>
              <th className="px-3 py-3 text-center">
                <span className="hidden sm:inline">النائب الأكاديمي</span>
                <span className="sm:hidden">نائب</span>
              </th>
              <th className="px-3 py-3 text-center">
                <span className="hidden sm:inline">مدير المدرسة</span>
                <span className="sm:hidden">مدير</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ stage, rows, totalPe, totalDeputy, totalPrincipal, visitedCount }) => {
              const meta = stageMeta(stage);
              return (
                <Fragment key={stage}>
                  {/* رأس المرحلة */}
                  <tr className={`${meta.bg} border-b border-stone-100`}>
                    <td colSpan={6} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                        <span className={`text-[11px] font-extrabold ${meta.text}`}>{stage}</span>
                        <span className="text-[10px] text-stone-400 font-semibold me-auto">
                          {rows.length} مدرسة · مزارة: {visitedCount}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* صفوف المدارس */}
                  {rows.map((row, ri) => (
                    <tr
                      key={row.id}
                      className={`border-b border-stone-50 transition-colors ${
                        ri % 2 === 0 ? "bg-white" : "bg-stone-50/40"
                      } hover:bg-gold/5`}
                    >
                      <td className="px-3 py-2.5 text-center text-[10px] font-bold text-stone-400">
                        {row.seq}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] font-semibold text-[#2A1418]">
                        {row.name}
                      </td>
                      <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${meta.bg} ${meta.text}`}
                        >
                          {stage}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <CountCell n={row.pe} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <CountCell n={row.deputy} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <CountCell n={row.principal} />
                      </td>
                    </tr>
                  ))}

                  {/* إجمالي المرحلة */}
                  <tr className={`${meta.bg} border-b-2 border-stone-200`}>
                    <td colSpan={3} className="px-4 py-2 text-right">
                      <span className={`text-[10px] font-extrabold ${meta.text}`}>
                        إجمالي {stage}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-[11px] font-extrabold ${meta.text}`}
                      >
                        {totalPe || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-[11px] font-extrabold ${meta.text}`}
                      >
                        {totalDeputy || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-[11px] font-extrabold ${meta.text}`}
                      >
                        {totalPrincipal || "—"}
                      </span>
                    </td>
                  </tr>
                </Fragment>
              );
            })}

            {/* الإجمالي الكلي */}
            {groups.length > 0 && (
              <tr className="bg-[#5C1523] text-white">
                <td colSpan={3} className="px-4 py-3 text-right">
                  <span className="text-[12px] font-extrabold">
                    الإجمالي الكلي — {grand.total} مدرسة
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-[13px] font-extrabold">
                  {grand.pe || "—"}
                </td>
                <td className="px-3 py-3 text-center text-[13px] font-extrabold">
                  {grand.deputy || "—"}
                </td>
                <td className="px-3 py-3 text-center text-[13px] font-extrabold">
                  {grand.principal || "—"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {data !== null && data.length === 0 && (
          <div className="py-16 text-center text-stone-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">لا توجد مدارس مسجّلة</p>
          </div>
        )}
        {data === null && (
          <div className="py-16 text-center text-stone-400">
            <p className="text-sm font-semibold">هذا التقرير متاح للمديرين فقط</p>
          </div>
        )}
      </div>

      {/* تذييل */}
      <div className="text-center text-[10px] text-stone-400 font-semibold no-print">
        البيانات محسوبة تلقائياً من الاستمارات المسجّلة — السنة الدراسية {year}
      </div>
    </div>
  );
}

/* ── بطاقة KPI ──────────────────────────────────────────────────── */
function KpiCard({
  icon, label, value, color, bg, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className={`rounded-2xl border border-stone-100 p-4 ${bg} flex flex-col gap-1`}>
      <div className={`flex items-center gap-2 ${color}`}>
        <span className="shrink-0">{icon}</span>
        <span className="text-[10px] font-bold leading-tight">{label}</span>
      </div>
      <div className={`text-2xl font-extrabold ${color}`}>
        {value.toLocaleString("ar-QA")}
      </div>
      {sub && (
        <div className={`text-[10px] font-semibold opacity-70 ${color}`}>{sub}</div>
      )}
    </div>
  );
}
