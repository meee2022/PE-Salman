"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import {
  Trophy, Plus, Pencil, Trash2, X, Check, Loader2,
  Search, AlertCircle, Building2, School2, ChevronRight, Printer
} from "lucide-react";
import Link from "next/link";

const GENDER_MAP = { male: "بنين", female: "بنات", both: "جميع الفئات" } as const;
const STAGE_MAP  = { primary: "ابتدائي", middle: "إعدادي", secondary: "ثانوي", all: "جميع المراحل", model: "نموذجي" } as const;
const TYPE_MAP   = { department: "فعاليات القسم", school: "فعاليات المدارس" } as const;

type Gender = keyof typeof GENDER_MAP;
type Stage  = keyof typeof STAGE_MAP;
type PType  = keyof typeof TYPE_MAP;

type FormData = {
  organizer: string; activityName: string; partnership: string;
  dateText: string; gender: Gender; stage: Stage; type: PType; notes: string;
};

export default function ActivitiesPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = user && ["admin", "superadmin"].includes(user.role);

  const activities = useQuery(api.activityPlans.listByYear, { academicYear: YEAR, token: token ?? undefined });
  const createMut  = useMutation(api.activityPlans.create);
  const updateMut  = useMutation(api.activityPlans.update);
  const removeMut  = useMutation(api.activityPlans.remove);

  const [tab, setTab]       = useState<PType>("department");
  const [search, setSearch] = useState("");
  const [modal, setModal]   = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<Id<"activityPlans"> | null>(null);
  const [form, setForm]     = useState<FormData>({
    organizer: "", activityName: "", partnership: "",
    dateText: "", gender: "both", stage: "all", type: "department", notes: "",
  });
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    if (!activities) return [];
    return activities
      .filter(a => a.type === tab)
      .filter(a => !search || [a.activityName, a.organizer, a.partnership ?? ""].some(s => s.includes(search)));
  }, [activities, tab, search]);

  const deptCount   = activities?.filter(a => a.type === "department").length ?? 0;
  const schoolCount = activities?.filter(a => a.type === "school").length ?? 0;

  function openAdd() {
    setForm({ organizer: "", activityName: "", partnership: "", dateText: "", gender: "both", stage: "all", type: tab, notes: "" });
    setEditId(null); setErr(null); setModal("add");
  }
  function openEdit(a: NonNullable<typeof activities>[0]) {
    setForm({ organizer: a.organizer, activityName: a.activityName, partnership: a.partnership ?? "",
      dateText: a.dateText, gender: a.gender as Gender, stage: a.stage as Stage, type: a.type as PType, notes: a.notes ?? "" });
    setEditId(a._id); setErr(null); setModal("edit");
  }
  async function handleSave() {
    if (!form.organizer.trim() || !form.activityName.trim() || !form.dateText.trim()) {
      setErr("الجهة المنظمة واسم النشاط والتاريخ مطلوبة"); return;
    }
    setBusy(true); setErr(null);
    try {
      const p = { ...form, partnership: form.partnership || undefined, notes: form.notes || undefined, token: token ?? undefined };
      if (modal === "add") { await createMut({ ...p, academicYear: YEAR }); showToast("✅ تم إضافة النشاط"); }
      else if (editId)     { await updateMut({ id: editId, ...p }); showToast("✅ تم حفظ التعديلات"); }
      setModal(null);
    } catch (e: any) { setErr(e.message ?? "حدث خطأ"); }
    finally { setBusy(false); }
  }
  async function handleDelete(id: Id<"activityPlans">, name: string) {
    if (!confirm(`حذف "${name}"؟`)) return;
    await removeMut({ id, token: token ?? undefined });
    showToast("تم الحذف");
  }

  if (activities === undefined) {
    return <div className="py-24 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
  }

  return (
    <div className="space-y-5 animate-in">

      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#8A7A72] font-semibold">
        <Link href="/dashboard/plans" className="hover:text-primary transition-colors">الخطط</Link>
        <ChevronRight size={12} className="rotate-180" />
        <span className="text-[#2A1418] font-bold">خطة الأنشطة اللاصفية</span>
      </div>

      <PageHeader
        title="خطة الأنشطة اللاصفية"
        subtitle={`الأنشطة والفعاليات الرياضية المعتمدة — العام ${YEAR}`}
        icon={<Trophy size={24} />}
      />

      {/* إشعار القاعدة الفارغة */}
      {activities.length === 0 && isAdmin && (
        <div className="card-luxurious p-5 bg-amber-50/60 border-amber-200/60 flex items-start gap-4">
          <span className="icon-orb !w-10 !h-10 bg-amber-100 text-amber-600 border border-amber-200 shrink-0">
            <Trophy size={18} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">لا توجد أنشطة مسجّلة بعد</p>
            <p className="text-xs text-amber-700/80 font-semibold mt-1">أضف الأنشطة مباشرةً من زر "إضافة نشاط"، أو استورد بيانات الملف الأصلي من صفحة الاستيراد.</p>
          </div>
          <Link href="/dashboard/settings/import" className="text-xs font-bold text-amber-700 underline whitespace-nowrap hover:text-amber-900">
            صفحة الاستيراد ←
          </Link>
        </div>
      )}

      {/* شريط الأدوات */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C0B4AE]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم النشاط أو الجهة…" className="field pr-9 text-sm" />
        </div>
        {/* زر طباعة */}
        <Link href={`/print/activities?year=${YEAR}`} target="_blank"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border border-black/10 text-[#6b5a52] hover:bg-black/[0.03] hover:border-primary/20 hover:text-primary transition-all whitespace-nowrap">
          <Printer size={15} /> طباعة PDF
        </Link>
        {isAdmin && (
          <button onClick={openAdd}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5 whitespace-nowrap">
            <Plus size={16} /> إضافة نشاط
          </button>
        )}
      </div>

      {/* تبويبات */}
      <div className="flex gap-1 bg-white/60 border border-black/[0.06] rounded-2xl p-1.5 shadow-sm w-fit">
        {(Object.keys(TYPE_MAP) as PType[]).map(t => {
          const active = tab === t;
          const Icon = t === "department" ? Building2 : School2;
          const count = t === "department" ? deptCount : schoolCount;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                active ? "bg-gradient-to-l from-primary to-[#7A1E30] text-white shadow-md" : "text-[#6b5a52] hover:bg-black/[0.04]"
              }`}>
              <Icon size={15} className={active ? "text-gold" : "opacity-60"} />
              {TYPE_MAP[t]}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-black ${active ? "bg-white/20 text-white" : "bg-black/[0.06] text-[#8A7A72]"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* الجدول */}
      {filtered.length === 0 ? (
        <div className="glass-table-container py-16 text-center space-y-3">
          <Trophy size={32} className="mx-auto text-[#DFC48E] opacity-40" />
          <p className="text-sm font-bold text-[#8A7A72]">
            {search ? "لا توجد نتائج للبحث" : `لا توجد ${TYPE_MAP[tab]} بعد`}
          </p>
          {!search && isAdmin && (
            <button onClick={openAdd} className="inline-flex items-center gap-2 text-xs font-bold text-primary underline">
              <Plus size={13} /> أضف الآن
            </button>
          )}
        </div>
      ) : (
        <div className="glass-table-container animate-in">
          <table className="glass-table">
            <thead>
              <tr>
                <th className="text-center w-12">#</th>
                <th>اسم النشاط</th>
                <th>الجهة المنظمة</th>
                <th>الشراكة</th>
                <th className="text-center">التاريخ</th>
                <th className="text-center">الفئة</th>
                <th className="text-center">المرحلة</th>
                {isAdmin && <th className="text-center w-20">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a._id} className="group">
                  <td className="text-center text-xs font-bold text-[#C0B4AE] px-3">{i + 1}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-extrabold text-primary text-sm">{a.activityName}</span>
                    {a.notes && <p className="text-[11px] text-[#8A7A72] font-semibold mt-0.5">{a.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-[#2A1418] text-sm">{a.organizer}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6b5a52] font-semibold">
                    {a.partnership ?? <span className="text-[#C0B4AE]">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-bold text-[#2A1418] bg-black/[0.04] px-2.5 py-1 rounded-lg whitespace-nowrap">
                      {a.dateText}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center"><GenderBadge gender={a.gender as Gender} /></td>
                  <td className="px-4 py-3.5 text-center"><StageBadge stage={a.stage as Stage} /></td>
                  {isAdmin && (
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(a)}
                          className="p-1.5 rounded-lg hover:bg-gold/10 text-[#8A7A72] hover:text-primary transition-colors" title="تعديل">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(a._id, a.activityName)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#8A7A72] hover:text-red-600 transition-colors" title="حذف">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-[#2A1418]/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gold/20" onClick={e => e.stopPropagation()}>
            <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] border-b border-gold/25 overflow-hidden">
              <div className="pattern-arabesque absolute inset-0 opacity-30" />
              <button onClick={() => setModal(null)} className="absolute left-4 top-5 text-white/70 hover:text-white"><X size={18} /></button>
              <h3 className="relative font-extrabold text-white flex items-center gap-2 text-base">
                <Trophy size={17} className="text-gold" />
                {modal === "add" ? "إضافة نشاط جديد" : "تعديل النشاط"}
              </h3>
              <p className="relative text-white/50 text-xs mt-0.5">{form.type === "department" ? "فعالية القسم" : "فعالية مدرسة"} — {YEAR}</p>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {err && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl px-4 py-2.5 border border-red-200">
                  <AlertCircle size={14} /> {err}
                </div>
              )}
              {/* نوع الفعالية */}
              <div>
                <label className="field-label">نوع الفعالية</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TYPE_MAP) as [PType, string][]).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setForm(f => ({ ...f, type: k }))}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        form.type === k ? "bg-primary/5 border-primary text-primary" : "border-black/10 text-[#6b5a52] hover:border-primary/30"
                      }`}>
                      {k === "department" ? <Building2 size={13} className="inline ml-1.5" /> : <School2 size={13} className="inline ml-1.5" />}
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">اسم النشاط *</label>
                <input value={form.activityName} onChange={e => setForm(f => ({ ...f, activityName: e.target.value }))}
                  className="field" placeholder="بطولة / مسابقة / فعالية رياضية…" />
              </div>
              <div>
                <label className="field-label">الجهة المنظمة *</label>
                <input value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))}
                  className="field" placeholder={form.type === "department" ? "قسم التربية البدنية" : "اسم المدرسة"} />
              </div>
              <div>
                <label className="field-label">الشراكة</label>
                <input value={form.partnership} onChange={e => setForm(f => ({ ...f, partnership: e.target.value }))}
                  className="field" placeholder="اسباير / وزارة الرياضة / اتحاد رياضي…" />
              </div>
              <div>
                <label className="field-label">التاريخ *</label>
                <input value={form.dateText} onChange={e => setForm(f => ({ ...f, dateText: e.target.value }))}
                  className="field" placeholder="مثال: 15-16/2/2026  أو  مارس 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">الفئة</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Gender }))} className="field bg-white">
                    {Object.entries(GENDER_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">المرحلة</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage }))} className="field bg-white">
                    {Object.entries(STAGE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="field resize-none" rows={2} placeholder="أي تفاصيل إضافية…" />
              </div>
            </div>

            <div className="px-6 pb-5 pt-3 flex gap-3 justify-end border-t border-gold/10">
              <button onClick={() => setModal(null)} className="btn-ghost text-xs font-bold !py-2.5 !px-5">إلغاء</button>
              <button onClick={handleSave} disabled={busy} className="btn-primary text-xs font-bold !py-2.5 !px-6 flex items-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {modal === "add" ? "إضافة النشاط" : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-500/30">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

function GenderBadge({ gender }: { gender: Gender }) {
  const cfg = { male: "bg-sky-50 text-sky-700 border-sky-200/50", female: "bg-pink-50 text-pink-700 border-pink-200/50", both: "bg-purple-50 text-purple-700 border-purple-200/50" }[gender];
  return <span className={`pill text-[11px] font-bold border ${cfg}`}>{GENDER_MAP[gender]}</span>;
}
function StageBadge({ stage }: { stage: Stage }) {
  const cfg = { primary: "bg-emerald-50 text-emerald-700 border-emerald-200/50", middle: "bg-amber-50 text-amber-700 border-amber-200/50", secondary: "bg-primary/5 text-primary border-primary/15", all: "bg-gold/10 text-gold-dark border-gold/20", model: "bg-indigo-50 text-indigo-700 border-indigo-200/50" }[stage];
  return <span className={`pill text-[11px] font-bold border ${cfg}`}>{STAGE_MAP[stage]}</span>;
}
