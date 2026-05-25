"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Database, CheckCircle2, AlertCircle, Loader2, Play, Trash2, School, Trophy, Users, GraduationCap, ListChecks } from "lucide-react";
import { ACTIVITY_IMPORT_DATA } from "@/data/activityImportData";
import { ASSIGNMENTS_IMPORT_DATA } from "@/data/assignmentsImportData";
import { ACTIVITY_PLANS_DATA } from "@/data/activityPlansData";
import { OPERATIONAL_PLAN_DATA } from "@/data/operationalPlanData";
import { SUPERVISORS_DATA } from "@/data/supervisorsData";
import { TEACHERS_DATA } from "@/data/teachersData";
import { SCHOOLS_DATA } from "@/data/schoolsData";
import { useActiveYear } from "@/hooks/useActiveYear";

type LogEntry = { date: string; code: string };
type SupervisorData = { name: string; record_count: number; daily_log: LogEntry[] };
type AssignmentData = { supervisorName: string; schools: string[]; schoolCount: number };

type ImportStatus = "idle" | "running" | "done" | "error";
type SupResult = { name: string; inserted: number; updated: number; total: number; error?: string };

export default function ImportActivityPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const importLogs       = useMutation(api.activity.importSupervisorLogs);
  const clearAll         = useMutation(api.activity.clearAllActivityForYear);
  const clearAndImportA  = useMutation(api.assignments.clearAndBulkImport);
  const seedPlans        = useMutation(api.activityPlans.bulkSeed);
  const seedOpPlan       = useMutation(api.operationalPlans.bulkSeed);
  const bulkUpsertSups   = useMutation(api.supervisors.bulkUpsert);
  const importTeachers   = useMutation(api.teachers.bulkImport);
  const deactivateSchools = useMutation(api.schools.deactivateUnlisted);
  const seedSchools       = useMutation(api.schools.bulkSeedSchools);

  // ── نشاط ─────────────────────────────────────────────────────────
  const [status, setStatus]       = useState<ImportStatus>("idle");
  const [current, setCurrent]     = useState<string>("");
  const [progress, setProgress]   = useState(0);
  const [results, setResults]     = useState<SupResult[]>([]);
  const [clearing, setClearing]   = useState(false);
  const [cleared, setCleared]     = useState<{logs:number; summaries:number} | null>(null);

  // ── توزيع ────────────────────────────────────────────────────────
  const [asgStatus, setAsgStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [asgResult, setAsgResult] = useState<{deleted:number; inserted:number; createdSchools?:number; errors:string[]} | null>(null);

  // ── خطة الأنشطة ──────────────────────────────────────────────────
  const [plansStatus, setPlansStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [plansResult, setPlansResult] = useState<{deleted:number; inserted:number} | null>(null);

  // ── الخطة الإجرائية ──────────────────────────────────────────────
  const [opStatus, setOpStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [opResult, setOpResult] = useState<{deleted:number; inserted:number} | null>(null);

  // ── إخفاء المدارس غير المعيّنة ────────────────────────────────────
  const [hideSchoolsStatus, setHideSchoolsStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [hideSchoolsResult, setHideSchoolsResult] = useState<number | null>(null);

  // ── استيراد المدارس ───────────────────────────────────────────────
  const [schoolsStatus, setSchoolsStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [schoolsResult, setSchoolsResult] = useState<{inserted:number; updated:number; hidden:number} | null>(null);

  // ── الموجهون ─────────────────────────────────────────────────────
  const [supsStatus, setSupsStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [supsResult, setSupsResult] = useState<{inserted:number; updated:number} | null>(null);

  // ── المعلمون والمنسقون ───────────────────────────────────────────
  const [teachersStatus, setTeachersStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [teachersResult, setTeachersResult] = useState<number | null>(null);

  if (!user || !["admin", "superadmin"].includes(user.role)) {
    return <div className="p-8 text-center text-[#8A7A72] font-bold">هذه الصفحة للمدير فقط</div>;
  }

  const supervisors   = ACTIVITY_IMPORT_DATA as unknown as SupervisorData[];
  const assignments   = ASSIGNMENTS_IMPORT_DATA as unknown as AssignmentData[];
  const totalRecords  = supervisors.reduce((a, s) => a + s.record_count, 0);
  const totalSchools  = assignments.reduce((a, s) => a + s.schoolCount, 0);

  // ── استيراد النشاط ───────────────────────────────────────────────
  async function runImport() {
    setStatus("running");
    setProgress(0);
    setResults([]);

    const allResults: SupResult[] = [];

    for (let i = 0; i < supervisors.length; i++) {
      const sup = supervisors[i];
      setCurrent(sup.name);
      setProgress(Math.round((i / supervisors.length) * 100));

      try {
        const res = await importLogs({
          supervisorName: sup.name,
          academicYear: YEAR,
          logs: sup.daily_log as any,
          token: token ?? undefined,
        });
        allResults.push({ name: res.supervisorName, inserted: res.inserted, updated: res.updated, total: res.total });
      } catch (err: any) {
        allResults.push({ name: sup.name, inserted: 0, updated: 0, total: 0, error: err.message ?? "خطأ غير معروف" });
      }

      setResults([...allResults]);
    }

    setProgress(100);
    setCurrent("");
    setStatus(allResults.some(r => r.error) ? "error" : "done");
  }

  const totalImported = results.reduce((a, r) => a + r.total, 0);

  async function runClearThenImport() {
    if (!confirm(`⚠️ سيتم مسح كل بيانات النشاط للعام ${YEAR} ثم إعادة استيرادها. هل أنت متأكد؟`)) return;
    setClearing(true);
    setCleared(null);
    setResults([]);
    setStatus("idle");
    try {
      const res = await clearAll({ academicYear: YEAR, token: token ?? undefined });
      setCleared({ logs: res.deletedLogs, summaries: res.deletedSummaries });
    } catch (e: any) {
      alert("خطأ أثناء المسح: " + e.message);
      setClearing(false);
      return;
    }
    setClearing(false);
    await runImport();
  }

  // ── استيراد المدارس (upsert + تصحيح + إخفاء غير المُدرج) ───────────
  async function runImportSchools() {
    if (!confirm(`سيتم استيراد/تصحيح ${SCHOOLS_DATA.length} مدرسة وإخفاء أي مدرسة قديمة غير مُدرجة. متأكد؟`)) return;
    setSchoolsStatus("running");
    setSchoolsResult(null);
    try {
      const res = await seedSchools({ schools: SCHOOLS_DATA as any, token: token ?? undefined });
      setSchoolsResult(res);
      setSchoolsStatus("done");
    } catch (e: any) {
      setSchoolsStatus("error");
    }
  }

  // ── إخفاء المدارس غير المعيّنة ────────────────────────────────────
  async function runHideUnlistedSchools() {
    if (!confirm(`سيتم إخفاء المدارس غير الموجودة في ملف التوزيع (${assignments.length} موجه). هل أنت متأكد؟`)) return;
    setHideSchoolsStatus("running");
    try {
      // كل أسماء المدارس الموجودة في ملف التوزيع
      const activeNames = Array.from(new Set(assignments.flatMap(a => a.schools)));
      const res = await deactivateSchools({ activeNames, token: token ?? undefined });
      setHideSchoolsResult(res.hidden);
      setHideSchoolsStatus("done");
    } catch (e: any) {
      setHideSchoolsStatus("error");
    }
  }

  // ── استيراد الموجهين ─────────────────────────────────────────────
  async function runImportSupervisors() {
    if (!confirm(`سيتم تحديث/إضافة ${SUPERVISORS_DATA.length} موجه من ملف بيانات الموجهين 2026. هل أنت متأكد؟`)) return;
    setSupsStatus("running");
    setSupsResult(null);
    try {
      const res = await bulkUpsertSups({ supervisors: SUPERVISORS_DATA as any });
      setSupsResult(res);
      setSupsStatus("done");
    } catch (e: any) {
      setSupsResult(null);
      setSupsStatus("error");
    }
  }

  // ── استيراد المعلمين والمنسقين ────────────────────────────────────
  async function runImportTeachers() {
    if (!confirm(`سيتم تحديث/إضافة ${TEACHERS_DATA.length} معلم ومنسق من ملف بيانات المنسقين والمعلمين. هل أنت متأكد؟`)) return;
    setTeachersStatus("running");
    setTeachersResult(null);
    try {
      // Map to mutation fields only, import in batches of 100
      const mapped = (TEACHERS_DATA as any[]).map(t => ({
        schoolCode:    t.schoolCode    ?? "",
        schoolName:    t.schoolName    ?? "",
        level:         t.level         ?? "",
        supervisorName:t.supervisorName?? "",
        name:          t.name          ?? "",
        jobTitle:      t.jobTitle      ?? "معلم تربية رياضية",
        classification:t.classification?? "عام",
        personalId:    t.personalId    ?? "0",
        employeeId:    t.employeeId    ?? "0",
        joinDate:      t.joinDate      ?? undefined,
        gender:        t.gender        ?? "male",
        nationality:   t.nationality   ?? "",
        mobile:        t.mobile        ?? "",
        email:         t.email         ?? "",
      }));
      const batchSize = 100;
      let total = 0;
      for (let i = 0; i < mapped.length; i += batchSize) {
        const batch = mapped.slice(i, i + batchSize);
        const count = await importTeachers({ teachers: batch as any });
        total += count;
      }
      setTeachersResult(total);
      setTeachersStatus("done");
    } catch (e: any) {
      setTeachersStatus("error");
    }
  }

  // ── استيراد الخطة الإجرائية ──────────────────────────────────────
  async function runImportOpPlan() {
    if (!confirm(`سيتم مسح الخطة الإجرائية للعام ${YEAR} واستبدالها بـ ${OPERATIONAL_PLAN_DATA.length} إجراء. متابعة؟`)) return;
    setOpStatus("running");
    setOpResult(null);
    try {
      const res = await seedOpPlan({ academicYear: YEAR, items: OPERATIONAL_PLAN_DATA as any, token: token ?? undefined });
      setOpResult(res);
      setOpStatus("done");
    } catch (e: any) {
      setOpStatus("error");
    }
  }

  // ── استيراد خطة الأنشطة ──────────────────────────────────────────
  async function runImportPlans() {
    if (!confirm(`⚠️ سيتم مسح خطة الأنشطة للعام ${YEAR} واستبدالها بـ ${ACTIVITY_PLANS_DATA.length} نشاط من الملف. هل أنت متأكد؟`)) return;
    setPlansStatus("running");
    setPlansResult(null);
    try {
      const res = await seedPlans({
        academicYear: YEAR,
        items: ACTIVITY_PLANS_DATA as any,
        token: token ?? undefined,
      });
      setPlansResult(res);
      setPlansStatus("done");
    } catch (e: any) {
      setPlansResult({ deleted: 0, inserted: 0 });
      setPlansStatus("error");
    }
  }

  // ── استيراد التوزيع ──────────────────────────────────────────────
  async function runImportAssignments() {
    if (!confirm(`⚠️ سيتم مسح كل توزيعات السنة ${YEAR} واستبدالها بالتوزيع الجديد (${totalSchools} مدرسة). هل أنت متأكد؟`)) return;
    setAsgStatus("running");
    setAsgResult(null);
    try {
      const res = await clearAndImportA({
        academicYear: YEAR,
        assignments: assignments.map(a => ({ supervisorName: a.supervisorName, schools: a.schools })),
        token: token ?? undefined,
      });
      setAsgResult(res);
      setAsgStatus(res.errors.length > 0 ? "error" : "done");
    } catch (e: any) {
      setAsgResult({ deleted: 0, inserted: 0, errors: [e.message ?? "خطأ غير معروف"] });
      setAsgStatus("error");
    }
  }

  return (
    <div className="space-y-8 animate-in">
      <PageHeader
        title="استيراد البيانات"
        subtitle="استيراد السجلات اليومية وتوزيع المدارس على الموجهين مباشرةً إلى قاعدة البيانات"
        icon={<Database size={24} />}
      />

      {/* ══════════════════ قسم ١: الموجهون ════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h2 className="font-black text-[#1C1008] text-base">الموجهون التربويون</h2>
          <span className="text-xs font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg">من ملف بيانات موجهي قسم التربية البدنية 2026.docx</span>
        </div>

        <div className="card-luxurious bg-white/70 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-[#2A1418]">
                إجمالي الموجهين: <span className="font-black text-primary">{SUPERVISORS_DATA.length}</span>
              </span>
              <span className="text-xs text-[#8A7A72] font-semibold">
                ({(SUPERVISORS_DATA as any[]).filter(s => s.gender === "male").length} ذكور
                · {(SUPERVISORS_DATA as any[]).filter(s => s.gender === "female").length} إناث)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {supsStatus === "running" && <div className="flex items-center gap-2 text-sm font-bold text-primary"><Loader2 size={15} className="animate-spin" /> جاري الاستيراد…</div>}
              {supsStatus === "done" && supsResult && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={13} /> تم إضافة {supsResult.inserted} وتحديث {supsResult.updated} موجه
                </span>
              )}
              {supsStatus === "error" && <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl"><AlertCircle size={13} /> حدث خطأ</span>}
              <button onClick={runImportSupervisors} disabled={supsStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-l from-primary to-[#7A1E30] shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                {supsStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                تحديث بيانات الموجهين
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.04] bg-black/[0.02]">
                  <th className="text-center px-3 py-2.5 text-xs font-bold text-[#8A7A72]">#</th>
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-[#8A7A72]">الاسم</th>
                  <th className="text-right px-4 py-2.5 text-xs font-bold text-[#8A7A72]">الوظيفة</th>
                  <th className="text-center px-3 py-2.5 text-xs font-bold text-[#8A7A72]">الجنس</th>
                  <th className="text-right px-4 py-2.5 text-xs font-bold text-[#8A7A72]">الجوال</th>
                  <th className="text-right px-4 py-2.5 text-xs font-bold text-[#8A7A72]">البريد</th>
                </tr>
              </thead>
              <tbody>
                {(SUPERVISORS_DATA as any[]).map((s, i) => (
                  <tr key={i} className="border-b border-black/[0.03] last:border-0">
                    <td className="px-3 py-2 text-center text-xs font-bold text-[#8A7A72]">{s.seq}</td>
                    <td className="px-5 py-2 font-bold text-[#2A1418] text-sm">{s.name}</td>
                    <td className="px-4 py-2 text-xs text-[#6b5a52]">{s.jobTitle || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${s.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                        {s.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#6b5a52] font-mono">{s.mobile || '—'}</td>
                    <td className="px-4 py-2 text-xs text-[#6b5a52]">{s.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════ قسم ٢: المعلمون والمنسقون ══════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap size={18} className="text-primary" />
          <h2 className="font-black text-[#1C1008] text-base">المعلمون والمنسقون</h2>
          <span className="text-xs font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg">من ملف بيانات المنسقين والمعلمين.xlsx</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "إجمالي السجلات", value: TEACHERS_DATA.length },
            { label: "معلم تربية رياضية", value: (TEACHERS_DATA as any[]).filter(t => t.jobTitle?.startsWith("معلم")).length },
            { label: "منسق تربية رياضية", value: (TEACHERS_DATA as any[]).filter(t => t.jobTitle?.startsWith("منسق")).length },
            { label: "المصدر", value: "Excel 2026" },
          ].map(({ label, value }) => (
            <div key={label} className="card-luxurious p-4 text-center bg-white/70">
              <p className="text-2xl font-black text-primary font-sans">{value}</p>
              <p className="text-xs font-semibold text-[#8A7A72] mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="card-luxurious bg-white/70 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-[#8A7A72] font-semibold">يشمل معلمي ومنسقي التربية البدنية في جميع المدارس الحكومية</p>
            <div className="flex items-center gap-2">
              {teachersStatus === "running" && <div className="flex items-center gap-2 text-sm font-bold text-primary"><Loader2 size={15} className="animate-spin" /> جاري الاستيراد…</div>}
              {teachersStatus === "done" && teachersResult !== null && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={13} /> تم استيراد {teachersResult} سجل
                </span>
              )}
              {teachersStatus === "error" && <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl"><AlertCircle size={13} /> حدث خطأ أثناء الاستيراد</span>}
              <button onClick={runImportTeachers} disabled={teachersStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-l from-primary to-[#7A1E30] shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                {teachersStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                استيراد المعلمين والمنسقين
              </button>
            </div>
          </div>
          <div className="px-5 py-4 text-sm text-[#8A7A72]">
            <p className="font-bold text-[#2A1418] mb-2">ملاحظة:</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>سيتم تحديث السجلات الموجودة (بحسب الرقم الشخصي) وإضافة الجديدة</li>
              <li>لن يتم حذف أي سجلات موجودة</li>
              <li>البيانات مستخرجة من ملف الإكسل الرسمي للعام الدراسي 2025-2026</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════ الخطة الإجرائية العامة ═══════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-primary" />
          <h2 className="font-black text-[#1C1008] text-base">الخطة الإجرائية العامة</h2>
          <span className="text-xs font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg">من ملف الخطة الإجرائية 2025-2026.pdf</span>
        </div>
        <div className="card-luxurious bg-white/70 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-[#2A1418]">
                إجمالي الإجراءات: <span className="font-black text-primary">{OPERATIONAL_PLAN_DATA.length}</span>
              </span>
              <span className="text-xs text-[#8A7A72] font-semibold">(4 مجالات · 8 أهداف)</span>
            </div>
            <div className="flex items-center gap-2">
              {opStatus === "running" && <div className="flex items-center gap-2 text-sm font-bold text-primary"><Loader2 size={15} className="animate-spin" /> جاري…</div>}
              {opStatus === "done" && opResult && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={13} /> تم مسح {opResult.deleted} وإضافة {opResult.inserted} إجراء
                </span>
              )}
              {opStatus === "error" && <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl"><AlertCircle size={13} /> حدث خطأ</span>}
              <button onClick={runImportOpPlan} disabled={opStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-l from-red-700 to-red-600 shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                {opStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                مسح واستيراد الخطة الإجرائية
              </button>
            </div>
          </div>
          <div className="px-5 py-4 text-xs text-[#8A7A72]">
            تشمل: التخطيط والمتابعة · التحصيل الأكاديمي · التطوير المهني · الأنشطة والمسابقات — مع تاريخ الانتهاء والمسؤول والمخرجات ومؤشرات الأداء لكل إجراء.
          </div>
        </div>
      </section>

      {/* ══════════════════ قسم ٣: خطة الأنشطة اللاصفية ═══════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-primary" />
          <h2 className="font-black text-[#1C1008] text-base">خطة الأنشطة اللاصفية</h2>
          <span className="text-xs font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg">من ملف خطة الأنشطة 2025-2026.xlsx</span>
        </div>

        <div className="card-luxurious bg-white/70 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-[#2A1418]">
                إجمالي الأنشطة: <span className="font-black text-primary">{ACTIVITY_PLANS_DATA.length}</span>
              </span>
              <span className="text-xs text-[#8A7A72] font-semibold">
                ({ACTIVITY_PLANS_DATA.filter(a => a.type === "department").length} فعالية قسم
                + {ACTIVITY_PLANS_DATA.filter(a => a.type === "school").length} فعالية مدرسة)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {plansStatus === "running" && (
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Loader2 size={15} className="animate-spin" /> جاري الاستيراد…
                </div>
              )}
              {plansStatus === "done" && plansResult && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={13} />
                  تم مسح {plansResult.deleted} وإضافة {plansResult.inserted} نشاط
                </span>
              )}
              {plansStatus === "error" && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                  <AlertCircle size={13} /> حدث خطأ أثناء الاستيراد
                </span>
              )}
              <button
                onClick={runImportPlans}
                disabled={plansStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-l from-red-700 to-red-600 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {plansStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                مسح واستيراد خطة الأنشطة
              </button>
            </div>
          </div>

          {/* معاينة سريعة */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.04] bg-black/[0.02]">
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-[#8A7A72]">النشاط</th>
                  <th className="text-right px-4 py-2.5 text-xs font-bold text-[#8A7A72]">الجهة المنظمة</th>
                  <th className="text-center px-3 py-2.5 text-xs font-bold text-[#8A7A72]">التاريخ</th>
                  <th className="text-center px-3 py-2.5 text-xs font-bold text-[#8A7A72]">النوع</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITY_PLANS_DATA.map((item, i) => (
                  <tr key={i} className="border-b border-black/[0.03] last:border-0">
                    <td className="px-5 py-2 font-bold text-[#2A1418] text-sm">{item.activityName}</td>
                    <td className="px-4 py-2 text-xs text-[#6b5a52] font-semibold">{item.organizer}</td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-[#2A1418]">{item.dateText}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                        item.type === "department"
                          ? "bg-primary/5 text-primary"
                          : "bg-gold/10 text-gold-dark"
                      }`}>
                        {item.type === "department" ? "فعالية القسم" : "فعالية مدرسة"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════ قسم ٣: توزيع المدارس ══════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <School size={18} className="text-primary" />
          <h2 className="font-black text-[#1C1008] text-base">توزيع المدارس على الموجهين</h2>
          <span className="text-xs font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg">من ملفات PDF 2025-2026</span>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "موجه", value: assignments.length },
            { label: "مدرسة", value: totalSchools },
            { label: "العام الدراسي", value: YEAR },
            { label: "المصدر", value: "PDF التوزيع" },
          ].map(({ label, value }) => (
            <div key={label} className="card-luxurious p-4 text-center bg-white/70">
              <p className="text-2xl font-black text-primary font-sans">{value}</p>
              <p className="text-xs font-semibold text-[#8A7A72] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* جدول التوزيع */}
        <div className="card-luxurious bg-white/70 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-black text-[#1C1008] text-sm">توزيع الموجهين على المدارس</h3>
            <div className="flex items-center gap-2">
              {asgStatus === "running" && (
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Loader2 size={15} className="animate-spin" /> جاري الاستيراد…
                </div>
              )}
              {asgStatus === "done" && asgResult && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={13} />
                  تم مسح {asgResult.deleted} وإضافة {asgResult.inserted} توزيع
                  {asgResult.createdSchools ? ` · أُنشئت ${asgResult.createdSchools} مدرسة` : ""}
                </span>
              )}
              {asgStatus === "error" && asgResult && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                  <AlertCircle size={13} /> {asgResult.errors[0]}
                </span>
              )}
              <button
                onClick={runImportSchools}
                disabled={schoolsStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-l from-emerald-700 to-emerald-600 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {schoolsStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <School size={14} />}
                استيراد/تصحيح المدارس ({SCHOOLS_DATA.length})
              </button>
              {schoolsStatus === "done" && schoolsResult && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={13} /> أُضيفت {schoolsResult.inserted} · صُحّحت {schoolsResult.updated} · أُخفيت {schoolsResult.hidden}
                </span>
              )}
              {schoolsStatus === "error" && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                  <AlertCircle size={13} /> حدث خطأ
                </span>
              )}
              <button
                onClick={runImportAssignments}
                disabled={asgStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-l from-red-700 to-red-600 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {asgStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                مسح واستيراد التوزيع
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.04] bg-black/[0.02]">
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-[#8A7A72]">الموجه</th>
                  <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">عدد المدارس</th>
                  <th className="text-right px-4 py-2.5 text-xs font-bold text-[#8A7A72]">المدارس</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item, i) => (
                  <tr key={i} className="border-b border-black/[0.03] last:border-b-0">
                    <td className="px-5 py-2.5 font-bold text-[#2A1418] text-sm whitespace-nowrap">{item.supervisorName}</td>
                    <td className="px-4 py-2.5 text-center font-sans font-bold text-primary text-sm">{item.schoolCount}</td>
                    <td className="px-4 py-2.5 text-[11px] text-[#6b5a52] leading-relaxed">
                      {item.schools.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════ قسم ٤: السجلات اليومية ══════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-primary" />
          <h2 className="font-black text-[#1C1008] text-base">السجلات اليومية للموجهين</h2>
          <span className="text-xs font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg">من ملف الاحصاءات 2025.xlsx</span>
        </div>

        {/* زر مسح وإعادة استيراد */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={runClearThenImport}
            disabled={clearing || status === "running"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-l from-red-700 to-red-600 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {clearing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {clearing ? "جاري المسح…" : "مسح البيانات الحالية وإعادة الاستيراد"}
          </button>
          {cleared && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
              <CheckCircle2 size={13} />
              تم مسح {cleared.logs} سجل و {cleared.summaries} ملخص
            </span>
          )}
        </div>

        {/* معلومات البيانات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "موجه", value: supervisors.length },
            { label: "سجل يومي", value: totalRecords.toLocaleString() },
            { label: "العام الدراسي", value: YEAR },
            { label: "المصدر", value: "الاحصاءات 2025.xlsx" },
          ].map(({ label, value }) => (
            <div key={label} className="card-luxurious p-4 text-center bg-white/70">
              <p className="text-2xl font-black text-primary font-sans">{value}</p>
              <p className="text-xs font-semibold text-[#8A7A72] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* جدول الموجهين */}
        <div className="card-luxurious bg-white/70 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between">
            <h3 className="font-black text-[#1C1008] text-sm">بيانات الاستيراد لكل موجه</h3>
            {status === "idle" && (
              <button
                onClick={runImport}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-5"
              >
                <Play size={15} /> تشغيل الاستيراد
              </button>
            )}
            {status === "running" && (
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Loader2 size={16} className="animate-spin" />
                {progress}% — جاري: {current}
              </div>
            )}
            {status === "done" && (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                <CheckCircle2 size={16} /> اكتمل — {totalImported.toLocaleString()} سجل
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 text-sm font-bold text-red-600">
                <AlertCircle size={16} /> اكتمل مع أخطاء
              </div>
            )}
          </div>

          {status === "running" && (
            <div className="px-5 py-2 bg-gold/5 border-b border-gold/10">
              <div className="h-2 bg-black/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-gold rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.04] bg-black/[0.02]">
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-[#8A7A72]">الموجه</th>
                  <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">السجلات</th>
                  <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">الحالة</th>
                  <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">جديد</th>
                  <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">محدّث</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map((sup, i) => {
                  const res = results.find(r => r.name === sup.name || r.name.includes(sup.name.split(" ")[0]));
                  const isActive = status === "running" && current === sup.name;
                  return (
                    <tr key={i} className={`border-b border-black/[0.03] last:border-b-0 transition-colors ${isActive ? "bg-gold/10" : ""}`}>
                      <td className="px-5 py-2.5 font-bold text-[#2A1418] text-sm">{sup.name}</td>
                      <td className="px-4 py-2.5 text-center font-sans font-bold text-[#6b5a52] text-sm">{sup.record_count}</td>
                      <td className="px-4 py-2.5 text-center">
                        {isActive && <Loader2 size={14} className="animate-spin text-primary mx-auto" />}
                        {!isActive && res?.error && <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">{res.error}</span>}
                        {!isActive && res && !res.error && <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />}
                        {!isActive && !res && status === "idle" && <span className="text-[10px] text-[#C0B4AE] font-semibold">انتظار</span>}
                        {!isActive && !res && status === "running" && <span className="text-[10px] text-[#C0B4AE]">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center font-sans font-bold text-emerald-600 text-sm">{res ? res.inserted : "—"}</td>
                      <td className="px-4 py-2.5 text-center font-sans font-bold text-gold-dark text-sm">{res ? res.updated : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gold/10 border border-gold/25 rounded-2xl p-4 text-xs font-semibold text-[#8a6a1f] leading-relaxed">
          <strong>تنبيه:</strong> الاستيراد آمن تماماً — إذا وُجد سجل بنفس الموجه والتاريخ سيُحدَّث، وإذا كان جديداً سيُضاف. بعد اكتمال الاستيراد يُعاد حساب ملخص كل موجه تلقائياً. يمكن تشغيل الاستيراد أكثر من مرة بأمان.
        </div>
      </section>
    </div>
  );
}
