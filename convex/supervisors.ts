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

    // ── إزالة التكرار بطبقتين ──────────────────────────────────
    // الطبقة الأولى: تجميع بالـ nameKey (الاسم الكامل المُنقَّح)
    const byNameKey = new Map<string, { primary: typeof active[0]; allIds: string[] }>();
    for (const s of active) {
      const key = s.nameKey || normName(s.name);
      const prev = byNameKey.get(key);
      if (!prev) {
        byNameKey.set(key, { primary: s, allIds: [s._id as string] });
      } else {
        prev.allIds.push(s._id as string);
        if (s.seq < prev.primary.seq) prev.primary = s;
      }
    }
    // الطبقة الثانية: دمج المجموعات بالـ shortKey (أول + آخر كلمة)
    // يعالج الحالات التي يختلف فيها الاسم الأوسط بين السجلين
    const seenMap = new Map<string, { primary: typeof active[0]; allIds: string[] }>();
    for (const { primary, allIds } of byNameKey.values()) {
      const sk = shortKeyOf(primary.name);
      const prev = seenMap.get(sk);
      if (!prev) {
        seenMap.set(sk, { primary, allIds: [...allIds] });
      } else {
        prev.allIds.push(...allIds);
        if (primary.seq < prev.primary.seq) prev.primary = primary;
      }
    }
    return Array.from(seenMap.values())
      .sort((a, b) => a.primary.seq - b.primary.seq)
      .map(({ primary, allIds }) => ({ ...primary, duplicateIds: allIds }));
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

    // سجلات النشاط اليومية للعام الدراسي
    const activityLogsList = await ctx.db
      .query("activityLogs")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.id).eq("academicYear", args.academicYear))
      .collect();

    // آخر زيارة لكل مدرسة (schoolId → آخر تاريخ VS/CL)
    const schoolLastVisit: Record<string, string> = {};
    for (const log of activityLogsList) {
      if (log.schoolId && (log.code === "VS" || log.code === "CL")) {
        const k = log.schoolId as string;
        if (!schoolLastVisit[k] || log.date > schoolLastVisit[k]) {
          schoolLastVisit[k] = log.date;
        }
      }
    }

    // ملخص النشاط الشهري (شهر → أكواد → عدد)
    const monthlyMap = new Map<string, Record<string, number>>();
    for (const log of activityLogsList) {
      const month = log.date.slice(0, 7); // "2025-11"
      if (!monthlyMap.has(month)) monthlyMap.set(month, {});
      const m = monthlyMap.get(month)!;
      m[log.code] = (m[log.code] ?? 0) + 1;
    }
    const monthlyActivity = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, codes]) => ({ month, ...codes } as { month: string } & Record<string, number>));

    return {
      supervisor,
      coverage,
      activity,
      formTotals,
      schools: schools.filter(Boolean),
      liveFormsList,
      liveFormsCount,
      liveFormsSubmitted,
      schoolLastVisit,
      monthlyActivity,
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

// مساعد: يحوّل null → undefined لتوافق Convex
const nn = (v: string | null | undefined): string | undefined =>
  v === null ? undefined : v;

// ── استيراد جماعي للموجهين (upsert by jobNumber) ───────────────────
export const bulkUpsert = mutation({
  args: {
    supervisors: v.array(v.object({
      seq: v.number(),
      personalId: v.union(v.string(), v.null()),
      jobNumber: v.string(),
      name: v.string(),
      nameKey: v.string(),
      shortKey: v.string(),
      jobTitle: v.union(v.string(), v.null()),
      grade: v.optional(v.union(v.string(), v.null())),
      gender: v.union(v.literal("male"), v.literal("female")),
      officePhone: v.union(v.string(), v.null()),
      mobile: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      poBox: v.union(v.string(), v.null()),
      residence: v.union(v.string(), v.null()),
      nationality: v.union(v.string(), v.null()),
      contractType: v.union(v.string(), v.null()),
      jobCategory: v.union(v.string(), v.null()),
      joinDate: v.union(v.string(), v.null()),
      schoolsCount: v.optional(v.number()),
      coordinatorsCount: v.optional(v.number()),
      teachersCount: v.optional(v.number()),
      totalFollowed: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0, updated = 0;
    for (const sup of args.supervisors) {
      // Try find by jobNumber first, then by personalId
      let existing = await ctx.db
        .query("supervisors")
        .filter(q => q.eq(q.field("jobNumber"), sup.jobNumber))
        .first();
      if (!existing && sup.personalId) {
        existing = await ctx.db
          .query("supervisors")
          .filter(q => q.eq(q.field("personalId"), sup.personalId))
          .first();
      }
      const data = {
        seq: sup.seq,
        personalId: nn(sup.personalId) ?? "",
        jobNumber: sup.jobNumber,
        name: sup.name,
        nameKey: sup.nameKey,
        shortKey: sup.shortKey,
        jobTitle: nn(sup.jobTitle) ?? "",
        gender: sup.gender,
        officePhone: nn(sup.officePhone),
        mobile: nn(sup.mobile),
        email: nn(sup.email),
        poBox: nn(sup.poBox),
        residence: nn(sup.residence),
        nationality: nn(sup.nationality),
        contractType: nn(sup.contractType),
        jobCategory: nn(sup.jobCategory),
        joinDate: nn(sup.joinDate),
        isActive: true,
      };
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated++;
      } else {
        await ctx.db.insert("supervisors", data);
        inserted++;
      }
    }
    return { inserted, updated };
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

// ── دمج المكررين: يشمل النشط والمؤرشف ─────────────────────────
export const deduplicateSupervisors = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    // نشمل الكل: نشط ومؤرشف (قد يكون الأصل اتأرشف بالخطأ في تشغيل سابق)
    const all = await ctx.db.query("supervisors").collect();

    // تجميع بطبقتين: nameKey أولاً ثم shortKey (أول + آخر كلمة)
    const byNameKey = new Map<string, typeof all>();
    for (const s of all) {
      const key = s.nameKey || normName(s.name);
      if (!byNameKey.has(key)) byNameKey.set(key, []);
      byNameKey.get(key)!.push(s);
    }
    const groups = new Map<string, typeof all>();
    for (const [, grp] of byNameKey) {
      const sk = shortKeyOf(grp[0].name);
      if (!groups.has(sk)) groups.set(sk, []);
      groups.get(sk)!.push(...grp);
    }

    let deactivated = 0, activated = 0, logsMoved = 0;

    for (const [, group] of groups) {
      if (group.length <= 1) continue;

      // فحص سريع لكل سجل: هل عنده بيانات؟ (first بدلاً من collect)
      const checks = await Promise.all(
        group.map(async (s) => {
          const first = await ctx.db
            .query("activityLogs")
            .withIndex("by_supervisor_date", (q: any) => q.eq("supervisorId", s._id))
            .first();
          return { s, hasData: !!first };
        })
      );
      // الأصل: من عنده بيانات أولاً؛ تعادل → الأقل seq
      checks.sort((a, b) =>
        (b.hasData ? 1 : 0) - (a.hasData ? 1 : 0) || a.s.seq - b.s.seq
      );
      const primary = checks[0].s;
      const dups    = checks.slice(1).map((c) => c.s);

      // تفعيل الأصل إذا كان مؤرشفاً بالخطأ
      if (!primary.isActive) {
        await ctx.db.patch(primary._id, { isActive: true });
        activated++;
      }

      // بناء Set من تواريخ الأصل (مرة واحدة فقط)
      const primaryLogs = await ctx.db
        .query("activityLogs")
        .withIndex("by_supervisor_date", (q: any) => q.eq("supervisorId", primary._id))
        .collect();
      const primaryDates = new Set(primaryLogs.map((l: any) => l.date as string));

      for (const dup of dups) {
        const dupLogs = await ctx.db
          .query("activityLogs")
          .withIndex("by_supervisor_date", (q: any) => q.eq("supervisorId", dup._id))
          .collect();
        for (const log of dupLogs) {
          if (!primaryDates.has(log.date)) {
            await ctx.db.patch(log._id, { supervisorId: primary._id });
            primaryDates.add(log.date);
            logsMoved++;
          } else {
            await ctx.db.delete(log._id);
          }
        }
        if (dup.isActive) {
          await ctx.db.patch(dup._id, { isActive: false });
          deactivated++;
        }
      }
    }
    return { deactivated, activated, logsMoved };
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
    if (assigned) throw new Error("لا يمكن الحذف: للموجه مدارس مسندة. أرشِفه بدلًا من ذلك.");
    // منع الحذف إن كان للموجه سجلات نشاط يومية
    const hasLogs = await ctx.db
      .query("activityLogs")
      .withIndex("by_supervisor_date", (q) => q.eq("supervisorId", args.id))
      .first();
    if (hasLogs) throw new Error("لا يمكن الحذف: للموجه سجلات نشاط يومية. استخدم 'دمج المكررين' بدلاً من الحذف المباشر.");
    const s = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    await logAudit(ctx, admin, "delete", "supervisor", args.id, `حذف موجه: ${s?.name ?? ""}`);
  },
});
