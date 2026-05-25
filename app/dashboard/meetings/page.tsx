"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, TxtField, SelectField } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { SupervisorFormList } from "@/components/SupervisorFormList";
import { FileText, Plus } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function MeetingsPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const router = useRouter();
  const isAdmin = ["admin", "superadmin"].includes(user?.role ?? "");
  const forms = useQuery(api.meetingForms.list, token ? { academicYear: YEAR, token } : "skip");
  const supOptions = useQuery(api.supervisors.list, token && isAdmin ? { token } : "skip");
  const create = useMutation(api.meetingForms.create);
  const removeForm = useMutation(api.meetingForms.remove);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hdr, setHdr] = useState({ schoolName: "", schoolId: undefined as string | undefined, supervisorId: undefined as string | undefined, supervisorName: "", subject: "زيارة تعارفية لقسم التربية البدنية", day: "الأحد", date: new Date().toISOString().slice(0, 10) });

  const formSupId = isAdmin ? hdr.supervisorId : (user?.supervisorId as string | undefined);
  const assigned = useQuery(api.assignments.listBySupervisorYear, token && formSupId ? { supervisorId: formSupId as Id<"supervisors">, academicYear: YEAR, token } : "skip");
  const schoolOpts = (assigned ?? []).filter((a) => a.school).map((a) => ({ id: a.school!._id as string, name: a.school!.name, sub: a.school!.gender === "male" ? "بنين" : "بنات" }));

  if (!forms) return <Spinner />;

  async function createForm() {
    if (!hdr.schoolName.trim() || (isAdmin && !hdr.supervisorId)) return;
    setSaving(true);
    try {
      const id = await create({
        schoolName: hdr.schoolName, schoolId: hdr.schoolId as Id<"schools"> | undefined, supervisorId: hdr.supervisorId as Id<"supervisors"> | undefined,
        subject: hdr.subject, day: hdr.day, date: hdr.date, academicYear: YEAR, token: token ?? undefined,
      });
      router.push(`/dashboard/meetings/${id}`);
    } finally { setSaving(false); }
  }

  const rows = forms.map((f) => ({ _id: f._id, schoolName: f.schoolName, supervisorId: f.supervisorId, supervisorName: f.supervisorName, status: f.status, date: f.date, primary: f.subject || "محضر اجتماع" }));

  return (
    <div className="space-y-6">
      <PageHeader title="محضر اجتماع الزيارة التعارفية" subtitle={isAdmin ? `${forms.length} محضر` : "محاضر اجتماعاتك"} icon={<FileText size={26} />}
        back={{ href: "/dashboard/forms-center", label: "مركز الاستمارات" }}
        action={<button onClick={() => setShowNew(true)} className="btn-primary shadow-lg shadow-primary/10"><Plus size={16} /> محضر جديد</button>} />

      {forms.length === 0 ? (
        <div className="card-luxurious p-16 text-center text-stone-500 text-sm flex flex-col items-center justify-center gap-3">
          <FileText className="w-12 h-12 text-gold/40 animate-pulse" />
          <p className="font-extrabold text-[#5C1523] text-base">لا توجد محاضر حالياً</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-2 text-xs !py-2.5"><Plus size={14} /> إنشاء محضر الآن</button>
        </div>
      ) : (
        <SupervisorFormList forms={rows} isAdmin={isAdmin} basePath="/dashboard/meetings" onDelete={(id) => { if (confirm("حذف المحضر؟")) removeForm({ id: id as Id<"meetingForms">, token: token ?? undefined }); }} searchPlaceholder="ابحث بالموضوع أو المدرسة..." />
      )}

      {showNew && (
        <Modal title="محضر اجتماع جديد" onClose={() => setShowNew(false)}>
          <div className="p-6 space-y-4">
            {isAdmin && (
              <SearchSelect label="الموجه المسؤول" required value={hdr.supervisorName}
                options={(supOptions ?? []).map((s) => ({ id: s._id, name: s.name, sub: s.gender === "male" ? "ذكر" : "أنثى" }))}
                onSelect={(name, id) => setHdr({ ...hdr, supervisorName: name, supervisorId: id, schoolName: "", schoolId: undefined })} placeholder="اختر الموجه..." />
            )}
            <SearchSelect label="المدرسة" required value={hdr.schoolName} options={schoolOpts} onSelect={(name, id) => setHdr({ ...hdr, schoolName: name, schoolId: id })}
              placeholder={isAdmin && !hdr.supervisorId ? "اختر الموجه أولاً" : "اختر المدرسة..."} />
            <TxtField label="الموضوع" value={hdr.subject} onChange={(v) => setHdr({ ...hdr, subject: v })} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="اليوم" value={hdr.day} onChange={(v) => setHdr({ ...hdr, day: v })} options={WEEKDAYS.map((d) => [d, d] as const)} />
              <div>
                <label className="block text-[11px] font-bold text-[#2A1418] mb-1.5">التاريخ</label>
                <input type="date" value={hdr.date} onChange={(e) => setHdr({ ...hdr, date: e.target.value })} className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-3 py-2.5 rounded-xl" dir="ltr" />
              </div>
            </div>
          </div>
          <ModalFooter onClose={() => setShowNew(false)} onSave={createForm} saving={saving} saveLabel="إنشاء ومتابعة" disabled={!hdr.schoolName.trim() || (isAdmin && !hdr.supervisorId)} />
        </Modal>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
}
