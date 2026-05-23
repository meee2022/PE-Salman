"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton, PrintHeader } from "@/components/ui/PrintReport";
import { CalendarDays, ChevronRight, ChevronLeft, X, Eraser, Users, HelpCircle, Check, Info } from "lucide-react";

import { useActiveYear } from "@/hooks/useActiveYear";

type Code = "OF" | "VS" | "CL" | "LV" | "SL" | "TR" | "MT" | "AC" | "AB" | "SP" | "VP" | "OL" | "WP";

const CODES: { code: Code; short: string; label: string; cell: string; chip: string; hdr: string }[] = [
  { code: "VS", short: "زيارة",  label: "زيارة صفية",    cell: "bg-emerald-500/10 text-emerald-700 border border-emerald-300/35", chip: "bg-emerald-500", hdr: "#10b981" },
  { code: "CL", short: "عارضة",  label: "زيارة عارضة",   cell: "bg-emerald-500/5 text-emerald-600 border border-emerald-200/30",  chip: "bg-emerald-400", hdr: "#34d399" },
  { code: "OF", short: "مكتبي",  label: "عمل مكتبي",     cell: "bg-[#5C1523]/5 text-[#5C1523] border border-[#5C1523]/20",       chip: "bg-[#5C1523]",  hdr: "#C9A96E" },
  { code: "MT", short: "اجتماع", label: "اجتماع فني",    cell: "bg-[#7A1E30]/5 text-[#7A1E30] border border-[#7A1E30]/20",       chip: "bg-[#7A1E30]",  hdr: "#E8DECF" },
  { code: "TR", short: "تطوير",  label: "تطوير مهني",    cell: "bg-sky-500/10 text-sky-700 border border-sky-300/35",            chip: "bg-sky-500",    hdr: "#0ea5e9" },
  { code: "OL", short: "عن بعد", label: "تعلم عن بعد",   cell: "bg-sky-500/5 text-sky-600 border border-sky-200/30",            chip: "bg-sky-400",    hdr: "#38bdf8" },
  { code: "AC", short: "أنشطة",  label: "أنشطة رياضية",  cell: "bg-amber-500/10 text-amber-700 border border-amber-300/35",      chip: "bg-amber-500",  hdr: "#f59e0b" },
  { code: "SP", short: "رسمية",  label: "مهمة رسمية",    cell: "bg-amber-500/10 text-amber-800 border border-amber-300/35",      chip: "bg-amber-600",  hdr: "#d97706" },
  { code: "VP", short: "مهمة",   label: "مهمة عمل",      cell: "bg-amber-500/5 text-amber-700 border border-amber-200/30",       chip: "bg-amber-500",  hdr: "#fbbf24" },
  { code: "LV", short: "إجازة",  label: "إجازة اعتيادية",cell: "bg-orange-500/10 text-orange-700 border border-orange-200",      chip: "bg-orange-500", hdr: "#f97316" },
  { code: "SL", short: "مرضية",  label: "إجازة مرضية",   cell: "bg-orange-500/5 text-orange-600 border border-orange-200/50",    chip: "bg-orange-400", hdr: "#fb923c" },
  { code: "WP", short: "إذن",    label: "إذن رسمي",      cell: "bg-orange-500/5 text-orange-600 border border-orange-200/50",    chip: "bg-orange-400", hdr: "#fdba74" },
  { code: "AB", short: "غياب",   label: "غياب بدون عذر", cell: "bg-red-500/10 text-red-700 border border-red-200",              chip: "bg-red-500",    hdr: "#ef4444" },
];

const CODE_MAP = Object.fromEntries(CODES.map((c) => [c.code, c]));

const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function ActivityPage() {
  const YEAR = useActiveYear();
  const [tab, setTab] = useState<"week" | "month" | "summary">("week");
  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل النشاط الإشرافي"
        subtitle={`13 تصنيفاً معتمداً للنشاط الميداني والبدني · العام ${YEAR}`}
        icon={<CalendarDays size={26} />}
        action={<PrintButton />}
      />
      <PrintHeader title="تقرير سجل النشاط الفني للموجهين" subtitle={`العام الدراسي الرياضي ${YEAR}`} />

      {/* تبويبات الفلترة الزمنية */}
      <div className="no-print flex gap-2.5 p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-gold/15 animate-in overflow-x-auto no-scrollbar max-w-max">
        <TabBtn active={tab === "week"} onClick={() => setTab("week")}>
          الجدول الأسبوعي
        </TabBtn>
        <TabBtn active={tab === "month"} onClick={() => setTab("month")}>
          الجدول الشهري
        </TabBtn>
        <TabBtn active={tab === "summary"} onClick={() => setTab("summary")}>
          التقرير السنوي العام
        </TabBtn>
      </div>

      {tab === "summary" ? <AnnualSummary /> : <EntryGrid mode={tab} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-300 whitespace-nowrap relative ${
        active
          ? "bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white shadow-lg shadow-primary/10 border border-[#5C1523]/10 scale-[1.02]"
          : "bg-white/80 hover:bg-[#FCF9F2]/60 text-[#5C1523]/80 hover:text-primary border border-gold/15 hover:border-gold/30 shadow-sm"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
      )}
    </button>
  );
}

/* ───────────────────────── شبكة الإدخال (أسبوعي/شهري) ───────────────────────── */
const AR_WEEK = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

interface DayCell { ds: string; dayNum: number; wd: string; weekend: boolean; monthIdx: number }

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // الأحد بداية الأسبوع في الخليج
  return x;
}
function toDS(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function makeDay(d: Date): DayCell {
  const wd = d.getDay();
  return { ds: toDS(d), dayNum: d.getDate(), wd: AR_WEEK[wd], weekend: wd === 5 || wd === 6, monthIdx: d.getMonth() };
}

function EntryGrid({ mode }: { mode: "week" | "month" }) {
  const YEAR = useActiveYear();
  const [anchor, setAnchor] = useState(() => new Date("2025-12-01"));

  const { token } = useAuth();
  const supervisors = useQuery(api.supervisors.list, token ? { token } : "skip");
  const logActivity = useMutation(api.activity.logActivity);
  const clearActivity = useMutation(api.activity.clearActivity);
  const bulkLog = useMutation(api.activity.bulkLog);
  const bulkClear = useMutation(api.activity.bulkClear);

  const [picker, setPicker] = useState<{ supId: Id<"supervisors">; supName: string; ds: string; label: string } | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<Id<"supervisors">>>(new Set());
  const [bulkFrom, setBulkFrom] = useState(0);
  const [bulkTo, setBulkTo]     = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast]       = useState<string | null>(null);

  // أيام الفترة الظاهرة
  const days = useMemo<DayCell[]>(() => {
    if (mode === "week") {
      const s = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        return makeDay(d);
      });
    }
    const y = anchor.getFullYear(), m = anchor.getMonth();
    const n = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => makeDay(new Date(y, m, i + 1)));
  }, [mode, anchor]);

  // إعادة ضبط نطاق الإدخال الجماعي عند تغيّر الفترة
  const periodKey = days[0]?.ds + "_" + days[days.length - 1]?.ds;
  useEffect(() => {
    setBulkFrom(0);
    setBulkTo(days.length - 1);
  }, [periodKey]);

  const start = days[0]?.ds, end = days[days.length - 1]?.ds;
  const logs = useQuery(api.activity.logsInRange, token && start && end ? { start, end, token } : "skip");

  const logMap = useMemo(() => {
    const m = new Map<string, Code>();
    (logs ?? []).forEach((l) => m.set(`${l.supervisorId}_${l.date}`, l.code as Code));
    return m;
  }, [logs]);

  function shift(deltaDays: number) {
    setAnchor((a) => {
      const d = new Date(a);
      d.setDate(d.getDate() + deltaDays);
      return d;
    });
  }
  function shiftMonth(delta: number) {
    setAnchor((a) => {
      const d = new Date(a);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }
  function prev() { mode === "week" ? shift(-7) : shiftMonth(-1); }
  function next() { mode === "week" ? shift(7) : shiftMonth(1); }
  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }

  const periodLabel = (() => {
    if (!days.length) return "";
    if (mode === "month") return `${AR_MONTHS[days[0].monthIdx]} ${days[0].ds.slice(0, 4)}`;
    const a = days[0], b = days[days.length - 1];
    if (a.monthIdx === b.monthIdx) return `${a.dayNum} – ${b.dayNum} ${AR_MONTHS[a.monthIdx]}`;
    return `${a.dayNum} ${AR_MONTHS[a.monthIdx]} – ${b.dayNum} ${AR_MONTHS[b.monthIdx]}`;
  })();

  async function setCode(code: Code) {
    if (!picker) return;
    await logActivity({ supervisorId: picker.supId, date: picker.ds, code, academicYear: YEAR, token: token ?? undefined });
    setPicker(null);
  }
  async function clearCode() {
    if (!picker) return;
    await clearActivity({ supervisorId: picker.supId, date: picker.ds, token: token ?? undefined });
    setPicker(null);
  }
  function toggleSel(id: Id<"supervisors">) {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll(allIds: Id<"supervisors">[]) {
    setSelected(selected.size === allIds.length ? new Set() : new Set(allIds));
  }
  function bulkDates() {
    const from = Math.min(bulkFrom, bulkTo), to = Math.max(bulkFrom, bulkTo);
    return days.slice(from, to + 1).map((d) => d.ds);
  }
  function bulkSpan() {
    const from = Math.min(bulkFrom, bulkTo), to = Math.max(bulkFrom, bulkTo);
    return from === to ? `${days[from]?.dayNum}` : `${days[from]?.dayNum}–${days[to]?.dayNum}`;
  }
  async function applyBulk(code: Code) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await bulkLog({ supervisorIds: Array.from(selected), dates: bulkDates(), code, academicYear: YEAR, token: token ?? undefined });
      showToast(`تم إدخال "${CODE_MAP[code].label}" لـ ${selected.size} موجه (الأيام ${bulkSpan()})`);
    } finally {
      setBulkBusy(false);
    }
  }
  async function applyBulkClear() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const n = await bulkClear({ supervisorIds: Array.from(selected), dates: bulkDates(), token: token ?? undefined });
      showToast(`تم حذف ${n} إدخال لـ ${selected.size} موجه (الأيام ${bulkSpan()})`);
    } finally {
      setBulkBusy(false);
    }
  }

  if (!supervisors || logs === undefined) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }
  
  const allIds = supervisors.map((s) => s._id);
  const cellW = mode === "week" ? "min-w-[66px]" : "min-w-[56px] w-[56px]";

  return (
    <>
      {/* شريط الأدوات التنفيذي */}
      <div className="no-print card-luxurious p-4 flex items-center justify-between gap-3 flex-wrap animate-in">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="btn-ghost !px-2.5 hover:ring-1 hover:ring-gold/30">
            <ChevronRight size={16} />
          </button>
          <span className="font-extrabold text-sm text-[#2A1418] min-w-36 text-center select-none bg-[#FCF9F2] px-4 py-2 rounded-xl border border-gold/15 shadow-inner">
            {periodLabel}
          </span>
          <button onClick={next} className="btn-ghost !px-2.5 hover:ring-1 hover:ring-gold/30">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setAnchor(new Date())} className="text-xs text-primary font-extrabold hover:text-primary/80 transition-colors mr-2">
            اليوم الحالي
          </button>
        </div>
        
        <button
          onClick={() => {
            setBulkMode((v) => !v);
            setSelected(new Set());
          }}
          className={
            bulkMode
              ? "btn-primary shadow-lg shadow-primary/10 flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-5"
              : "btn-ghost hover:ring-1 hover:ring-gold/30 flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-5"
          }
        >
          <Users size={15} />
          {bulkMode ? "إنهاء الإدخال الجماعي" : "تفعيل الإدخال الجماعي"}
        </button>
      </div>

      {/* لوحة الإدخال الجماعي الفخمة */}
      {bulkMode && (
        <div className="no-print card-luxurious p-5 space-y-4 animate-in border-r-4 !border-r-primary bg-gradient-to-l from-white via-[#FCFAF5] to-[#F7F2E6] shadow-xl relative overflow-hidden">
          <div className="pattern-arabesque absolute inset-0 opacity-[0.06] pointer-events-none" />
          <div className="flex items-center justify-between flex-wrap gap-4 relative">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-xs text-[#2A1418] bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-xl">
                الموجهون المحددون: {selected.size}
              </span>
              <button onClick={() => toggleAll(allIds)} className="text-xs text-primary font-bold hover:underline">
                {selected.size === allIds.length ? "إلغاء تحديد الكل" : "تحديد كافة الموجهين"}
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8A7A72] font-bold">من تاريخ:</span>
              <select
                value={bulkFrom}
                onChange={(e) => setBulkFrom(+e.target.value)}
                className="bg-[#FCF9F2] text-[#2A1418] border border-gold/25 text-xs font-extrabold rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary shadow-sm"
              >
                {days.map((d, i) => (
                  <option key={d.ds} value={i}>
                    {d.wd} {d.dayNum}
                  </option>
                ))}
              </select>
              <span className="text-[#8A7A72] font-bold mr-1">إلى:</span>
              <select
                value={bulkTo}
                onChange={(e) => setBulkTo(+e.target.value)}
                className="bg-[#FCF9F2] text-[#2A1418] border border-gold/25 text-xs font-extrabold rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary shadow-sm"
              >
                {days.map((d, i) => (
                  <option key={d.ds} value={i}>
                    {d.wd} {d.dayNum}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative pt-2">
            <p className="text-xs text-stone-500 mb-3.5 font-bold flex items-center gap-1.5 select-none">
              <Info size={14} className="text-gold" />
              اختر نوع النشاط المراد تطبيقه على الفترة المحددة للموجهين المختارين:
            </p>
            <div className="flex flex-wrap gap-2">
              {CODES.map((c) => (
                <button
                  key={c.code}
                  disabled={selected.size === 0 || bulkBusy}
                  onClick={() => applyBulk(c.code)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all disabled:opacity-40 hover:ring-2 hover:ring-gold/30 shadow-sm ${c.cell}`}
                >
                  {c.label}
                </button>
              ))}
              <button
                disabled={selected.size === 0 || bulkBusy}
                onClick={applyBulkClear}
                className="px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all disabled:opacity-40 hover:ring-2 hover:ring-red-400 bg-red-500/10 text-red-700 border border-red-200 inline-flex items-center gap-1 shadow-sm"
              >
                <Eraser size={12} /> مسح المدخلات للفترة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* عنوان الفترة المطبوعة */}
      <p className="print-only" style={{ textAlign: "center", fontWeight: 700, color: "#5C1523", margin: "0 0 10px", fontSize: "14px" }}>
        سجل أنشطة الموجهين للفترة: {periodLabel}
      </p>

      {/* دليل ومفتاح الأكواد */}
      {!bulkMode && (
        <div className="no-print card-luxurious p-4 flex flex-wrap gap-2 animate-in bg-white/80 backdrop-blur-md relative overflow-hidden select-none border border-gold/15">
          <div className="w-full text-[10px] font-extrabold text-[#5C1523] mb-2 flex items-center gap-1.5">
            <HelpCircle size={13} className="text-gold" />
            دليل اختصارات وأكواد الأنشطة المعتمدة في الإدارة:
          </div>
          {CODES.map((c) => (
            <span
              key={c.code}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-extrabold shadow-sm ${c.cell}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.chip}`} />
              {c.label} ({c.short})
            </span>
          ))}
        </div>
      )}

      {/* الشبكة والتخطيط الإشرافي */}
      <div className="glass-table-container animate-in">
        <div className="overflow-x-auto">
          <table className={`glass-table ${mode === "week" ? "w-full" : ""}`}>
            <thead>
              <tr>
                <th
                  className="sticky right-0 z-20 bg-gradient-to-b from-[#5C1523] to-[#4A0F1B] px-4 py-3.5 text-right text-xs font-extrabold text-[#EBD9B4] min-w-44 border-l border-gold/25"
                  style={{ borderBottom: "2px solid var(--gold)" }}
                >
                  {bulkMode ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.size === allIds.length && allIds.length > 0}
                        onChange={() => toggleAll(allIds)}
                        className="accent-gold w-4 h-4 rounded"
                      />
                      قائمة الموجهين
                    </label>
                  ) : (
                    "الموجه التربوي"
                  )}
                </th>
                {days.map((d) => (
                  <th
                    key={d.ds}
                    className={`px-1 py-2 text-center ${cellW} ${
                      d.weekend
                        ? "bg-[#3A0B14] text-white/45"
                        : "bg-gradient-to-b from-[#5C1523] to-[#4A0F1B] text-[#EBD9B4]"
                    }`}
                    style={{ borderBottom: "2px solid var(--gold)" }}
                  >
                    <div className="text-[9px] font-extrabold opacity-80">{d.wd}</div>
                    <div className="text-xs font-extrabold mt-0.5">{d.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {supervisors.map((sup) => {
                const sel = selected.has(sup._id);
                return (
                  <tr key={sup._id} className={`hover:bg-gold/5 transition-colors border-b border-gold/5 last:border-b-0 ${sel ? "!bg-gold/[0.07]" : ""}`}>
                    <td
                      className={`sticky right-0 z-10 px-4 py-3 font-extrabold text-[#2A1418] text-xs border-l border-gold/15 whitespace-nowrap transition-colors ${
                        sel ? "bg-[#FBF4E9]" : "bg-white"
                      }`}
                    >
                      {bulkMode ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleSel(sup._id)}
                            className="accent-primary w-4 h-4 rounded"
                          />
                          {sup.name}
                        </label>
                      ) : (
                        sup.name
                      )}
                    </td>
                    
                    {days.map((d) => {
                      const code = logMap.get(`${sup._id}_${d.ds}`);
                      const meta = code ? CODE_MAP[code] : null;
                      return (
                        <td
                          key={d.ds}
                          className={`p-0.5 text-center transition-all ${
                            d.weekend ? "bg-stone-50/40" : ""
                          }`}
                        >
                          <button
                            disabled={bulkMode}
                            onClick={() =>
                              setPicker({
                                supId: sup._id,
                                supName: sup.name,
                                ds: d.ds,
                                label: `${d.wd} ${d.dayNum} ${AR_MONTHS[d.monthIdx]} ${d.ds.slice(0, 4)}`,
                              })
                            }
                            className={`w-full max-w-[50px] mx-auto h-8 rounded-xl text-[10px] font-extrabold transition-all border ${
                              bulkMode ? "cursor-default border-transparent" : "hover:scale-[1.05]"
                            } ${
                              meta
                                ? meta.cell
                                : "text-stone-300 border-dashed border-stone-200 bg-stone-50/10 " +
                                  (bulkMode ? "" : "hover:bg-gold/10 hover:border-gold/30 hover:text-gold")
                            }`}
                          >
                            {meta ? meta.short : "·"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* منتقي كود الإدخال الفردي الفاخر */}
      {picker && (
        <div
          className="fixed inset-0 bg-[#2A1418]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in"
          onClick={() => setPicker(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gold/25"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] overflow-hidden border-b border-gold/25">
              <div className="pattern-arabesque absolute inset-0 opacity-45" />
              <button
                onClick={() => setPicker(null)}
                className="absolute left-4 top-4.5 text-white/60 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <h3 className="relative font-extrabold text-white text-base">{picker.supName}</h3>
              <p className="relative text-xs text-white/60 mt-1 font-semibold">{picker.label}</p>
            </div>
            
            <div className="p-5 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {CODES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCode(c.code)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all hover:ring-2 hover:ring-gold/30 hover:shadow-sm ${c.cell}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.chip}`} />
                  {c.label}
                </button>
              ))}
            </div>
            
            <div className="px-5 pb-5">
              <button
                onClick={clearCode}
                className="btn-ghost w-full justify-center text-red-600 border border-red-200 hover:bg-red-50 hover:text-red-700 font-extrabold text-xs !py-3 rounded-xl transition-all"
              >
                <Eraser size={14} className="shrink-0" /> تفريغ هذا اليوم من الأنشطة
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold px-6 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-1.5 animate-in border border-emerald-500/20">
          <Check size={14} />
          {toast}
        </div>
      )}
    </>
  );
}

/* ───────────────────────── التقرير والملخص السنوي ───────────────────────── */
function AnnualSummary() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = user?.role === "admin";
  const summaries = useQuery(api.activity.summaries, token ? { academicYear: YEAR, token } : "skip");
  const recomputeAll = useMutation(api.activity.recomputeAllSummaries);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);

  async function handleRecompute() {
    setRecomputing(true);
    try {
      const n = await recomputeAll({ academicYear: YEAR, token: token ?? undefined });
      setRecomputeMsg(`✅ تم إعادة حساب ملخص ${n} موجه من السجلات اليومية`);
      setTimeout(() => setRecomputeMsg(null), 4000);
    } finally {
      setRecomputing(false);
    }
  }

  if (!summaries) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  const codes = CODES.map((c) => c.code);

  return (
    <div className="space-y-3 animate-in">
      {isAdmin && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-[#8A7A72] font-semibold">
            الأرقام محسوبة من السجلات اليومية — تُحدَّث تلقائياً عند كل إدخال
          </p>
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="btn-primary text-xs py-2 px-4 disabled:opacity-60"
          >
            {recomputing ? "جاري إعادة الحساب..." : "⟳ إعادة حساب الكل من السجلات"}
          </button>
        </div>
      )}
      {recomputeMsg && (
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
          {recomputeMsg}
        </div>
      )}
    <div className="glass-table-container">
      {/* مؤشر السكرول */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-black/[0.04] bg-white/40 no-print">
        <span className="text-[10px] font-bold text-[#A89A92]">← مرّر يساراً لرؤية باقي الأعمدة</span>
        <div className="flex gap-0.5 mr-auto">
          {codes.map((c) => (
            <span key={c} className={`w-2 h-2 rounded-full ${CODE_MAP[c].chip}`} title={CODE_MAP[c].label} />
          ))}
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="glass-table w-max min-w-full">
          <thead>
            <tr>
              <th
                className="sticky right-0 z-10 bg-gradient-to-b from-[#5C1523] to-[#4A0F1B] px-3 py-3 text-right text-xs font-extrabold text-[#EBD9B4] w-40 min-w-[140px] border-l border-gold/25"
                style={{ borderBottom: "2px solid var(--gold)" }}
              >
                الموجه التربوي
              </th>
              {codes.map((c) => (
                <th
                  key={c}
                  className="px-1 py-0 text-center w-10 min-w-[40px] border-l border-white/10 last:border-l-0 bg-[#3D0D18]"
                  style={{ borderBottom: `3px solid ${CODE_MAP[c].hdr}` }}
                >
                  <div className="flex flex-col items-center justify-center gap-0.5 py-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: CODE_MAP[c].hdr }}
                    />
                    <span
                      className="text-[9px] font-extrabold whitespace-nowrap leading-none"
                      style={{ color: CODE_MAP[c].hdr }}
                    >
                      {CODE_MAP[c].short}
                    </span>
                  </div>
                </th>
              ))}
              <th
                className="px-1 py-0 text-center w-12 min-w-[48px] bg-[#3D0D18]"
                style={{ borderBottom: "3px solid #38bdf8" }}
              >
                <div className="flex flex-col items-center justify-center gap-0.5 py-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-[9px] font-extrabold text-sky-400 leading-none">تمدرس</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row, i) => (
              <tr key={row._id} className={`hover:bg-gold/5 transition-colors border-b border-gold/5 last:border-b-0 ${i % 2 ? "bg-stone-50/20" : ""}`}>
                <td
                  className={`font-extrabold text-[#2A1418] text-xs sticky right-0 z-10 px-3 py-2.5 border-l border-gold/15 transition-colors whitespace-nowrap ${
                    i % 2 ? "bg-[#FAF8F5]" : "bg-white"
                  }`}
                >
                  {row.supervisor?.name ?? "—"}
                </td>

                {codes.map((c) => {
                  const val = ((row as Record<string, unknown>)[c] as number) ?? 0;
                  return (
                    <td key={c} className="text-center px-1 py-2 border-l border-gold/5 last:border-l-0">
                      {val > 0 ? (
                        <span className={`inline-flex items-center justify-center w-7 h-6 rounded-md font-extrabold text-[11px] ${CODE_MAP[c].cell}`}>
                          {val}
                        </span>
                      ) : (
                        <span className="text-stone-300/60 font-semibold select-none text-xs">·</span>
                      )}
                    </td>
                  );
                })}

                <td className="text-center px-1 py-2">
                  <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-sky-50 text-sky-700 font-extrabold text-[11px] border border-sky-200">
                    {row.schoolingDays}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
