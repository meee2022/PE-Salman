import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// الحصول على المعلمين مع خيارات البحث والتصفية الفورية
export const list = query({
  args: {
    supervisorName: v.optional(v.string()),
    classification: v.optional(v.string()),
    level: v.optional(v.string()),
    gender: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let teachers = await ctx.db.query("teachers").collect();

    if (args.supervisorName) {
      teachers = teachers.filter((t) => t.supervisorName === args.supervisorName);
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
