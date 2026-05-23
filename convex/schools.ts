import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, requireAdminMutation, logAudit } from "./permissions";

function normName(s: string): string {
  return String(s).replace(/\xa0/g, " ").replace(/ـ/g, "")
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ").trim();
}
const GENDER = v.union(v.literal("male"), v.literal("female"));

export const list = query({
  args: {
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    academicYear: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];  // الموجه يرى مدارسه عبر صفحة ملفه فقط
    let schools = await ctx.db.query("schools").collect();
    schools = schools.filter((s) => s.isActive);
    if (args.gender) schools = schools.filter((s) => s.gender === args.gender);

    if (!args.academicYear) return schools;

    // الحاق الموجه الحالي لكل مدرسة
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear!))
      .collect();

    const assignMap = new Map(assignments.map((a) => [a.schoolId, a.supervisorId]));

    return Promise.all(
      schools.map(async (school) => {
        const supId = assignMap.get(school._id);
        const supervisor = supId ? await ctx.db.get(supId) : null;
        return { ...school, supervisor: supervisor ?? null };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("schools") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const upsert = mutation({
  args: {
    name: v.string(),
    nameKey: v.string(),
    level: v.optional(v.string()),
    gender: v.union(v.literal("male"), v.literal("female")),
    teachers: v.optional(v.number()),
    coordinators: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("schools")
      .withIndex("by_name_key", (q) => q.eq("nameKey", args.nameKey))
      .first();
    const data = { ...args, isActive: args.isActive ?? true };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert("schools", data);
  },
});

// ── خيارات المدارس (أسماء فقط) لأي مستخدم مسجّل — للقوائم المنسدلة ──
export const options = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    const all = await ctx.db.query("schools").collect();
    return all.filter((s) => s.isActive)
      .map((s) => ({ id: s._id, name: s.name, gender: s.gender }))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  },
});

// ── إضافة مدرسة — للأدمن ──────────────────────────────────────────
export const create = mutation({
  args: {
    name: v.string(), gender: GENDER, level: v.optional(v.string()),
    teachers: v.optional(v.number()), coordinators: v.optional(v.number()),
    notes: v.optional(v.string()), token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const id = await ctx.db.insert("schools", {
      name: args.name.trim(),
      nameKey: normName(args.name),
      gender: args.gender,
      level: args.level || undefined,
      teachers: args.teachers,
      coordinators: args.coordinators,
      notes: args.notes || undefined,
      isActive: true,
    });
    await logAudit(ctx, admin, "create", "school", id, `إضافة مدرسة: ${args.name}`);
    return id;
  },
});

// ── تعديل مدرسة — للأدمن ──────────────────────────────────────────
export const update = mutation({
  args: {
    id: v.id("schools"),
    name: v.string(), gender: GENDER, level: v.optional(v.string()),
    teachers: v.optional(v.number()), coordinators: v.optional(v.number()),
    notes: v.optional(v.string()), token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      nameKey: normName(args.name),
      gender: args.gender,
      level: args.level || undefined,
      teachers: args.teachers,
      coordinators: args.coordinators,
      notes: args.notes || undefined,
    });
    await logAudit(ctx, admin, "update", "school", args.id, `تعديل مدرسة: ${args.name}`);
  },
});

// ── حذف مدرسة — للأدمن (يحذف إسناداتها أيضًا) ─────────────────────
export const remove = mutation({
  args: { id: v.id("schools"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const sc = await ctx.db.get(args.id);
    const asg = await ctx.db
      .query("assignments")
      .withIndex("by_school_year", (q) => q.eq("schoolId", args.id))
      .collect();
    for (const a of asg) await ctx.db.delete(a._id);
    await ctx.db.delete(args.id);
    await logAudit(ctx, admin, "delete", "school", args.id, `حذف مدرسة: ${sc?.name ?? ""}`);
  },
});
