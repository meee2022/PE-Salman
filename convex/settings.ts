import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAdminMutation, logAudit } from "./permissions";

const DEFAULT_ACTIVE_YEAR = "2025-2026";

// ── السنة الدراسية النشطة ─────────────────────────────────────────────
export const activeYear = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "activeYear")).first();
    return row?.value ?? DEFAULT_ACTIVE_YEAR;
  },
});

export const setActiveYear = mutation({
  args: { year: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    // تحقق من تنسيق السنة: YYYY-YYYY
    if (!/^\d{4}-\d{4}$/.test(args.year)) throw new Error("تنسيق السنة غير صحيح — مثال: 2025-2026");
    const ex = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "activeYear")).first();
    if (ex) await ctx.db.patch(ex._id, { value: args.year, updatedAt: Date.now(), updatedBy: admin._id });
    else await ctx.db.insert("settings", { key: "activeYear", value: args.year, updatedAt: Date.now(), updatedBy: admin._id });
    await logAudit(ctx, admin, "update", "settings", undefined, `تغيير السنة الدراسية النشطة إلى ${args.year}`);
  },
});

// مفاتيح بيانات الجهة (تظهر في ترويسة التقارير المطبوعة)
const ORG_KEYS = [
  "org.ministry", "org.department", "org.section", "org.headName", "org.managerName",
] as const;

const DEFAULTS: Record<string, string> = {
  "org.ministry": "وزارة التربية والتعليم والتعليم العالي — دولة قطر",
  "org.department": "إدارة التوجيه التربوي",
  "org.section": "قسم التربية البدنية",
  "org.headName": "",
  "org.managerName": "",
};

// قراءة بيانات الجهة (لأي مستخدم مسجّل — تُستخدم في الطباعة)
export const org = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!user) return DEFAULTS;
    const rows = await ctx.db.query("settings").collect();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const r of rows) if (ORG_KEYS.includes(r.key as any)) map[r.key] = r.value;
    return map;
  },
});

// حفظ بيانات الجهة (للأدمن فقط)
export const setOrg = mutation({
  args: {
    ministry: v.string(),
    department: v.string(),
    section: v.string(),
    headName: v.string(),
    managerName: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminMutation(ctx, args.token);
    const entries: [string, string][] = [
      ["org.ministry", args.ministry],
      ["org.department", args.department],
      ["org.section", args.section],
      ["org.headName", args.headName],
      ["org.managerName", args.managerName],
    ];
    for (const [key, value] of entries) {
      const ex = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).first();
      if (ex) await ctx.db.patch(ex._id, { value, updatedAt: Date.now(), updatedBy: admin._id });
      else await ctx.db.insert("settings", { key, value, updatedAt: Date.now(), updatedBy: admin._id });
    }
    await logAudit(ctx, admin, "update", "settings", undefined, "تحديث بيانات الجهة/التقارير");
  },
});
