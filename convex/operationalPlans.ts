import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminMutation, getAuthUser } from "./permissions";

// ── قراءة كل بنود سنة ───────────────────────────────────────────────
export const listByYear = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    const rows = await ctx.db
      .query("operationalPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.academicYear))
      .collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

// ── السنوات المتوفّرة ───────────────────────────────────────────────
export const years = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    const all = await ctx.db.query("operationalPlans").collect();
    return Array.from(new Set(all.map(r => r.academicYear))).sort().reverse();
  },
});

// ── إضافة بند ───────────────────────────────────────────────────────
export const create = mutation({
  args: {
    academicYear:   v.string(),
    domain:         v.string(),
    domainOrder:    v.number(),
    objective:      v.string(),
    objectiveOrder: v.number(),
    action:         v.string(),
    endDate:        v.string(),
    responsible:    v.string(),
    outputs:        v.string(),
    kpi:            v.string(),
    token:          v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const all = await ctx.db
      .query("operationalPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.academicYear))
      .collect();
    const maxOrder = all.length ? Math.max(...all.map(r => r.order)) : 0;
    const { token, ...data } = args;
    return ctx.db.insert("operationalPlans", { ...data, order: maxOrder + 1 });
  },
});

// ── تعديل بند ───────────────────────────────────────────────────────
export const update = mutation({
  args: {
    id:             v.id("operationalPlans"),
    domain:         v.string(),
    objective:      v.string(),
    action:         v.string(),
    endDate:        v.string(),
    responsible:    v.string(),
    outputs:        v.string(),
    kpi:            v.string(),
    token:          v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const { id, token, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// ── حذف بند ─────────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("operationalPlans"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    await ctx.db.delete(args.id);
  },
});

// ── استيراد جماعي (مسح السنة + إضافة) ──────────────────────────────
export const bulkSeed = mutation({
  args: {
    academicYear: v.string(),
    items: v.array(v.object({
      domain:         v.string(),
      domainOrder:    v.number(),
      objective:      v.string(),
      objectiveOrder: v.number(),
      action:         v.string(),
      endDate:        v.string(),
      responsible:    v.string(),
      outputs:        v.string(),
      kpi:            v.string(),
    })),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const existing = await ctx.db
      .query("operationalPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.academicYear))
      .collect();
    for (const r of existing) await ctx.db.delete(r._id);
    let order = 0;
    for (const item of args.items) {
      await ctx.db.insert("operationalPlans", {
        ...item,
        academicYear: args.academicYear,
        order: ++order,
      });
    }
    return { deleted: existing.length, inserted: args.items.length };
  },
});

// ── نسخ خطة سنة إلى سنة جديدة (نفس البنود لإعادة التعبئة) ───────────
export const copyYear = mutation({
  args: {
    fromYear: v.string(),
    toYear:   v.string(),
    clearDates: v.optional(v.boolean()), // تفريغ التواريخ للتعبئة من جديد
    token:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    // امنع الكتابة فوق سنة فيها بيانات
    const exists = await ctx.db
      .query("operationalPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.toYear))
      .first();
    if (exists) throw new Error(`السنة ${args.toYear} تحتوي على خطة بالفعل`);

    const source = await ctx.db
      .query("operationalPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.fromYear))
      .collect();
    source.sort((a, b) => a.order - b.order);

    for (const r of source) {
      await ctx.db.insert("operationalPlans", {
        academicYear:   args.toYear,
        domain:         r.domain,
        domainOrder:    r.domainOrder,
        objective:      r.objective,
        objectiveOrder: r.objectiveOrder,
        action:         r.action,
        endDate:        args.clearDates ? "" : r.endDate,
        responsible:    r.responsible,
        outputs:        r.outputs,
        kpi:            args.clearDates ? "" : r.kpi,
        order:          r.order,
      });
    }
    return { copied: source.length };
  },
});
