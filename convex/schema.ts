import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── المستخدمون والصلاحيات ───────────────────────────────────────
  users: defineTable({
    name: v.string(),
    email: v.string(),
    username: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    mustChangePassword: v.optional(v.boolean()),
    token: v.optional(v.string()),
    role: v.union(v.literal("superadmin"), v.literal("admin"), v.literal("supervisor"), v.literal("viewer")),
    supervisorId: v.optional(v.id("supervisors")), // ربط بالموجه إن وُجد
    isActive: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_token", ["token"])
    .index("by_supervisor", ["supervisorId"]),

  // ─── الموجهون ────────────────────────────────────────────────────
  supervisors: defineTable({
    seq: v.number(),
    personalId: v.string(),   // رقم الهوية - admin only
    jobNumber: v.string(),
    name: v.string(),
    nameKey: v.string(),      // اسم منقّح للبحث
    shortKey: v.string(),     // أول + آخر كلمة للربط بين الملفات
    jobTitle: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    officePhone: v.optional(v.string()),
    mobile: v.optional(v.string()),   // admin only
    email: v.optional(v.string()),
    poBox: v.optional(v.string()),
    residence: v.optional(v.string()),
    nationality: v.optional(v.string()),
    contractType: v.optional(v.string()),
    jobCategory: v.optional(v.string()),
    joinDate: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_name_key", ["nameKey"])
    .index("by_short_key", ["shortKey"])
    .index("by_gender", ["gender"])
    .searchIndex("search_name", { searchField: "name" }),

  // ─── المدارس ─────────────────────────────────────────────────────
  schools: defineTable({
    name: v.string(),
    nameKey: v.string(),
    level: v.optional(v.string()),
    gender: v.union(v.literal("male"), v.literal("female")),
    teachers: v.optional(v.number()),
    coordinators: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_name_key", ["nameKey"])
    .index("by_gender", ["gender"])
    .searchIndex("search_name", { searchField: "name" }),

  // ─── معلمو التربية البدنية ───────────────────────────────────────
  teachers: defineTable({
    schoolCode: v.string(),            // كود المدرسة من Excel
    schoolName: v.string(),            // اسم المدرسة
    level: v.string(),                 // المرحلة الدراسية
    supervisorName: v.string(),        // الموجه المسؤول
    name: v.string(),                  // اسم المعلم الكامل
    nameKey: v.string(),               // اسم منقح للبحث
    jobTitle: v.string(),              // المسمى الوظيفي (معلم / منسق)
    classification: v.string(),        // التصنيف (تطوير ذاتي / مكثف / عام)
    personalId: v.string(),            // الرقم الشخصي
    employeeId: v.string(),            // الرقم الوظيفي
    joinDate: v.optional(v.string()),  // تاريخ التعيين ISO
    gender: v.union(v.literal("male"), v.literal("female")),
    nationality: v.string(),           // الجنسية
    mobile: v.string(),                // رقم الجوال
    email: v.string(),                 // البريد الإلكتروني
    isActive: v.boolean(),
  })
    .index("by_name_key", ["nameKey"])
    .index("by_personal_id", ["personalId"])
    .index("by_employee_id", ["employeeId"])
    .index("by_supervisor", ["supervisorName"])
    .searchIndex("search_name", { searchField: "name" }),

  // ─── الالتزام والمواثيق السنوية ──────────────────────────────────
  complianceChecklists: defineTable({
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),          // "2025-2026"
    integrityPledge: v.boolean(),      // ميثاق سلوك نزاهة الموظفين
    ramadanIntegration: v.boolean(),   // التكامل مع التربية الإسلامية في رمضان
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_supervisor_year", ["supervisorId", "academicYear"]),

  // ─── توزيع المدارس على الموجهين (سنوي) ──────────────────────────
  // هذا الجدول يمكّن إعادة التوزيع بين الموجهين كل عام دراسي
  assignments: defineTable({
    schoolId: v.id("schools"),
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),         // مثال: "2025-2026"
    assignedAt: v.number(),           // timestamp
    assignedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_school_year", ["schoolId", "academicYear"])
    .index("by_supervisor_year", ["supervisorId", "academicYear"])
    .index("by_year", ["academicYear"]),

  // ─── سجل الأكواد اليومية ─────────────────────────────────────────
  // كود لكل موجه × يوم (OF مكتب | VS زيارة | CL عارضة | LV إجازة |
  //  SL مرضي | TR تطوير | MT اجتماع | AC أنشطة | AB غياب |
  //  SP رسمية | VP مهمة | OL عن بعد | WP إذن عمل)
  activityLogs: defineTable({
    supervisorId: v.id("supervisors"),
    date: v.string(),                 // ISO: "2025-11-03"
    code: v.union(
      v.literal("OF"), v.literal("VS"), v.literal("CL"), v.literal("LV"),
      v.literal("SL"), v.literal("TR"), v.literal("MT"), v.literal("AC"),
      v.literal("AB"), v.literal("SP"), v.literal("VP"), v.literal("OL"),
      v.literal("WP")
    ),
    schoolId: v.optional(v.id("schools")),  // عند VS/CL
    notes: v.optional(v.string()),
    academicYear: v.string(),
    enteredBy: v.optional(v.id("users")),
  })
    .index("by_supervisor_date", ["supervisorId", "date"])
    .index("by_supervisor_year", ["supervisorId", "academicYear"])
    .index("by_date", ["date"])
    .index("by_school", ["schoolId"]),

  // ─── ملخص الأكواد السنوي (مستورد من Excel) ───────────────────────
  activitySummaries: defineTable({
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    OF: v.number(), VS: v.number(), CL: v.number(), LV: v.number(),
    SL: v.number(), TR: v.number(), MT: v.number(), AC: v.number(),
    AB: v.number(), SP: v.number(), VP: v.number(), OL: v.number(),
    WP: v.number(),
    schoolingDays: v.number(),
  })
    .index("by_supervisor_year", ["supervisorId", "academicYear"]),

  // ─── الاستمارات ───────────────────────────────────────────────────
  forms: defineTable({
    supervisorId: v.id("supervisors"),
    schoolId: v.id("schools"),
    type: v.union(
      v.literal("classroom_visit"),    // زيارة صفية
      v.literal("exam_approval"),      // اعتماد اختبارات
      v.literal("exam_judging"),       // تحكيم اختبارات
      v.literal("coordinator_followup"), // متابعة منسق
      v.literal("prof_development"),   // تطوير مهني
      v.literal("remote_learning"),    // تعلم عن بعد
      v.literal("prof_licenses")       // رخص مهنية
    ),
    date: v.string(),
    academicYear: v.string(),
    notes: v.optional(v.string()),
    enteredBy: v.optional(v.id("users")),
  })
    .index("by_supervisor_type", ["supervisorId", "type"])
    .index("by_supervisor_year", ["supervisorId", "academicYear"])
    .index("by_school_year", ["schoolId", "academicYear"])
    .index("by_date", ["date"]),

  // ─── إجماليات الاستمارات (مستوردة من Excel) ──────────────────────
  formTotals: defineTable({
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    totalVisits: v.number(),
    classroomVisits: v.number(),
    examApproval: v.number(),
    schoolsCount: v.number(),
    examJudging: v.number(),
    coordinatorFollowup: v.number(),
  })
    .index("by_supervisor_year", ["supervisorId", "academicYear"]),

  // ─── مؤشرات التغطية (KPIs) ────────────────────────────────────────
  coverageKpis: defineTable({
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    schoolsRequired: v.number(),
    schoolsCovered: v.number(),
    formsCount: v.number(),
    coverageRate: v.number(),
    formsRate: v.number(),
    status: v.string(),   // ✅مكتمل | ✅ممتاز | 🏆متميز | ⚠️قريب
  })
    .index("by_supervisor_year", ["supervisorId", "academicYear"])
    .index("by_year", ["academicYear"]),

  // ─── التعلم عن بعد: التغطية ───────────────────────────────────────
  remoteCoverage: defineTable({
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    required: v.number(),
    covered: v.number(),
    forms: v.number(),
    coverageRate: v.number(),
    formsRate: v.number(),
  })
    .index("by_supervisor_year", ["supervisorId", "academicYear"])
    .index("by_year", ["academicYear"]),

  // ─── التعلم عن بعد: الجدول الأسبوعي ───────────────────────────────
  remoteSchedule: defineTable({
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    schoolsTotal: v.number(),
    days: v.object({
      sunday: v.array(v.object({ school: v.string(), count: v.number() })),
      monday: v.array(v.object({ school: v.string(), count: v.number() })),
      tuesday: v.array(v.object({ school: v.string(), count: v.number() })),
      wednesday: v.array(v.object({ school: v.string(), count: v.number() })),
      thursday: v.array(v.object({ school: v.string(), count: v.number() })),
    }),
  })
    .index("by_supervisor_year", ["supervisorId", "academicYear"])
    .index("by_year", ["academicYear"]),

  // ─── التعلم عن بعد: استطلاع اليوم ─────────────────────────────────
  remoteSurvey: defineTable({
    supervisorId: v.optional(v.id("supervisors")),
    name: v.string(),
    date: v.string(),
    items: v.array(v.object({ challenge: v.string(), recommendation: v.string() })),
  })
    .index("by_date", ["date"]),

  // ─── جدول المناوبات الأسبوعية ─────────────────────────────────────
  weeklySchedule: defineTable({
    supervisorId: v.id("supervisors"),
    weekStartDate: v.string(),
    academicYear: v.string(),
    sunday: v.optional(v.string()),
    monday: v.optional(v.string()),
    tuesday: v.optional(v.string()),
    wednesday: v.optional(v.string()),
    thursday: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_supervisor_week", ["supervisorId", "weekStartDate"])
    .index("by_week", ["weekStartDate"]),

  // ─── مقابلات التوظيف (PII - admin only) ──────────────────────────
  interviews: defineTable({
    personalId: v.string(),          // رقم الهوية - admin only
    name: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    nationality: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    phone: v.optional(v.string()),   // admin only
    appointment: v.optional(v.string()),
    interviewDate: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    sensitive: v.boolean(),          // دائماً true - للتأكيد
    scorePersonal: v.optional(v.number()),    // الكفاية الشخصية والسمات (من 25)
    scoreScientific: v.optional(v.number()),  // الكفاية العلمية والمهنية (من 25)
    scorePlanning: v.optional(v.number()),    // مهارات التخطيط والتحليل (من 25)
    scoreLeadership: v.optional(v.number()),  // المهارات القيادية والإشرافية (من 25)
    scoreTotal: v.optional(v.number()),       // المجموع التلقائي (من 100)
    committeeRecommendation: v.optional(v.string()), // توصية اللجنة النهائية
  })
    .index("by_date", ["interviewDate"])
    .searchIndex("search_name", { searchField: "name" }),

  // ─── سجل الوصول لبيانات PII ───────────────────────────────────────
  accessLogs: defineTable({
    userId: v.id("users"),
    resource: v.string(),            // "interviews" | "supervisor.mobile" | ...
    resourceId: v.optional(v.string()),
    action: v.string(),              // "view" | "export"
    timestamp: v.number(),
    ip: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_resource", ["resource"])
    .index("by_timestamp", ["timestamp"]),

  // ─── الإعدادات العامة ─────────────────────────────────────────────
  settings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  // ─── فترات التعلم عن بعد (تُدار من الموقع) ────────────────────────
  remoteLearningPeriods: defineTable({
    name: v.string(),                 // اسم الفترة
    reason: v.optional(v.string()),   // السبب/الوصف (طوارئ، صيانة، ...)
    startDate: v.string(),            // ISO
    endDate: v.string(),              // ISO
    isActive: v.boolean(),            // فعّالة الآن؟
    scope: v.union(v.literal("all"), v.literal("selected")), // كل المدارس أم محددة
    schoolIds: v.optional(v.array(v.id("schools"))),
    supervisorIds: v.optional(v.array(v.id("supervisors"))),
    requiredPerSupervisor: v.optional(v.number()), // المطلوب الافتراضي لهذه الفترة
    academicYear: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_year", ["academicYear"])
    .index("by_active", ["isActive"]),

  // ─── استمارات الإشراف على أداء المنسق ────────────────────────────
  coordinatorForms: defineTable({
    supervisorId: v.id("supervisors"),
    supervisorName: v.string(),
    schoolId: v.optional(v.id("schools")),
    schoolName: v.string(),
    coordinatorName: v.string(),
    subject: v.string(),                 // المادة (افتراضي: التربية البدنية)
    day: v.string(),                     // اليوم
    date: v.string(),                    // ISO
    academicYear: v.string(),
    domains: v.array(v.object({
      domain: v.string(),               // المجال
      indicator: v.string(),            // مؤشر الأداء
      notes: v.optional(v.string()),    // (قديم) الملاحظات
      evidences: v.optional(v.array(v.object({
        text: v.string(),               // الدليل
        status: v.string(),             // الإشراف: مستكمل | مستكمل جزئياً | غير مستكمل
      }))),
    })),
    generalNote: v.optional(v.string()),
    supervisorSignature: v.optional(v.string()),   // dataURL
    coordinatorSignature: v.optional(v.string()),  // dataURL
    status: v.union(v.literal("draft"), v.literal("submitted")),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    submittedAt: v.optional(v.number()),
  })
    .index("by_supervisor", ["supervisorId"])
    .index("by_year", ["academicYear"]),

  // ─── سجل التدقيق (كل تعديل مهم) ───────────────────────────────────
  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
    action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    entity: v.string(),               // "remoteCoverage" | "remotePeriod" | ...
    entityId: v.optional(v.string()),
    summary: v.string(),              // وصف عربي للتغيير
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_entity", ["entity"]),
});
