import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, logAudit } from "./permissions";
import { Doc } from "./_generated/dataModel";

const DOMAIN = v.object({
  domain: v.string(),
  criteria: v.array(v.object({ text: v.string(), rating: v.string() })),
  recommendations: v.array(v.string()),
});

function ownsOrAll(user: Doc<"users"> | null, supervisorId: string) {
  if (!user) return false;
  if (canSeeAll(user)) return true;
  return user.role === "supervisor" && user.supervisorId === supervisorId;
}

// ── قائمة الاستمارات ──────────────────────────────────────────────
export const list = query({
  args: { academicYear: v.optional(v.string()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    let rows;
    if (canSeeAll(user)) {
      rows = args.academicYear
        ? await ctx.db.query("teacherForms").withIndex("by_year", (q) => q.eq("academicYear", args.academicYear!)).collect()
        : await ctx.db.query("teacherForms").collect();
    } else if (user.role === "supervisor" && user.supervisorId) {
      rows = await ctx.db.query("teacherForms").withIndex("by_supervisor", (q) => q.eq("supervisorId", user.supervisorId!)).collect();
    } else {
      return [];
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ── استمارة واحدة ─────────────────────────────────────────────────
export const get = query({
  args: { id: v.id("teacherForms"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) return null;
    return form;
  },
});

// ── بنك التوصيات: يجمع التوصيات المستخدمة فعلياً عبر كل الاستمارات ──
export const recommendationsBank = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    const rows = await ctx.db.query("teacherForms").collect();
    const set = new Set<string>();
    for (const f of rows) {
      for (const d of f.domains) {
        for (const r of d.recommendations) {
          const t = r.trim();
          if (t) set.add(t);
        }
      }
    }
    return Array.from(set);
  },
});

// ── إنشاء ─────────────────────────────────────────────────────────
export const create = mutation({
  args: {
    supervisorId: v.optional(v.id("supervisors")),
    schoolId: v.optional(v.id("schools")),
    schoolName: v.string(),
    teacherName: v.string(),
    subject: v.string(),
    topic: v.optional(v.string()),
    grade: v.optional(v.string()),
    day: v.string(),
    date: v.string(),
    academicYear: v.string(),
    followUpType: v.optional(v.string()),
    followUpOptions: v.optional(v.array(v.string())),
    domains: v.array(DOMAIN),
    generalNote: v.optional(v.string()),
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
    const id = await ctx.db.insert("teacherForms", {
      supervisorId,
      supervisorName: sup?.name ?? "",
      schoolId: args.schoolId,
      schoolName: args.schoolName,
      teacherName: args.teacherName,
      subject: args.subject || "التربية البدنية",
      topic: args.topic,
      grade: args.grade,
      day: args.day,
      date: args.date,
      academicYear: args.academicYear,
      followUpType: args.followUpType,
      followUpOptions: args.followUpOptions,
      domains: args.domains,
      generalNote: args.generalNote,
      status: "draft",
      createdBy: user._id,
      createdAt: Date.now(),
    });
    await logAudit(ctx, user, "create", "teacherForm", id, `إنشاء استمارة معلم: ${args.teacherName} (${args.schoolName})`);
    return id;
  },
});

// ── تعديل ─────────────────────────────────────────────────────────
export const update = mutation({
  args: {
    id: v.id("teacherForms"),
    schoolId: v.optional(v.id("schools")),
    schoolName: v.string(),
    teacherName: v.string(),
    subject: v.string(),
    topic: v.optional(v.string()),
    grade: v.optional(v.string()),
    day: v.string(),
    date: v.string(),
    followUpType: v.optional(v.string()),
    followUpOptions: v.optional(v.array(v.string())),
    domains: v.array(DOMAIN),
    generalNote: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    const { id, token, ...data } = args;
    await ctx.db.patch(id, data);
    await logAudit(ctx, user, "update", "teacherForm", id, `تعديل استمارة معلم: ${args.teacherName}`);
  },
});

// ── التوقيع والإرسال ──────────────────────────────────────────────
export const sign = mutation({
  args: {
    id: v.id("teacherForms"),
    supervisorSignature: v.optional(v.string()),
    teacherSignature: v.optional(v.string()),
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
    if (args.submit) { patch.status = "submitted"; patch.submittedAt = Date.now(); }
    await ctx.db.patch(args.id, patch);
    if (args.submit) await logAudit(ctx, user, "update", "teacherForm", args.id,
      `اعتماد وإرسال استمارة المعلم: ${form.teacherName}`);
  },
});

// ── حذف ───────────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("teacherForms"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    await ctx.db.delete(args.id);
    await logAudit(ctx, user, "delete", "teacherForm", args.id, `حذف استمارة معلم: ${form.teacherName}`);
  },
});
