import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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

const VALID_CODES = new Set(["OF","VS","CL","LV","SL","TR","MT","AC","AB","SP","VP","OL","WP","HC","CA"]);

export const syncOfficialData = internalMutation({
  args: {
    academicYear: v.string(),
    supervisors: v.array(v.object({ seq: v.number(), name: v.string() })),
    logs: v.array(v.object({
      supervisorSeq: v.number(),
      date: v.string(),
      code: v.string(),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // 1. Get all current supervisors
    const allSups = await ctx.db.query("supervisors").collect();

    // 2. Build official name set (normalized short keys)
    const officialShortKeys = new Set(args.supervisors.map(s => shortKeyOf(s.name)));

    // 3. Match each official supervisor to existing DB record
    const seqToId = new Map<number, string>();
    for (const os of args.supervisors) {
      const sk = shortKeyOf(os.name);
      const nk = normName(os.name);
      // Try to find existing by shortKey or nameKey
      let found = allSups.find(s => shortKeyOf(s.name) === sk || normName(s.name) === nk);
      if (found) {
        // Update seq and ensure active
        await ctx.db.patch(found._id, { seq: os.seq, isActive: true, name: os.name, nameKey: nk, shortKey: sk });
        seqToId.set(os.seq, found._id as string);
      } else {
        // Create new supervisor with minimal fields
        // Determine gender from name (female supervisors: جميله, اقبال, حنان, عائشة, هيام, لينا, موزة, فجر)
        const femaleIndicators = ["جميل", "اقبال", "إقبال", "حنان", "عائش", "هيام", "لينا", "موزة", "فجر"];
        const isFemale = femaleIndicators.some(f => os.name.includes(f));
        const newId = await ctx.db.insert("supervisors", {
          seq: os.seq,
          personalId: "",
          jobNumber: "",
          name: os.name,
          nameKey: nk,
          shortKey: sk,
          jobTitle: "موجه تربوي",
          gender: isFemale ? "female" : "male",
          isActive: true,
        });
        seqToId.set(os.seq, newId as string);
      }
    }

    // 4. Deactivate supervisors not in official list
    let deactivated = 0;
    for (const s of allSups) {
      const sk = shortKeyOf(s.name);
      if (!officialShortKeys.has(sk) && s.isActive) {
        await ctx.db.patch(s._id, { isActive: false });
        deactivated++;
      }
    }

    // 5. Delete all existing activityLogs for this academic year
    const existingLogs = await ctx.db.query("activityLogs").collect();
    let deleted = 0;
    for (const log of existingLogs) {
      if (log.academicYear === args.academicYear) {
        await ctx.db.delete(log._id);
        deleted++;
      }
    }

    // 6. Delete existing activitySummaries for this year
    const existingSummaries = await ctx.db.query("activitySummaries").collect();
    for (const s of existingSummaries) {
      if (s.academicYear === args.academicYear) await ctx.db.delete(s._id);
    }

    // 7. Insert new logs
    let inserted = 0;
    for (const log of args.logs) {
      const supId = seqToId.get(log.supervisorSeq);
      if (!supId) continue;
      if (!VALID_CODES.has(log.code)) continue;
      await ctx.db.insert("activityLogs", {
        supervisorId: supId as any,
        date: log.date,
        code: log.code as any,
        notes: log.notes ?? undefined,
        academicYear: args.academicYear,
      });
      inserted++;
    }

    // 8. Recompute summaries
    const LEAVE_CODES = new Set(["LV","SL","AB","WP","HC","CA"]);
    for (const [seq, supId] of seqToId.entries()) {
      const allLogs = await ctx.db.query("activityLogs").collect();
      const logs = allLogs.filter((l: any) => String(l.supervisorId) === supId && l.academicYear === args.academicYear);
      const counts: Record<string, number> = {};
      for (const l of logs) counts[l.code] = (counts[l.code] ?? 0) + 1;
      await ctx.db.insert("activitySummaries", {
        supervisorId: supId as any,
        academicYear: args.academicYear,
        OF: counts.OF ?? 0, VS: counts.VS ?? 0, CL: counts.CL ?? 0, LV: counts.LV ?? 0,
        SL: counts.SL ?? 0, TR: counts.TR ?? 0, MT: counts.MT ?? 0, AC: counts.AC ?? 0,
        AB: counts.AB ?? 0, SP: counts.SP ?? 0, VP: counts.VP ?? 0, OL: counts.OL ?? 0,
        WP: counts.WP ?? 0, HC: counts.HC ?? 0, CA: counts.CA ?? 0,
        schoolingDays: logs.filter((l: any) => !LEAVE_CODES.has(l.code)).length,
      });
    }

    return { deactivated, deletedLogs: deleted, insertedLogs: inserted };
  },
});
