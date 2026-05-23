"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, TxtField, SelectField, useToast } from "@/components/ui/Modal";
import { Users, Phone, Mail, Search, ChevronLeft, Plus, Pencil, Trash2, Power } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

type SupForm = {
  id?: Id<"supervisors">;
  name: string; gender: "male" | "female"; jobTitle: string;
  email: string; officePhone: string; mobile: string; jobNumber: string; nationality: string;
};
const empty: SupForm = { name: "", gender: "male", jobTitle: "موجه تربية بدنية", email: "", officePhone: "", mobile: "", jobNumber: "", nationality: "قطري" };

export default function SupervisorsPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = user?.role === "admin";
  const [showArchived, setShowArchived] = useState(false);
  const supervisors = useQuery(api.supervisors.list, token ? { token, includeInactive: showArchived } : "skip");
  const coverage    = useQuery(api.coverage.listByYear, token ? { academicYear: YEAR, token } : "skip");

  const createSup = useMutation(api.supervisors.create);
  const updateSup = useMutation(api.supervisors.update);
  const setActive = useMutation(api.supervisors.setActive);
  const removeSup = useMutation(api.supervisors.remove);

  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [form, setForm] = useState<SupForm | null>(null);
  const [saving, setSaving] = useState(false);
  const { show, node: toast } = useToast();

  const coverageMap = useMemo(() => new Map((coverage ?? []).map((c) => [c.supervisorId, c])), [coverage]);

  const filtered = useMemo(() => {
    if (!supervisors) return [];
    return supervisors.filter((s) => {
      if (gender !== "all" && s.gender !== gender) return false;
      if (search && !s.name.includes(search)) return false;
      return true;
    });
  }, [supervisors, search, gender]);

  if (!supervisors || !coverage) return <Loading />;

  async function save() {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      const base = {
        name: form.name, gender: form.gender, jobTitle: form.jobTitle || undefined,
        email: form.email || undefined, officePhone: form.officePhone || undefined,
        mobile: form.mobile || undefined, jobNumber: form.jobNumber || undefined,
        nationality: form.nationality || undefined, token: token ?? undefined,
      };
      if (form.id) { await updateSup({ id: form.id, ...base }); show("تم تحديث الموجه"); }
      else { await createSup(base); show("تمت إضافة الموجه"); }
      setForm(null);
    } finally { setSaving(false); }
  }

  async function archive(id: Id<"supervisors">, active: boolean, name: string) {
    await setActive({ id, isActive: !active, token: token ?? undefined });
    show(active ? `تمت أرشفة ${name}` : `تم تفعيل ${name}`);
  }
  async function del(id: Id<"supervisors">, name: string) {
    if (!confirm(`حذف الموجه "${name}" نهائيًا؟`)) return;
    try { await removeSup({ id, token: token ?? undefined }); show("تم الحذف"); }
    catch (e: any) { alert(e?.message ?? "تعذّر الحذف"); }
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="الموجهون"
        subtitle={`${supervisors.length} موجه مسجل في النظام`}
        icon={<Users size={26} />}
        action={isAdmin && (
          <button onClick={() => setForm({ ...empty })} className="btn-primary">
            <Plus size={16} /> إضافة موجه جديد
          </button>
        )}
      />

      {/* فلاتر البحث والفرز */}
      <div className="card-luxurious p-4 flex flex-wrap gap-4 items-center bg-white/70 backdrop-blur-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A7A72]" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="بحث باسم الموجه التربوي..." 
            className="field pr-10 hover:border-gold/30" 
          />
        </div>
        
        <div className="flex rounded-2xl border border-black/[0.06] overflow-hidden bg-white/50 p-1 backdrop-blur-md">
          {([["all","الكل"],["male","ذكور"],["female","إناث"]] as const).map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => setGender(v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 
                ${gender === v ? "bg-primary text-white shadow-md" : "text-[#6b5a52] hover:bg-black/[0.02]"}`}
            >
              {l}
            </button>
          ))}
        </div>

        {isAdmin && (
          <label className="flex items-center gap-2 text-xs font-bold text-[#6b5a52] cursor-pointer bg-black/[0.02] hover:bg-black/[0.04] px-3.5 py-2.5 rounded-xl border border-black/[0.04] transition-colors">
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={(e) => setShowArchived(e.target.checked)} 
              className="accent-primary w-4 h-4" 
            />
            عرض الموجهين المؤرشفين
          </label>
        )}
        
        <span className="text-xs font-bold text-[#8A7A72] mr-auto bg-gold/10 px-3 py-1.5 rounded-lg border border-gold/10">{filtered.length} موجه مطابقة</span>
      </div>

      {/* شبكة بطاقات الموجهين الفاخرة */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((sup, i) => {
          const cov = coverageMap.get(sup._id);
          const initials = sup.name.split(" ").slice(0, 2).map((w) => w[0]).join("");
          return (
            <div 
              key={sup._id} 
              className={`card-luxurious card-luxurious-hover overflow-hidden flex flex-col transition-all duration-300 ${!sup.isActive ? "opacity-60" : ""}`} 
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <Link href={`/dashboard/supervisors/${sup._id}`} className="block group">
                {/* خلفية البانر المطور للهوية */}
                <div className="relative h-20 bg-gradient-to-l from-[#5C1523] to-[#3B0A14] overflow-hidden">
                  <div className="pattern-arabesque absolute inset-0 opacity-[0.35]" />
                  <span className={`absolute top-3 left-3 pill backdrop-blur-md ring-1 text-[11px] font-bold ${
                    sup.gender === "male" 
                      ? "bg-sky-400/20 text-sky-100 ring-sky-300/30" 
                      : "bg-pink-400/20 text-pink-100 ring-pink-300/30"
                  }`}>
                    {sup.gender === "male" ? "ذكر" : "أنثى"}
                  </span>
                  {!sup.isActive && (
                    <span className="absolute top-3 right-3 pill bg-black/45 text-white/95 text-[10px] font-bold backdrop-blur-md">
                      مؤرشف
                    </span>
                  )}
                </div>
                
                {/* الصورة الرمزية للموجه */}
                <div className="px-5 -mt-8 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-light to-gold-dark ring-4 ring-[#FCF9F2] shadow-lg flex items-center justify-center text-white text-lg font-extrabold">
                    {initials}
                  </div>
                </div>

                {/* البيانات الأساسية */}
                <div className="px-5 pt-3.5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-extrabold text-[#2A1418] group-hover:text-primary transition-colors leading-tight truncate">{sup.name}</p>
                      <p className="text-xs font-semibold text-[#8A7A72] mt-1.5 truncate">{sup.jobTitle}</p>
                    </div>
                    <ChevronLeft 
                      size={18} 
                      className="text-[#C0B3AA] group-hover:text-primary group-hover:-translate-x-1.5 transition-all shrink-0 mt-1 duration-300" 
                    />
                  </div>

                  <div className="space-y-2 text-xs font-medium text-[#6b5a52] bg-black/[0.01] p-2.5 rounded-xl border border-black/[0.02]">
                    {sup.officePhone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-gold-dark" />
                        <span dir="ltr">{sup.officePhone}</span>
                      </div>
                    )}
                    {sup.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-gold-dark" />
                        <span className="truncate" dir="ltr">{sup.email}</span>
                      </div>
                    )}
                  </div>

                  {/* إحصاءات التغطية */}
                  {cov && (
                    <div className="border-t border-black/[0.04] pt-3.5 pb-2.5 grid grid-cols-3 gap-2 text-center bg-gold/[0.02] -mx-5 px-5 mt-2">
                      <Stat value={cov.schoolsCovered} label="مغطّى" />
                      <Stat value={cov.formsCount} label="استمارة" gold />
                      <Stat value={`${Math.round(cov.coverageRate)}%`} label="تغطية" />
                    </div>
                  )}
                </div>
              </Link>

              {/* أزرار الإجراءات الفاخرة */}
              {isAdmin && (
                <div className="px-5 py-3 mt-auto flex items-center gap-2 border-t border-black/[0.04] bg-white/50">
                  <button 
                    onClick={() => setForm({ id: sup._id, name: sup.name, gender: sup.gender, jobTitle: sup.jobTitle, email: sup.email ?? "", officePhone: sup.officePhone ?? "", mobile: sup.mobile ?? "", jobNumber: sup.jobNumber ?? "", nationality: sup.nationality ?? "" })}
                    className="text-xs font-bold text-primary hover:bg-primary/5 rounded-xl px-3 py-2 flex items-center gap-1 transition-all"
                  >
                    <Pencil size={13} /> تعديل البيانات
                  </button>
                  
                  <button 
                    onClick={() => archive(sup._id, sup.isActive, sup.name)}
                    className="text-xs font-bold text-[#5b4a3e] hover:bg-black/[0.03] rounded-xl px-3 py-2 flex items-center gap-1 transition-all"
                  >
                    <Power size={13} /> {sup.isActive ? "أرشفة الملف" : "تفعيل الحساب"}
                  </button>
                  
                  <button 
                    onClick={() => del(sup._id, sup.name)}
                    className="text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl px-3 py-2 flex items-center gap-1 mr-auto transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {filtered.length === 0 && <Empty />}

      {/* مودال الإضافة والتعديل */}
      {form && (
        <Modal title={form.id ? "تعديل بيانات الموجه" : "إضافة موجه جديد للنظام"} onClose={() => setForm(null)}>
          <div className="p-6 space-y-3">
            <TxtField label="الاسم الكامل للموجه" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <SelectField label="النوع الاجتماعي" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={[["male", "ذكر"], ["female", "أنثى"]]} />
            <TxtField label="المسمى الوظيفي" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} />
            <div className="grid grid-cols-2 gap-3">
              <TxtField label="البريد الإلكتروني" ltr value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <TxtField label="هاتف المكتب" ltr value={form.officePhone} onChange={(v) => setForm({ ...form, officePhone: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TxtField label="الرقم الوظيفي" ltr value={form.jobNumber} onChange={(v) => setForm({ ...form, jobNumber: v })} />
              <TxtField label="الجنسية" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
            </div>
          </div>
          <ModalFooter onClose={() => setForm(null)} onSave={save} saving={saving} disabled={!form.name.trim()} />
        </Modal>
      )}
      {toast}
    </div>
  );
}

function Stat({ value, label, gold }: { value: string | number; label: string; gold?: boolean }) {
  return (
    <div>
      <p className={`text-xl font-black font-sans ${gold ? "text-gold-dark" : "text-primary"}`}>{value}</p>
      <p className="text-[10px] font-bold text-[#8A7A72] mt-1">{label}</p>
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
function Empty() {
  return (
    <div className="card-luxurious p-12 text-center text-[#8A7A72] text-sm font-bold bg-white/70">
      لا توجد نتائج مطابقة لفلترة البحث الحالية
    </div>
  );
}
