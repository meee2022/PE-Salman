import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Import scripts authenticate with a secret from the deployment env (`npx convex env set SEED_TOKEN <random>`).
// Unset or short secret = bypass disabled.
function isSeedToken(token?: string): boolean {
  const secret = process.env.SEED_TOKEN;
  return !!secret && secret.length >= 32 && token === secret;
}

// Resolve a session token to its active user (no seed bypass).
export async function userByToken(
  ctx: QueryCtx | MutationCtx,
  token?: string
): Promise<Doc<"users"> | null> {
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  const u = session
    ? await ctx.db.get(session.userId)
    // legacy single-token logins issued before the sessions table existed
    : await ctx.db.query("users").withIndex("by_token", (q) => q.eq("token", token)).first();
  return u && u.isActive ? u : null;
}

// Sign a user out everywhere, optionally keeping one session alive.
export async function endSessions(ctx: MutationCtx, userId: Doc<"users">["_id"], keepToken?: string) {
  const rows = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  for (const s of rows) if (s.token !== keepToken) await ctx.db.delete(s._id);
  await ctx.db.patch(userId, { token: undefined });
}

// إرجاع المستخدم المرتبط بالتوكن (أو null)
export async function getAuthUser(
  ctx: QueryCtx | MutationCtx,
  token?: string
): Promise<Doc<"users"> | null> {
  if (!token) return null;
  if (isSeedToken(token)) {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "admin"))
      .first();
    return admin && admin.isActive ? admin : null;
  }
  return userByToken(ctx, token);
}

export function isAdmin(u: Doc<"users"> | null): boolean {
  return !!u && (u.role === "admin" || u.role === "superadmin");
}

export function isSuperAdmin(u: Doc<"users"> | null): boolean {
  return !!u && u.role === "superadmin";
}

// admin و superadmin و viewer يطّلعان على كل البيانات؛ الموجه لا
export function canSeeAll(u: Doc<"users"> | null): boolean {
  return !!u && (u.role === "superadmin" || u.role === "admin" || u.role === "viewer");
}

// التأكد من صلاحية الأدمن داخل mutation (يرمي خطأ إن لم يكن)
export async function requireAdminMutation(
  ctx: MutationCtx,
  token?: string
): Promise<Doc<"users">> {
  if (isSeedToken(token)) {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "admin"))
      .first();
    if (admin) return admin;
  }
  const u = await getAuthUser(ctx, token);
  if (!u || (u.role !== "admin" && u.role !== "superadmin"))
    throw new Error("غير مصرّح: هذا الإجراء للمدير فقط");
  return u;
}

// تسجيل تدقيق لأي تعديل مهم
export async function logAudit(
  ctx: MutationCtx,
  user: Doc<"users"> | null,
  action: "create" | "update" | "delete",
  entity: string,
  entityId: string | undefined,
  summary: string
) {
  await ctx.db.insert("auditLogs", {
    userId: user?._id,
    userName: user?.name,
    action,
    entity,
    entityId,
    summary,
    timestamp: Date.now(),
  });
}
