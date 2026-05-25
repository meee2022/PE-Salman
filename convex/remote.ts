import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, requireAdminMutation, logAudit } from "./permissions";

function rate(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0; // نسبة مئوية بخانة عشرية
}

const DAY_SLOT = v.object({ school: v.string(), count: v.number() });
const DAYS = v.object({
  sunday: v.array(DAY_SLOT), monday: v.array(DAY_SLOT), tuesday: v.array(DAY_SLOT),
  wednesday: v.array(DAY_SLOT), thursday: v.array(DAY_SLOT),
});

// ── استعلامات — المدير يرى الكل، الموجه يرى بياناته فقط ──────────
export const coverage = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    if (canSeeAll(user)) {
      const rows = await ctx.db
        .query("remoteCoverage")
        .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
        .collect();
      return Promise.all(rows.map(async (r) => ({ ...r, supervisor: await ctx.db.get(r.supervisorId) })));
    }
    // موجه: يرى بياناته هو فقط
    if (user.role === "supervisor" && user.supervisorId) {
      const row = await ctx.db
        .query("remoteCoverage")
        .withIndex("by_supervisor_year", (q) =>
          q.eq("supervisorId", user.supervisorId!).eq("academicYear", args.academicYear)
        )
        .first();
      if (!row) return [];
      return [{ ...row, supervisor: await ctx.db.get(row.supervisorId) }];
    }
    return [];
  },
});

export const schedule = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    if (canSeeAll(user)) {
      const rows = await ctx.db
        .query("remoteSchedule")
        .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
        .collect();
      return Promise.all(rows.map(async (r) => ({ ...r, supervisor: await ctx.db.get(r.supervisorId) })));
    }
    // موجه: يرى جدوله هو فقط
    if (user.role === "supervisor" && user.supervisorId) {
      const row = await ctx.db
        .query("remoteSchedule")
        .withIndex("by_supervisor_year", (q) =>
          q.eq("supervisorId", user.supervisorId!).eq("academicYear", args.academicYear)
        )
        .first();
      if (!row) return [];
      return [{ ...row, supervisor: await ctx.db.get(row.supervisorId) }];
    }
    return [];
  },
});

export const survey = query({
  args: { date: v.optional(v.string()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    let rows = await ctx.db.query("remoteSurvey").collect();
    if (args.date) rows = rows.filter((r) => r.date === args.date);
    return rows;
  },
});

// ── إدخال (استيراد) ───────────────────────────────────────────────
export const upsertCoverage = mutation({
  args: {
    supervisorId: v.id("supervisors"), academicYear: v.string(),
    required: v.number(), covered: v.number(), forms: v.number(),
    coverageRate: v.number(), formsRate: v.number(),
  },
  handler: async (ctx, args) => {
    const ex = await ctx.db.query("remoteCoverage")
      .withIndex("by_supervisor_year", (q) => q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear))
      .first();
    if (ex) { await ctx.db.patch(ex._id, args); return ex._id; }
    return ctx.db.insert("remoteCoverage", args);
  },
});

// ── تعديل تغطية موجه (يعيد حساب النِّسب تلقائيًا) — للأدمن ─────────
export const updateCoverage = mutation({
  args: {
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    required: v.optional(v.number()),
    covered: v.optional(v.number()),
    forms: v.optional(v.number()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const ex = await ctx.db.query("remoteCoverage")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear))
      .first();

    const required = args.required ?? ex?.required ?? 0;
    const covered  = args.covered  ?? ex?.covered  ?? 0;
    const forms    = args.forms    ?? ex?.forms    ?? 0;
    const data = {
      supervisorId: args.supervisorId,
      academicYear: args.academicYear,
      required, covered, forms,
      coverageRate: rate(covered, required),  // مُشتقّة لحظيًا
      formsRate: rate(forms, required),
    };

    const sup = await ctx.db.get(args.supervisorId);
    if (ex) {
      await ctx.db.patch(ex._id, data);
      await logAudit(ctx, admin, "update", "remoteCoverage", ex._id,
        `تعديل تغطية التعلم عن بعد لـ${sup?.name ?? ""}: مطلوب=${required} مغطّى=${covered} استمارات=${forms}`);
      return ex._id;
    }
    const id = await ctx.db.insert("remoteCoverage", data);
    await logAudit(ctx, admin, "create", "remoteCoverage", id,
      `إضافة تغطية تعلم عن بعد لـ${sup?.name ?? ""}`);
    return id;
  },
});

// ── ضبط "المطلوب" لكل الموجهين دفعة واحدة — للأدمن ────────────────
export const setRequiredForAll = mutation({
  args: { academicYear: v.string(), required: v.number(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const rows = await ctx.db.query("remoteCoverage")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear))
      .collect();
    for (const r of rows) {
      await ctx.db.patch(r._id, {
        required: args.required,
        coverageRate: rate(r.covered, args.required),
        formsRate: rate(r.forms, args.required),
      });
    }
    await logAudit(ctx, admin, "update", "remoteCoverage", undefined,
      `ضبط المطلوب للجميع = ${args.required} (${rows.length} موجه)`);
    return rows.length;
  },
});

export const upsertSchedule = mutation({
  args: { supervisorId: v.id("supervisors"), academicYear: v.string(), schoolsTotal: v.number(), days: DAYS },
  handler: async (ctx, args) => {
    const ex = await ctx.db.query("remoteSchedule")
      .withIndex("by_supervisor_year", (q) => q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear))
      .first();
    if (ex) { await ctx.db.patch(ex._id, args); return ex._id; }
    return ctx.db.insert("remoteSchedule", args);
  },
});

export const upsertSurvey = mutation({
  args: {
    id: v.optional(v.id("remoteSurvey")),
    supervisorId: v.optional(v.id("supervisors")),
    name: v.string(),
    date: v.string(),
    items: v.array(v.object({ challenge: v.string(), recommendation: v.string() })),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) throw new Error("غير مصرح: يجب تسجيل الدخول أولاً");

    let supervisorId = args.supervisorId;
    let name = args.name;

    if (user.role === "supervisor") {
      supervisorId = user.supervisorId;
      if (supervisorId) {
        const sup = await ctx.db.get(supervisorId);
        if (sup) name = sup.name;
      }
    }

    const data = {
      supervisorId,
      name,
      date: args.date,
      items: args.items,
    };

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("الاستطلاع غير موجود");
      if (user.role !== "admin" && existing.supervisorId !== user.supervisorId) {
        throw new Error("غير مصرح لك بتعديل هذا الاستطلاع");
      }
      await ctx.db.patch(args.id, data);
      return args.id;
    } else {
      if (supervisorId) {
        const existing = await ctx.db.query("remoteSurvey")
          .withIndex("by_date", (q) => q.eq("date", args.date))
          .collect();
        const dup = existing.find((r) => r.supervisorId === supervisorId);
        if (dup) {
          await ctx.db.patch(dup._id, data);
          return dup._id;
        }
      }
      return ctx.db.insert("remoteSurvey", data);
    }
  },
});

export const removeSurvey = mutation({
  args: {
    id: v.id("remoteSurvey"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) throw new Error("غير مصرح: يجب تسجيل الدخول أولاً");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("الاستطلاع غير موجود");

    if (user.role !== "admin" && existing.supervisorId !== user.supervisorId) {
      throw new Error("غير مصرح لك بحذف هذا الاستطلاع");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

