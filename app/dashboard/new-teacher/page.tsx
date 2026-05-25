"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, TxtField } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { SupervisorFormList } from "@/components/SupervisorFormList";
import { buildNewTeacherRows } from "@/components/visitFormsTemplates";
import { UserPlus, Plus } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

export default function NewTeacherPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const router = useRouter();
  const isAdmin = ["admin", "superadmin"].includes(user?.role ?? "");
  const forms = useQuery(api.newTeacherPlans.list, token ? { academicYear: YEAR, token } : "skip");
  const supOptions = useQuery(api.supervisors.list, token && isAdmin ? { token } : "skip");
  const create = useMutation(api.newTeacherPlans.create);
  const removeForm = useMutation(api.newTeacherPlans.remove);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hdr, setHdr] = useState({ schoolName: "", schoolId: undefined as string | undefined, supervisorId: undefined as string | undefined, supervisorName: "", teacherName: "" });

  const formSupId = isAdmin ? hdr.supervisorId : (user?.supervisorId as string | undefined);
  const assigned = useQuery(api.assignments.listBySupervisorYear, token && formSupId ? { supervisorId: formSupId as Id<"supervisors">, academicYear: YEAR, token } : "skip");
  const schoolOpts = (assigned ?? []).filter((a) => a.school).map((a) => ({ id: a.school!._id as string, name: a.school!.name, sub: a.school!.gender === "male" ? "بنين" : "بنات" }));
  const schoolTeachers = useQuery(api.teachers.bySchoolName, hdr.schoolName ? { schoolName: hdr.schoolName } : "skip");
  const teacherOpts = (schoolTeachers ?? []).filter((t) => !(t.jobTitle ?? "").startsWith("منسق")).map((t) => ({ id: t._id as string, name: t.name, sub: t.jobTitle }));

  if (!forms) return <Spinner />;

  async function createForm() {
    if (!hdr.schoolName.trim() || !hdr.teacherName.trim() || (isAdmin && !hdr.supervisorId)) return;
    setSaving(true);
    try {
      const id = await create({
        schoolName: hdr.schoolName, schoolId: hdr.schoolId as Id<"schools"> | undefined, supervisorId: hdr.supervisorId as Id<"supervisors"> | undefined,
        teacherName: hdr.teacherName, academicYear: YEAR, rows: buildNewTeacherRows(), token: token ?? undefined,
      });
      router.push(`/dashboard/new-teacher/${id}`);
    } finally { setSaving(false); }
  }

  const rows = forms.map((f) => ({ _id: f._id, schoolName: f.schoolName, supervisorId: f.supervisorId, supervisorName: f.supervisorName, status: f.status, date: new Date(f.createdAt).toISOString().slice(0, 10), primary: f.teacherName }));

  return (
    <div className="space-y-6">
      <PageHeader title="خطة تهيئة وتطوير معلم مستجد" subtitle={isAdmin ? `${forms.length} خطة` : "خطط المعلمين المستجدين"} icon={<UserPlus size={26} />}
        back={{ href: "/dashboard/forms-center", label: "مركز الاستمارات" }}
        action={<button onClick={() => setShowNew(true)} className="btn-primary shadow-lg shadow-primary/10"><Plus size={16} /> خطة جديدة</button>} />

      {forms.length === 0 ? (
        <div className="card-luxurious p-16 text-center text-stone-500 text-sm flex flex-col items-center justify-center gap-3">
          <UserPlus className="w-12 h-12 text-gold/40 animate-pulse" />
          <p className="font-extrabold text-[#5C1523] text-base">لا توجد خطط حالياً</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-2 text-xs !py-2.5"><Plus size={14} /> إنشاء خطة الآن</button>
        </div>
      ) : (
        <SupervisorFormList forms={rows} isAdmin={isAdmin} basePath="/dashboard/new-teacher" onDelete={(id) => { if (confirm("حذف الخطة؟")) removeForm({ id: id as Id<"newTeacherPlans">, token: token ?? undefined }); }} searchPlaceholder="ابحث باسم المعلم أو المدرسة..." />
      )}

      {showNew && (
        <Modal title="خطة معلم مستجد جديدة" onClose={() => setShowNew(false)}>
          <div className="p-6 space-y-4">
            {isAdmin && (
              <SearchSelect label="الموجه المسؤول" required value={hdr.supervisorName}
                options={(supOptions ?? []).map((s) => ({ id: s._id, name: s.name, sub: s.gender === "male" ? "ذكر" : "أنثى" }))}
                onSelect={(name, id) => setHdr({ ...hdr, supervisorName: name, supervisorId: id, schoolName: "", schoolId: undefined })} placeholder="اختر الموجه..." />
            )}
            <SearchSelect label="المدرسة" required value={hdr.schoolName} options={schoolOpts} onSelect={(name, id) => setHdr({ ...hdr, schoolName: name, schoolId: id })}
              placeholder={isAdmin && !hdr.supervisorId ? "اختر الموجه أولاً" : "اختر المدرسة..."} />
            <SearchSelect label="اسم المعلم المستجد" required value={hdr.teacherName} options={teacherOpts} allowCustom
              onSelect={(name) => setHdr({ ...hdr, teacherName: name })}
              searchPlaceholder="ابحث عن المعلم أو اكتب اسماً جديداً..."
              placeholder={!hdr.schoolName ? "اختر المدرسة أولاً" : teacherOpts.length ? "اختر المعلم من القائمة..." : "اكتب اسم المعلم..."} />
            <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4 text-[11px] text-[#A8853A] font-semibold leading-relaxed">سيتم إنشاء الخطة بمعاييرها الستة الجاهزة (معايير المعلم المهنية) لتعبئة الإطار الزمني والمؤشرات والمتابعة.</div>
          </div>
          <ModalFooter onClose={() => setShowNew(false)} onSave={createForm} saving={saving} saveLabel="إنشاء ومتابعة" disabled={!hdr.schoolName.trim() || !hdr.teacherName.trim() || (isAdmin && !hdr.supervisorId)} />
        </Modal>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
}
