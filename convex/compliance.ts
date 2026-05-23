import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// الحصول على قائمة التزامات ومواثيق الموجهين بالكامل
export const list = query({
  args: {
    academicYear: v.string(),
  },
  handler: async (ctx, args) => {
    const supervisors = await ctx.db
      .query("supervisors")
      .collect();

    const activeSupervisors = supervisors.filter((s) => s.isActive);

    const results = [];
    for (const sup of activeSupervisors) {
      const item = await ctx.db
        .query("complianceChecklists")
        .withIndex("by_supervisor_year", (q) =>
          q.eq("supervisorId", sup._id).eq("academicYear", args.academicYear)
        )
        .first();

      results.push({
        _id: item?._id,
        supervisorId: sup._id,
        supervisorName: sup.name,
        supervisorJob: sup.jobTitle,
        academicYear: args.academicYear,
        integrityPledge: item?.integrityPledge ?? false,
        ramadanIntegration: item?.ramadanIntegration ?? false,
        updatedAt: item?.updatedAt,
        updatedBy: item?.updatedBy,
      });
    }
    return results;
  },
});

// الحصول على التزام موجه محدد
export const getBySupervisor = query({
  args: {
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("complianceChecklists")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear)
      )
      .first();
  },
});

// تحديث التزام أو توقيع موثق إلكتروني
export const upsert = mutation({
  args: {
    supervisorId: v.id("supervisors"),
    academicYear: v.string(),
    integrityPledge: v.boolean(),
    ramadanIntegration: v.boolean(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("complianceChecklists")
      .withIndex("by_supervisor_year", (q) =>
        q.eq("supervisorId", args.supervisorId).eq("academicYear", args.academicYear)
      )
      .first();

    const data = {
      supervisorId: args.supervisorId,
      academicYear: args.academicYear,
      integrityPledge: args.integrityPledge,
      ramadanIntegration: args.ramadanIntegration,
      updatedAt: Date.now(),
      updatedBy: args.userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return ctx.db.insert("complianceChecklists", data);
    }
  },
});

// استيراد جماعي للالتزام من الإكسيل (Bulk Import)
export const bulkImport = mutation({
  args: {
    records: v.array(
      v.object({
        supervisorName: v.string(),
        academicYear: v.string(),
        integrityPledge: v.boolean(),
        ramadanIntegration: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let importedCount = 0;
    const supervisors = await ctx.db.query("supervisors").collect();

    for (const record of args.records) {
      // البحث عن الموجه بالاسم المقارب أو المطابق
      const supervisor = supervisors.find(
        (s) =>
          s.name.includes(record.supervisorName) ||
          record.supervisorName.includes(s.name) ||
          s.nameKey.includes(record.supervisorName.trim().replace(/\s+/g, "_"))
      );

      if (!supervisor) continue;

      const existing = await ctx.db
        .query("complianceChecklists")
        .withIndex("by_supervisor_year", (q) =>
          q.eq("supervisorId", supervisor._id).eq("academicYear", record.academicYear)
        )
        .first();

      const data = {
        supervisorId: supervisor._id,
        academicYear: record.academicYear,
        integrityPledge: record.integrityPledge,
        ramadanIntegration: record.ramadanIntegration,
        updatedAt: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("complianceChecklists", data);
      }
      importedCount++;
    }
    return importedCount;
  },
});
