import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminMutation, getAuthUser, canSeeAll } from "./permissions";

const GENDER = v.union(v.literal("male"), v.literal("female"), v.literal("both"));
const STAGE  = v.union(v.literal("primary"), v.literal("middle"), v.literal("secondary"), v.literal("all"), v.literal("model"));
const TYPE   = v.union(v.literal("department"), v.literal("school"));

// ── قراءة ──────────────────────────────────────────────────────────
export const listByYear = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    return ctx.db
      .query("activityPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.academicYear))
      .order("asc")
      .collect();
  },
});

// ── إضافة ──────────────────────────────────────────────────────────
export const create = mutation({
  args: {
    organizer:    v.string(),
    activityName: v.string(),
    partnership:  v.optional(v.string()),
    dateText:     v.string(),
    gender:       GENDER,
    stage:        STAGE,
    type:         TYPE,
    academicYear: v.string(),
    notes:        v.optional(v.string()),
    token:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    // اعطِ seq تلقائياً
    const all = await ctx.db
      .query("activityPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.academicYear))
      .collect();
    const maxSeq = all.length ? Math.max(...all.map(r => r.seq)) : 0;
    return ctx.db.insert("activityPlans", {
      seq: maxSeq + 1,
      organizer: args.organizer.trim(),
      activityName: args.activityName.trim(),
      partnership: args.partnership?.trim() || undefined,
      dateText: args.dateText.trim(),
      gender: args.gender,
      stage: args.stage,
      type: args.type,
      academicYear: args.academicYear,
      notes: args.notes?.trim() || undefined,
    });
  },
});

// ── تعديل ──────────────────────────────────────────────────────────
export const update = mutation({
  args: {
    id:           v.id("activityPlans"),
    organizer:    v.string(),
    activityName: v.string(),
    partnership:  v.optional(v.string()),
    dateText:     v.string(),
    gender:       GENDER,
    stage:        STAGE,
    type:         TYPE,
    notes:        v.optional(v.string()),
    token:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("السجل غير موجود");
    await ctx.db.patch(args.id, {
      organizer:    args.organizer.trim(),
      activityName: args.activityName.trim(),
      partnership:  args.partnership?.trim() || undefined,
      dateText:     args.dateText.trim(),
      gender:       args.gender,
      stage:        args.stage,
      type:         args.type,
      notes:        args.notes?.trim() || undefined,
    });
  },
});

// ── حذف ────────────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("activityPlans"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    await ctx.db.delete(args.id);
  },
});

// ── استيراد جماعي (مسح + إضافة) ───────────────────────────────────
export const bulkSeed = mutation({
  args: {
    academicYear: v.string(),
    items: v.array(v.object({
      seq:          v.number(),
      organizer:    v.string(),
      activityName: v.string(),
      partnership:  v.optional(v.string()),
      dateText:     v.string(),
      gender:       GENDER,
      stage:        STAGE,
      type:         TYPE,
    })),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    // مسح السنة أولاً
    const existing = await ctx.db
      .query("activityPlans")
      .withIndex("by_year", q => q.eq("academicYear", args.academicYear))
      .collect();
    for (const r of existing) await ctx.db.delete(r._id);
    // إضافة الجديد
    for (const item of args.items) {
      await ctx.db.insert("activityPlans", { ...item, academicYear: args.academicYear });
    }
    return { deleted: existing.length, inserted: args.items.length };
  },
});
