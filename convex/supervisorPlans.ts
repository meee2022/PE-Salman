import { mutation } from "./_generated/server";
import { v } from "convex/values";

const planRow = v.object({
  supervisorId: v.id("supervisors"),
  coordSelfDev: v.number(),
  coordGeneral: v.number(),
  coordIntensive: v.number(),
  coordNew: v.number(),
  coordNone: v.number(),
  teachersTotal: v.number(),
  teachIntensive: v.number(),
  teachGeneral: v.number(),
  teachSelfDev: v.number(),
  teachNew: v.number(),
});

// مسح ثم استيراد خطط الموجهين لسنة (من ملف خطة الموجة)
export const clearAndBulkImport = mutation({
  args: { academicYear: v.string(), rows: v.array(planRow) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("supervisorPlans")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);
    for (const r of args.rows) {
      await ctx.db.insert("supervisorPlans", { academicYear: args.academicYear, ...r });
    }
    return { deleted: existing.length, inserted: args.rows.length };
  },
});
