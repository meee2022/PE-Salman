import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./permissions";

// الحصول على المعلمين مع خيارات البحث والتصفية الفورية
export const list = query({
  args: {
    token: v.optional(v.string()),
    supervisorName: v.optional(v.string()),
    classification: v.optional(v.string()),
    level: v.optional(v.string()),
    gender: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = args.token ? await getAuthUser(ctx, args.token) : null;
    let teachers = await ctx.db.query("teachers").collect();

    // إذا كان موجهاً، نفلتر تلقائياً بمعلميه فقط
    let effectiveSupervisorName = args.supervisorName;
    if (user?.role === "supervisor" && user.supervisorId) {
      const sup = await ctx.db.get(user.supervisorId);
      if (sup) effectiveSupervisorName = sup.name;
    }

    if (effectiveSupervisorName) {
      teachers = teachers.filter((t) => t.supervisorName === effectiveSupervisorName);
    }
    if (args.classification) {
      teachers = teachers.filter((t) => t.classification === args.classification);
    }
    if (args.level) {
      teachers = teachers.filter((t) => t.level === args.level);
    }
    if (args.gender) {
      teachers = teachers.filter((t) => t.gender === args.gender);
    }
    if (args.searchQuery) {
      const queryLower = args.searchQuery.toLowerCase();
      teachers = teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(queryLower) ||
          t.personalId.includes(queryLower) ||
          t.employeeId.includes(queryLower) ||
          t.schoolName.toLowerCase().includes(queryLower)
      );
    }

    return teachers;
  },
});

// البحث عن معلم/منسق بالاسم وإعادة رقم هاتفه (لزر WhatsApp في الاستمارات)
export const getPhone = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    function normStr(s: string) {
      return (s ?? "").replace(/\xa0/g, " ").replace(/ـ/g, "")
        .replace(/[ً-ْٰ]/g, "")
        .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
        .replace(/\s+/g, " ").trim();
    }
    const target = normStr(args.name);
    const all = await ctx.db.query("teachers").collect();
    // مطابقة تامة أولاً
    const exact = all.find((t) => normStr(t.name) === target || normStr(t.nameKey) === target);
    if (exact) return { name: exact.name, mobile: exact.mobile, email: exact.email, jobTitle: exact.jobTitle };
    // مطابقة جزئية: أكبر عدد كلمات مشتركة
    const targetWords = new Set(target.split(" ").filter((w) => w.length > 1));
    let best: typeof all[0] | null = null;
    let bestScore = 0;
    for (const t of all) {
      const score = normStr(t.name).split(" ").filter((w) => targetWords.has(w)).length;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (best && bestScore >= 2) return { name: best.name, mobile: best.mobile, email: best.email, jobTitle: best.jobTitle };
    return null;
  },
});

// جلب معلمي مدرسة معينة بالاسم (للنقر على عدد المعلمين في صفحة المدارس)
export const bySchoolName = query({
  args: { schoolName: v.string() },
  handler: async (ctx, args) => {
    function normStr(s: string) {
      return (s ?? "").replace(/\s+/g, " ").trim()
        .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
        .replace(/ة/g, "ه").replace(/[ً-ْٰ]/g, "");
    }
    const target = normStr(args.schoolName);
    const all = await ctx.db.query("teachers").collect();
    return all
      .filter((t) => normStr(t.schoolName) === target)
      .sort((a, b) => {
        // المنسقون أولاً ثم المعلمون
        const ac = (a.jobTitle ?? "").startsWith("منسق") ? 0 : 1;
        const bc = (b.jobTitle ?? "").startsWith("منسق") ? 0 : 1;
        return ac - bc || a.name.localeCompare(b.name, "ar");
      });
  },
});

// إضافة معلم جديد
export const create = mutation({
  args: {
    schoolCode: v.string(),
    schoolName: v.string(),
    level: v.string(),
    supervisorName: v.string(),
    name: v.string(),
    jobTitle: v.string(),
    classification: v.string(),
    personalId: v.string(),
    employeeId: v.string(),
    joinDate: v.optional(v.string()),
    gender: v.union(v.literal("male"), v.literal("female")),
    nationality: v.string(),
    mobile: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // التحقق من تكرار الرقم الشخصي أو الوظيفي
    const existingPersonal = await ctx.db
      .query("teachers")
      .withIndex("by_personal_id", (q) => q.eq("personalId", args.personalId))
      .first();
    if (existingPersonal) {
      throw new Error("الرقم الشخصي مسجل بالفعل لمعلم آخر");
    }

    const nameKey = args.name.trim().replace(/\s+/g, "_");
    const data = {
      ...args,
      nameKey,
      isActive: true,
    };
    return ctx.db.insert("teachers", data);
  },
});

// تعديل بيانات معلم
export const update = mutation({
  args: {
    id: v.id("teachers"),
    schoolCode: v.string(),
    schoolName: v.string(),
    level: v.string(),
    supervisorName: v.string(),
    name: v.string(),
    jobTitle: v.string(),
    classification: v.string(),
    personalId: v.string(),
    employeeId: v.string(),
    joinDate: v.optional(v.string()),
    gender: v.union(v.literal("male"), v.literal("female")),
    nationality: v.string(),
    mobile: v.string(),
    email: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const nameKey = args.name.trim().replace(/\s+/g, "_");
    await ctx.db.patch(id, {
      ...data,
      nameKey,
    });
    return id;
  },
});

// حذف معلم
export const remove = mutation({
  args: {
    id: v.id("teachers"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

// استيراد جماعي للمعلمين من الإكسيل (Bulk Upsert)
export const bulkImport = mutation({
  args: {
    teachers: v.array(
      v.object({
        schoolCode: v.string(),
        schoolName: v.string(),
        level: v.string(),
        supervisorName: v.string(),
        name: v.string(),
        jobTitle: v.string(),
        classification: v.string(),
        personalId: v.string(),
        employeeId: v.string(),
        joinDate: v.optional(v.string()),
        gender: v.union(v.literal("male"), v.literal("female")),
        nationality: v.string(),
        mobile: v.string(),
        email: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let importedCount = 0;
    for (const teacher of args.teachers) {
      const nameKey = teacher.name.trim().replace(/\s+/g, "_");
      const existing = await ctx.db
        .query("teachers")
        .withIndex("by_personal_id", (q) => q.eq("personalId", teacher.personalId))
        .first();

      const data = {
        ...teacher,
        nameKey,
        isActive: true,
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("teachers", data);
      }
      importedCount++;
    }
    return importedCount;
  },
});
