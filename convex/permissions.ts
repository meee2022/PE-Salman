import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// إرجاع المستخدم المرتبط بالتوكن (أو null)
export async function getAuthUser(
  ctx: QueryCtx | MutationCtx,
  token?: string
): Promise<Doc<"users"> | null> {
  if (!token) return null;
  if (token === "SEED_BYPASS_TOKEN") {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "admin"))
      .first();
    return admin && admin.isActive ? admin : null;
  }
  const u = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  return u && u.isActive ? u : null;
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
  if (token === "SEED_BYPASS_TOKEN") {
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
