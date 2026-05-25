import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll } from "./permissions";

/* ────────────────────────────────────────────────────────────────────
   حصر عدد الزيارات المدرسية — مجمّع حسب المدرسة والمرحلة
   يحسب تلقائياً عدد الزيارات الميدانية لكل مدرسة بثلاثة محاور:
     pe        = استمارات التربية البدنية (كل استمارات الموجه)
     deputy    = استمارات النائب الأكاديمي
     principal = استمارات مدير المدرسة
   ──────────────────────────────────────────────────────────────────── */
export const schoolVisitCounts = query({
  args: {
    academicYear: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return null;

    const year = args.academicYear;

    /* تطبيع الأسماء للمطابقة بين استمارات وجدول المدارس */
    function norm(s: string): string {
      return (s ?? "")
        .replace(/\xa0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[ً-ْٰ]/g, "");
    }

    /* جلب كل المدارس النشطة */
    const allSchools = await ctx.db.query("schools").collect();
    const schools = allSchools.filter((s) => s.isActive);

    /* جلب كل الاستمارات بالتوازي */
    async function byYear(table: string) {
      return ctx.db
        .query(table as any)
        .withIndex("by_year", (q: any) => q.eq("academicYear", year))
        .collect();
    }

    const [
      coordinator, teacher, meeting,
      exam, examFollowup, examArbitration,
      profDev, newTeacher,
      deputy, principal, profLicense,
    ] = await Promise.all([
      byYear("coordinatorForms"),
      byYear("teacherForms"),
      byYear("meetingForms"),
      byYear("examForms"),
      byYear("examFollowupForms"),
      byYear("examArbitrationForms"),
      byYear("profDevForms"),
      byYear("newTeacherPlans"),
      byYear("deputyPrincipalForms"),
      byYear("principalForms"),
      byYear("profLicenseForms"),
    ]);

    /* احتساب الأعداد لكل مدرسة */
    type Counts = { pe: number; deputy: number; principal: number };
    const counts = new Map<string, Counts>();

    function add(forms: any[], field: keyof Counts) {
      for (const f of forms) {
        const k = norm(f.schoolName ?? "");
        if (!k) continue;
        const c = counts.get(k) ?? { pe: 0, deputy: 0, principal: 0 };
        c[field]++;
        counts.set(k, c);
      }
    }

    /* استمارات التربية البدنية (كل استمارات الموجه التربوي) */
    for (const forms of [
      coordinator, teacher, meeting,
      exam, examFollowup, examArbitration,
      profDev, newTeacher, profLicense,
    ]) {
      add(forms, "pe");
    }

    /* استمارات النائب الأكاديمي ومدير المدرسة */
    add(deputy, "deputy");
    add(principal, "principal");

    /* بناء النتيجة — مدرسة واحدة لكل صف */
    const result = schools.map((s) => {
      const key = norm(s.name);
      const c = counts.get(key) ?? { pe: 0, deputy: 0, principal: 0 };
      return {
        id: s._id as string,
        name: s.name,
        level: s.level ?? "",
        gender: s.gender as "male" | "female",
        pe: c.pe,
        deputy: c.deputy,
        principal: c.principal,
      };
    });

    /* ترتيب: حسب المرحلة ثم الاسم أبجدياً */
    const STAGE_ORDER = [
      "ابتدائي بنين", "إعدادي بنين", "ثانوي بنين",
      "مشتركة بنين", "تخصصية بنين", "نموذجية",
      "ابتدائي بنات", "إعدادي بنات", "ثانوي بنات",
      "مشتركة بنات", "تخصصية بنات",
    ];
    const stageIdx = (level: string) => {
      const idx = STAGE_ORDER.indexOf(level);
      return idx === -1 ? 99 : idx;
    };

    result.sort((a, b) => {
      const si = stageIdx(a.level) - stageIdx(b.level);
      if (si !== 0) return si;
      return a.name.localeCompare(b.name, "ar");
    });

    /* إضافة الرقم التسلسلي بعد الترتيب */
    return result.map((r, i) => ({ ...r, seq: i + 1 }));
  },
});

/**
 * حصر الزيارات الميدانية
 * يجمع جميع الاستمارات المرتبطة بزيارات ميدانية من كل الجداول
 * ويُعيدها كقائمة موحّدة مرتبة بالتاريخ
 */
export const fieldVisits = query({
  args: {
    academicYear: v.string(),
    supervisorId: v.optional(v.id("supervisors")),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];

    const year = args.academicYear;

    // تحديد فلتر الموجه (المدير يرى الجميع، الموجه يرى نفسه فقط)
    const isAdmin = canSeeAll(user);
    const filterSupervisorId = isAdmin
      ? args.supervisorId   // المدير يختار موجهاً معيناً أو الكل
      : user.supervisorId ?? undefined; // الموجه يرى نفسه فقط

    // دالة لجلب كل سجلات جدول بفلتر السنة (والموجه اختياريًا)
    async function fetchForms<T extends { supervisorId: any; academicYear: string }>(
      tableName: string
    ): Promise<T[]> {
      const q = ctx.db.query(tableName as any).withIndex("by_year", (q: any) =>
        q.eq("academicYear", year)
      );
      const rows: T[] = await q.collect();
      if (filterSupervisorId) {
        return rows.filter((r: any) => r.supervisorId === filterSupervisorId);
      }
      return rows;
    }

    // جلب كل الاستمارات بالتوازي
    const [
      coordinator,
      teacher,
      meeting,
      exam,
      examFollowup,
      examArbitration,
      profDev,
      newTeacher,
      deputy,
      principal,
      profLicense,
    ] = await Promise.all([
      fetchForms<any>("coordinatorForms"),
      fetchForms<any>("teacherForms"),
      fetchForms<any>("meetingForms"),
      fetchForms<any>("examForms"),
      fetchForms<any>("examFollowupForms"),
      fetchForms<any>("examArbitrationForms"),
      fetchForms<any>("profDevForms"),
      fetchForms<any>("newTeacherPlans"),
      fetchForms<any>("deputyPrincipalForms"),
      fetchForms<any>("principalForms"),
      fetchForms<any>("profLicenseForms"),
    ]);

    type VisitEntry = {
      id: string;
      supervisorId: string;
      supervisorName: string;
      schoolName: string;
      date: string;
      day: string;
      formType: string;
      formCode: string;
      colorKey: string;
      extraInfo: string;
      status: "draft" | "submitted";
      href: string;
    };

    const visits: VisitEntry[] = [
      ...coordinator.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "إشراف على المنسق",
        formCode: "ES-ESP-P12-F3",
        colorKey: "primary",
        extraInfo: f.coordinatorName ?? "",
        status: f.status,
        href: `/dashboard/forms/${f._id}`,
      })),
      ...teacher.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "إشراف على معلم",
        formCode: "ES-ESP-P12-F2",
        colorKey: "sky",
        extraInfo: f.teacherName ?? "",
        status: f.status,
        href: `/dashboard/teacher-forms/${f._id}`,
      })),
      ...meeting.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "اجتماع تعارفي",
        formCode: "ES-ESP-P12-F8",
        colorKey: "teal",
        extraInfo: f.coordinatorName ?? "",
        status: f.status,
        href: `/dashboard/meetings/${f._id}`,
      })),
      ...exam.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "اختبار عملي",
        formCode: "ES-ESP-P18-F1",
        colorKey: "emerald",
        extraInfo: f.teacherName ?? "",
        status: f.status,
        href: `/dashboard/exam-forms/${f._id}`,
      })),
      ...examFollowup.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "متابعة تنفيذ الاختبار",
        formCode: "ES-ESP-P18-F3",
        colorKey: "amber",
        extraInfo: f.teacherName ?? "",
        status: f.status,
        href: `/dashboard/exam-followup/${f._id}`,
      })),
      ...examArbitration.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "تحكيم الاختبار العملي",
        formCode: "ES-ESP-P18-F2",
        colorKey: "orange",
        extraInfo: f.coordinatorName ?? "",
        status: f.status,
        href: `/dashboard/exam-arbitration/${f._id}`,
      })),
      ...profDev.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "تطوير مهني",
        formCode: "ES-ESA-P11-F4",
        colorKey: "violet",
        extraInfo: f.coordinatorName ?? "",
        status: f.status,
        href: `/dashboard/prof-dev/${f._id}`,
      })),
      ...newTeacher.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.createdAt
          ? new Date(f.createdAt).toISOString().split("T")[0]
          : year,
        day: "",
        formType: "خطة معلم مستجد",
        formCode: "ES-ESP-P12",
        colorKey: "rose",
        extraInfo: f.teacherName ?? "",
        status: f.status,
        href: `/dashboard/new-teacher/${f._id}`,
      })),
      ...deputy.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "متابعة نائب المدير",
        formCode: "ES-ESP-P13-F1",
        colorKey: "cyan",
        extraInfo: f.deputyName ?? "",
        status: f.status,
        href: `/dashboard/deputy-principal/${f._id}`,
      })),
      ...principal.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: f.day ?? "",
        formType: "متابعة مدير المدرسة",
        formCode: "",
        colorKey: "indigo",
        extraInfo: f.principalName ?? "",
        status: f.status,
        href: `/dashboard/principal-forms/${f._id}`,
      })),
      ...profLicense.map((f: any) => ({
        id: f._id,
        supervisorId: f.supervisorId,
        supervisorName: f.supervisorName,
        schoolName: f.schoolName,
        date: f.date,
        day: "",
        formType: "رخصة مهنية",
        formCode: `نموذج ${f.formVariant}`,
        colorKey: "yellow",
        extraInfo: f.teacherName ?? "",
        status: f.status,
        href: `/dashboard/prof-licenses/${f._id}`,
      })),
    ];

    // ترتيب بالتاريخ تصاعديًا ثم بالاسم
    return visits.sort((a, b) =>
      a.supervisorName.localeCompare(b.supervisorName, "ar") ||
      (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)
    );
  },
});
