import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, isAdmin } from "./permissions";

// آخر سجلات التدقيق — للأدمن فقط
export const list = query({
  args: { limit: v.optional(v.number()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.token);
    if (!isAdmin(user)) return null;
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 50);
    return rows;
  },
});
