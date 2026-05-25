import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, logAudit } from "./permissions";
import { Doc } from "./_generated/dataModel";

function ownsOrAll(user: Doc<"users"> | null, supervisorId: string) {
  if (!user) return false;
  if (canSeeAll(user)) return true;
  return user.role === "supervisor" && user.supervisorId === supervisorId;
}

export const list = query({
  args: { academicYear: v.optional(v.string()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    let rows;
    if (canSeeAll(user)) {
      rows = args.academicYear
        ? await ctx.db.query("profLicenseForms").withIndex("by_year", (q) => q.eq("academicYear", args.academicYear!)).collect()
        : await ctx.db.query("profLicenseForms").collect();
    } else if (user.role === "supervisor" && user.supervisorId) {
      rows = await ctx.db.query("profLicenseForms").withIndex("by_supervisor", (q) => q.eq("supervisorId", user.supervisorId!)).collect();
    } else return [];
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("profLicenseForms"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) return null;
    return form;
  },
});

export const notesBank = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    const rows = await ctx.db.query("profLicenseForms").collect();
    const set = new Set<string>();
    for (const f of rows) {
      for (const arr of (f.teachingNotes ?? [])) for (const n of arr) { const t = n.trim(); if (t) set.add(t); }
      for (const arr of (f.coordinationNotes ?? [])) for (const n of arr) { const t = n.trim(); if (t) set.add(t); }
      for (const n of (f.generalNotes ?? [])) { const t = n.trim(); if (t) set.add(t); }
    }
    return Array.from(set);
  },
});

export const create = mutation({
  args: {
    supervisorId: v.optional(v.id("supervisors")),
    schoolId: v.optional(v.id("schools")),
    schoolName: v.string(),
    teacherName: v.string(),
    teacherRole: v.string(),
    formVariant: v.string(),
    attempt: v.string(),
    term: v.string(),
    date: v.string(),
    academicYear: v.string(),
    level: v.string(),
    teachingScores: v.array(v.object({
      standard: v.string(),
      evaluator1: v.array(v.number()),
      evaluator2: v.array(v.number()),
      evaluator3: v.array(v.number()),
    })),
    coordinationScores: v.optional(v.array(v.object({
      standard: v.string(),
      evaluator1: v.array(v.number()),
      evaluator2: v.array(v.number()),
    }))),
    teachingNotes: v.optional(v.array(v.array(v.string()))),
    coordinationNotes: v.optional(v.array(v.array(v.string()))),
    generalNotes: v.optional(v.array(v.string())),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) throw new Error("غير مصرّح");
    let supervisorId = args.supervisorId;
    if (user.role === "supervisor") supervisorId = user.supervisorId;
    if (!supervisorId) throw new Error("يجب تحديد الموجه");
    if (!canSeeAll(user) && user.supervisorId !== supervisorId) throw new Error("غير مصرّح");
    const sup = await ctx.db.get(supervisorId);
    const id = await ctx.db.insert("profLicenseForms", {
      supervisorId, supervisorName: sup?.name ?? "",
      schoolId: args.schoolId, schoolName: args.schoolName,
      teacherName: args.teacherName, teacherRole: args.teacherRole,
      formVariant: args.formVariant, attempt: args.attempt,
      term: args.term, date: args.date, academicYear: args.academicYear, level: args.level,
      teachingScores: args.teachingScores,
      coordinationScores: args.coordinationScores,
      teachingNotes: args.teachingNotes ?? [],
      coordinationNotes: args.coordinationNotes ?? [],
      generalNotes: args.generalNotes ?? [],
      status: "draft", createdBy: user._id, createdAt: Date.now(),
    });
    await logAudit(ctx, user, "create", "profLicenseForm", id, `إنشاء استمارة رخصة مهنية: ${args.teacherName} — ${args.schoolName}`);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("profLicenseForms"),
    schoolName: v.string(),
    teacherName: v.string(),
    level: v.string(),
    evaluator1Name: v.optional(v.string()),
    evaluator2Name: v.optional(v.string()),
    evaluator3Name: v.optional(v.string()),
    teachingScores: v.array(v.object({
      standard: v.string(),
      evaluator1: v.array(v.number()),
      evaluator2: v.array(v.number()),
      evaluator3: v.array(v.number()),
    })),
    coordinationScores: v.optional(v.array(v.object({
      standard: v.string(),
      evaluator1: v.array(v.number()),
      evaluator2: v.array(v.number()),
    }))),
    teachingNotes: v.optional(v.array(v.array(v.string()))),
    coordinationNotes: v.optional(v.array(v.array(v.string()))),
    generalNotes: v.optional(v.array(v.string())),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    if (form.status === "submitted") throw new Error("الاستمارة مُعتمدة ولا يمكن تعديلها");
    const { id, token, ...data } = args;
    await ctx.db.patch(id, data);
    await logAudit(ctx, user, "update", "profLicenseForm", id, `تعديل استمارة رخصة مهنية: ${args.teacherName}`);
  },
});

export const sign = mutation({
  args: {
    id: v.id("profLicenseForms"),
    supervisorSignature: v.optional(v.string()),
    teacherSignature: v.optional(v.string()),
    submit: v.optional(v.boolean()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    const patch: Record<string, unknown> = {};
    if (args.supervisorSignature !== undefined) patch.supervisorSignature = args.supervisorSignature;
    if (args.teacherSignature !== undefined) patch.teacherSignature = args.teacherSignature;
    if (args.submit) { patch.status = "submitted"; patch.submittedAt = Date.now(); }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("profLicenseForms"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    await ctx.db.delete(args.id);
    await logAudit(ctx, user, "delete", "profLicenseForm", args.id, `حذف استمارة رخصة مهنية: ${form.teacherName}`);
  },
});
