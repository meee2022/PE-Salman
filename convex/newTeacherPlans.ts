import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, logAudit } from "./permissions";
import { Doc } from "./_generated/dataModel";

const ROW = v.object({
  criterion: v.string(),
  method: v.string(),
  responsible: v.string(),
  timeframe: v.string(),
  indicators: v.string(),
  done: v.boolean(),
});

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
        ? await ctx.db.query("newTeacherPlans").withIndex("by_year", (q) => q.eq("academicYear", args.academicYear!)).collect()
        : await ctx.db.query("newTeacherPlans").collect();
    } else if (user.role === "supervisor" && user.supervisorId) {
      rows = await ctx.db.query("newTeacherPlans").withIndex("by_supervisor", (q) => q.eq("supervisorId", user.supervisorId!)).collect();
    } else return [];
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("newTeacherPlans"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) return null;
    return form;
  },
});

export const create = mutation({
  args: {
    supervisorId: v.optional(v.id("supervisors")),
    schoolId: v.optional(v.id("schools")),
    schoolName: v.string(),
    teacherName: v.string(),
    section: v.optional(v.string()),
    academicYear: v.string(),
    rows: v.array(ROW),
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
    const id = await ctx.db.insert("newTeacherPlans", {
      supervisorId, supervisorName: sup?.name ?? "",
      schoolId: args.schoolId, schoolName: args.schoolName, teacherName: args.teacherName,
      section: args.section ?? "التربية الرياضية", academicYear: args.academicYear, rows: args.rows,
      status: "draft", createdBy: user._id, createdAt: Date.now(),
    });
    await logAudit(ctx, user, "create", "newTeacherPlan", id, `إنشاء خطة معلم مستجد: ${args.teacherName}`);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("newTeacherPlans"),
    schoolName: v.string(),
    teacherName: v.string(),
    coordinatorName: v.optional(v.string()),
    deputyName: v.optional(v.string()),
    section: v.optional(v.string()),
    rows: v.array(ROW),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    const { id, token, ...data } = args;
    await ctx.db.patch(id, data);
    await logAudit(ctx, user, "update", "newTeacherPlan", id, `تعديل خطة معلم مستجد: ${args.teacherName}`);
  },
});

export const sign = mutation({
  args: {
    id: v.id("newTeacherPlans"),
    supervisorSignature: v.optional(v.string()),
    teacherSignature: v.optional(v.string()),
    coordinatorSignature: v.optional(v.string()),
    submit: v.optional(v.boolean()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    const patch: any = {};
    if (args.supervisorSignature !== undefined) patch.supervisorSignature = args.supervisorSignature;
    if (args.teacherSignature !== undefined) patch.teacherSignature = args.teacherSignature;
    if (args.coordinatorSignature !== undefined) patch.coordinatorSignature = args.coordinatorSignature;
    if (args.submit) { patch.status = "submitted"; patch.submittedAt = Date.now(); }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("newTeacherPlans"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    await ctx.db.delete(args.id);
    await logAudit(ctx, user, "delete", "newTeacherPlan", args.id, `حذف خطة معلم مستجد: ${form.teacherName}`);
  },
});
