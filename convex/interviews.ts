import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, isAdmin, requireAdminMutation } from "./permissions";

// عرض المقابلات (PII) — للأدمن فقط؛ غير الأدمن لا يحصل على شيء
export const list = query({
  args: {
    interviewDate: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!isAdmin(user)) return null; // ممنوع لغير الأدمن

    let rows = await ctx.db.query("interviews").collect();
    if (args.interviewDate)
      rows = rows.filter((r) => r.interviewDate === args.interviewDate);
    return rows;
  },
});

export const upsert = mutation({
  args: {
    token: v.string(),
    personalId: v.string(),
    name: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    nationality: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    phone: v.optional(v.string()),
    appointment: v.optional(v.string()),
    interviewDate: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    scorePersonal: v.optional(v.number()),
    scoreScientific: v.optional(v.number()),
    scorePlanning: v.optional(v.number()),
    scoreLeadership: v.optional(v.number()),
    scoreTotal: v.optional(v.number()),
    committeeRecommendation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // التحقق من صلاحية الأدمن
    await requireAdminMutation(ctx, args.token);

    const existing = await ctx.db
      .query("interviews")
      .collect()
      .then((rows) => rows.find((r) => r.personalId === args.personalId));

    const { token, ...dataWithoutToken } = args;
    const data = { ...dataWithoutToken, sensitive: true };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert("interviews", data);
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    // التحقق من صلاحية الأدمن
    await requireAdminMutation(ctx, args.token);

    await ctx.db.delete(args.id);
    return true;
  },
});

