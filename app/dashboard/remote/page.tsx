"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { PrintButton, PrintHeader } from "@/components/ui/PrintReport";
import {
  GraduationCap, School, ClipboardCheck, TrendingUp, CalendarRange,
  TriangleAlert, Lightbulb, MessageSquareText, Check, X, Pencil,
  Plus, Trash2, Power, SlidersHorizontal,
} from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

const DAY_LABELS: { key: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday"; label: string }[] = [
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الاثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
];

export default function RemotePage() {
  const { user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = ["admin","superadmin"].includes(user?.role ?? "");
  const [tab, setTab] = useState<"coverage" | "periods" | "schedule" | "survey">("coverage");
  return (
    <>
      <PageHeader title="التعلم عن بعد" subtitle={`تغطية وفترات وجدول واستطلاع — العام الدراسي ${YEAR}`} icon={<GraduationCap size={26} />}
        action={<PrintButton />} />
      <PrintHeader title="تقرير التعلم عن بعد" subtitle={`العام الدراسي ${YEAR}`} />
      <div className="no-print flex gap-2.5 p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-gold/10 animate-in overflow-x-auto no-scrollbar max-w-max mb-6">
        <TabBtn active={tab === "coverage"} onClick={() => setTab("coverage")}>التغطية</TabBtn>
        <TabBtn active={tab === "periods"}  onClick={() => setTab("periods")}>الفترات</TabBtn>
        <TabBtn active={tab === "schedule"} onClick={() => setTab("schedule")}>الجدول الأسبوعي</TabBtn>
        <TabBtn active={tab === "survey"}   onClick={() => setTab("survey")}>الاستطلاع</TabBtn>
      </div>
      {tab === "coverage" ? <Coverage isAdmin={isAdmin} />
        : tab === "periods" ? <Periods isAdmin={isAdmin} />
        : tab === "schedule" ? <Schedule />
        : <Survey />}
    </>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap relative
        ${active 
          ? "bg-gradient-to-l from-primary to-[#7A1E30] text-white shadow-md shadow-primary/20 scale-102 border border-primary/20" 
          : "bg-white/80 hover:bg-[#FCF9F2]/60 text-[#5C1523]/80 hover:text-primary border border-gold/10 hover:border-gold/30 shadow-sm"
        }`}>
      {children}
      {active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
      )}
    </button>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center h-72">
    <div className="w-9 h-9 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
}

/* ───────────────────────── التغطية ───────────────────────── */
function Coverage({ isAdmin }: { isAdmin: boolean }) {
  const { token } = useAuth();
  const YEAR = useActiveYear();
  const rows = useQuery(api.remote.coverage, token ? { academicYear: YEAR, token } : "skip");
  const updateCoverage = useMutation(api.remote.updateCoverage);
  const setRequiredForAll = useMutation(api.remote.setRequiredForAll);

  const [edit, setEdit] = useState<{ supId: Id<"supervisors">; required: number; covered: number; forms: number } | null>(null);
  const [showSetAll, setShowSetAll] = useState(false);
  const [allValue, setAllValue] = useState("10");
  const [toast, setToast] = useState<string | null>(null);
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  if (!rows) return <Spinner />;

  const sorted = [...rows].sort((a, b) => b.coverageRate - a.coverageRate);
  const totReq = rows.reduce((s, r) => s + r.required, 0);
  const totCov = rows.reduce((s, r) => s + r.covered, 0);
  const totForms = rows.reduce((s, r) => s + r.forms, 0);
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.coverageRate, 0) / rows.length) : 0;
  const pctColor = (p: number) => p >= 100 ? "text-emerald-600" : p >= 80 ? "text-primary" : "text-orange-500";

  async function saveEdit() {
    if (!edit) return;
    await updateCoverage({
      supervisorId: edit.supId, academicYear: YEAR,
      required: edit.required, covered: edit.covered, forms: edit.forms,
      token: token ?? undefined,
    });
    setEdit(null);
    show("تم تحديث التغطية وإعادة حساب النِّسب");
  }
  async function applySetAll() {
    const n = parseInt(allValue, 10);
    if (Number.isNaN(n)) return;
    const count = await setRequiredForAll({ academicYear: YEAR, required: n, token: token ?? undefined });
    setShowSetAll(false);
    show(`تم ضبط المطلوب = ${n} لـ ${count} موجه`);
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard title="المدارس المطلوبة" value={totReq} sub="للتعلم عن بعد" icon={<School size={20} />} color="primary" />
        <KpiCard title="المدارس المغطّاة" value={totCov} sub={totReq ? `${Math.round(totCov / totReq * 100)}%` : "—"} icon={<ClipboardCheck size={20} />} color="gold" />
        <KpiCard title="إجمالي الاستمارات" value={totForms} icon={<ClipboardCheck size={20} />} color="green" />
        <KpiCard title="متوسط التغطية" value={`${avg}%`} icon={<TrendingUp size={20} />} color="blue" />
      </div>

      {isAdmin && (
        <div className="no-print flex items-center justify-between flex-wrap gap-3 bg-white/40 backdrop-blur-sm border border-gold/15 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse shrink-0" />
            <p className="text-xs font-semibold text-[#5C1523]/80">المطلوب لكل موجه قابل للتعديل — انقر زر التعديل بجانب الصف. النِّسب تُحسب تلقائيًا.</p>
          </div>
          <button onClick={() => setShowSetAll(true)} className="btn-ghost !py-2 !px-4 hover:border-gold/50 hover:bg-[#FCF9F2]/50 text-xs font-bold transition-all duration-300 flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-gold" /> تعديل المطلوب للجميع
          </button>
        </div>
      )}

      {/* موبايل: بطاقات */}
      <div className="space-y-3.5 lg:hidden">
        {sorted.map((r) => (
          <div key={r._id} className="card-luxurious p-4 relative overflow-hidden group">
            <span className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-[#7A1E30]" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="icon-orb !w-8 !h-8 bg-gradient-to-br from-[#DFC48E]/20 to-[#A8853A]/10 text-gold-dark border border-gold/25 font-bold text-xs">
                  {r.supervisor?.name ? r.supervisor.name.trim().charAt(0) : "—"}
                </div>
                <p className="font-bold text-[#2A1418] text-sm">{r.supervisor?.name ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-extrabold text-sm ${pctColor(r.coverageRate)}`}>{Math.round(r.coverageRate)}%</span>
                {isAdmin && (
                  <button onClick={() => setEdit({ supId: r.supervisorId, required: r.required, covered: r.covered, forms: r.forms })}
                    className="text-primary hover:text-white hover:bg-primary rounded-xl p-2 transition-all duration-200 border border-transparent hover:border-primary/20"><Pencil size={13} /></button>
                )}
              </div>
            </div>
            <div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${Math.min(r.coverageRate, 100)}%` }} /></div>
            <div className="flex justify-between items-center text-[11px] text-[#7A6A58] mt-2.5 pt-2 border-t border-black/[0.02]">
              <span>معدل التغطية: <strong className="text-[#2A1418] font-bold">{r.covered} من أصل {r.required}</strong> مدرسة</span>
              <span className="inline-flex items-center gap-1 text-gold-dark bg-gold/5 px-2 py-0.5 rounded-lg border border-gold/10 font-bold">{r.forms} استمارة</span>
            </div>
          </div>
        ))}
      </div>

      {/* سطح المكتب: جدول */}
      <div className="glass-table-container hidden lg:block animate-in">
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th className="!text-center !w-14">#</th>
                <th className="text-right">الموجه</th>
                <th className="text-center">المطلوب</th>
                <th className="text-center">المغطّى</th>
                <th className="text-center">الاستمارات</th>
                <th className="text-center">نسبة التغطية</th>
                <th className="text-center">نسبة الاستمارات</th>
                {isAdmin && <th className="text-center no-print">تعديل</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r._id} className="group">
                  <td className="text-center text-[#A89A92] font-bold">{i + 1}</td>
                  <td className="font-extrabold text-[#2A1418] flex items-center gap-2.5">
                    <span className="icon-orb !w-8 !h-8 bg-gradient-to-br from-[#FCF9F2] to-[#DFC48E]/20 text-[#5C1523] border border-gold/30 font-extrabold text-xs shadow-inner">
                      {r.supervisor?.name ? r.supervisor.name.trim().charAt(0) : "—"}
                    </span>
                    <span>{r.supervisor?.name ?? "—"}</span>
                  </td>
                  <td className="text-center text-[#5C1523] font-bold num">{r.required}</td>
                  <td className="text-center text-[#5C1523] font-bold num">{r.covered}</td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-lg bg-gold/10 text-gold-dark font-extrabold text-xs border border-gold/20">
                      {r.forms}
                    </span>
                  </td>
                  <td className={`text-center font-extrabold ${pctColor(r.coverageRate)}`}>{Math.round(r.coverageRate)}%</td>
                  <td className="text-center text-[#5b4a3e] font-semibold">{Math.round(r.formsRate)}%</td>
                  {isAdmin && (
                    <td className="text-center no-print">
                      <button onClick={() => setEdit({ supId: r.supervisorId, required: r.required, covered: r.covered, forms: r.forms })}
                        className="text-primary hover:text-white hover:bg-primary border border-primary/20 hover:border-transparent rounded-xl p-2 transition-all duration-200"><Pencil size={14} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة تعديل تغطية موجه */}
      {edit && (
        <Modal title="تعديل تغطية التعلم عن بعد" onClose={() => setEdit(null)}>
          <div className="p-6 space-y-4">
            <NumField label="المطلوب" value={edit.required} onChange={(v) => setEdit({ ...edit, required: v })} />
            <NumField label="المغطّى" value={edit.covered} onChange={(v) => setEdit({ ...edit, covered: v })} />
            <NumField label="عدد الاستمارات" value={edit.forms} onChange={(v) => setEdit({ ...edit, forms: v })} />
            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 text-xs text-gold-dark font-semibold leading-relaxed">
              نسبة التغطية ستُحسب تلقائيًا = المغطّى ÷ المطلوب.
            </div>
          </div>
          <ModalFooter onClose={() => setEdit(null)} onSave={saveEdit} />
        </Modal>
      )}

      {/* نافذة ضبط المطلوب للجميع */}
      {showSetAll && (
        <Modal title="تعديل المطلوب لكل الموجهين" onClose={() => setShowSetAll(false)}>
          <div className="p-6 space-y-4">
            <NumField label="المطلوب الجديد للجميع" value={parseInt(allValue, 10) || 0} onChange={(v) => setAllValue(String(v))} />
            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 text-xs text-gold-dark font-semibold leading-relaxed">
              سيُطبَّق على جميع الموجهين في العام {YEAR}، وتُعاد النِّسب تلقائيًا.
            </div>
          </div>
          <ModalFooter onClose={() => setShowSetAll(false)} onSave={applySetAll} />
        </Modal>
      )}

      {toast && <Toast msg={toast} />}
    </>
  );
}

/* ───────────────────────── الجدول الأسبوعي ───────────────────────── */
function Schedule() {
  const { token } = useAuth();
  const YEAR = useActiveYear();
  const rows = useQuery(api.remote.schedule, token ? { academicYear: YEAR, token } : "skip");
  if (!rows) return <Spinner />;

  return (
    <div className="space-y-6">
      {rows.map((r) => (
        <div key={r._id} className="card-luxurious overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
          <div className="px-6 py-4.5 flex items-center justify-between border-b border-gold/15 bg-gradient-to-l from-[#5C1523]/5 to-[#4A0F1B]/0 relative">
            <span className="absolute right-0 top-0 bottom-0 w-1 bg-gold" />
            <div className="flex items-center gap-3">
              <span className="icon-orb !w-9 !h-9 bg-gradient-to-br from-[#5C1523] to-[#4A0F1B] text-gold border border-gold/25 font-bold text-sm">
                {r.supervisor?.name ? r.supervisor.name.trim().charAt(0) : "—"}
              </span>
              <p className="font-extrabold text-[#2A1418] text-base">{r.supervisor?.name ?? "—"}</p>
            </div>
            <span className="pill bg-gold/10 text-gold-dark border border-gold/20 px-3 py-1 flex items-center gap-1.5 text-xs font-bold">
              <CalendarRange size={14} className="text-gold-dark" /> {r.schoolsTotal} مدارس مسجلة
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-x-reverse divide-gold/10 bg-[#FCF9F2]/30">
            {DAY_LABELS.map(({ key, label }) => {
              const slots = r.days[key] ?? [];
              return (
                <div key={key} className="p-4.5 hover:bg-white/40 transition-colors duration-250">
                  <p className="text-xs font-extrabold text-[#5C1523] mb-3 pb-1 border-b border-gold/10 inline-block">{label}</p>
                  {slots.length === 0 ? (
                    <p className="text-[11px] text-[#A87A72]/60 font-semibold italic">لا يوجد زيارات مجدولة</p>
                  ) : (
                    <div className="space-y-2">
                      {slots.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2.5 bg-white/70 hover:bg-white border border-gold/10 hover:border-gold/30 rounded-xl px-3 py-2 shadow-sm transition-all duration-200">
                          <span className="text-[12px] font-bold text-[#4B3A32] leading-snug">{s.school}</span>
                          <span className="shrink-0 text-[10px] font-extrabold text-white bg-gradient-to-br from-primary to-[#7A1E30] rounded-lg px-2 py-0.5 shadow-sm">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── الاستطلاع ───────────────────────── */
type SurveyForm = {
  id?: Id<"remoteSurvey">;
  supervisorId?: Id<"supervisors">;
  name: string;
  date: string;
  items: { challenge: string; recommendation: string }[];
};

const emptySurvey = (user: any): SurveyForm => ({
  name: user?.role === "supervisor" ? user.name : "",
  supervisorId: user?.role === "supervisor" ? user.supervisorId : undefined,
  date: new Date().toISOString().split("T")[0],
  items: [{ challenge: "", recommendation: "" }],
});

function Survey() {
  const { user, token } = useAuth();
  const isAdmin = ["admin","superadmin"].includes(user?.role ?? "");
  const isSupervisor = user?.role === "supervisor";
  
  const rows = useQuery(api.remote.survey, token ? { token } : "skip");
  const supervisors = useQuery(api.supervisors.list, token ? { token } : "skip");
  
  const upsertSurvey = useMutation(api.remote.upsertSurvey);
  const removeSurvey = useMutation(api.remote.removeSurvey);

  const [form, setForm] = useState<SurveyForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  if (!rows) return <Spinner />;

  function addItem() {
    if (!form) return;
    setForm({
      ...form,
      items: [...form.items, { challenge: "", recommendation: "" }]
    });
  }

  function removeItem(index: number) {
    if (!form) return;
    const newItems = form.items.filter((_, idx) => idx !== index);
    setForm({ ...form, items: newItems });
  }

  function changeItem(index: number, field: "challenge" | "recommendation", val: string) {
    if (!form) return;
    const newItems = form.items.map((it, idx) => {
      if (idx === index) {
        return { ...it, [field]: val };
      }
      return it;
    });
    setForm({ ...form, items: newItems });
  }

  async function save() {
    if (!form) return;
    if (!form.date) {
      alert("الرجاء تحديد التاريخ");
      return;
    }
    if (isAdmin && !form.supervisorId) {
      alert("الرجاء اختيار الموجه");
      return;
    }
    const validItems = form.items.filter(it => it.challenge.trim() || it.recommendation.trim());
    if (validItems.length === 0) {
      alert("الرجاء إضافة تحدي أو توصية واحدة على الأقل");
      return;
    }

    try {
      setSaving(true);
      let supName = form.name;
      if (isAdmin && form.supervisorId) {
        const found = supervisors?.find(s => s._id === form.supervisorId);
        if (found) supName = found.name;
      }

      await upsertSurvey({
        id: form.id,
        supervisorId: form.supervisorId,
        name: supName,
        date: form.date,
        items: validItems,
        token: token ?? undefined,
      });

      show(form.id ? "تم تحديث المشاركة والاستبيان بنجاح" : "تمت إضافة المشاركة والاستبيان بنجاح");
      setForm(null);
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"remoteSurvey">, name: string) {
    if (!confirm(`هل أنت متأكد من حذف مشاركة الموجه "${name}" في هذا الاستطلاع؟`)) return;
    try {
      await removeSurvey({ id, token: token ?? undefined });
      show("تم حذف المشاركة بنجاح");
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء حذف المشاركة");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-luxurious p-5 flex items-center justify-between flex-wrap gap-4 bg-gradient-to-l from-[#DFC48E]/10 via-transparent to-transparent border-gold/20">
        <div className="flex items-center gap-4">
          <span className="icon-orb !w-12 !h-12 bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white shadow-md shadow-gold/20"><MessageSquareText size={20} /></span>
          <div>
            <h4 className="font-extrabold text-[#2A1418] text-base">نتائج استطلاع يوم التعلم عن بعد</h4>
            <p className="text-xs text-gold-dark font-semibold mt-0.5">
              {rows.length > 0
                ? (() => {
                    const dates = [...new Set(rows.map((r) => r.date))].sort();
                    const fmt = (d: string) => new Date(d).toLocaleDateString("ar-QA", { day: "numeric", month: "long", year: "numeric" });
                    return dates.length === 1
                      ? `تاريخ الاستطلاع: ${fmt(dates[0])} · إجمالي المشاركات: ${rows.length} موجهين`
                      : `فترة الاستطلاع: ${fmt(dates[0])} — ${fmt(dates[dates.length - 1])} · إجمالي المشاركات: ${rows.length} موجهين`;
                  })()
                : `إجمالي المشاركات: ${rows.length} موجهين`}
            </p>
          </div>
        </div>
        {(isAdmin || isSupervisor) && (
          <button
            onClick={() => setForm(emptySurvey(user))}
            className="btn-primary flex items-center gap-2 !py-2.5 !px-5 rounded-xl hover:scale-102 duration-200 text-xs font-bold shadow-md shadow-primary/10 no-print"
          >
            <Plus size={16} /> إضافة استبيان جديد
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card-luxurious p-12 text-center text-[#A89A92] text-sm font-semibold">لا توجد مشاركات مسجّلة بعد.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rows.map((r) => {
            const canEdit = isAdmin || (isSupervisor && r.supervisorId === user?.supervisorId);
            return (
              <div key={r._id} className="card-luxurious p-6 space-y-4 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 relative group">
                <div className="flex items-center justify-between border-b border-gold/15 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-6 rounded-full bg-primary" />
                    <p className="font-extrabold text-[#2A1418] text-base">{r.name}</p>
                    <span className="text-[10px] font-bold text-gold-dark bg-gold/5 px-2.5 py-0.5 rounded-lg border border-gold/10 ml-2" dir="ltr">{r.date}</span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1.5 no-print">
                      <button
                        onClick={() => setForm({ id: r._id, supervisorId: r.supervisorId, name: r.name, date: r.date, items: r.items })}
                        className="text-xs font-bold text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1 transition-all duration-200"
                      >
                        <Pencil size={13} /> تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(r._id, r.name)}
                        className="text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition-all duration-200"
                      >
                        <Trash2 size={13} /> حذف
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {r.items.map((it, idx) => (
                    <div key={idx} className="space-y-3">
                      {it.challenge && (
                        <div className="flex items-start gap-3 bg-orange-500/[0.03] border border-orange-500/10 rounded-xl p-3.5">
                          <TriangleAlert size={16} className="text-orange-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-bold text-orange-600 mb-0.5">التحدي المرصود</p>
                            <p className="text-xs text-[#4b3a32] leading-relaxed font-semibold">{it.challenge}</p>
                          </div>
                        </div>
                      )}
                      {it.recommendation && (
                        <div className="flex items-start gap-3 bg-emerald-600/[0.03] border border-emerald-600/10 rounded-xl p-3.5">
                          <Lightbulb size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-bold text-emerald-600 mb-0.5">التوصيات والمقترحات</p>
                            <p className="text-xs text-[#4b3a32] leading-relaxed font-semibold">{it.recommendation}</p>
                          </div>
                        </div>
                      )}
                      {idx < r.items.length - 1 && <div className="border-b border-dashed border-gold/10 my-2" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <Modal title={form.id ? "تعديل مشاركة الاستبيان" : "إضافة مشاركة / استبيان التعلم عن بعد"} onClose={() => setForm(null)} wide={true}>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1008] mb-1.5">تاريخ الاستبيان *</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field font-semibold text-xs focus:ring-primary/30 focus:border-primary/50" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1008] mb-1.5">الموجه التربوي *</label>
                {isAdmin ? (
                  <select
                    value={form.supervisorId || ""}
                    onChange={(e) => setForm({ ...form, supervisorId: e.target.value as Id<"supervisors"> })}
                    className="field font-semibold text-xs focus:ring-primary/30 focus:border-primary/50 bg-white"
                  >
                    <option value="">-- اختر الموجه --</option>
                    {supervisors?.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={form.name} disabled className="field font-semibold text-xs bg-gray-100/60 text-[#7A6A58] border-gold/10" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-gold" /> التحديات والتوصيات
                </span>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-ghost !py-1.5 !px-3 text-xs font-bold hover:border-gold/50 flex items-center gap-1"
                >
                  <Plus size={14} /> إضافة بند جديد
                </button>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                {form.items.map((it, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#FCF9F2]/30 border border-gold/15 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gold-dark bg-gold/5 px-2.5 py-0.5 rounded-lg border border-gold/10">بند {idx + 1}</span>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors duration-150"
                          title="حذف البند"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-orange-600 mb-1">التحدي المرصود</label>
                        <textarea
                          value={it.challenge}
                          onChange={(e) => changeItem(idx, "challenge", e.target.value)}
                          className="field font-semibold text-xs focus:ring-primary/30 focus:border-primary/50 min-h-[50px] py-1.5"
                          placeholder="اكتب التحدي أو العائق الفني/الإداري..."
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-600 mb-1">التوصيات والمقترحات</label>
                        <textarea
                          value={it.recommendation}
                          onChange={(e) => changeItem(idx, "recommendation", e.target.value)}
                          className="field font-semibold text-xs focus:ring-primary/30 focus:border-primary/50 min-h-[50px] py-1.5"
                          placeholder="اكتب الحل المقترح أو التوصيات العلاجية..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ModalFooter onClose={() => setForm(null)} onSave={save} saving={saving} />
        </Modal>
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

/* ───────────────────────── الفترات (CRUD) ───────────────────────── */
type PeriodForm = {
  id?: Id<"remoteLearningPeriods">;
  name: string; reason: string; startDate: string; endDate: string;
  isActive: boolean; requiredPerSupervisor: string; notes: string;
};
const emptyPeriod: PeriodForm = { name: "", reason: "", startDate: "", endDate: "", isActive: true, requiredPerSupervisor: "10", notes: "" };

function Periods({ isAdmin }: { isAdmin: boolean }) {
  const { token } = useAuth();
  const YEAR = useActiveYear();
  const periods = useQuery(api.remotePeriods.list, token ? { academicYear: YEAR, token } : "skip");
  const create = useMutation(api.remotePeriods.create);
  const update = useMutation(api.remotePeriods.update);
  const toggleActive = useMutation(api.remotePeriods.toggleActive);
  const remove = useMutation(api.remotePeriods.remove);

  const [form, setForm] = useState<PeriodForm | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  if (!periods) return <Spinner />;

  async function save() {
    if (!form || !form.name || !form.startDate || !form.endDate) return;
    const req = form.requiredPerSupervisor ? parseInt(form.requiredPerSupervisor, 10) : undefined;
    const base = {
      name: form.name, reason: form.reason || undefined,
      startDate: form.startDate, endDate: form.endDate,
      isActive: form.isActive, scope: "all" as const,
      requiredPerSupervisor: req, notes: form.notes || undefined,
      token: token ?? undefined,
    };
    if (form.id) { await update({ id: form.id, ...base }); show("تم تحديث الفترة"); }
    else { await create({ ...base, academicYear: YEAR }); show("تمت إضافة الفترة"); }
    setForm(null);
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <p className="text-sm font-semibold text-[#7A6A58]">فترات تفعيل التعلم عن بعد (طوارئ، أيام محددة، أسابيع...).</p>
        {isAdmin && (
          <button onClick={() => setForm({ ...emptyPeriod })} className="btn-primary flex items-center gap-2 !py-2.5 !px-5 rounded-xl hover:scale-102 duration-200">
            <Plus size={16} /> إضافة فترة جديدة
          </button>
        )}
      </div>

      {periods.length === 0 ? (
        <div className="card-luxurious p-12 text-center text-[#A89A92] text-sm font-semibold">لا توجد فترات مسجّلة بعد.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {periods.map((p) => (
            <div key={p._id} className="card-luxurious p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="icon-orb !w-11 !h-11 bg-gradient-to-br from-[#5C1523] to-[#4A0F1B] text-gold border border-gold/25 shadow-md shadow-primary/10"><CalendarRange size={20} /></span>
                    <div>
                      <p className="font-extrabold text-[#2A1418] text-base">{p.name}</p>
                      <p className="text-[11px] font-bold text-gold-dark mt-0.5" dir="ltr">{p.startDate} ← {p.endDate}</p>
                    </div>
                  </div>
                  <span className={`pill px-3 py-1 font-bold text-xs ${p.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                    {p.isActive ? "فعّالة حالياً" : "منتهية الصلاحية"}
                  </span>
                </div>
                {p.reason && (
                  <div className="bg-[#FCF9F2]/50 border border-gold/10 rounded-xl p-3.5 mt-4">
                    <p className="text-xs font-bold text-[#5C1523] mb-1">السبب / الغرض:</p>
                    <p className="text-xs text-[#4b3a32] leading-relaxed font-semibold">{p.reason}</p>
                  </div>
                )}
                {p.notes && (
                  <p className="text-xs text-[#7A6A58] mt-3 font-semibold">ملاحظات: {p.notes}</p>
                )}
              </div>
              
              <div className="mt-5 pt-3.5 border-t border-gold/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3 text-[#7A6A58] font-bold">
                  {p.requiredPerSupervisor != null && <span>المطلوب: <strong className="text-primary font-extrabold">{p.requiredPerSupervisor} زيارات</strong></span>}
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60" />
                  <span>النطاق: {p.scope === "all" ? "كل المدارس" : "مدارس محددة"}</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setForm({ id: p._id, name: p.name, reason: p.reason ?? "", startDate: p.startDate, endDate: p.endDate, isActive: p.isActive, requiredPerSupervisor: p.requiredPerSupervisor != null ? String(p.requiredPerSupervisor) : "", notes: p.notes ?? "" })}
                      className="text-xs font-bold text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10 rounded-xl px-3 py-2 flex items-center gap-1 transition-all duration-200"><Pencil size={13} /> تعديل</button>
                    <button onClick={async () => { await toggleActive({ id: p._id, isActive: !p.isActive, token: token ?? undefined }); show(p.isActive ? "أُوقفت الفترة" : "فُعّلت الفترة"); }}
                      className="text-xs font-bold text-[#5b4a3e] hover:bg-black/[0.03] border border-transparent hover:border-black/[0.05] rounded-xl px-3 py-2 flex items-center gap-1 transition-all duration-200"><Power size={13} /> {p.isActive ? "إيقاف" : "تفعيل"}</button>
                    <button onClick={async () => { if (confirm(`حذف فترة "${p.name}"؟`)) { await remove({ id: p._id, token: token ?? undefined }); show("حُذفت الفترة"); } }}
                      className="text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1 transition-all duration-200"><Trash2 size={13} /> حذف</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.id ? "تعديل فترة" : "إضافة فترة تعلم عن بعد"} onClose={() => setForm(null)}>
          <div className="p-6 space-y-4">
            <TxtField label="اسم الفترة *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="مثال: تعليق الدراسة - طوارئ" />
            <TxtField label="السبب / الوصف" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} placeholder="ظرف طارئ، صيانة، ..." />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1C1008] mb-1.5">من تاريخ *</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="field font-semibold text-xs focus:ring-primary/30 focus:border-primary/50" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1008] mb-1.5">إلى تاريخ *</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="field font-semibold text-xs focus:ring-primary/30 focus:border-primary/50" dir="ltr" />
              </div>
            </div>
            <NumField label="المطلوب لكل موجه" value={parseInt(form.requiredPerSupervisor, 10) || 0} onChange={(v) => setForm({ ...form, requiredPerSupervisor: String(v) })} />
            <label className="flex items-center gap-2.5 text-sm text-[#1C1008] font-semibold cursor-pointer pt-2 select-none">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary w-4.5 h-4.5 rounded-lg border-gold/30" />
              تفعيل هذه الفترة حالياً
            </label>
          </div>
          <ModalFooter onClose={() => setForm(null)} onSave={save} />
        </Modal>
      )}

      {toast && <Toast msg={toast} />}
    </>
  );
}

/* ───────────────────────── عناصر مشتركة ───────────────────────── */
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-[#2A1418]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in" onClick={onClose}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-hidden max-h-[90vh] overflow-y-auto border border-gold/20`} onClick={(e) => e.stopPropagation()}>
        <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] overflow-hidden border-b border-gold/25">
          <div className="pattern-arabesque absolute inset-0 opacity-40" />
          <button onClick={onClose} className="absolute left-4 top-4.5 text-white/70 hover:text-white transition-colors duration-150"><X size={18} /></button>
          <h3 className="relative font-extrabold text-white text-base">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving = false }: { onClose: () => void; onSave: () => void; saving?: boolean }) {
  return (
    <div className="px-6 pb-6 flex gap-3 justify-end">
      <button onClick={onClose} disabled={saving} className="btn-ghost text-xs font-bold !py-2.5 !px-5 disabled:opacity-50">إلغاء</button>
      <button onClick={onSave} disabled={saving} className="btn-primary text-xs font-bold !py-2.5 !px-5 flex items-center gap-1.5 disabled:opacity-75">
        {saving ? (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <Check size={14} />
        )}
        {saving ? "جاري الحفظ..." : "حفظ البيانات"}
      </button>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#1C1008] mb-1.5">{label}</label>
      <input type="number" min={0} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)} className="field font-semibold focus:ring-primary/30 focus:border-primary/50" dir="ltr" />
    </div>
  );
}

function TxtField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#1C1008] mb-1.5">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field font-semibold focus:ring-primary/30 focus:border-primary/50" placeholder={placeholder} />
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-2 animate-in border border-emerald-500/30">
      <Check size={16} className="text-white" /> {msg}
    </div>
  );
}
