import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, logAudit } from "./permissions";
import { Doc } from "./_generated/dataModel";

const DOMAIN = v.object({
  domain: v.string(),
  indicator: v.string(),
  notes: v.optional(v.string()),
  evidences: v.optional(v.array(v.object({ text: v.string(), status: v.string() }))),
});

// يملك الموجه استمارته؛ الأدمن/المشاهد يرى الكل
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
        ? await ctx.db.query("coordinatorForms").withIndex("by_year", (q) => q.eq("academicYear", args.academicYear!)).collect()
        : await ctx.db.query("coordinatorForms").collect();
    } else if (user.role === "supervisor" && user.supervisorId) {
      rows = await ctx.db.query("coordinatorForms").withIndex("by_supervisor", (q) => q.eq("supervisorId", user.supervisorId!)).collect();
    } else {
      return [];
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ── استمارة واحدة ─────────────────────────────────────────────────
export const get = query({
  args: { id: v.id("coordinatorForms"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) return null;
    return form;
  },
});

// ── عدد الاستمارات لكل موجه (للأدمن) ──────────────────────────────
export const countsBySupervisor = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    const rows = await ctx.db.query("coordinatorForms")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear)).collect();
    const map = new Map<string, { name: string; total: number; submitted: number }>();
    for (const r of rows) {
      const e = map.get(r.supervisorId) ?? { name: r.supervisorName, total: 0, submitted: 0 };
      e.total++; if (r.status === "submitted") e.submitted++;
      map.set(r.supervisorId, e);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  },
});

// ── إنشاء (الموجه لنفسه أو الأدمن) ────────────────────────────────
export const create = mutation({
  args: {
    supervisorId: v.optional(v.id("supervisors")),
    schoolId: v.optional(v.id("schools")),
    schoolName: v.string(),
    coordinatorName: v.string(),
    subject: v.string(),
    day: v.string(),
    date: v.string(),
    academicYear: v.string(),
    domains: v.array(DOMAIN),
    generalNote: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) throw new Error("غير مصرّح");

    // تحديد الموجه: الموجه ينشئ لنفسه؛ الأدمن يحدد الموجه
    let supervisorId = args.supervisorId;
    if (user.role === "supervisor") supervisorId = user.supervisorId;
    if (!supervisorId) throw new Error("يجب تحديد الموجه");
    if (!canSeeAll(user) && user.supervisorId !== supervisorId) throw new Error("غير مصرّح");

    const sup = await ctx.db.get(supervisorId);
    const id = await ctx.db.insert("coordinatorForms", {
      supervisorId,
      supervisorName: sup?.name ?? "",
      schoolId: args.schoolId,
      schoolName: args.schoolName,
      coordinatorName: args.coordinatorName,
      subject: args.subject || "التربية البدنية",
      day: args.day,
      date: args.date,
      academicYear: args.academicYear,
      domains: args.domains,
      generalNote: args.generalNote,
      status: "draft",
      createdBy: user._id,
      createdAt: Date.now(),
    });
    await logAudit(ctx, user, "create", "coordinatorForm", id, `إنشاء استمارة منسق: ${args.coordinatorName} (${args.schoolName})`);
    return id;
  },
});

// ── تعديل (المالك في وضع المسودة أو الأدمن) ──────────────────────
export const update = mutation({
  args: {
    id: v.id("coordinatorForms"),
    schoolId: v.optional(v.id("schools")),
    schoolName: v.string(),
    coordinatorName: v.string(),
    subject: v.string(),
    day: v.string(),
    date: v.string(),
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
    await logAudit(ctx, user, "update", "coordinatorForm", id, `تعديل استمارة منسق: ${args.coordinatorName}`);
  },
});

// ── التوقيع والإرسال ──────────────────────────────────────────────
export const sign = mutation({
  args: {
    id: v.id("coordinatorForms"),
    supervisorSignature: v.optional(v.string()),
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
    if (args.coordinatorSignature !== undefined) patch.coordinatorSignature = args.coordinatorSignature;
    if (args.submit) { patch.status = "submitted"; patch.submittedAt = Date.now(); }
    await ctx.db.patch(args.id, patch);
    if (args.submit) await logAudit(ctx, user, "update", "coordinatorForm", args.id,
      `اعتماد وإرسال استمارة المنسق: ${form.coordinatorName}`);
  },
});

// ── حذف ───────────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("coordinatorForms"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const form = await ctx.db.get(args.id);
    if (!form || !ownsOrAll(user, form.supervisorId)) throw new Error("غير مصرّح");
    await ctx.db.delete(args.id);
    await logAudit(ctx, user, "delete", "coordinatorForm", args.id, `حذف استمارة منسق: ${form.coordinatorName}`);
  },
});
