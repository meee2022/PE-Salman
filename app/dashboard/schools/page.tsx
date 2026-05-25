"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, TxtField, NumField, SelectField } from "@/components/ui/Modal";
import { Search, ArrowLeftRight, School, Check, X, Plus, Pencil, Trash2, Users, Phone, Mail, Printer, Download } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";
import { exportToCSV, printTable, type ExportColumn } from "@/lib/exportUtils";

type SchoolWithSup = Doc<"schools"> & { supervisor: Doc<"supervisors"> | null };
type SchoolForm = {
  id?: Id<"schools">; name: string; gender: "male" | "female"; level: string;
  teachers: number; coordinators: number; notes: string;
};
const LEVELS = ["نموذجي", "ابتدائي", "أعدادي", "ثانوي", "تخصصي", "مشتركة"];
const emptySchool: SchoolForm = { name: "", gender: "male", level: "ابتدائي", teachers: 0, coordinators: 0, notes: "" };

export default function SchoolsPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = ["admin","superadmin"].includes(user?.role ?? "");
  const schools      = useQuery(api.schools.list, token ? { academicYear: YEAR, token } : "skip") as SchoolWithSup[] | undefined;
  const supervisors  = useQuery(api.supervisors.list, token ? { token } : "skip");
  const bulkReassign = useMutation(api.assignments.bulkReassign);
  const createSchool = useMutation(api.schools.create);
  const updateSchool = useMutation(api.schools.update);
  const removeSchool = useMutation(api.schools.remove);

  const [form, setForm] = useState<SchoolForm | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  const [search,       setSearch]       = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [supFilter,    setSupFilter]    = useState<string>("all");
  const [selected,     setSelected]     = useState<Set<Id<"schools">>>(new Set());
  const [showModal,    setShowModal]    = useState(false);
  const [targetSupId,  setTargetSupId]  = useState<Id<"supervisors"> | "">("");
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);
  const [teachersOf,   setTeachersOf]   = useState<{ name: string; gender: "male"|"female" } | null>(null);

  const filtered = useMemo(() => {
    if (!schools) return [];
    return schools.filter((s) => {
      if (genderFilter !== "all" && s.gender !== genderFilter) return false;
      if (supFilter !== "all" && (s.supervisor?._id ?? "none") !== supFilter) return false;
      if (search && !s.name.includes(search)) return false;
      return true;
    });
  }, [schools, search, genderFilter, supFilter]);

  function toggleSelect(id: Id<"schools">) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((s) => s._id)));
  }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function saveSchool() {
    if (!form || !form.name.trim()) return;
    setSavingForm(true);
    try {
      const base = {
        name: form.name, gender: form.gender, level: form.level || undefined,
        teachers: form.teachers || undefined, coordinators: form.coordinators || undefined,
        notes: form.notes || undefined, token: token ?? undefined,
      };
      if (form.id) { await updateSchool({ id: form.id, ...base }); showToast("تم تحديث المدرسة"); }
      else { await createSchool(base); showToast("تمت إضافة المدرسة"); }
      setForm(null);
    } finally { setSavingForm(false); }
  }
  async function delSchool(id: Id<"schools">, name: string) {
    if (!confirm(`حذف المدرسة "${name}"؟ سيُحذف إسنادها أيضًا.`)) return;
    await removeSchool({ id, token: token ?? undefined });
    showToast("تم حذف المدرسة");
  }

  async function handleReassign() {
    if (!targetSupId || selected.size === 0) return;
    setSaving(true);
    try {
      await bulkReassign({
        schoolIds: Array.from(selected) as Id<"schools">[],
        fromSupervisorId: supervisors![0]._id,
        toSupervisorId: targetSupId as Id<"supervisors">,
        academicYear: YEAR,
        notes: "إعادة توزيع يدوي",
        token: token ?? undefined,
      });
      showToast(`تم نقل ${selected.size} مدرسة بنجاح`);
      setSelected(new Set());
      setShowModal(false);
      setTargetSupId("");
    } finally { setSaving(false); }
  }

  // أعمدة التصدير/الطباعة
  const exportColumns: ExportColumn<SchoolWithSup>[] = [
    { header: "#", value: () => "", align: "center" },
    { header: "اسم المدرسة", value: (s) => s.name },
    { header: "فئة الطلاب", value: (s) => (s.gender === "male" ? "بنين" : "بنات"), align: "center" },
    { header: "المرحلة", value: (s) => s.level ?? "—", align: "center" },
    { header: "عدد المعلمين", value: (s) => s.teachers ?? 0, align: "center" },
    { header: "عدد المنسقين", value: (s) => s.coordinators ?? 0, align: "center" },
    { header: "الموجه المسؤول", value: (s) => s.supervisor?.name ?? "غير مسندة" },
  ];

  function schoolsFilterDesc() {
    const parts: string[] = [];
    if (genderFilter !== "all") parts.push(genderFilter === "male" ? "بنين" : "بنات");
    if (supFilter !== "all") {
      const sup = supervisors?.find((x) => x._id === supFilter);
      if (sup) parts.push(`الموجه: ${sup.name}`);
    }
    if (search) parts.push(`بحث: ${search}`);
    return parts.length ? parts.join(" · ") : `جميع المدارس — العام ${YEAR}`;
  }

  function handleExport() {
    if (!filtered.length) return;
    exportToCSV("المدارس_والتوزيع", exportColumns.filter((c) => c.header !== "#"), filtered);
  }

  function handlePrint() {
    if (!filtered.length) return;
    let i = 0;
    const cols = exportColumns.map((c) => (c.header === "#" ? { ...c, value: () => String(++i) } : c));
    printTable({
      title: "المدارس وتوزيعها على الموجهين",
      subtitle: schoolsFilterDesc(),
      columns: cols,
      rows: filtered,
      meta: [
        { label: "إجمالي المدارس", value: filtered.length },
        { label: "بنين", value: filtered.filter((s) => s.gender === "male").length },
        { label: "بنات", value: filtered.filter((s) => s.gender === "female").length },
      ],
    });
  }

  if (!schools || !supervisors) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-gold/10 border-t-gold animate-spin" />
          <div className="absolute inset-2 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin" style={{ animationDirection: "reverse", animationDuration: "1s" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="المدارس والتوزيع"
        subtitle={`${schools.length} مدرسة مدرجة بالخطة — العام الدراسي ${YEAR}`}
        icon={<School size={26} />}
        action={
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {selected.size > 0 && (
              <button onClick={() => setShowModal(true)} className="btn-ghost !border-primary/20 hover:bg-primary/5 text-primary rounded-xl font-bold shadow-sm flex items-center gap-1.5 transition-all">
                <ArrowLeftRight size={16} /> نقل {selected.size} مدرسة مسندة
              </button>
            )}
            <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-sm transition-all" title="طباعة / حفظ PDF">
              <Printer size={14} /> طباعة / PDF
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-sm transition-all" title="تصدير كـ Excel/CSV">
              <Download size={14} /> تصدير Excel
            </button>
            {isAdmin && (
              <button onClick={() => setForm({ ...emptySchool })} className="btn-primary">
                <Plus size={16} /> إضافة مدرسة جديدة
              </button>
            )}
          </div>
        }
      />

      {/* فلاتر البحث والفرز */}
      <div className="card-luxurious p-4 flex flex-wrap gap-4 items-center bg-white/70 backdrop-blur-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A7A72]" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المدرسة..." 
            className="field pr-10 hover:border-gold/30" 
          />
        </div>
        
        <div className="flex rounded-2xl border border-black/[0.06] overflow-hidden bg-white/50 p-1 backdrop-blur-md">
          {([["all","الكل"],["male","بنين"],["female","بنات"]] as const).map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => setGenderFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 
                ${genderFilter === v ? "bg-primary text-white shadow-md" : "text-[#6b5a52] hover:bg-black/[0.02]"}`}
            >
              {l}
            </button>
          ))}
        </div>
        
        <select 
          value={supFilter} 
          onChange={(e) => setSupFilter(e.target.value)} 
          className="field max-w-[220px] font-bold text-[#4b3a32] hover:border-gold/30 cursor-pointer"
        >
          <option value="all">كل الموجهين</option>
          <option value="none">بدون موجه معين</option>
          {supervisors.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        
        <span className="text-xs font-bold text-[#8A7A72] mr-auto bg-gold/10 px-3 py-1.5 rounded-lg border border-gold/10">{filtered.length} منشأة تعليمية</span>
      </div>

      {/* جدول المدارس الفاخر */}
      <div className="glass-table-container">
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th className="w-16 text-center">
                  <div className="flex justify-center items-center">
                    <input 
                      type="checkbox" 
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll} 
                      className="accent-primary w-4.5 h-4.5 rounded-md cursor-pointer" 
                    />
                  </div>
                </th>
                <th className="text-right">اسم المؤسسة التعليمية</th>
                <th className="text-center">فئة الطلاب</th>
                <th className="text-center">المرحلة الدراسية</th>
                <th className="text-center">عدد المعلمين</th>
                <th className="text-right">الموجه المسؤول الحالي</th>
                <th className="text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((school) => (
                <tr key={school._id} className={`group transition-all ${selected.has(school._id) ? "bg-gold/5" : ""}`}>
                  <td className="text-center">
                    <div className="flex justify-center items-center">
                      <input 
                        type="checkbox" 
                        checked={selected.has(school._id)}
                        onChange={() => toggleSelect(school._id)} 
                        className="accent-primary w-4.5 h-4.5 rounded-md cursor-pointer" 
                      />
                    </div>
                  </td>
                  <td className="font-bold text-[#2A1418]">
                    <div className="flex items-center gap-3">
                      <span className="icon-orb !w-9 !h-9 bg-primary/5 text-primary transform group-hover:scale-105 transition-transform duration-300">
                        <School size={15} />
                      </span>
                      {school.name}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`pill backdrop-blur-sm text-[11px] font-bold ${
                      school.gender === "male"
                        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70"
                        : "bg-pink-50 text-pink-700 ring-1 ring-pink-200/70"
                    }`}>
                      {school.gender === "male" ? "بنين" : "بنات"}
                    </span>
                  </td>
                  <td className="text-center text-xs font-semibold text-[#8A7A72]">{school.level ?? "—"}</td>
                  <td className="text-center">
                    {school.teachers ? (
                      <button
                        onClick={() => setTeachersOf({ name: school.name, gender: school.gender })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-sans bg-primary/5 text-primary hover:bg-primary/10 ring-1 ring-primary/10 transition-all"
                        title="عرض أسماء المعلمين"
                      >
                        <Users size={12} /> {school.teachers}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-[#bdb0a6] font-sans">—</span>
                    )}
                  </td>
                  <td>
                    {school.supervisor ? (
                      <span className="font-bold text-[#2A1418] hover:text-primary transition-colors cursor-pointer">{school.supervisor.name}</span>
                    ) : (
                      <span className="pill bg-orange-50 text-orange-600 ring-1 ring-orange-200/70 text-[10px] font-bold">غير مسندة</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <SingleAssignButton 
                        schoolId={school._id} 
                        supervisors={supervisors}
                        currentSupId={school.supervisor?._id ?? null} 
                        academicYear={YEAR} 
                        onDone={showToast} 
                        token={token} 
                      />
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => setForm({ id: school._id, name: school.name, gender: school.gender, level: school.level ?? "", teachers: school.teachers ?? 0, coordinators: school.coordinators ?? 0, notes: school.notes ?? "" })}
                            className="text-primary hover:bg-primary/5 rounded-xl p-2 transition-all" 
                            title="تعديل المدرسة"
                          >
                            <Pencil size={14} />
                          </button>
                          
                          <button 
                            onClick={() => delSchool(school._id, school.name)}
                            className="text-red-600 hover:bg-red-50 rounded-xl p-2 transition-all" 
                            title="حذف المدرسة"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[#8A7A72] text-sm font-bold bg-white/50">
            لا توجد مدارس مطابقة للبحث أو الفلترة المحددة
          </div>
        )}
      </div>

      {/* نافذة إعادة الإسناد الجماعي الفاخرة */}
      {showModal && (
        <div className="fixed inset-0 bg-[#2A1418]/45 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-black/[0.04]">
            <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#3B0A14] overflow-hidden">
              <div className="pattern-arabesque absolute inset-0 opacity-[0.4]" />
              <button 
                onClick={() => { setShowModal(false); setTargetSupId(""); }}
                className="absolute left-4 top-5 text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <h3 className="relative text-lg font-black text-white flex items-center gap-2">
                <ArrowLeftRight size={20} className="text-gold" /> نقل إسناد {selected.size} مدرسة
              </h3>
              <p className="relative text-xs text-white/75 mt-1.5 font-medium">نقل جماعي وتوزيع المدارس المحددة لموجه آخر في العام {YEAR}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2A1418] mb-2.5">اختيار الموجه المستلم الجديد</label>
                <select 
                  value={targetSupId} 
                  onChange={(e) => setTargetSupId(e.target.value as Id<"supervisors">)} 
                  className="field font-bold text-[#4b3a32] cursor-pointer"
                >
                  <option value="">-- اضغط للاختيار من القائمة --</option>
                  {supervisors.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.gender === "male" ? "ذكر" : "أنثى"})</option>
                  ))}
                </select>
              </div>
              
              <div className="bg-gold/10 border border-gold/25 rounded-2xl p-4 text-xs font-semibold text-[#8a6a1f] leading-relaxed">
                تنبيه: سيقوم النظام بتحديث التوزيع لـ <strong>{selected.size} مدرسة</strong> في العام الدراسي {YEAR} فقط. لن تتأثر السنوات الدراسية السابقة أو السجلات القديمة بهذا النقل.
              </div>
            </div>
            
            <div className="px-6 pb-5 flex gap-3 justify-end bg-black/[0.01]">
              <button onClick={() => { setShowModal(false); setTargetSupId(""); }} className="btn-ghost rounded-xl font-bold">إلغاء</button>
              <button 
                onClick={handleReassign} 
                disabled={!targetSupId || saving} 
                className="btn-primary rounded-xl font-bold"
              >
                {saving ? "جاري النقل..." : <><Check size={15} /> تأكيد نقل الإسناد</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة/تعديل مدرسة */}
      {form && (
        <Modal title={form.id ? "تعديل بيانات المدرسة" : "إضافة مدرسة جديدة للنظام"} onClose={() => setForm(null)}>
          <div className="p-6 space-y-3">
            <TxtField label="اسم المدرسة الكامل" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="فئة الطلاب" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={[["male", "بنين"], ["female", "بنات"]]} />
              <SelectField label="المرحلة الدراسية" value={form.level} onChange={(v) => setForm({ ...form, level: v })} options={LEVELS.map((l) => [l, l] as const)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="عدد المعلمين الكلي" value={form.teachers} onChange={(v) => setForm({ ...form, teachers: v })} />
              <NumField label="عدد المنسقين للمادة" value={form.coordinators} onChange={(v) => setForm({ ...form, coordinators: v })} />
            </div>
            <TxtField label="ملاحظات وتوجيهات إضافية" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          </div>
          <ModalFooter onClose={() => setForm(null)} onSave={saveSchool} saving={savingForm} disabled={!form.name.trim()} />
        </Modal>
      )}

      {/* نافذة أسماء المعلمين */}
      {teachersOf && (
        <TeachersModal school={teachersOf} onClose={() => setTeachersOf(null)} />
      )}

      {/* التنبيهات الموقوتة */}
      {toast && (
        <div className="fixed bottom-6 left-6 bg-emerald-600 text-white text-xs font-bold px-5 py-3.5 rounded-2xl shadow-xl z-50 flex items-center gap-2 animate-in border border-emerald-500/25">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

// ── نافذة عرض معلمي مدرسة ──────────────────────────────────────────
function TeachersModal({ school, onClose }: { school: { name: string; gender: "male"|"female" }; onClose: () => void }) {
  const teachers = useQuery(api.teachers.bySchoolName, { schoolName: school.name });
  const coordinators = teachers?.filter((t) => (t.jobTitle ?? "").startsWith("منسق")) ?? [];
  const regular      = teachers?.filter((t) => !(t.jobTitle ?? "").startsWith("منسق")) ?? [];

  // قفل تمرير الصفحة الخلفية أثناء فتح النافذة
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-[#2A1418]/45 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-black/[0.04] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#3B0A14] overflow-hidden shrink-0">
          <div className="pattern-arabesque absolute inset-0 opacity-[0.4]" />
          <button onClick={onClose} className="absolute left-4 top-5 text-white/70 hover:text-white transition-colors"><X size={18} /></button>
          <h3 className="relative text-lg font-black text-white flex items-center gap-2">
            <Users size={20} className="text-gold" /> معلمو {school.name}
          </h3>
          <p className="relative text-xs text-white/75 mt-1.5 font-medium">
            {teachers === undefined ? "جاري التحميل…" : `${teachers.length} (${coordinators.length} منسق · ${regular.length} معلم)`}
          </p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {teachers === undefined ? (
            <div className="text-center py-8 text-[#8A7A72] text-sm font-bold">جاري التحميل…</div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-8 text-[#8A7A72] text-sm font-bold">لا يوجد معلمون مسجّلون لهذه المدرسة</div>
          ) : (
            <>
              {coordinators.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-gold-dark">المنسقون</p>
                  {coordinators.map((t) => <TeacherRow key={t._id} t={t} accent />)}
                </div>
              )}
              {regular.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-[#8A7A72]">المعلمون</p>
                  {regular.map((t) => <TeacherRow key={t._id} t={t} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TeacherRow({ t, accent }: { t: Doc<"teachers">; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 border ${accent ? "bg-gold/5 border-gold/20" : "bg-black/[0.015] border-black/[0.04]"}`}>
      <div className="min-w-0">
        <p className="font-bold text-[#2A1418] text-sm truncate">{t.name}</p>
        <p className="text-[11px] text-[#8A7A72] font-semibold">{t.jobTitle} · {t.classification}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {t.mobile && (
          <a href={`tel:${t.mobile}`} className="text-primary hover:bg-primary/5 rounded-lg p-1.5 transition-all" title={t.mobile}><Phone size={13} /></a>
        )}
        {t.email && (
          <a href={`mailto:${t.email}`} className="text-primary hover:bg-primary/5 rounded-lg p-1.5 transition-all" title={t.email}><Mail size={13} /></a>
        )}
      </div>
    </div>
  );
}

function SingleAssignButton({ schoolId, supervisors, currentSupId, academicYear, onDone, token }: {
  schoolId: Id<"schools">; supervisors: Doc<"supervisors">[];
  currentSupId: Id<"supervisors"> | null; academicYear: string; onDone: (msg: string) => void;
  token: string | null;
}) {
  const assign = useMutation(api.assignments.assign);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(supId: Id<"supervisors">) {
    setBusy(true);
    await assign({ schoolId, supervisorId: supId, academicYear, token: token ?? undefined });
    setBusy(false); setOpen(false);
    onDone("تم إسناد الموجه للمدرسة بنجاح");
  }

  return (
    <div className="relative inline-block text-right">
      <button 
        onClick={() => setOpen((v) => !v)} 
        disabled={busy}
        className="text-xs font-bold text-primary hover:text-primary-dark px-3 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all disabled:opacity-50 whitespace-nowrap"
      >
        {busy ? "..." : "تغيير الموجه"}
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9.5 z-50 bg-white/95 backdrop-blur-md border border-black/[0.06] rounded-2xl shadow-xl min-w-56 py-2 max-h-64 overflow-y-auto">
            {supervisors.map((s) => (
              <button 
                key={s._id} 
                onClick={() => pick(s._id)}
                className={`w-full text-right px-4 py-2.5 text-xs font-semibold hover:bg-gold/10 flex items-center justify-between transition-colors
                  ${s._id === currentSupId ? "font-bold text-primary bg-primary/[0.03]" : "text-[#4b3a32]"}`}
              >
                <span>{s.name}</span>
                {s._id === currentSupId && <Check size={13} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
