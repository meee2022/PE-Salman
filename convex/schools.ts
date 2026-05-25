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

    // حساب عدد المعلمين والمنسقين فعلياً من جدول المعلمين (مطابقة بالاسم الكامل)
    const allTeachers = await ctx.db.query("teachers").collect();
    function normStr(s: string) {
      return (s ?? "").replace(/\s+/g, " ").trim()
        .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
        .replace(/ة/g, "ه").replace(/[ً-ْٰ]/g, "");
    }
    // فهرس المعلمين حسب اسم المدرسة الكامل المنقّح
    const teacherCounts = new Map<string, { teachers: number; coordinators: number }>();
    for (const t of allTeachers) {
      const key = normStr(t.schoolName);
      const rec = teacherCounts.get(key) ?? { teachers: 0, coordinators: 0 };
      if ((t.jobTitle ?? "").startsWith("منسق")) rec.coordinators++;
      else rec.teachers++;
      teacherCounts.set(key, rec);
    }
    function countFor(school: { name: string }) {
      return teacherCounts.get(normStr(school.name)) ?? { teachers: 0, coordinators: 0 };
    }

    if (!args.academicYear) {
      return schools.map((s) => {
        const c = countFor(s);
        return { ...s, teachers: c.teachers, coordinators: c.coordinators };
      });
    }

    // الحاق الموجه الحالي + عدد المعلمين لكل مدرسة
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear!))
      .collect();

    const assignMap = new Map(assignments.map((a) => [a.schoolId, a.supervisorId]));

    return Promise.all(
      schools.map(async (school) => {
        const supId = assignMap.get(school._id);
        const supervisor = supId ? await ctx.db.get(supId) : null;
        const c = countFor(school);
        return { ...school, supervisor: supervisor ?? null, teachers: c.teachers, coordinators: c.coordinators };
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

// ── استيراد كامل للمدارس: upsert + إخفاء غير المُدرج ────────────────
export const bulkSeedSchools = mutation({
  args: {
    schools: v.array(v.object({
      name: v.string(),
      nameKey: v.string(),
      level: v.optional(v.string()),
      gender: v.union(v.literal("male"), v.literal("female")),
    })),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);

    function normStr(s: string) {
      return s.replace(/\s+/g, " ").trim()
        .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
        .replace(/ة/g, "ه").replace(/[ً-ْٰ]/g, "");
    }

    const allExisting = await ctx.db.query("schools").collect();
    const wantedNames = new Set(args.schools.map(s => normStr(s.name)));

    let inserted = 0, updated = 0, hidden = 0;

    // 1) upsert كل مدرسة في القائمة
    for (const sch of args.schools) {
      const n = normStr(sch.name);
      const existing = allExisting.find(e => normStr(e.name) === n);
      const data = {
        name: sch.name,
        nameKey: sch.nameKey,
        level: sch.level,
        gender: sch.gender,
        isActive: true,
      };
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated++;
      } else {
        await ctx.db.insert("schools", data);
        inserted++;
      }
    }

    // 2) إخفاء أي مدرسة نشطة غير موجودة في القائمة
    for (const e of allExisting) {
      if (!wantedNames.has(normStr(e.name)) && e.isActive) {
        await ctx.db.patch(e._id, { isActive: false });
        hidden++;
      }
    }

    return { inserted, updated, hidden };
  },
});

// ── إخفاء المدارس غير الموجودة في قائمة الأسماء ─────────────────────
export const deactivateUnlisted = mutation({
  args: {
    activeNames: v.array(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx, args.token);
    const activeSet = new Set(args.activeNames);
    const allSchools = await ctx.db.query("schools").collect();
    let hidden = 0;
    for (const school of allSchools) {
      if (!activeSet.has(school.name) && school.isActive) {
        await ctx.db.patch(school._id, { isActive: false });
        hidden++;
      }
    }
    return { hidden };
  },
});
