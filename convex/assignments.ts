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
