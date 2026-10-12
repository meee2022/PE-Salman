import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canSeeAll, isAdmin, requireAdminMutation, logAudit } from "./permissions";

// Ministry allowances — editable from the page
const KEYS = { hours: "leave.limitHours", casualDays: "leave.casualDays", perRequest: "leave.maxHoursPerRequest" } as const;
// permission hours per month, casual-leave days per academic year, max hours of a single permission
const DEFAULTS = { hours: 10, casualDays: 10, perRequest: 3 };
type LimitKey = keyof typeof KEYS;

async function readLimits(ctx: QueryCtx) {
  const out = { ...DEFAULTS };
  for (const k of Object.keys(KEYS) as LimitKey[]) {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", KEYS[k])).first();
    if (row) out[k] = Number(row.value);
  }
  return out;
}

export const limit = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) =>
    (await getAuthUser(ctx, args.token)) ? readLimits(ctx) : { ...DEFAULTS },
});

export const setLimit = mutation({
  args: { key: v.union(v.literal("hours"), v.literal("casualDays"), v.literal("perRequest")), value: v.number(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    if (!Number.isFinite(args.value) || args.value < 0 || args.value > 200) throw new Error("القيمة غير صحيحة");
    const value = String(args.value);
    const ex = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", KEYS[args.key])).first();
    if (ex) await ctx.db.patch(ex._id, { value, updatedAt: Date.now(), updatedBy: admin._id });
    else await ctx.db.insert("settings", { key: KEYS[args.key], value, updatedAt: Date.now(), updatedBy: admin._id });
    await logAudit(ctx, admin, "update", "settings", undefined,
      args.key === "hours" ? `ضبط حد الاستئذان الشهري = ${value} ساعة`
        : args.key === "perRequest" ? `ضبط أقصى مدة للاستئذان الواحد = ${value} ساعة`
        : `ضبط رصيد الإجازة العارضة السنوي = ${value} يوم`);
  },
});

// A supervisor sees only their own rows; admin/viewer see everyone
export const list = query({
  args: { academicYear: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return [];
    let rows;
    if (canSeeAll(user)) {
      rows = await ctx.db.query("leavePermissions")
        .withIndex("by_year", (q) => q.eq("academicYear", args.academicYear)).collect();
    } else {
      const sid = user.supervisorId;
      if (!sid) return [];
      rows = await ctx.db.query("leavePermissions")
        .withIndex("by_supervisor_year", (q) => q.eq("supervisorId", sid).eq("academicYear", args.academicYear)).collect();
    }
    const names = new Map<string, string>();
    for (const r of rows) {
      if (!names.has(r.supervisorId)) names.set(r.supervisorId, (await ctx.db.get(r.supervisorId))?.name ?? "—");
    }
    return rows
      .map((r) => ({ ...r, supervisorName: names.get(r.supervisorId) ?? "—" }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
  },
});

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const create = mutation({
  args: {
    supervisorId: v.optional(v.id("supervisors")), // admin only; a supervisor always records for self
    academicYear: v.string(),
    kind: v.optional(v.literal("casual")), // casual leave counted in days; omitted = hourly permission
    date: v.string(),
    fromTime: v.optional(v.string()),
    toTime: v.optional(v.string()),
    days: v.optional(v.number()),
    reason: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) throw new Error("غير مصرّح");
    const supervisorId = isAdmin(user) ? args.supervisorId : user.role === "supervisor" ? user.supervisorId : undefined;
    if (!supervisorId) throw new Error(isAdmin(user) ? "يرجى اختيار الموجّه" : "غير مصرّح");
    if (!(await ctx.db.get(supervisorId))) throw new Error("الموجّه غير موجود");

    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(args.date)) throw new Error("يرجى ملء خانة: التاريخ");
    const reason = args.reason.trim();
    if (reason.length > 300) throw new Error("السبب طويل جداً (300 حرف كحد أقصى)");

    const limits = await readLimits(ctx);
    let amount;
    if (args.kind === "casual") {
      const days = args.days ?? 0;
      if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error("يرجى ملء خانة: عدد الأيام");
      amount = { kind: "casual" as const, days, minutes: 0 };
    } else {
      const fromTime = args.fromTime ?? "", toTime = args.toTime ?? "";
      if (!time.test(fromTime)) throw new Error("يرجى ملء خانة: من الساعة");
      if (!time.test(toTime)) throw new Error("يرجى ملء خانة: إلى الساعة");
      const minutes = toMin(toTime) - toMin(fromTime);
      if (minutes <= 0) throw new Error("وقت النهاية يجب أن يكون بعد وقت البداية");
      if (minutes > limits.perRequest * 60) throw new Error(`مدة الاستئذان الواحد لا تتجاوز ${limits.perRequest} ساعات`);
      if (!reason) throw new Error("يرجى ملء خانة: السبب");
      amount = { fromTime, toTime, minutes };
    }

    // Hard stop when the allowance is used up: hours per calendar month, casual days per academic year.
    // Pending requests hold balance; rejected ones do not.
    const casual = args.kind === "casual";
    const cap = casual ? limits.casualDays : limits.hours * 60;
    const size = casual ? amount.days ?? 0 : amount.minutes;
    const used = (await ctx.db.query("leavePermissions")
      .withIndex("by_supervisor_year", (q) => q.eq("supervisorId", supervisorId).eq("academicYear", args.academicYear)).collect())
      .filter((r) => r.status !== "rejected" && (r.kind === "casual") === casual && (casual || r.date.slice(0, 7) === args.date.slice(0, 7)))
      .reduce((s, r) => s + (casual ? r.days ?? 0 : r.minutes), 0);
    const left = Math.max(0, cap - used);
    if (size > left) {
      throw new Error(casual
        ? `لا يمكن التسجيل: المتبقي من رصيد الإجازة العارضة هذا العام ${left} يوم فقط`
        : `لا يمكن التسجيل: المتبقي من رصيد الاستئذان هذا الشهر ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} ساعة فقط`);
    }

    return ctx.db.insert("leavePermissions", {
      supervisorId, academicYear: args.academicYear, date: args.date, ...amount, reason,
      status: isAdmin(user) ? "approved" : "pending", // recorded by the department = already approved
      createdBy: user._id, createdAt: Date.now(),
    });
  },
});

// Department approves or rejects a request
export const decide = mutation({
  args: { id: v.id("leavePermissions"), approve: v.boolean(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("السجل غير موجود");
    await ctx.db.patch(args.id, { status: args.approve ? "approved" : "rejected" });
    await logAudit(ctx, admin, "update", "leavePermission", args.id,
      `${args.approve ? "اعتماد" : "رفض"} ${row.kind === "casual" ? "إجازة عارضة" : "استئذان"} بتاريخ ${row.date}`);
  },
});

export const remove = mutation({
  args: { id: v.id("leavePermissions"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    const row = await ctx.db.get(args.id);
    if (!user || !row) throw new Error("غير مصرّح");
    // a supervisor may withdraw only a request that has not been decided yet
    const own = user.role === "supervisor" && user.supervisorId === row.supervisorId && row.status === "pending";
    if (!own && !isAdmin(user)) throw new Error("غير مصرّح");
    await ctx.db.delete(args.id);
    if (!own) await logAudit(ctx, user, "delete", "leavePermission", args.id, `حذف استئذان بتاريخ ${row.date}`);
  },
});
