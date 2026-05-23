import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, requireAdminMutation } from "./permissions";
import type { MutationCtx } from "./_generated/server";

const LEAVE_CODES = new Set(["LV", "SL", "AB", "WP"]);

// ─── إعادة حساب الملخص السنوي لموجه واحد من سجلات اليومية ───────
async function recomputeForSupervisor(
  ctx: MutationCtx,
  supervisorId: string,
  academicYear: string
) {
  const allLogs = await ctx.db
    .query("activityLogs")
    .withIndex("by_supervisor_date", (q) => q.eq("supervisorId", supervisorId as any))
    .collect();
  const logs = allLogs.filter((l) => l.academicYear === academicYear);

  const counts: Record<string, number> = {};
  for (const l of logs) counts[l.code] = (counts[l.code] ?? 0) + 1;

  const data = {
    supervisorId: supervisorId as any,
    academicYear,
    OF: counts.OF ?? 0,
    VS: counts.VS ?? 0,
    CL: counts.CL ?? 0,
    LV: counts.LV ?? 0,
    SL: counts.SL ?? 0,
    TR: counts.TR ?? 0,
    MT: counts.MT ?? 0,
    AC: counts.AC ?? 0,
    AB: counts.AB ?? 0,
    SP: counts.SP ?? 0,
    VP: counts.VP ?? 0,
    OL: counts.OL ?? 0,
    WP: counts.WP ?? 0,
    schoolingDays: logs.filter((l) => !LEAVE_CODES.has(l.code)).length,
  };

  const ex = await ctx.db
    .query("activitySummaries")
    .withIndex("by_supervisor_year", (q) =>
      q.eq("supervisorId", supervisorId as any).eq("academicYear", academicYear)
    )
    .first();
  if (ex) await ctx.db.patch(ex._id, data);
  else await ctx.db.insert("activitySummaries", data);
}

const ACTIVITY_CODE = v.union(
  v.literal("OF"), v.literal("VS"), v.literal("CL"), v.literal("LV"),
  v.literal("SL"), v.literal("TR"), v.literal("MT"), v.literal("AC"),
  v.literal("AB"), v.literal("SP"), v.literal("VP"), v.literal("OL"),
  v.literal("WP")
);

export const listByMonth = query({
  args: {
    supervisorId: v.id("supervisors"),
    year: v.number(),
    month: v.number(), // 1-12
  },
  handler: async (ctx, args) => {
    const prefix = `${args.year}-${String(args.month).padStart(2, "0")}`;
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_supervisor_date", (q) =>
        q.eq("supervisorId", args.supervisorId)
      )
      .collect();
    return logs.filter((l) => l.date.startsWith(prefix));
  },
});

// كل سجلات شهر معيّن (لكل الموجهين) — لشبكة الإدخال
export const monthLogs = query({
  args: { year: v.number(), month: v.number(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    const ym = `${args.year}-${String(args.month).padStart(2, "0")}`;
    return ctx.db
      .query("activityLogs")
      .withIndex("by_date", (q) => q.gte("date", `${ym}-01`).lte("date", `${ym}-31`))
      .collect();
  },
});

// إدخال جماعي: كود واحد لعدة موجهين عبر عدة أيام
export const bulkLog = mutation({
  args: {
    supervisorIds: v.array(v.id("supervisors")),
    dates: v.array(v.string()),
    code: ACTIVITY_CODE,
    academicYear: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    let count = 0;
    for (const supervisorId of args.supervisorIds) {
      for (const date of args.dates) {
        const existing = await ctx.db
          .query("activityLogs")
          .withIndex("by_supervisor_date", (q) =>
            q.eq("supervisorId", supervisorId).eq("date", date))
          .first();
        if (existing) await ctx.db.patch(existing._id, { code: args.code });
        else await ctx.db.insert("activityLogs", { supervisorId, date, code: args.code, academicYear: args.academicYear });
        count++;
      }
      // أعد حساب الملخص لكل موجه بعد إدخال بياناته
      await recomputeForSupervisor(ctx, supervisorId, args.academicYear);
    }
    return count;
  },
});

// سجلات ضمن نطاق تواريخ (أسبوع/شهر) — لشبكة الإدخال
export const logsInRange = query({
  args: { start: v.string(), end: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    return ctx.db
      .query("activityLogs")
      .withIndex("by_date", (q) => q.gte("date", args.start).lte("date", args.end))
      .collect();
  },
});

// حذف جماعي: تفريغ عدة موجهين عبر عدة أيام
export const bulkClear = mutation({
  args: {
    supervisorIds: v.array(v.id("supervisors")),
    dates: v.array(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    let count = 0;
    for (const supervisorId of args.supervisorIds) {
      for (const date of args.dates) {
        const existing = await ctx.db
          .query("activityLogs")
          .withIndex("by_supervisor_date", (q) =>
            q.eq("supervisorId", supervisorId).eq("date", date))
          .first();
        if (existing) { await ctx.db.delete(existing._id); count++; }
      }
      // أعد حساب الملخص بعد الحذف
      await recomputeForSupervisor(ctx, supervisorId, "2025-2026");
    }
    return count;
  },
});

// مسح كود خلية (تفريغ يوم لموجه)
export const clearActivity = mutation({
  args: { supervisorId: v.id("supervisors"), date: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const existing = await ctx.db
      .query("activityLogs")
      .withIndex("by_supervisor_date", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("date", args.date))
      .first();
    if (existing) {
      const yr = existing.academicYear ?? "2025-2026";
      await ctx.db.delete(existing._id);
      await recomputeForSupervisor(ctx, args.supervisorId, yr);
    }
  },
});

// ── استيراد سجلات يومية لموجه واحد (batch) — للأدمن ─────────────────
export const importSupervisorLogs = mutation({
  args: {
    supervisorName: v.string(),
    academicYear: v.string(),
    logs: v.array(v.object({ date: v.string(), code: ACTIVITY_CODE })),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);

    // تطبيع النص العربي
    const normStr = (s: string) =>
      s.replace(/\xa0/g, " ").replace(/ـ/g, "")
       .replace(/[ً-ْٰ]/g, "")
       .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
       .replace(/\s+/g, " ").trim();

    // حساب عدد الكلمات المشتركة بين اسمين
    const sharedWords = (a: string, b: string) => {
      const wa = new Set(normStr(a).split(" ").filter(w => w.length > 1));
      const wb = normStr(b).split(" ").filter(w => w.length > 1);
      return wb.filter(w => wa.has(w)).length;
    };

    const allSups = await ctx.db.query("supervisors").collect();
    const normTarget = normStr(args.supervisorName);
    const targetWords = normTarget.split(" ").filter(w => w.length > 1);

    // 1) مطابقة تامة
    let supervisor = allSups.find(
      (s) => normStr(s.name) === normTarget || normStr(s.nameKey ?? "") === normTarget
    );

    // 2) مطابقة بالكلمتين الأولى والأخيرة (shortKey)
    if (!supervisor) {
      const shortTarget = targetWords.length >= 2
        ? `${targetWords[0]} ${targetWords[targetWords.length - 1]}`
        : normTarget;
      supervisor = allSups.find((s) => {
        const sn = normStr(s.name).split(" ").filter(w => w.length > 1);
        const sk = sn.length >= 2 ? `${sn[0]} ${sn[sn.length - 1]}` : normStr(s.name);
        return sk === shortTarget;
      });
    }

    // 3) مطابقة بأكبر عدد كلمات مشتركة (≥ نصف كلمات الهدف)
    if (!supervisor) {
      let bestScore = 0;
      let bestSup = null as typeof allSups[0] | null;
      for (const s of allSups) {
        const score = sharedWords(args.supervisorName, s.name);
        if (score > bestScore) { bestScore = score; bestSup = s; }
      }
      const minMatch = Math.ceil(targetWords.length / 2);
      if (bestScore >= minMatch && bestSup) supervisor = bestSup;
    }

    if (!supervisor) throw new Error(`لم يُعثر على الموجه: ${args.supervisorName}`);

    let inserted = 0;
    let updated = 0;
    for (const log of args.logs) {
      const existing = await ctx.db
        .query("activityLogs")
        .withIndex("by_supervisor_date", (q) =>
          q.eq("supervisorId", supervisor._id).eq("date", log.date)
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { code: log.code });
        updated++;
      } else {
        await ctx.db.insert("activityLogs", {
          supervisorId: supervisor._id,
          date: log.date,
          code: log.code,
          academicYear: args.academicYear,
        });
        inserted++;
      }
    }

    await recomputeForSupervisor(ctx, supervisor._id, args.academicYear);
    return { supervisorName: supervisor.name, inserted, updated, total: inserted + updated };
  },
});

// ── إعادة حساب ملخص جميع الموجهين من السجلات اليومية — للأدمن ──────
export const recomputeAllSummaries = mutation({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    // اجمع كل supervisorIds الفريدة لهذا العام
    const logs = await ctx.db
      .query("activityLogs")
      .collect();
    const yearLogs = logs.filter((l) => l.academicYear === args.academicYear);
    const supIds = [...new Set(yearLogs.map((l) => l.supervisorId))];
    for (const supId of supIds) {
      await recomputeForSupervisor(ctx, supId, args.academicYear);
    }
    return supIds.length;
  },
});

export const summaries = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!canSeeAll(user)) return [];
    const all = await ctx.db.query("activitySummaries").collect();
    const rows = all.filter((r) => r.academicYear === args.academicYear);

    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        supervisor: await ctx.db.get(r.supervisorId),
      }))
    );
  },
});

export const logActivity = mutation({
  args: {
    supervisorId: v.id("supervisors"),
    date: v.string(),
    code: ACTIVITY_CODE,
    schoolId: v.optional(v.id("schools")),
    notes: v.optional(v.string()),
    academicYear: v.string(),
    enteredBy: v.optional(v.id("users")),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const existing = await ctx.db
      .query("activityLogs")
      .withIndex("by_supervisor_date", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        code: args.code,
        schoolId: args.schoolId,
        notes: args.notes,
        enteredBy: args.enteredBy,
      });
    } else {
      await ctx.db.insert("activityLogs", {
        supervisorId: args.supervisorId,
        date: args.date,
        code: args.code,
        schoolId: args.schoolId,
        notes: args.notes,
        academicYear: args.academicYear,
        enteredBy: args.enteredBy,
      });
    }
    // أعد حساب الملخص تلقائياً
    await recomputeForSupervisor(ctx, args.supervisorId, args.academicYear);
    return existing?._id;
  },
});

export const upsertSummary = mutation({
  args: {
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    OF: v.number(), VS: v.number(), CL: v.number(), LV: v.number(),
    SL: v.number(), TR: v.number(), MT: v.number(), AC: v.number(),
    AB: v.number(), SP: v.number(), VP: v.number(), OL: v.number(),
    WP: v.number(),
    schoolingDays: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activitySummaries")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return ctx.db.insert("activitySummaries", args);
  },
});
