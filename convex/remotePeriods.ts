import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, requireAdminMutation, logAudit } from "./permissions";

// ── قراءة فترات سنة دراسية ────────────────────────────────────────
export const list = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    const rows = await ctx.db
      .query("remoteLearningPeriods")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
});

// ── إنشاء فترة ────────────────────────────────────────────────────
export const create = mutation({
  args: {
    name: v.string(),
    reason: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    isActive: v.boolean(),
    scope: v.union(v.literal("all"), v.literal("selected")),
    schoolIds: v.optional(v.array(v.id("schools"))),
    supervisorIds: v.optional(v.array(v.id("supervisors"))),
    requiredPerSupervisor: v.optional(v.number()),
    academicYear: v.string(),
    notes: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const { token, ...data } = args;
    const id = await ctx.db.insert("remoteLearningPeriods", {
      ...data,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
    await logAudit(ctx, admin, "create", "remotePeriod", id, `إنشاء فترة تعلم عن بعد: ${args.name}`);
    return id;
  },
});

// ── تعديل فترة ────────────────────────────────────────────────────
export const update = mutation({
  args: {
    id: v.id("remoteLearningPeriods"),
    name: v.string(),
    reason: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    isActive: v.boolean(),
    scope: v.union(v.literal("all"), v.literal("selected")),
    schoolIds: v.optional(v.array(v.id("schools"))),
    supervisorIds: v.optional(v.array(v.id("supervisors"))),
    requiredPerSupervisor: v.optional(v.number()),
    notes: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const { id, token, ...data } = args;
    await ctx.db.patch(id, data);
    await logAudit(ctx, admin, "update", "remotePeriod", id, `تعديل فترة: ${args.name}`);
  },
});

// ── تفعيل/إيقاف ───────────────────────────────────────────────────
export const toggleActive = mutation({
  args: { id: v.id("remoteLearningPeriods"), isActive: v.boolean(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    await ctx.db.patch(args.id, { isActive: args.isActive });
    const p = await ctx.db.get(args.id);
    await logAudit(ctx, admin, "update", "remotePeriod", args.id,
      `${args.isActive ? "تفعيل" : "إيقاف"} فترة: ${p?.name ?? ""}`);
  },
});

// ── حذف ───────────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("remoteLearningPeriods"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const p = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    await logAudit(ctx, admin, "delete", "remotePeriod", args.id, `حذف فترة: ${p?.name ?? ""}`);
  },
});
