import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll } from "./permissions";

// مسح ثم استيراد زيارات المدارس لسنة (للاستيراد من ملف الإكسيل)
export const clearAndBulkImport = mutation({
  args: {
    academicYear: v.string(),
    rows: v.array(
      v.object({
        supervisorId: v.id("supervisors"),
        schoolName: v.string(),
        schoolNameKey: v.string(),
        total: v.number(),
        teacherForms: v.number(),
        examApproval: v.number(),
        examFollow: v.number(),
        coordForms: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("schoolVisits")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);
    for (const r of args.rows) {
      await ctx.db.insert("schoolVisits", { academicYear: args.academicYear, ...r });
    }
    return { deleted: existing.length, inserted: args.rows.length };
  },
});

// زيارات موجه معيّن حسب المدرسة
export const bySupervisor = query({
  args: { supervisorId: v.id("supervisors"), academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    if (!canSeeAll(user) && user.supervisorId !== args.supervisorId) return [];
    return ctx.db
      .query("schoolVisits")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear))
      .collect();
  },
});
