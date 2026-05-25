import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, requireAdminMutation } from "./permissions";

// جلب كل توزيعات سنة دراسية معينة
export const listByYear = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();

    return Promise.all(
      assignments.map(async (a) => ({
        ...a,
        school: await ctx.db.get(a.schoolId),
        supervisor: await ctx.db.get(a.supervisorId),
      }))
    );
  },
});

// جلب مدارس موجه في سنة معينة
export const listBySupervisorYear = query({
  args: { supervisorId: v.id("supervisors"), academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    if (!canSeeAll(user) && user.supervisorId !== args.supervisorId) return [];
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear)
      )
      .collect();

    return Promise.all(
      assignments.map(async (a) => ({
        ...a,
        school: await ctx.db.get(a.schoolId),
      }))
    );
  },
});

// إسناد مدرسة لموجه (أو تحديث الإسناد الحالي)
export const assign = mutation({
  args: {
    schoolId: v.id("schools"),
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    notes: v.optional(v.string()),
    assignedBy: v.optional(v.id("users")),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_school_year", (q) =>
        q.eq("schoolId", args.schoolId).eq("academicYear", args.academicYear)
      )
      .first();

    const data = {
      schoolId: args.schoolId,
      supervisorId: args.supervisorId,
      academicYear: args.academicYear,
      assignedAt: Date.now(),
      assignedBy: args.assignedBy,
      notes: args.notes,
    };

    if (existing) {
      await ctx.db.replace(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert("assignments", data);
  },
});

// نقل مجموعة مدارس من موجه لآخر دفعة واحدة
export const bulkReassign = mutation({
  args: {
    schoolIds: v.array(v.id("schools")),
    fromSupervisorId: v.id("supervisors"),
    toSupervisorId: v.id("supervisors"),
    academicYear: v.string(),
    notes: v.optional(v.string()),
    assignedBy: v.optional(v.id("users")),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const results = [];
    for (const schoolId of args.schoolIds) {
      const existing = await ctx.db
        .query("assignments")
        .withIndex("by_school_year", (q) =>
          q.eq("schoolId", schoolId).eq("academicYear", args.academicYear)
        )
        .first();

      const data = {
        schoolId,
        supervisorId: args.toSupervisorId,
        academicYear: args.academicYear,
        assignedAt: Date.now(),
        assignedBy: args.assignedBy,
        notes: args.notes,
      };

      if (existing) {
        await ctx.db.replace(existing._id, data);
        results.push(existing._id);
      } else {
        results.push(await ctx.db.insert("assignments", data));
      }
    }
    return results;
  },
});

// إزالة إسناد (نادراً ما يُستخدم، لكن مفيد للتصحيح)
export const remove = mutation({
  args: {
    schoolId: v.id("schools"),
    academicYear: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_school_year", (q) =>
        q.eq("schoolId", args.schoolId).eq("academicYear", args.academicYear)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// مسح كل توزيعات سنة واستيراد توزيع جديد من ملف JSON
export const clearAndBulkImport = mutation({
  args: {
    academicYear: v.string(),
    assignments: v.array(v.object({
      supervisorName: v.string(),
      schools: v.array(v.string()),
    })),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);

    // 1) مسح كل التوزيعات للسنة
    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    for (const a of existing) await ctx.db.delete(a._id);

    // 2) جلب كل الموجهين والمدارس مرة واحدة
    const allSups = await ctx.db.query("supervisors").collect();
    const allSchools = await ctx.db.query("schools").collect();

    function normStr(s: string) {
      return s
        .replace(/\s+/g, " ").trim()
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[ً-ْٰ]/g, "");
    }

    function findSupervisor(name: string) {
      const n = normStr(name);
      return allSups.find(s =>
        normStr(s.name) === n ||
        normStr(s.nameKey ?? "") === n
      ) ?? allSups.find(s => {
        const sn = normStr(s.name).split(" ");
        const tn = n.split(" ");
        const shared = sn.filter(w => tn.includes(w)).length;
        return shared >= 2;
      });
    }

    function findSchool(name: string) {
      const n = normStr(name);
      return allSchools.find(s =>
        normStr(s.name) === n ||
        normStr(s.nameKey ?? "") === n
      ) ?? allSchools.find(s => {
        const sn = normStr(s.name).split(" ");
        const tn = n.split(" ");
        const shared = sn.filter(w => tn.includes(w)).length;
        return shared >= Math.max(2, Math.floor(tn.length / 2));
      });
    }

    // استنتاج المرحلة والجنس من اسم المدرسة
    function deriveLevel(name: string): string {
      if (name.includes("الابتدائية") || name.includes("ابتدائية") || name.includes("الإبتدائية") || name.includes("الابتدائيه")) return "ابتدائي";
      if (name.includes("الإعدادية") || name.includes("إعدادية") || name.includes("اعدادية") || name.includes("الاعدادية")) return "إعدادي";
      if (name.includes("الثانوية") || name.includes("ثانوية")) return "ثانوي";
      if (name.includes("النموذجية") || name.includes("نموذجية")) return "نموذجي";
      if (name.includes("المشتركة") || name.includes("مشتركة")) return "مشترك";
      if (name.includes("تخصصية") || name.includes("تخصصي")) return "تخصصي";
      return "";
    }
    function deriveGender(name: string, supGender: "male" | "female"): "male" | "female" {
      if (name.includes("للبنات") || name.includes("البنات")) return "female";
      if (name.includes("للبنين") || name.includes("البنين")) return "male";
      return supGender;
    }

    // 3) استيراد التوزيع الجديد — مع إنشاء المدارس الناقصة تلقائياً
    let inserted = 0;
    let createdSchools = 0;
    const errors: string[] = [];

    for (const item of args.assignments) {
      const sup = findSupervisor(item.supervisorName);
      if (!sup) {
        errors.push(`موجه غير موجود: ${item.supervisorName}`);
        continue;
      }
      for (const schoolName of item.schools) {
        let school = findSchool(schoolName);
        // إنشاء المدرسة إذا لم تكن موجودة
        if (!school) {
          const newId = await ctx.db.insert("schools", {
            name: schoolName,
            nameKey: schoolName,
            level: deriveLevel(schoolName),
            gender: deriveGender(schoolName, sup.gender),
            isActive: true,
          });
          const created = await ctx.db.get(newId);
          if (created) {
            school = created;
            allSchools.push(created);
            createdSchools++;
          }
        }
        if (!school) continue;
        await ctx.db.insert("assignments", {
          schoolId: school._id,
          supervisorId: sup._id,
          academicYear: args.academicYear,
          assignedAt: Date.now(),
        });
        inserted++;
      }
    }

    return {
      deleted: existing.length,
      inserted,
      createdSchools,
      errors,
    };
  },
});

// نسخ كل توزيعات سنة إلى سنة جديدة (بداية كل عام دراسي)
export const copyYearAssignments = mutation({
  args: {
    fromYear: v.string(),
    toYear: v.string(),
    assignedBy: v.optional(v.id("users")),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    // التأكد من أن السنة الجديدة لا تحتوي على توزيعات بالفعل
    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_year", (q) => q.eq("academicYear", args.toYear))
      .first();
    if (existing) throw new Error(`السنة ${args.toYear} تحتوي على توزيعات بالفعل`);

    const source = await ctx.db
      .query("assignments")
      .withIndex("by_year", (q) => q.eq("academicYear", args.fromYear))
      .collect();

    for (const a of source) {
      await ctx.db.insert("assignments", {
        schoolId: a.schoolId,
        supervisorId: a.supervisorId,
        academicYear: args.toYear,
        assignedAt: Date.now(),
        assignedBy: args.assignedBy,
      });
    }
    return source.length;
  },
});
