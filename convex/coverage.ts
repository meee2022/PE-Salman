import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, requireAdminMutation, logAudit } from "./permissions";

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}
function computeStatus(covPct: number, formsPct: number): string {
  if (covPct >= 100 && formsPct >= 300) return "🏆متميز";
  if (covPct >= 100 && formsPct >= 200) return "✅ممتاز";
  if (covPct >= 100) return "✅مكتمل";
  return "⚠️قريب";
}

export const listByYear = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    const rows = await ctx.db
      .query("coverageKpis")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();

    // احسب عدد الاستمارات الحية (coordinatorForms) لكل موجه لهذا العام
    const liveForms = await ctx.db
      .query("coordinatorForms")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    const liveCountMap = new Map<string, number>();
    for (const f of liveForms) {
      liveCountMap.set(f.supervisorId, (liveCountMap.get(f.supervisorId) ?? 0) + 1);
    }

    return Promise.all(
      rows.map(async (r) => {
        const liveFormsCount = liveCountMap.get(r.supervisorId) ?? 0;
        // formsCount = أكبر قيمة بين الرقم اليدوي والاستمارات الحية
        const effectiveFormsCount = Math.max(r.formsCount, liveFormsCount);
        return {
          ...r,
          formsCount: effectiveFormsCount,
          liveFormsCount,
          supervisor: await ctx.db.get(r.supervisorId),
        };
      })
    );
  },
});

export const upsert = mutation({
  args: {
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    schoolsRequired: v.number(),
    schoolsCovered: v.number(),
    formsCount: v.number(),
    coverageRate: v.number(),
    formsRate: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("coverageKpis")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return ctx.db.insert("coverageKpis", args);
  },
});

// ── تعديل مؤشر تغطية موجه (يعيد حساب النِّسب والحالة) — للأدمن ─────
export const updateKpi = mutation({
  args: {
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    schoolsRequired: v.optional(v.number()),
    schoolsCovered: v.optional(v.number()),
    formsCount: v.optional(v.number()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const ex = await ctx.db.query("coverageKpis")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear))
      .first();
    const required = args.schoolsRequired ?? ex?.schoolsRequired ?? 0;
    const covered = args.schoolsCovered ?? ex?.schoolsCovered ?? 0;
    const forms = args.formsCount ?? ex?.formsCount ?? 0;
    const coverageRate = pct(covered, required);
    const formsRate = pct(forms, required);
    const data = { supervisorId: args.supervisorId, academicYear: args.academicYear,
      schoolsRequired: required, schoolsCovered: covered, formsCount: forms,
      coverageRate, formsRate, status: computeStatus(coverageRate, formsRate) };
    const sup = await ctx.db.get(args.supervisorId);
    if (ex) {
      await ctx.db.patch(ex._id, data);
      await logAudit(ctx, admin, "update", "coverageKpi", ex._id,
        `تعديل تغطية ${sup?.name ?? ""}: مطلوب=${required} مغطّى=${covered} استمارات=${forms}`);
      return ex._id;
    }
    const id = await ctx.db.insert("coverageKpis", data);
    await logAudit(ctx, admin, "create", "coverageKpi", id, `إضافة تغطية لـ${sup?.name ?? ""}`);
    return id;
  },
});

// ── ضبط المطلوب للجميع — للأدمن ───────────────────────────────────
export const setRequiredForAll = mutation({
  args: { academicYear: v.string(), required: v.number(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const rows = await ctx.db.query("coverageKpis")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear)).collect();
    for (const r of rows) {
      const coverageRate = pct(r.schoolsCovered, args.required);
      const formsRate = pct(r.formsCount, args.required);
      await ctx.db.patch(r._id, { schoolsRequired: args.required, coverageRate, formsRate,
        status: computeStatus(coverageRate, formsRate) });
    }
    await logAudit(ctx, admin, "update", "coverageKpi", undefined,
      `ضبط المطلوب للجميع = ${args.required} (${rows.length} موجه)`);
    return rows.length;
  },
});

export const upsertFormTotals = mutation({
  args: {
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    totalVisits: v.number(),
    classroomVisits: v.number(),
    examApproval: v.number(),
    schoolsCount: v.number(),
    examJudging: v.number(),
    coordinatorFollowup: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("formTotals")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return ctx.db.insert("formTotals", args);
  },
});
