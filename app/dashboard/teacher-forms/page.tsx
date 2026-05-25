"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, TxtField, SelectField } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { buildTeacherDomains } from "@/components/teacherTemplate";
import { gradesForLevel } from "@/components/visitFormsTemplates";
import { ClipboardCheck, Plus, ChevronLeft, FileSignature, CircleCheck, Clock, Trash2, Search, ArrowRight, LayoutList } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function TeacherFormsPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const router = useRouter();
  const isAdmin = ["admin", "superadmin"].includes(user?.role ?? "");
  const forms = useQuery(api.teacherForms.list, token ? { academicYear: YEAR, token } : "skip");
  const supOptions = useQuery(api.supervisors.list, token && isAdmin ? { token } : "skip");
  const create = useMutation(api.teacherForms.create);
  const removeForm = useMutation(api.teacherForms.remove);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selSup, setSelSup] = useState<{ id: string; name: string } | "all" | null>(null);
  const [hdr, setHdr] = useState<{ schoolName: string; schoolId?: string; supervisorId?: string; supervisorName?: string; teacherName: string; subject: string; topic: string; grade: string; day: string; date: string }>({ schoolName: "", teacherName: "", subject: "التربية البدنية", topic: "", grade: "السادس", day: "الأحد", date: new Date().toISOString().slice(0, 10) });

  const formSupId = isAdmin ? hdr.supervisorId : (user?.supervisorId as string | undefined);
  const assigned = useQuery(api.assignments.listBySupervisorYear,
    token && formSupId ? { supervisorId: formSupId as Id<"supervisors">, academicYear: YEAR, token } : "skip");
  const schoolOpts = (assigned ?? [])
    .filter((a) => a.school)
    .map((a) => ({ id: a.school!._id as string, name: a.school!.name, sub: a.school!.gender === "male" ? "بنين" : "بنات" }));

  // معلمو المدرسة المختارة (للاختيار من القائمة)
  const schoolTeachers = useQuery(api.teachers.bySchoolName, hdr.schoolName ? { schoolName: hdr.schoolName } : "skip");
  const teacherOpts = (schoolTeachers ?? [])
    .filter((t) => !(t.jobTitle ?? "").startsWith("منسق"))
    .map((t) => ({ id: t._id as string, name: t.name, sub: t.jobTitle }));

  // صفوف المدرسة المختارة حسب مرحلتها
  const selSchool = (assigned ?? []).find((a) => a.school?._id === hdr.schoolId)?.school;
  const gradeOpts = gradesForLevel(selSchool ? `${selSchool.level ?? ""} ${selSchool.name}` : undefined);

  if (!forms) return <Spinner />;

  async function createForm() {
    if (!hdr.schoolName.trim() || !hdr.teacherName.trim()) return;
    if (isAdmin && !hdr.supervisorId) return;
    setSaving(true);
    try {
      const id = await create({
        schoolName: hdr.schoolName, schoolId: hdr.schoolId as Id<"schools"> | undefined,
        supervisorId: hdr.supervisorId as Id<"supervisors"> | undefined,
        teacherName: hdr.teacherName, subject: hdr.subject, topic: hdr.topic, grade: hdr.grade,
        day: hdr.day, date: hdr.date, academicYear: YEAR,
        domains: buildTeacherDomains(),
        token: token ?? undefined,
      });
      router.push(`/dashboard/teacher-forms/${id}`);
    } finally { setSaving(false); }
  }

  const norm = (s: string) => (s || "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
  const searching = search.trim().length > 0;
  const matchSearch = (f: typeof forms[number]) =>
    [f.teacherName, f.schoolName, f.supervisorName].some((x) => norm(x).includes(norm(search)));

  const groupMap = new Map<string, { id: string; name: string; total: number; submitted: number }>();
  forms.forEach((f) => {
    const g = groupMap.get(f.supervisorId) ?? { id: f.supervisorId, name: f.supervisorName, total: 0, submitted: 0 };
    g.total++; if (f.status === "submitted") g.submitted++;
    groupMap.set(f.supervisorId, g);
  });
  const groups = Array.from(groupMap.values()).sort((a, b) => b.total - a.total);

  async function del(fid: string) {
    if (confirm("حذف الاستمارة؟")) await removeForm({ id: fid as Id<"teacherForms">, token: token ?? undefined });
  }

  let listForms = forms;
  let heading: string | null = null;
  if (searching) { listForms = forms.filter(matchSearch); heading = `نتائج البحث (${listForms.length})`; }
  else if (isAdmin && selSup === null) { listForms = []; }
  else if (selSup && selSup !== "all") { listForms = forms.filter((f) => f.supervisorId === selSup.id); heading = `استمارات: ${selSup.name}`; }
  else if (selSup === "all") { heading = `كل الاستمارات (${forms.length})`; }

  const showGrid = isAdmin && !searching && selSup === null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="استمارات الإشراف على المعلم"
        subtitle={isAdmin ? `${forms.length} استمارة · ${groups.length} موجه` : "استماراتك الإشرافية للمعلمين"}
        icon={<ClipboardCheck size={26} />}
        back={{ href: "/dashboard/forms-center", label: "مركز الاستمارات" }}
        action={
          <button onClick={() => setShowNew(true)} className="btn-primary shadow-lg shadow-primary/10">
            <Plus size={16} /> استمارة جديدة
          </button>
        }
      />

      <div className="card-luxurious p-4 flex items-center gap-3 animate-in focus-within:ring-1 focus-within:ring-gold/45 focus-within:border-gold/60">
        <Search size={18} className="text-primary/50 mr-1" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم المعلم أو المدرسة أو الموجه..."
          className="flex-1 bg-transparent outline-none text-xs font-semibold text-[#2A1418] placeholder:text-stone-400" />
        {search && <button onClick={() => setSearch("")} className="text-xs font-bold text-primary hover:text-primary/80">مسح البحث</button>}
      </div>

      {forms.length === 0 ? (
        <div className="card-luxurious p-16 text-center text-stone-500 text-sm animate-in flex flex-col items-center justify-center gap-3">
          <ClipboardCheck className="w-12 h-12 text-gold/40 animate-pulse" />
          <p className="font-extrabold text-[#5C1523] text-base">لا توجد استمارات حالياً</p>
          <p className="text-xs text-stone-400 max-w-xs">ابدأ بإنشاء استمارة إشرافية جديدة لمتابعة أداء المعلم داخل الحصة.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-2 text-xs !py-2.5"><Plus size={14} /> إنشاء استمارة الآن</button>
        </div>
      ) : showGrid ? (
        <div className="space-y-6 animate-in">
          <h2 className="text-xs font-extrabold text-[#5C1523] tracking-wider uppercase opacity-85">مجموعات الموجهين وإحصائيات التقديم</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => setSelSup("all")}
              className="card-luxurious card-luxurious-hover p-6 flex items-center gap-4 text-right bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] border-none shadow-xl text-white relative overflow-hidden group">
              <div className="pattern-arabesque absolute inset-0 opacity-[0.2] pointer-events-none" />
              <span className="icon-orb bg-white/10 ring-1 ring-white/20 text-gold shadow-md group-hover:scale-105 transition-transform duration-300"><LayoutList size={20} /></span>
              <div className="flex-1 min-w-0 relative">
                <p className="font-extrabold text-sm text-white">كل الاستمارات</p>
                <p className="text-[11px] text-white/70 mt-1 font-semibold">{forms.length} استمارة إشرافية مسجلة</p>
              </div>
              <ChevronLeft size={18} className="text-white/60 group-hover:-translate-x-1 transition-transform duration-300" />
            </button>
            {groups.map((g, idx) => (
              <button key={g.id} onClick={() => setSelSup({ id: g.id, name: g.name })}
                className="card-luxurious card-luxurious-hover p-6 flex items-center gap-4 text-right group relative overflow-hidden" style={{ animationDelay: `${(idx + 1) * 30}ms` }}>
                <span className="icon-orb bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white flex items-center justify-center font-extrabold shrink-0 shadow-md text-xs border border-gold/25 group-hover:rotate-3 transition-transform duration-300">
                  {g.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-xs text-[#2A1418] truncate group-hover:text-primary transition-colors">{g.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-stone-500 font-bold">{g.total} استمارات</span>
                    <span className="w-1 h-1 rounded-full bg-gold/50" />
                    <span className="text-[10px] text-emerald-600 font-bold">{g.submitted} معتمدة</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-[#C7B8A6] group-hover:-translate-x-1 transition-transform duration-300" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in">
          {(heading && (selSup || searching)) && (
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-gold/10 pb-3">
              <div className="flex items-center gap-2">
                {isAdmin && !searching && (
                  <button onClick={() => setSelSup(null)} className="btn-ghost !py-2 !px-3 text-xs font-bold flex items-center gap-1"><ArrowRight size={14} /> العودة للموجهين</button>
                )}
                <h2 className="text-sm font-extrabold text-[#5C1523] flex items-center gap-2"><span className="w-1.5 h-3 rounded bg-primary" />{heading}</h2>
              </div>
            </div>
          )}
          {listForms.length === 0 ? (
            <div className="card-luxurious p-12 text-center text-stone-500 text-sm flex flex-col items-center justify-center gap-2">
              <Search className="w-8 h-8 text-gold/40" />
              <p className="font-extrabold text-[#5C1523] text-xs">لا توجد استمارات تطابق هذا البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {listForms.map((f, idx) => (
                <div key={f._id} className="card-luxurious card-luxurious-hover p-5 flex items-center gap-4 group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-gold/30" style={{ animationDelay: `${idx * 40}ms` }}>
                  <span className="icon-orb bg-primary/5 text-primary shrink-0 group-hover:scale-105 transition-transform duration-300"><FileSignature size={20} /></span>
                  <Link href={`/dashboard/teacher-forms/${f._id}`} className="flex-1 min-w-0">
                    <p className="font-extrabold text-[#2A1418] text-xs leading-snug group-hover:text-primary transition-colors">{f.schoolName}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] text-stone-500 font-bold">{f.teacherName}</span>
                      <span className="text-stone-300 text-[10px]">•</span>
                      <span className="text-[10px] text-stone-500 font-bold">{f.date}</span>
                      {isAdmin && f.supervisorName && (<><span className="text-stone-300 text-[10px]">•</span><span className="text-[10px] text-[#A8853A] font-extrabold">{f.supervisorName}</span></>)}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    {f.status === "submitted" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200"><CircleCheck size={11} className="text-emerald-600" /> معتمدة</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-200"><Clock size={11} className="text-amber-600" /> مسودة</span>
                    )}
                    <button onClick={() => del(f._id)} className="text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl p-2 shrink-0 transition-colors" title="حذف"><Trash2 size={14} /></button>
                    <Link href={`/dashboard/teacher-forms/${f._id}`} className="text-stone-300 hover:text-[#5C1523] p-1 shrink-0"><ChevronLeft size={18} /></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNew && (
        <Modal title="استمارة إشرافية جديدة للمعلم" onClose={() => setShowNew(false)}>
          <div className="p-6 space-y-4">
            {isAdmin && (
              <SearchSelect label="الموجه المسؤول" required value={hdr.supervisorName ?? ""}
                options={(supOptions ?? []).map((s) => ({ id: s._id, name: s.name, sub: s.gender === "male" ? "ذكر" : "أنثى" }))}
                onSelect={(name, id) => setHdr({ ...hdr, supervisorName: name, supervisorId: id, schoolName: "", schoolId: undefined })}
                placeholder="اختر الموجه لتفعيل مدارسه..." />
            )}
            <SearchSelect label="المدرسة المستهدفة" required value={hdr.schoolName} options={schoolOpts}
              onSelect={(name, id) => {
                const sc = (assigned ?? []).find((a) => a.school?._id === id)?.school;
                const g = gradesForLevel(sc ? `${sc.level ?? ""} ${sc.name}` : undefined);
                setHdr({ ...hdr, schoolName: name, schoolId: id, teacherName: "", grade: g[0] ?? "" });
              }}
              placeholder={isAdmin && !hdr.supervisorId ? "الرجاء اختيار الموجه أولًا" : schoolOpts.length ? "اختر المدرسة..." : "لا توجد مدارس مسندة"} />
            <SearchSelect label="اسم المعلم" required value={hdr.teacherName} options={teacherOpts} allowCustom
              onSelect={(name) => setHdr({ ...hdr, teacherName: name })}
              searchPlaceholder="ابحث عن المعلم أو اكتب اسماً جديداً..."
              placeholder={!hdr.schoolName ? "اختر المدرسة أولاً" : teacherOpts.length ? "اختر المعلم من القائمة..." : "اكتب اسم المعلم..."} />
            <div className="grid grid-cols-2 gap-3">
              <TxtField label="موضوع الدرس" value={hdr.topic} onChange={(v) => setHdr({ ...hdr, topic: v })} placeholder="عنوان درس الحصة..." />
              <SelectField label="الصف" value={hdr.grade} onChange={(v) => setHdr({ ...hdr, grade: v })} options={gradeOpts.map((g) => [g, g] as const)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <TxtField label="المادة" value={hdr.subject} onChange={(v) => setHdr({ ...hdr, subject: v })} />
              <SelectField label="اليوم" value={hdr.day} onChange={(v) => setHdr({ ...hdr, day: v })} options={WEEKDAYS.map((d) => [d, d] as const)} />
              <div>
                <label className="block text-[11px] font-bold text-[#2A1418] mb-1.5">التاريخ</label>
                <input type="date" value={hdr.date} onChange={(e) => setHdr({ ...hdr, date: e.target.value })}
                  className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-3 py-2.5 rounded-xl transition-all" dir="ltr" />
              </div>
            </div>
            <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4 text-[11px] text-[#A8853A] font-semibold leading-relaxed flex items-start gap-2">
              <ClipboardCheck size={16} className="text-gold shrink-0 mt-0.5" />
              <span>سيتم إنشاء المسودة الآن. ستقيّم مجالات الأداء (التخطيط، تنفيذ الدرس، التقويم، الإدارة الصفية) وتختار التوصيات من البنك أو تكتب توصية جديدة لكل مجال.</span>
            </div>
          </div>
          <ModalFooter onClose={() => setShowNew(false)} onSave={createForm} saving={saving} saveLabel="إنشاء ومتابعة التقييم"
            disabled={!hdr.schoolName.trim() || !hdr.teacherName.trim() || (isAdmin && !hdr.supervisorId)} />
        </Modal>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
}
