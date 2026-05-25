import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll } from "./permissions";

// عدد التنبيهات النشطة (للشارة في الهيدر)
export const count = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return 0;
    const kpis = await ctx.db
      .query("coverageKpis")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    const active = kpis.filter((r) => r.schoolsRequired > 0);
    const lowCoverage = active.filter((r) => r.coverageRate < 30).length;
    const noForms     = active.filter((r) => r.formsCount === 0).length;
    // نحسب التنبيهات الفريدة (موجه واحد يمكن أن يكون له تنبيهان)
    const uniqueIds = new Set([
      ...active.filter((r) => r.coverageRate < 30).map((r) => r._id),
      ...active.filter((r) => r.formsCount === 0).map((r) => r._id),
    ]);
    return uniqueIds.size;
  },
});

// قائمة التنبيهات التفصيلية
export const list = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    const kpis = await ctx.db
      .query("coverageKpis")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    const active = kpis.filter((r) => r.schoolsRequired > 0);
    const alerts: {
      type: "low_coverage" | "no_forms";
      supervisorId: string;
      supervisorName: string;
      coverageRate: number;
      formsCount: number;
    }[] = [];

    for (const r of active) {
      const sup = await ctx.db.get(r.supervisorId);
      if (!sup) continue;
      if (r.coverageRate < 30) {
        alerts.push({
          type: "low_coverage",
          supervisorId: r.supervisorId,
          supervisorName: sup.name,
          coverageRate: r.coverageRate,
          formsCount: r.formsCount,
        });
      }
      if (r.formsCount === 0) {
        alerts.push({
          type: "no_forms",
          supervisorId: r.supervisorId,
          supervisorName: sup.name,
          coverageRate: r.coverageRate,
          formsCount: r.formsCount,
        });
      }
    }
    return alerts;
  },
});
