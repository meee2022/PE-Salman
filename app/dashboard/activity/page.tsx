"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton, PrintHeader } from "@/components/ui/PrintReport";
import {
  CalendarDays, ChevronRight, ChevronLeft, X, Eraser,
  Users, HelpCircle, Check, Info, FileDown, RotateCcw,
  BarChart2, TrendingUp, TrendingDown, Award, AlertTriangle,
} from "lucide-react";

import { useActiveYear } from "@/hooks/useActiveYear";
import { EXCEL_ACTIVITY_DATA } from "@/lib/excelActivityData";
import { getWeekInfo } from "@/lib/weeklySchedule";

type Code =
  | "OF" | "VS" | "CL" | "LV" | "SL" | "TR" | "MT" | "AC"
  | "AB" | "SP" | "VP" | "OL" | "WP" | "HC" | "CA";

const CODES: {
  code: Code; short: string; label: string;
  cell: string; chip: string; hdr: string;
}[] = [
  { code: "VS", short: "زيارة",   label: "زيارة صفية",      cell: "bg-emerald-500/10 text-emerald-700 border border-emerald-300/35",  chip: "bg-emerald-500",  hdr: "#10b981" },
  { code: "CL", short: "عارضة",   label: "زيارة عارضة",     cell: "bg-emerald-500/5 text-emerald-600 border border-emerald-200/30",   chip: "bg-emerald-400",  hdr: "#34d399" },
  { code: "OF", short: "مكتبي",   label: "عمل مكتبي",       cell: "bg-[#5C1523]/5 text-[#5C1523] border border-[#5C1523]/20",        chip: "bg-[#5C1523]",    hdr: "#C9A96E" },
  { code: "MT", short: "اجتماع",  label: "اجتماع فني",      cell: "bg-[#7A1E30]/5 text-[#7A1E30] border border-[#7A1E30]/20",        chip: "bg-[#7A1E30]",    hdr: "#E8DECF" },
  { code: "TR", short: "تطوير",   label: "تطوير مهني",      cell: "bg-sky-500/10 text-sky-700 border border-sky-300/35",             chip: "bg-sky-500",      hdr: "#0ea5e9" },
  { code: "OL", short: "بُعد",    label: "تعلم عن بعد",     cell: "bg-sky-500/5 text-sky-600 border border-sky-200/30",             chip: "bg-sky-400",      hdr: "#38bdf8" },
  { code: "AC", short: "أنشطة",   label: "أنشطة رياضية",    cell: "bg-amber-500/10 text-amber-700 border border-amber-300/35",       chip: "bg-amber-500",    hdr: "#f59e0b" },
  { code: "SP", short: "رسمية",   label: "مهمة رسمية",      cell: "bg-amber-500/10 text-amber-800 border border-amber-300/35",       chip: "bg-amber-600",    hdr: "#d97706" },
  { code: "VP", short: "مهمة",    label: "مهمة عمل",        cell: "bg-amber-500/5 text-amber-700 border border-amber-200/30",        chip: "bg-amber-500",    hdr: "#fbbf24" },
  { code: "LV", short: "إجازة",   label: "إجازة اعتيادية",  cell: "bg-orange-500/10 text-orange-700 border border-orange-200",       chip: "bg-orange-500",   hdr: "#f97316" },
  { code: "CA", short: "عارضة",   label: "إجازة عارضة",     cell: "bg-orange-400/15 text-orange-600 border border-orange-300/40",    chip: "bg-orange-400",   hdr: "#fb923c" },
  { code: "SL", short: "مرضية",   label: "إجازة مرضية",     cell: "bg-rose-500/10 text-rose-700 border border-rose-200/50",          chip: "bg-rose-400",     hdr: "#fb7185" },
  { code: "HC", short: "حج",      label: "إجازة الحج",      cell: "bg-teal-500/10 text-teal-700 border border-teal-200",             chip: "bg-teal-500",     hdr: "#14b8a6" },
  { code: "WP", short: "إذن",     label: "إذن رسمي",        cell: "bg-purple-500/10 text-purple-700 border border-purple-200/50",    chip: "bg-purple-400",   hdr: "#a855f7" },
  { code: "AB", short: "غياب",    label: "غياب بدون عذر",   cell: "bg-red-500/10 text-red-700 border border-red-200",               chip: "bg-red-500",      hdr: "#ef4444" },
];

const CODE_MAP = Object.fromEntries(CODES.map((c) => [c.code, c])) as Record<Code, typeof CODES[0]>;
const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function ActivityPage() {
  const YEAR = useActiveYear();
  const [tab, setTab] = useState<"week" | "month" | "summary" | "analysis">("week");
  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل النشاط الإشرافي"
        subtitle={`15 تصنيفاً معتمداً للنشاط الميداني · العام ${YEAR}`}
        icon={<CalendarDays size={26} />}
        action={<PrintButton />}
      />
      <PrintHeader title="تقرير سجل النشاط الفني للموجهين" subtitle={`العام الدراسي الرياضي ${YEAR}`} />

      <div className="no-print flex gap-2.5 p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-gold/15 animate-in overflow-x-auto no-scrollbar max-w-max">
        <TabBtn active={tab === "week"} onClick={() => setTab("week")}>الجدول الأسبوعي</TabBtn>
        <TabBtn active={tab === "month"} onClick={() => setTab("month")}>الجدول الشهري</TabBtn>
        <TabBtn active={tab === "summary"} onClick={() => setTab("summary")}>التقرير السنوي العام</TabBtn>
        <TabBtn active={tab === "analysis"} onClick={() => setTab("analysis")}>
          <span className="flex items-center gap-1.5"><BarChart2 size={13} />تحليل الأداء</span>
        </TabBtn>
      </div>

      {tab === "summary" ? <AnnualSummary />
        : tab === "analysis" ? <PerformanceAnalysis />
        : <EntryGrid mode={tab} />}
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
      {active && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
    </button>
  );
}

/* ───────────────────── شبكة الإدخال ───────────────────── */
const AR_WEEK = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

interface DayCell { ds: string; dayNum: number; wd: string; weekend: boolean; monthIdx: number }
interface LogEntry { code: Code; notes?: string }

function startOfWeek(d: Date): Date {
  const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x;
}
function toDS(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function makeDay(d: Date): DayCell {
  const wd = d.getDay();
  return { ds: toDS(d), dayNum: d.getDate(), wd: AR_WEEK[wd], weekend: wd===5||wd===6, monthIdx: d.getMonth() };
}

/** مفتاح قصير محسوب لحظياً من الاسم بعد تطبيع عربي موحّد
 *  يُستخدم لدمج المكررين الذين قد تختلف shortKey المخزونة بينهم */
function computeGroupKey(name: string): string {
  const n = name
    .replace(/\xa0/g, " ")
    .replace(/ـ/g, "")
    .replace(/[ً-ْٰ]/g, "")  // حركات وتشكيل
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
  const parts = n.split(" ");
  // اول كلمة + آخر كلمة (أقل عرضة للاختلاف في أسماء المكررين)
  return parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : n;
}

function EntryGrid({ mode }: { mode: "week" | "month" }) {
  const YEAR = useActiveYear();
  const [anchor, setAnchor] = useState(() => new Date());
  const { token, user } = useAuth();
  const isAdmin = ["admin","superadmin"].includes(user?.role ?? "");
  const isSupervisor = user?.role === "supervisor";
  const readOnly = isSupervisor; // الموجه يرى فقط، لا يعدّل

  const supervisors = useQuery(api.supervisors.list, token ? { token } : "skip");
  const logActivity   = useMutation(api.activity.logActivity);
  const clearActivity = useMutation(api.activity.clearActivity);
  const bulkLog       = useMutation(api.activity.bulkLog);
  const bulkClear     = useMutation(api.activity.bulkClear);
  const importLogs    = useMutation(api.activity.importSupervisorLogs);

  const [picker, setPicker] = useState<{
    supId: Id<"supervisors">; supName: string; ds: string; label: string;
    currentCode?: Code; currentNote?: string;
  } | null>(null);
  const [pickerNote, setPickerNote] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<Id<"supervisors">>>(new Set());
  const [bulkFrom, setBulkFrom] = useState(0);
  const [bulkTo, setBulkTo]     = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast]       = useState<string | null>(null);

  // استيراد Excel
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpPos, setJumpPos] = useState({ top: 0, left: 0 });
  const jumpBtnRef = useRef<HTMLButtonElement>(null);
  const jumpRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!jumpOpen) return;
    function handle(e: MouseEvent) {
      if (jumpRef.current && !jumpRef.current.contains(e.target as Node) &&
          jumpBtnRef.current && !jumpBtnRef.current.contains(e.target as Node)) {
        setJumpOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [jumpOpen]);
  function openJump() {
    if (jumpBtnRef.current) {
      const r = jumpBtnRef.current.getBoundingClientRect();
      setJumpPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
    }
    setJumpOpen(v => !v);
  }

  const days = useMemo<DayCell[]>(() => {
    if (mode === "week") {
      const s = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(s); d.setDate(s.getDate() + i); return makeDay(d);
      }).filter(d => !d.weekend); // إزالة الجمعة والسبت (عطلة رسمية)
    }
    const y = anchor.getFullYear(), m = anchor.getMonth();
    const n = new Date(y, m+1, 0).getDate();
    return Array.from({ length: n }, (_, i) => makeDay(new Date(y, m, i+1)))
      .filter(d => !d.weekend); // إزالة الجمعة والسبت (عطلة رسمية)
  }, [mode, anchor]);

  const periodKey = days[0]?.ds + "_" + days[days.length-1]?.ds;
  useEffect(() => { setBulkFrom(0); setBulkTo(days.length-1); }, [periodKey]);

  const start = days[0]?.ds, end = days[days.length-1]?.ds;
  const logs = useQuery(api.activity.logsInRange, token && start && end ? { start, end, token } : "skip");

  const logMap = useMemo(() => {
    const m = new Map<string, LogEntry>();
    (logs ?? []).forEach((l) => m.set(`${l.supervisorId}_${l.date}`, { code: l.code as Code, notes: l.notes ?? undefined }));
    return m;
  }, [logs]);

  function shift(d: number) { setAnchor(a => { const x = new Date(a); x.setDate(x.getDate()+d); return x; }); }
  function shiftMonth(d: number) { setAnchor(a => { const x = new Date(a); x.setMonth(x.getMonth()+d); return x; }); }
  function prev() { mode==="week" ? shift(-7) : shiftMonth(-1); }
  function next() { mode==="week" ? shift(7) : shiftMonth(1); }
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 3500); }

  const periodLabel = (() => {
    if (!days.length) return "";
    if (mode === "month") return `${AR_MONTHS[days[0].monthIdx]} ${days[0].ds.slice(0,4)}`;
    const a = days[0], b = days[days.length-1];
    if (a.monthIdx === b.monthIdx) return `${a.dayNum} – ${b.dayNum} ${AR_MONTHS[a.monthIdx]}`;
    return `${a.dayNum} ${AR_MONTHS[a.monthIdx]} – ${b.dayNum} ${AR_MONTHS[b.monthIdx]}`;
  })();

  // معرفة رقم الأسبوع الدراسي الحالي
  const weekInfo = mode === "week" && days.length > 0
    ? getWeekInfo(days[0].ds)
    : null;

  async function setCode(code: Code) {
    if (!picker) return;
    await logActivity({
      supervisorId: picker.supId, date: picker.ds, code,
      notes: pickerNote.trim() || undefined,
      academicYear: YEAR, token: token ?? undefined,
    });
    setPicker(null);
  }
  async function clearCode() {
    if (!picker) return;
    await clearActivity({ supervisorId: picker.supId, date: picker.ds, token: token ?? undefined });
    setPicker(null);
  }
  function toggleSel(id: Id<"supervisors">) {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll(allIds: Id<"supervisors">[]) {
    setSelected(selected.size === allIds.length ? new Set() : new Set(allIds));
  }
  function bulkDates() {
    const from = Math.min(bulkFrom, bulkTo), to = Math.max(bulkFrom, bulkTo);
    return days.slice(from, to+1).map(d => d.ds);
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
    } finally { setBulkBusy(false); }
  }
  async function applyBulkClear() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const n = await bulkClear({ supervisorIds: Array.from(selected), dates: bulkDates(), token: token ?? undefined });
      showToast(`تم حذف ${n} إدخال لـ ${selected.size} موجه (الأيام ${bulkSpan()})`);
    } finally { setBulkBusy(false); }
  }

  // ── استيراد بيانات Excel ──────────────────────────────────
  async function handleImportExcel() {
    if (!confirm("سيتم استيراد جميع بيانات جدول الزيارات الأسبوعي من ملف Excel. هل تريد المتابعة؟")) return;
    setImporting(true);
    let totalInserted = 0, totalUpdated = 0;
    try {
      for (let i = 0; i < EXCEL_ACTIVITY_DATA.length; i++) {
        const sup = EXCEL_ACTIVITY_DATA[i];
        setImportProgress(`جاري استيراد بيانات ${sup.name} (${i+1}/${EXCEL_ACTIVITY_DATA.length})...`);
        const result = await importLogs({
          supervisorName: sup.name,
          academicYear: "2025-2026",
          logs: sup.logs as any,
          token: token ?? undefined,
        });
        totalInserted += result.inserted;
        totalUpdated  += result.updated;
      }
      showToast(`✅ تم الاستيراد: ${totalInserted} إدخال جديد، ${totalUpdated} محدَّث`);
    } catch (e: any) {
      showToast(`❌ خطأ في الاستيراد: ${e?.message ?? "خطأ غير معروف"}`);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  // إزالة المكررين — يجب قبل أي return مبكر (قاعدة hooks لا تتغير بين renders)
  const { displaySups, groupIds } = useMemo(() => {
    const sups = supervisors ?? [];
    const byShort = new Map<string, { primary: typeof sups[0]; allIds: string[] }>();
    for (const s of sups) {
      // نحسب المفتاح لحظياً من الاسم (لا نعتمد على الحقل المخزون الذي قد يختلف)
      const key = computeGroupKey(s.name);
      const prev = byShort.get(key);
      if (!prev) {
        byShort.set(key, { primary: s, allIds: [s._id as string] });
      } else {
        prev.allIds.push(s._id as string);
        if (s.seq < prev.primary.seq) prev.primary = s;
      }
    }
    const gids = new Map<string, string[]>();
    const display: typeof sups[0][] = [];
    for (const { primary, allIds } of byShort.values()) {
      display.push(primary);
      // ندمج: IDs من التجميع بالـ shortKey + duplicateIds المُعادة من السيرفر (nameKey)
      const serverDups: string[] = (primary as any).duplicateIds ?? [];
      const combined = Array.from(new Set([...allIds, ...serverDups]));
      gids.set(primary._id as string, combined);
    }
    display.sort((a, b) => a.seq - b.seq);
    return { displaySups: display, groupIds: gids };
  }, [supervisors]);

  if (!supervisors || logs === undefined) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  const allIds = displaySups.map(s => s._id);
  const cellW = mode === "week" ? "min-w-[72px]" : "min-w-[48px] w-[48px]";

  return (
    <>
      {/* شريط الأدوات */}
      <div className="no-print card-luxurious p-4 flex items-center justify-between gap-3 flex-wrap animate-in">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prev} className="btn-ghost !px-2.5 hover:ring-1 hover:ring-gold/30"><ChevronRight size={16} /></button>
          <div className="flex flex-col items-center">
            <button
              ref={jumpBtnRef}
              onClick={openJump}
              className="font-extrabold text-xs sm:text-sm text-[#2A1418] min-w-28 sm:min-w-36 text-center bg-[#FCF9F2] px-4 py-2 rounded-xl border border-gold/15 shadow-inner hover:border-gold/40 hover:bg-[#F5EFE0] transition-all"
              title="اضغط للانتقال السريع"
            >
              {periodLabel}
            </button>
            {weekInfo && (
              <span className="mt-1 text-[10px] font-extrabold px-3 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15 whitespace-nowrap">
                {weekInfo.label} · أسبوع {weekInfo.num}/44
              </span>
            )}
          </div>
          <button onClick={next} className="btn-ghost !px-2.5 hover:ring-1 hover:ring-gold/30"><ChevronLeft size={16} /></button>
          <button onClick={() => setAnchor(new Date())} className="text-xs text-primary font-extrabold hover:text-primary/80 transition-colors mr-2">
            اليوم الحالي
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* شارة "عرض للقراءة فقط" للموجه */}
          {readOnly && (
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
              سجلك الخاص — للاطلاع فقط
            </span>
          )}
          {isAdmin && (
            <button
              onClick={handleImportExcel}
              disabled={importing}
              className="btn-ghost hover:ring-1 hover:ring-gold/30 flex items-center gap-1.5 text-xs font-extrabold !py-2 !px-4 text-teal-700 border-teal-300/40 hover:bg-teal-50 disabled:opacity-60"
            >
              <FileDown size={14} />
              {importing ? "جاري الاستيراد..." : "استيراد بيانات Excel"}
            </button>
          )}
          {!readOnly && (
            <button
              onClick={() => { setBulkMode(v => !v); setSelected(new Set()); }}
              className={
                bulkMode
                  ? "btn-primary shadow-lg shadow-primary/10 flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-5"
                  : "btn-ghost hover:ring-1 hover:ring-gold/30 flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-5"
              }
            >
              <Users size={15} />
              {bulkMode ? "إنهاء الإدخال الجماعي" : "تفعيل الإدخال الجماعي"}
            </button>
          )}
        </div>
      </div>

      {/* شريط تقدم الاستيراد */}
      {importing && importProgress && (
        <div className="no-print card-luxurious p-3 flex items-center gap-3 bg-teal-50/80 border border-teal-200 animate-in">
          <div className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-teal-600 animate-spin shrink-0" />
          <p className="text-xs font-bold text-teal-800">{importProgress}</p>
        </div>
      )}

      {/* لوحة الإدخال الجماعي */}
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
              <span className="text-[#8A7A72] font-bold">من:</span>
              <select value={bulkFrom} onChange={e => setBulkFrom(+e.target.value)}
                className="bg-[#FCF9F2] text-[#2A1418] border border-gold/25 text-xs font-extrabold rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary shadow-sm">
                {days.map((d,i) => <option key={d.ds} value={i}>{d.wd} {d.dayNum}</option>)}
              </select>
              <span className="text-[#8A7A72] font-bold">إلى:</span>
              <select value={bulkTo} onChange={e => setBulkTo(+e.target.value)}
                className="bg-[#FCF9F2] text-[#2A1418] border border-gold/25 text-xs font-extrabold rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary shadow-sm">
                {days.map((d,i) => <option key={d.ds} value={i}>{d.wd} {d.dayNum}</option>)}
              </select>
            </div>
          </div>
          <div className="relative pt-2">
            <p className="text-xs text-stone-500 mb-3.5 font-bold flex items-center gap-1.5 select-none">
              <Info size={14} className="text-gold" />
              اختر نوع النشاط للفترة والموجهين المحددين:
            </p>
            <div className="flex flex-wrap gap-2">
              {CODES.map(c => (
                <button key={c.code} disabled={selected.size===0||bulkBusy} onClick={() => applyBulk(c.code)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all disabled:opacity-40 hover:ring-2 hover:ring-gold/30 shadow-sm ${c.cell}`}>
                  {c.label}
                </button>
              ))}
              <button disabled={selected.size===0||bulkBusy} onClick={applyBulkClear}
                className="px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all disabled:opacity-40 hover:ring-2 hover:ring-red-400 bg-red-500/10 text-red-700 border border-red-200 inline-flex items-center gap-1 shadow-sm">
                <Eraser size={12} /> مسح المدخلات للفترة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* دليل الأكواد */}
      {!bulkMode && (
        <div className="no-print card-luxurious p-4 flex flex-wrap gap-2 animate-in bg-white/80 backdrop-blur-md relative overflow-hidden select-none border border-gold/15">
          <div className="w-full text-[10px] font-extrabold text-[#5C1523] mb-2 flex items-center gap-1.5">
            <HelpCircle size={13} className="text-gold" />
            دليل اختصارات وأكواد الأنشطة المعتمدة في الإدارة:
          </div>
          {CODES.map(c => (
            <span key={c.code} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-extrabold shadow-sm ${c.cell}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.chip}`} />
              {c.label} ({c.short})
            </span>
          ))}
        </div>
      )}

      {/* الشبكة الرئيسية */}
      <div className="glass-table-container animate-in relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 hidden sm:hidden max-sm:block" />
        <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className={`glass-table ${mode === "week" ? "w-full" : ""}`}>
            <thead>
              <tr>
                <th
                  className="sticky right-0 z-20 bg-gradient-to-b from-[#5C1523] to-[#4A0F1B] px-2 sm:px-4 py-3.5 text-right text-xs font-extrabold text-[#EBD9B4] min-w-28 sm:min-w-44 border-l border-gold/25"
                  style={{ borderBottom: "2px solid var(--gold)" }}
                >
                  {bulkMode ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={selected.size === allIds.length && allIds.length > 0}
                        onChange={() => toggleAll(allIds)}
                        className="accent-gold w-4 h-4 rounded" />
                      قائمة الموجهين
                    </label>
                  ) : "الموجه التربوي"}
                </th>
                {(() => {
                  let weekNum = 0;
                  return days.map((d, di) => {
                    const isNewWeek = d.wd === "أحد";
                    if (isNewWeek) weekNum++;
                    const showSep = isNewWeek && di > 0 && mode === "month";
                    return (
                      <th key={d.ds}
                        className={`px-1 py-2 text-center ${cellW} ${
                          d.weekend
                            ? "bg-[#3A0B14] text-white/45"
                            : "bg-gradient-to-b from-[#5C1523] to-[#4A0F1B] text-[#EBD9B4]"
                        }`}
                        style={{
                          borderBottom: "2px solid var(--gold)",
                          borderRight: showSep ? "2px solid #C9A96E" : undefined,
                        }}
                      >
                        {showSep && (
                          <div className="text-[7px] font-black text-gold/80 -mt-0.5 mb-0.5 whitespace-nowrap">
                            أسبوع {weekNum}
                          </div>
                        )}
                        {!showSep && isNewWeek && mode === "month" && di === 0 && (
                          <div className="text-[7px] font-black text-gold/80 -mt-0.5 mb-0.5 whitespace-nowrap">
                            أسبوع {weekNum}
                          </div>
                        )}
                        <div className="text-[9px] font-extrabold opacity-80">{d.wd}</div>
                        <div className="text-xs font-extrabold mt-0.5">{d.dayNum}</div>
                        <div className="text-[8px] opacity-50">{AR_MONTHS[d.monthIdx].slice(0,3)}</div>
                      </th>
                    );
                  });
                })()}
              </tr>
            </thead>
            <tbody>
              {displaySups.map(sup => {
                const sel = selected.has(sup._id);
                // كل IDs المرتبطة بهذا الموجه (أصل + مكررات shortKey)
                const supAllIds: string[] = groupIds.get(sup._id as string) ?? [sup._id as string];
                return (
                  <tr key={sup._id} className={`hover:bg-gold/5 transition-colors border-b border-gold/5 last:border-b-0 ${sel ? "!bg-gold/[0.07]" : ""}`}>
                    <td className={`sticky right-0 z-10 px-2 sm:px-4 py-3 font-extrabold text-[#2A1418] text-xs border-l border-gold/15 whitespace-nowrap transition-colors max-w-[112px] sm:max-w-none overflow-hidden text-ellipsis ${sel ? "bg-[#FBF4E9]" : "bg-white"}`}>
                      {bulkMode ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={sel} onChange={() => toggleSel(sup._id)} className="accent-primary w-4 h-4 rounded" />
                          {sup.name}
                        </label>
                      ) : sup.name}
                    </td>

                    {days.map((d, di) => {
                      const isNewWeek = d.wd === "أحد" && di > 0 && mode === "month";
                      // ابحث في كل IDs: الأصل والمكررات (لو بياناته محفوظة تحت ID قديم)
                      const entry = supAllIds.reduce<LogEntry | undefined>(
                        (found, id) => found ?? logMap.get(`${id}_${d.ds}`),
                        undefined
                      );
                      const meta = entry ? CODE_MAP[entry.code] : null;
                      const hasNote = !!entry?.notes && entry.notes !== meta?.label;
                      return (
                        <td key={d.ds}
                          className={`p-0.5 text-center transition-all ${d.weekend ? "bg-stone-50/40" : ""}`}
                          style={{ borderRight: isNewWeek ? "2px solid rgba(201,169,110,0.4)" : undefined }}
                        >
                          <button
                            disabled={bulkMode || readOnly}
                            onClick={readOnly ? undefined : () => {
                              setPicker({ supId: sup._id, supName: sup.name, ds: d.ds,
                                label: `${d.wd} ${d.dayNum} ${AR_MONTHS[d.monthIdx]}`,
                                currentCode: entry?.code, currentNote: entry?.notes });
                              setPickerNote(entry?.notes ?? "");
                            }}
                            title={entry?.notes || meta?.label}
                            className={`w-full ${cellW} mx-auto rounded-xl text-[9px] font-extrabold transition-all border flex flex-col items-center justify-center gap-0 py-1 px-0.5 ${
                              bulkMode || readOnly ? "cursor-default border-transparent" : "hover:scale-[1.04] hover:z-10 relative"
                            } ${
                              meta
                                ? meta.cell
                                : "text-stone-300 border-dashed border-stone-200 bg-stone-50/10 " +
                                  (bulkMode || readOnly ? "" : "hover:bg-gold/10 hover:border-gold/30 hover:text-gold")
                            }`}
                            style={{ minHeight: mode === "week" ? "50px" : "40px" }}
                          >
                            {meta ? (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full mb-0.5 ${meta.chip}`} />
                                <span className="leading-tight font-black">{meta.short}</span>
                                {hasNote && mode === "week" && (
                                  <span className="text-[8px] leading-tight opacity-75 max-w-[70px] text-center break-words line-clamp-2 mt-0.5 font-semibold px-0.5">
                                    {entry!.notes!.length > 22 ? entry!.notes!.slice(0,22) + "…" : entry!.notes}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px]">·</span>
                            )}
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

      {/* منتقي الكود (الفردي) */}
      {picker && (
        <div
          className="fixed inset-0 bg-[#2A1418]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in"
          onClick={() => setPicker(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gold/25"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] overflow-hidden border-b border-gold/25">
              <div className="pattern-arabesque absolute inset-0 opacity-45" />
              <button onClick={() => setPicker(null)} className="absolute left-4 top-4.5 text-white/60 hover:text-white transition-colors">
                <X size={18} />
              </button>
              <h3 className="relative font-extrabold text-white text-base">{picker.supName}</h3>
              <p className="relative text-xs text-white/60 mt-1 font-semibold">{picker.label}</p>
              {picker.currentCode && (
                <span className={`relative mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${CODE_MAP[picker.currentCode].cell} bg-white/10`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${CODE_MAP[picker.currentCode].chip}`} />
                  {CODE_MAP[picker.currentCode].label}
                </span>
              )}
            </div>

            {/* حقل الملاحظة / اسم المدرسة */}
            <div className="px-5 pt-4 pb-1">
              <label className="block text-[10px] font-extrabold text-[#8A7A72] mb-1.5">
                اسم المدرسة / ملاحظة (اختياري)
              </label>
              <input
                type="text"
                value={pickerNote}
                onChange={e => setPickerNote(e.target.value)}
                placeholder="مثال: مدرسة قطر الابتدائية..."
                className="w-full bg-[#FDFAF5] border border-gold/30 rounded-xl px-3 py-2 text-xs font-semibold text-[#2A1418] outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-stone-300"
                dir="rtl"
              />
            </div>

            <div className="p-4 grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {CODES.map(c => (
                <button key={c.code} onClick={() => setCode(c.code)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all hover:ring-2 hover:ring-gold/30 hover:shadow-sm ${c.cell} ${picker.currentCode === c.code ? "ring-2 ring-offset-1 ring-current" : ""}`}
                  >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.chip}`} />
                  {c.label}
                </button>
              ))}
            </div>

            <div className="px-5 pb-5">
              <button onClick={clearCode}
                className="btn-ghost w-full justify-center text-red-600 border border-red-200 hover:bg-red-50 hover:text-red-700 font-extrabold text-xs !py-3 rounded-xl transition-all">
                <Eraser size={14} className="shrink-0" /> تفريغ هذا اليوم
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

      {/* منتقي الشهر — fixed فوق كل شيء */}
      {jumpOpen && (
        <div
          ref={jumpRef}
          className="fixed z-[9999] bg-white border border-gold/20 rounded-2xl shadow-2xl p-4 w-72"
          style={{ top: jumpPos.top, left: jumpPos.left, transform: "translateX(-50%)" }}
        >
          <p className="text-[10px] font-extrabold text-stone-400 mb-3 text-center">الانتقال السريع — العام الدراسي 2025-2026</p>
          {[
            { label: "2025", yr: 2025, months: [7, 8, 9, 10, 11] },
            { label: "2026", yr: 2026, months: [0, 1, 2, 3, 4, 5] },
          ].map(({ label, yr, months }) => (
            <div key={label} className="mb-3">
              <p className="text-[9px] font-bold text-stone-400 mb-1.5 text-center">{label}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {months.map(m => {
                  const isCurrent = anchor.getFullYear() === yr && anchor.getMonth() === m;
                  return (
                    <button
                      key={m}
                      onClick={() => { setAnchor(new Date(yr, m, 1)); setJumpOpen(false); }}
                      className={`py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${isCurrent ? "bg-primary text-white shadow" : "bg-stone-100 text-[#2A1418] hover:bg-gold/20"}`}
                    >
                      {AR_MONTHS[m]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            onClick={() => { setAnchor(new Date()); setJumpOpen(false); }}
            className="w-full mt-1 py-1.5 rounded-xl text-[11px] font-extrabold bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            اليوم الحالي
          </button>
        </div>
      )}
    </>
  );
}

/* ───────────────────── التقرير السنوي ───────────────────── */
function AnnualSummary() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = ["admin","superadmin"].includes(user?.role ?? "");
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
    } finally { setRecomputing(false); }
  }

  if (!summaries) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  const visibleCodes = CODES.filter(c => summaries.some(r => ((r as any)[c.code] ?? 0) > 0));
  const codes = visibleCodes.length > 0 ? visibleCodes.map(c => c.code) : CODES.map(c => c.code);

  return (
    <div className="space-y-3 animate-in">
      {isAdmin && (
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <p className="text-xs text-[#8A7A72] font-semibold">
            الأرقام محسوبة من السجلات اليومية — تُحدَّث تلقائياً عند كل إدخال
          </p>
          <button onClick={handleRecompute} disabled={recomputing}
            className="btn-primary text-xs py-2 px-4 disabled:opacity-60 flex items-center gap-1.5">
            <RotateCcw size={13} className={recomputing ? "animate-spin" : ""} />
            {recomputing ? "جاري إعادة الحساب..." : "إعادة حساب الكل"}
          </button>
        </div>
      )}
      {recomputeMsg && (
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
          {recomputeMsg}
        </div>
      )}

      <div className="glass-table-container">
        <div className="flex items-center gap-2 px-5 py-2 border-b border-black/[0.04] bg-white/40 no-print">
          <span className="text-[10px] font-bold text-[#A89A92]">← مرّر يساراً لرؤية باقي الأعمدة</span>
          <div className="flex gap-0.5 mr-auto">
            {codes.map(c => <span key={c} className={`w-2 h-2 rounded-full ${CODE_MAP[c]?.chip ?? ""}`} title={CODE_MAP[c]?.label} />)}
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="glass-table w-max min-w-full">
            <thead>
              <tr>
                <th className="sticky right-0 z-10 bg-gradient-to-b from-[#5C1523] to-[#4A0F1B] px-3 py-3 text-right text-xs font-extrabold text-[#EBD9B4] w-40 min-w-[140px] border-l border-gold/25"
                  style={{ borderBottom: "2px solid var(--gold)" }}>
                  الموجه التربوي
                </th>
                {codes.map(c => (
                  <th key={c} className="px-1 py-0 text-center w-10 min-w-[40px] border-l border-white/10 last:border-l-0 bg-[#3D0D18]"
                    style={{ borderBottom: `3px solid ${CODE_MAP[c]?.hdr ?? "#888"}` }}>
                    <div className="flex flex-col items-center justify-center gap-0.5 py-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: CODE_MAP[c]?.hdr }} />
                      <span className="text-[9px] font-extrabold whitespace-nowrap leading-none" style={{ color: CODE_MAP[c]?.hdr }}>
                        {CODE_MAP[c]?.short}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-1 py-0 text-center w-12 min-w-[48px] bg-[#3D0D18]"
                  style={{ borderBottom: "3px solid #38bdf8" }}>
                  <div className="flex flex-col items-center justify-center gap-0.5 py-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-[9px] font-extrabold text-sky-400 leading-none">تمدرس</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((row, i) => (
                <tr key={row._id} className={`hover:bg-gold/5 transition-colors border-b border-gold/5 last:border-b-0 ${i%2 ? "bg-stone-50/20" : ""}`}>
                  <td className={`font-extrabold text-[#2A1418] text-xs sticky right-0 z-10 px-3 py-2.5 border-l border-gold/15 transition-colors whitespace-nowrap ${i%2 ? "bg-[#FAF8F5]" : "bg-white"}`}>
                    {row.supervisor?.name ?? "—"}
                  </td>
                  {codes.map(c => {
                    const val = ((row as Record<string, unknown>)[c] as number) ?? 0;
                    return (
                      <td key={c} className="text-center px-1 py-2 border-l border-gold/5 last:border-l-0">
                        {val > 0 ? (
                          <span className={`inline-flex items-center justify-center w-7 h-6 rounded-md font-extrabold text-[11px] ${CODE_MAP[c]?.cell}`}>
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

/* ─────────────────────── تحليل الأداء ─────────────────────── */

// مجموعات الأنشطة للتحليل
const ANALYSIS_GROUPS = [
  {
    key: "visits",
    label: "الزيارات الميدانية",
    codes: ["VS", "CL"] as Code[],
    color: "#10b981",
    bg: "bg-emerald-500",
    lightBg: "bg-emerald-50",
    textColor: "text-emerald-700",
    border: "border-emerald-200",
  },
  {
    key: "office",
    label: "العمل المكتبي",
    codes: ["OF"] as Code[],
    color: "#5C1523",
    bg: "bg-[#5C1523]",
    lightBg: "bg-rose-50",
    textColor: "text-[#5C1523]",
    border: "border-rose-200",
  },
  {
    key: "devMeetings",
    label: "التطوير والاجتماعات",
    codes: ["TR", "OL", "MT"] as Code[],
    color: "#0ea5e9",
    bg: "bg-sky-500",
    lightBg: "bg-sky-50",
    textColor: "text-sky-700",
    border: "border-sky-200",
  },
  {
    key: "missions",
    label: "المهام والأنشطة",
    codes: ["SP", "VP", "AC"] as Code[],
    color: "#f59e0b",
    bg: "bg-amber-500",
    lightBg: "bg-amber-50",
    textColor: "text-amber-700",
    border: "border-amber-200",
  },
  {
    key: "leave",
    label: "الإجازات والأذونات",
    codes: ["LV", "SL", "HC", "CA", "WP"] as Code[],
    color: "#f97316",
    bg: "bg-orange-500",
    lightBg: "bg-orange-50",
    textColor: "text-orange-700",
    border: "border-orange-200",
  },
  {
    key: "absent",
    label: "الغياب بدون عذر",
    codes: ["AB"] as Code[],
    color: "#ef4444",
    bg: "bg-red-500",
    lightBg: "bg-red-50",
    textColor: "text-red-700",
    border: "border-red-200",
  },
] as const;

type SortKey = "visits" | "office" | "devMeetings" | "missions" | "leave" | "absent" | "total" | "name";

function PerformanceAnalysis() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isSupervisor = user?.role === "supervisor";
  const summaries = useQuery(api.activity.summaries, token ? { academicYear: YEAR, token } : "skip");
  const [sortBy, setSortBy] = useState<SortKey>("visits");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [highlight, setHighlight] = useState<string | null>(null);

  if (!summaries) return (
    <div className="flex items-center justify-center h-72">
      <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
    </div>
  );

  // حساب قيم كل مجموعة لكل موجه
  const rows = summaries.map((s) => {
    const get = (c: Code) => ((s as Record<string, unknown>)[c] as number) ?? 0;
    const groups: Record<string, number> = {};
    for (const g of ANALYSIS_GROUPS) {
      groups[g.key] = g.codes.reduce((sum, c) => sum + get(c), 0);
    }
    const total = Object.values(groups).reduce((a, b) => a + b, 0);
    return { ...s, groups, total };
  });

  // ترتيب
  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  }
  const sorted = [...rows].sort((a, b) => {
    const va = sortBy === "name" ? (a.supervisor?.name ?? "") : sortBy === "total" ? a.total : (a.groups[sortBy] ?? 0);
    const vb = sortBy === "name" ? (b.supervisor?.name ?? "") : sortBy === "total" ? b.total : (b.groups[sortBy] ?? 0);
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string, "ar") : (vb as string).localeCompare(va, "ar");
    return sortDir === "desc" ? (vb as number) - (va as number) : (va as number) - (vb as number);
  });

  // إجماليات وأعلى قيم لكل مجموعة
  const totals: Record<string, number> = {};
  const maxVals: Record<string, number> = {};
  for (const g of ANALYSIS_GROUPS) {
    totals[g.key] = rows.reduce((s, r) => s + r.groups[g.key], 0);
    maxVals[g.key] = Math.max(...rows.map(r => r.groups[g.key]), 1);
  }
  const totalAll = rows.reduce((s, r) => s + r.total, 0);
  const maxTotal = Math.max(...rows.map(r => r.total), 1);
  const maxVisits = maxVals["visits"];

  // أفضل موجه في الزيارات
  const topVisitor = [...rows].sort((a, b) => b.groups.visits - a.groups.visits)[0];
  // أكثر موجه إجازة
  const topLeave = [...rows].sort((a, b) => b.groups.leave - a.groups.leave)[0];
  // من لديه غياب
  const absentCount = rows.filter(r => r.groups.absent > 0).length;

  return (
    <div className="space-y-6 animate-in">

      {/* بطاقات KPI العليا */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ANALYSIS_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => toggleSort(g.key as SortKey)}
            className={`card-luxurious p-4 text-right transition-all hover:shadow-lg group relative overflow-hidden ${sortBy === g.key ? "ring-2 ring-offset-1" : ""}`}
            style={{ '--ring-color': g.color } as React.CSSProperties}
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${g.bg}`} />
            <div className={`text-2xl font-black mb-1 ${g.textColor}`}>{totals[g.key]}</div>
            <div className="text-[10px] font-extrabold text-stone-500 leading-tight">{g.label}</div>
            <div className="text-[9px] font-bold text-stone-400 mt-0.5">
              {totalAll > 0 ? `${Math.round(totals[g.key] / totalAll * 100)}%` : "—"}
            </div>
            {sortBy === g.key && (
              <span className={`absolute top-2 left-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${g.lightBg} ${g.textColor} border ${g.border}`}>
                {sortDir === "desc" ? "↓" : "↑"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* نبذة سريعة */}
      {!isSupervisor && rows.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topVisitor && (
            <div className="card-luxurious p-4 flex items-center gap-3 border-r-4 border-emerald-400">
              <Award size={22} className="text-emerald-500 shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-stone-400">أعلى عدد زيارات</div>
                <div className="text-sm font-extrabold text-[#2A1418] leading-tight">{topVisitor.supervisor?.name ?? "—"}</div>
                <div className="text-xs font-bold text-emerald-600">{topVisitor.groups.visits} زيارة</div>
              </div>
            </div>
          )}
          {topLeave && (
            <div className="card-luxurious p-4 flex items-center gap-3 border-r-4 border-orange-400">
              <TrendingDown size={22} className="text-orange-500 shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-stone-400">أكثر أيام إجازة</div>
                <div className="text-sm font-extrabold text-[#2A1418] leading-tight">{topLeave.supervisor?.name ?? "—"}</div>
                <div className="text-xs font-bold text-orange-600">{topLeave.groups.leave} يوم</div>
              </div>
            </div>
          )}
          <div className={`card-luxurious p-4 flex items-center gap-3 border-r-4 ${absentCount > 0 ? "border-red-400" : "border-emerald-400"}`}>
            {absentCount > 0
              ? <AlertTriangle size={22} className="text-red-500 shrink-0" />
              : <TrendingUp size={22} className="text-emerald-500 shrink-0" />}
            <div>
              <div className="text-[10px] font-bold text-stone-400">غياب بدون عذر</div>
              <div className={`text-2xl font-black ${absentCount > 0 ? "text-red-600" : "text-emerald-600"}`}>{absentCount}</div>
              <div className="text-[10px] font-bold text-stone-400">موجه</div>
            </div>
          </div>
        </div>
      )}

      {/* الجدول التفصيلي */}
      <div className="card-luxurious overflow-hidden">
        {/* رأس الجدول — رسالة الترتيب */}
        <div className="px-5 py-3 border-b border-gold/10 bg-gradient-to-l from-white to-[#FDFAF5] flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-extrabold text-[#5C1523] flex items-center gap-2">
            <BarChart2 size={14} className="text-gold" />
            تحليل تفصيلي لنشاط كل موجه — {YEAR}
          </p>
          <p className="text-[10px] font-semibold text-stone-400">
            اضغط على أي بطاقة أعلاه لترتيب القائمة حسبها
          </p>
        </div>

        <div className="divide-y divide-gold/8">
          {sorted.map((row, idx) => {
            const isHighlighted = highlight === row._id;
            const name = row.supervisor?.name ?? "—";
            return (
              <div
                key={row._id}
                onClick={() => setHighlight(isHighlighted ? null : row._id)}
                className={`px-4 sm:px-6 py-4 cursor-pointer transition-all ${isHighlighted ? "bg-gold/[0.06]" : idx % 2 ? "bg-stone-50/30" : "bg-white"} hover:bg-gold/[0.04]`}
              >
                {/* صف العنوان */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-sm text-[#2A1418]">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400">
                      إجمالي الأيام المرصودة:
                    </span>
                    <span className="text-sm font-black text-[#2A1418]">{row.total}</span>
                    <span className="hidden sm:inline text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                      {row.schoolingDays} يوم تمدرس
                    </span>
                  </div>
                </div>

                {/* شريط التوزيع النسبي */}
                {row.total > 0 && (
                  <div className="flex h-2.5 rounded-full overflow-hidden mb-3 gap-px">
                    {ANALYSIS_GROUPS.map((g) => {
                      const pct = row.groups[g.key] / row.total * 100;
                      if (pct < 0.5) return null;
                      return (
                        <div
                          key={g.key}
                          className={`${g.bg} transition-all`}
                          style={{ width: `${pct}%` }}
                          title={`${g.label}: ${row.groups[g.key]} (${Math.round(pct)}%)`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* شبكة المجموعات */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ANALYSIS_GROUPS.map((g) => {
                    const val = row.groups[g.key];
                    const pct = maxVals[g.key] > 0 ? val / maxVals[g.key] : 0;
                    return (
                      <div key={g.key} className={`rounded-xl p-2.5 ${g.lightBg} border ${g.border} relative overflow-hidden`}>
                        {/* شريط خلفي */}
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${g.bg} opacity-10 transition-all`}
                          style={{ height: `${pct * 100}%` }}
                        />
                        <div className={`relative text-xl font-black ${g.textColor} leading-none`}>{val}</div>
                        <div className="relative text-[9px] font-extrabold text-stone-500 mt-1 leading-tight">{g.label}</div>
                        {/* تفاصيل المكوّنات عند الضغط */}
                        {isHighlighted && val > 0 && (
                          <div className="relative mt-1.5 space-y-0.5">
                            {g.codes.map((c) => {
                              const cv = ((row as Record<string, unknown>)[c] as number) ?? 0;
                              if (!cv) return null;
                              return (
                                <div key={c} className="flex items-center justify-between gap-1">
                                  <span className={`inline-flex items-center gap-0.5 text-[8px] font-extrabold px-1 py-0.5 rounded ${CODE_MAP[c].cell}`}>
                                    <span className={`w-1 h-1 rounded-full ${CODE_MAP[c].chip}`} />
                                    {CODE_MAP[c].short}
                                  </span>
                                  <span className={`text-[9px] font-black ${g.textColor}`}>{cv}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* صف الإجمالي */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-l from-[#F7F2E7] to-[#FAF7F0] border-t-2 border-gold/20">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="font-extrabold text-xs text-[#5C1523]">الإجمالي العام</span>
            <span className="text-sm font-black text-[#2A1418]">{totalAll} يوم</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ANALYSIS_GROUPS.map((g) => (
              <div key={g.key} className={`rounded-xl p-2.5 ${g.lightBg} border ${g.border}`}>
                <div className={`text-xl font-black ${g.textColor}`}>{totals[g.key]}</div>
                <div className="text-[9px] font-extrabold text-stone-400 mt-0.5">
                  {totalAll > 0 ? `${Math.round(totals[g.key] / totalAll * 100)}%` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
