import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const DEFAULT_PASSWORD = "pe@2026";   // كلمة المرور الافتراضية الموحّدة للموجهين
const ADMIN_PASSWORD = "admin123";    // كلمة مرور رئيس التوجيه

// ── تجزئة كلمة المرور (SHA-256 + ملح) ──────────────────────────────
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function publicUser(u: Doc<"users">) {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    supervisorId: u.supervisorId,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword ?? false,
  };
}

// ── إنشاء الحسابات تلقائياً (إدارياً) ─────────────────────────────
export const seedUsers = mutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;

    // 1) حساب رئيس التوجيه (أدمن)
    const adminExists = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "admin"))
      .first();
    if (!adminExists) {
      const salt = randomToken().slice(0, 16);
      await ctx.db.insert("users", {
        name: "رئيس التوجيه",
        email: "admin@pe.local",
        username: "admin",
        salt,
        passwordHash: await sha256(ADMIN_PASSWORD + salt),
        role: "admin",
        isActive: true,
        mustChangePassword: true,
      });
      created++;
    }

    // 2) حساب لكل موجه نشط
    const supervisors = await ctx.db.query("supervisors").collect();
    for (const sup of supervisors) {
      if (!sup.isActive) continue;
      const username = (sup.email && sup.email.trim())
        ? sup.email.trim().toLowerCase()
        : `m${sup.jobNumber || sup.seq}`;

      const exists = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", username))
        .first();
      if (exists) continue;

      const salt = randomToken().slice(0, 16);
      await ctx.db.insert("users", {
        name: sup.name,
        email: sup.email || `${username}@pe.local`,
        username,
        salt,
        passwordHash: await sha256(DEFAULT_PASSWORD + salt),
        role: "supervisor",
        supervisorId: sup._id,
        isActive: true,
        mustChangePassword: true,
      });
      created++;
    }

    return { created };
  },
});

// ── تسجيل الدخول ──────────────────────────────────────────────────
export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const username = args.username.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (!user || !user.isActive) {
      return { ok: false as const, error: "اسم المستخدم غير موجود أو الحساب موقوف" };
    }
    const hash = await sha256(args.password + user.salt);
    if (hash !== user.passwordHash) {
      return { ok: false as const, error: "كلمة المرور غير صحيحة" };
    }
    const token = randomToken();
    await ctx.db.patch(user._id, { token });
    return { ok: true as const, token, user: publicUser({ ...user, token }) };
  },
});

// ── المستخدم الحالي عبر التوكن ────────────────────────────────────
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!user || !user.isActive) return null;
    return publicUser(user);
  },
});

// ── تسجيل الخروج ──────────────────────────────────────────────────
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (user) await ctx.db.patch(user._id, { token: undefined });
  },
});

// ── تغيير كلمة المرور (للمستخدم نفسه) ─────────────────────────────
export const changePassword = mutation({
  args: { token: v.string(), oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!user) return { ok: false as const, error: "الجلسة منتهية" };

    const oldHash = await sha256(args.oldPassword + user.salt);
    if (oldHash !== user.passwordHash) return { ok: false as const, error: "كلمة المرور الحالية غير صحيحة" };
    if (args.newPassword.length < 6) return { ok: false as const, error: "كلمة المرور الجديدة قصيرة (٦ أحرف على الأقل)" };

    const salt = randomToken().slice(0, 16);
    await ctx.db.patch(user._id, {
      salt,
      passwordHash: await sha256(args.newPassword + salt),
      mustChangePassword: false,
    });
    return { ok: true as const };
  },
});

// ── إدارة المستخدمين (أدمن فقط) ───────────────────────────────────
async function requireAdmin(ctx: any, token: string): Promise<Doc<"users"> | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  return user && user.role === "admin" && user.isActive ? user : null;
}

export const listUsers = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin) return null;
    const users = await ctx.db.query("users").collect();
    return users.map(publicUser);
  },
});

export const adminSetActive = mutation({
  args: { token: v.string(), userId: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin) throw new Error("غير مصرّح");
    if (admin._id === args.userId) throw new Error("لا يمكنك إيقاف حسابك");
    await ctx.db.patch(args.userId, { isActive: args.isActive, ...(args.isActive ? {} : { token: undefined }) });
  },
});

export const adminResetPassword = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin) throw new Error("غير مصرّح");
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("المستخدم غير موجود");
    const pass = target.role === "admin" ? ADMIN_PASSWORD : DEFAULT_PASSWORD;
    const salt = randomToken().slice(0, 16);
    await ctx.db.patch(args.userId, {
      salt,
      passwordHash: await sha256(pass + salt),
      mustChangePassword: true,
      token: undefined,
    });
    return { defaultPassword: pass };
  },
});

// إنشاء مستخدم جديد يدوياً مع تحديد الدور
export const adminCreateUser = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    username: v.string(),
    password: v.string(),
    role: v.union(v.literal("superadmin"), v.literal("admin"), v.literal("supervisor"), v.literal("viewer")),
    supervisorId: v.optional(v.id("supervisors")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin) throw new Error("غير مصرّح");
    // فقط الـ superadmin يقدر ينشئ superadmin آخر — إلا لو مافيش superadmin بعد (أول مرة)
    if (args.role === "superadmin" && admin.role !== "superadmin") {
      const allUsers = await ctx.db.query("users").collect();
      const hasSuperAdmin = allUsers.some((u) => u.role === "superadmin");
      if (hasSuperAdmin)
        return { ok: false as const, error: "فقط السوبر أدمن يمكنه إنشاء حساب سوبر أدمن" };
    }

    const username = args.username.trim().toLowerCase();
    if (!username) return { ok: false as const, error: "اسم المستخدم مطلوب" };
    if (args.password.length < 6) return { ok: false as const, error: "كلمة المرور قصيرة (٦ أحرف على الأقل)" };

    const exists = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
    if (exists) return { ok: false as const, error: "اسم المستخدم مستخدم بالفعل" };

    const salt = randomToken().slice(0, 16);
    await ctx.db.insert("users", {
      name: args.name.trim() || username,
      email: username.includes("@") ? username : `${username}@pe.local`,
      username,
      salt,
      passwordHash: await sha256(args.password + salt),
      role: args.role,
      supervisorId: args.supervisorId,
      isActive: true,
      mustChangePassword: true,
    });
    return { ok: true as const };
  },
});

export const adminSetRole = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    role: v.union(v.literal("superadmin"), v.literal("admin"), v.literal("supervisor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!admin) throw new Error("غير مصرّح");
    // فقط superadmin يقدر يعيّن/يغير دور superadmin
    if (args.role === "superadmin" && admin.role !== "superadmin")
      throw new Error("فقط السوبر أدمن يمكنه تعيين دور سوبر أدمن");
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// ── إنشاء السوبر أدمن الأول (بدون مصادقة — مرة واحدة فقط) ──────────
export const bootstrapSuperAdmin = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    password: v.string(),
    secretKey: v.string(), // مفتاح سري للحماية
  },
  handler: async (ctx, args) => {
    if (args.secretKey !== "PE_SUPER_2026")
      return { ok: false as const, error: "المفتاح السري غير صحيح" };

    // تحقق: هل يوجد superadmin بالفعل؟
    const existing = await ctx.db.query("users").collect();
    const hasSuperAdmin = existing.some((u) => u.role === "superadmin");
    if (hasSuperAdmin)
      return { ok: false as const, error: "يوجد سوبر أدمن بالفعل — استخدم صفحة الإعدادات لإضافة المزيد" };

    const username = args.username.trim().toLowerCase();
    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
    if (taken) return { ok: false as const, error: "اسم المستخدم مستخدم بالفعل" };
    if (args.password.length < 6) return { ok: false as const, error: "كلمة المرور قصيرة" };

    const salt = randomToken().slice(0, 16);
    await ctx.db.insert("users", {
      name: args.name.trim() || username,
      email: username.includes("@") ? username : `${username}@pe.local`,
      username,
      salt,
      passwordHash: await sha256(args.password + salt),
      role: "superadmin",
      isActive: true,
      mustChangePassword: false,
    });
    return { ok: true as const };
  },
});

export const debugDb = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const supervisors = await ctx.db.query("supervisors").collect();
    return {
      usersCount: users.length,
      users: users.map(u => ({ username: u.username, role: u.role, isActive: u.isActive })),
      supervisorsCount: supervisors.length,
    };
  }
});

