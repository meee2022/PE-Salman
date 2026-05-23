import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, requireAdminMutation, logAudit } from "./permissions";

// تنقيح الاسم لمفاتيح الربط
function normName(s: string): string {
  return String(s).replace(/\xa0/g, " ").replace(/ـ/g, "")
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ").trim();
}
function shortKeyOf(s: string): string {
  const n = normName(s); const p = n.split(" ");
  return p.length >= 2 ? `${p[0]} ${p[p.length - 1]}` : n;
}

const GENDER = v.union(v.literal("male"), v.literal("female"));

export const list = query({
  args: { includeInactive: v.optional(v.boolean()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    const all = await ctx.db.query("supervisors").collect();
    const active = args.includeInactive ? all : all.filter((s) => s.isActive);
    // الموجه لا يرى إلا نفسه
    if (!canSeeAll(user)) return active.filter((s) => s._id === user.supervisorId);
    return active;
  },
});

export const get = query({
  args: { id: v.id("supervisors") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getByShortKey = query({
  args: { shortKey: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("supervisors")
      .withIndex("by_short_key", (q) => q.eq("shortKey", args.shortKey))
      .first(),
});

// كل تفاصيل موجه واحد في سنة دراسية: الملف + التغطية + الأكواد + الاستمارات + المدارس
export const detail = query({
  args: { id: v.id("supervisors"), academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return null;
    // الموجه لا يفتح إلا ملفه؛ الأدمن/المشاهد يفتح أي ملف
    if (!canSeeAll(user) && user.supervisorId !== args.id) return null;

    const supervisor = await ctx.db.get(args.id);
    if (!supervisor) return null;

    const coverage = await ctx.db
      .query("coverageKpis")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.id).eq("academicYear", args.academicYear))
      .first();

    const activity = await ctx.db
      .query("activitySummaries")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.id).eq("academicYear", args.academicYear))
      .first();

    const formTotals = await ctx.db
      .query("formTotals")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.id).eq("academicYear", args.academicYear))
      .first();

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.id).eq("academicYear", args.academicYear))
      .collect();

    const schools = await Promise.all(assignments.map((a) => ctx.db.get(a.schoolId)));

    // الاستمارات الحية المدخلة عبر الموقع
    const allSupForms = await ctx.db
      .query("coordinatorForms")
      .withIndex("by_supervisor", (q) => q.eq("supervisorId", args.id))
      .collect();
    const liveFormsList = allSupForms
      .filter((f) => f.academicYear === args.academicYear)
      .sort((a, b) => b.createdAt - a.createdAt);
    const liveFormsCount = liveFormsList.length;
    const liveFormsSubmitted = liveFormsList.filter((f) => f.status === "submitted").length;

    return {
      supervisor,
      coverage,
      activity,
      formTotals,
      schools: schools.filter(Boolean),
      liveFormsList,
      liveFormsCount,
      liveFormsSubmitted,
    };
  },
});

export const upsert = mutation({
  args: {
    seq: v.number(),
    personalId: v.string(),
    jobNumber: v.string(),
    name: v.string(),
    nameKey: v.string(),
    shortKey: v.string(),
    jobTitle: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    officePhone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.optional(v.string()),
    poBox: v.optional(v.string()),
    residence: v.optional(v.string()),
    nationality: v.optional(v.string()),
    contractType: v.optional(v.string()),
    jobCategory: v.optional(v.string()),
    joinDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("supervisors")
      .withIndex("by_short_key", (q) => q.eq("shortKey", args.shortKey))
      .first();
    const data = { ...args, isActive: args.isActive ?? true };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert("supervisors", data);
  },
});

// ── إضافة موجه يدويًا من الموقع — للأدمن ──────────────────────────
export const create = mutation({
  args: {
    name: v.string(),
    gender: GENDER,
    jobTitle: v.optional(v.string()),
    email: v.optional(v.string()),
    officePhone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    jobNumber: v.optional(v.string()),
    personalId: v.optional(v.string()),
    nationality: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const all = await ctx.db.query("supervisors").collect();
    const seq = all.reduce((m, s) => Math.max(m, s.seq), 0) + 1;
    const id = await ctx.db.insert("supervisors", {
      seq,
      personalId: args.personalId ?? "",
      jobNumber: args.jobNumber ?? "",
      name: args.name.trim(),
      nameKey: normName(args.name),
      shortKey: shortKeyOf(args.name),
      jobTitle: args.jobTitle ?? "موجه تربية بدنية",
      gender: args.gender,
      officePhone: args.officePhone || undefined,
      mobile: args.mobile || undefined,
      email: args.email || undefined,
      nationality: args.nationality || undefined,
      isActive: true,
    });
    await logAudit(ctx, admin, "create", "supervisor", id, `إضافة موجه: ${args.name}`);
    return id;
  },
});

// ── تعديل بيانات موجه — للأدمن ────────────────────────────────────
export const update = mutation({
  args: {
    id: v.id("supervisors"),
    name: v.string(),
    gender: GENDER,
    jobTitle: v.optional(v.string()),
    email: v.optional(v.string()),
    officePhone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    jobNumber: v.optional(v.string()),
    personalId: v.optional(v.string()),
    nationality: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      nameKey: normName(args.name),
      shortKey: shortKeyOf(args.name),
      gender: args.gender,
      jobTitle: args.jobTitle ?? "موجه تربية بدنية",
      email: args.email || undefined,
      officePhone: args.officePhone || undefined,
      mobile: args.mobile || undefined,
      jobNumber: args.jobNumber ?? "",
      personalId: args.personalId ?? "",
      nationality: args.nationality || undefined,
    });
    await logAudit(ctx, admin, "update", "supervisor", args.id, `تعديل موجه: ${args.name}`);
  },
});

// ── أرشفة/تفعيل — للأدمن ──────────────────────────────────────────
export const setActive = mutation({
  args: { id: v.id("supervisors"), isActive: v.boolean(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    await ctx.db.patch(args.id, { isActive: args.isActive });
    const s = await ctx.db.get(args.id);
    await logAudit(ctx, admin, "update", "supervisor", args.id,
      `${args.isActive ? "تفعيل" : "أرشفة"} موجه: ${s?.name ?? ""}`);
  },
});

// ── حذف نهائي — للأدمن (يمنع الحذف إن كان عليه إسنادات) ───────────
export const remove = mutation({
  args: { id: v.id("supervisors"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const assigned = await ctx.db
      .query("assignments")
      .withIndex("by_supervisor_year", (q) => q.eq("supervisorId", args.id))
      .first();
    if (assigned) throw new Error("لا يمكن الحذف: للموجه مدارس مسندة. أرشِفه بدلًا من ذلك أو انقل مدارسه أولًا.");
    const s = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    await logAudit(ctx, admin, "delete", "supervisor", args.id, `حذف موجه: ${s?.name ?? ""}`);
  },
});
