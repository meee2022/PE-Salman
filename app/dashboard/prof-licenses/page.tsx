"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, SelectField } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { SupervisorFormList } from "@/components/SupervisorFormList";
import { Award, Plus } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";
import {
  FORM_VARIANTS, LICENSE_LEVELS, LICENSE_ATTEMPTS, LICENSE_TERMS,
  buildTeachingScores, buildCoordinationScores, buildTeachingNotes, buildCoordinationNotes,
} from "@/components/profLicenseTemplates";

const TEACHER_ROLES = ["معلم", "منسق"] as const;

export default function ProfLicensesPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const router = useRouter();
  const isAdmin = ["admin", "superadmin"].includes(user?.role ?? "");
  const forms = useQuery(api.profLicenseForms.list, token ? { academicYear: YEAR, token } : "skip");
  const supOptions = useQuery(api.supervisors.list, token && isAdmin ? { token } : "skip");
  const create = useMutation(api.profLicenseForms.create);
  const removeForm = useMutation(api.profLicenseForms.remove);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hdr, setHdr] = useState({
    schoolName: "", schoolId: undefined as string | undefined,
    supervisorId: undefined as string | undefined,
    teacherName: "",
    teacherRole: "معلم" as string,
    formVariant: "3-1" as string,
    attempt: "الأولى" as string,
    term: "الأول" as string,
    level: "الخبير" as string,
    date: new Date().toISOString().slice(0, 10),
  });

  const formSupId = isAdmin ? hdr.supervisorId : (user?.supervisorId as string | undefined);
  const assigned = useQuery(
    api.assignments.listBySupervisorYear,
    token && formSupId ? { supervisorId: formSupId as Id<"supervisors">, academicYear: YEAR, token } : "skip"
  );
  const schoolOpts = (assigned ?? []).filter((a) => a.school).map((a) => ({
    id: a.school!._id as string, name: a.school!.name,
    sub: a.school!.gender === "male" ? "بنين" : "بنات",
  }));

  if (!forms) return <Spinner />;

  const selectedVariant = FORM_VARIANTS.find((v) => v.id === hdr.formVariant) ?? FORM_VARIANTS[0];
  const isCoordinator = hdr.formVariant === "1-3";

  async function createForm() {
    if (!hdr.schoolName.trim() || !hdr.teacherName.trim() || (isAdmin && !hdr.supervisorId)) return;
    setSaving(true);
    try {
      const teachingScores = buildTeachingScores(hdr.formVariant);
      const coordinationScores = isCoordinator ? buildCoordinationScores() : undefined;
      const teachingNotes = buildTeachingNotes();
      const coordinationNotes = isCoordinator ? buildCoordinationNotes() : undefined;

      const id = await create({
        schoolName: hdr.schoolName, schoolId: hdr.schoolId as Id<"schools"> | undefined,
        supervisorId: hdr.supervisorId as Id<"supervisors"> | undefined,
        teacherName: hdr.teacherName, teacherRole: hdr.teacherRole,
        formVariant: hdr.formVariant, attempt: hdr.attempt, term: hdr.term,
        date: hdr.date, academicYear: YEAR, level: hdr.level,
        teachingScores, coordinationScores, teachingNotes, coordinationNotes,
        generalNotes: [],
        token: token ?? undefined,
      });
      router.push(`/dashboard/prof-licenses/${id}`);
    } finally { setSaving(false); }
  }

  const rows = forms.map((f) => ({
    _id: f._id, schoolName: f.schoolName,
    supervisorId: f.supervisorId, supervisorName: f.supervisorName,
    status: f.status, date: f.date,
    primary: `${f.teacherName} — ${selectedVariant?.label ?? f.formVariant}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="استمارات الرخصة المهنية"
        subtitle={isAdmin ? `${forms.length} استمارة` : "تقييم أداء المعلمين والمنسقين للرخصة المهنية"}
        icon={<Award size={26} />}
        back={{ href: "/dashboard/forms-center", label: "مركز الاستمارات" }}
        action={
          <button onClick={() => setShowNew(true)} className="btn-primary shadow-lg shadow-primary/10">
            <Plus size={16} /> استمارة جديدة
          </button>
        }
      />

      {forms.length === 0 ? (
        <div className="card-luxurious p-16 text-center text-stone-500 text-sm flex flex-col items-center justify-center gap-3">
          <Award className="w-12 h-12 text-gold/40 animate-pulse" />
          <p className="font-extrabold text-[#5C1523] text-base">لا توجد استمارات حالياً</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-2 text-xs !py-2.5">
            <Plus size={14} /> إنشاء استمارة الآن
          </button>
        </div>
      ) : (
        <SupervisorFormList
          forms={rows} isAdmin={isAdmin}
          basePath="/dashboard/prof-licenses"
          onDelete={(id) => {
            if (confirm("حذف الاستمارة؟"))
              removeForm({ id: id as Id<"profLicenseForms">, token: token ?? undefined });
          }}
          searchPlaceholder="ابحث باسم المعلم أو المدرسة..."
        />
      )}

      {showNew && (
        <Modal title="استمارة رخصة مهنية جديدة" onClose={() => setShowNew(false)}>
          <div className="p-6 space-y-4">
            {isAdmin && (
              <SearchSelect
                label="الموجه المسؤول" required value=""
                options={(supOptions ?? []).map((s) => ({ id: s._id, name: s.name, sub: s.gender === "male" ? "ذكر" : "أنثى" }))}
                onSelect={(_, id) => setHdr({ ...hdr, supervisorId: id, schoolName: "", schoolId: undefined })}
                placeholder="اختر الموجه..."
              />
            )}
            <SearchSelect
              label="المدرسة" required value={hdr.schoolName} options={schoolOpts}
              onSelect={(name, id) => setHdr({ ...hdr, schoolName: name, schoolId: id })}
              placeholder={isAdmin && !hdr.supervisorId ? "اختر الموجه أولاً" : "اختر المدرسة..."}
            />

            <div>
              <label className="block text-[11px] font-bold text-[#2A1418] mb-1.5">
                اسم المعلم / المنسق <span className="text-red-500">*</span>
              </label>
              <input
                value={hdr.teacherName}
                onChange={(e) => setHdr({ ...hdr, teacherName: e.target.value })}
                placeholder="اكتب الاسم الكامل..."
                className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-3 py-2.5 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="الوظيفة" value={hdr.teacherRole}
                onChange={(v) => {
                  const newRole = v;
                  const newVariant = newRole === "منسق" ? "1-3" : "3-1";
                  setHdr({ ...hdr, teacherRole: newRole, formVariant: newVariant });
                }}
                options={TEACHER_ROLES.map((r) => [r, r] as const)}
              />
              <SelectField
                label="النموذج" value={hdr.formVariant}
                onChange={(v) => setHdr({ ...hdr, formVariant: v })}
                options={FORM_VARIANTS.map((v) => [v.id, v.label] as const)}
              />
            </div>

            <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-[11px] text-[#5C1523] font-semibold">
              {selectedVariant.numEvaluators === 3
                ? `المقيّمون: ${selectedVariant.evaluatorLabels.join(" · ")}`
                : `المقيّمون: ${selectedVariant.evaluatorLabels.join(" · ")}`}
              {isCoordinator && " · يشمل مهام التنسيق"}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField label="المستوى" value={hdr.level} onChange={(v) => setHdr({ ...hdr, level: v })}
                options={LICENSE_LEVELS.map((l) => [l, l] as const)} />
              <SelectField label="المحاولة" value={hdr.attempt} onChange={(v) => setHdr({ ...hdr, attempt: v })}
                options={LICENSE_ATTEMPTS.map((a) => [a, `المحاولة ${a}`] as const)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField label="الفصل الدراسي" value={hdr.term} onChange={(v) => setHdr({ ...hdr, term: v })}
                options={LICENSE_TERMS.map((t) => [t, `الفصل ${t}`] as const)} />
              <div>
                <label className="block text-[11px] font-bold text-[#2A1418] mb-1.5">التاريخ</label>
                <input type="date" value={hdr.date} onChange={(e) => setHdr({ ...hdr, date: e.target.value })}
                  className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-3 py-2.5 rounded-xl" dir="ltr" />
              </div>
            </div>
          </div>
          <ModalFooter
            onClose={() => setShowNew(false)} onSave={createForm} saving={saving}
            saveLabel="إنشاء ومتابعة"
            disabled={!hdr.schoolName.trim() || !hdr.teacherName.trim() || (isAdmin && !hdr.supervisorId)}
          />
        </Modal>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
}
