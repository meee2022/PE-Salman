import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/* ────────────────────────────────────────────────────────────────────
   مساعد جانب-الخادم لجلب لقطة بيانات النظام لاستخدامها في تحليلات
   وتقارير الذكاء الاصطناعي. يحترم صلاحيات المستخدم عبر تمرير التوكن.
   ──────────────────────────────────────────────────────────────────── */

export function getConvex(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("إعداد Convex غير متوفر (NEXT_PUBLIC_CONVEX_URL)");
  return new ConvexHttpClient(url);
}

export interface SystemSnapshot {
  academicYear: string;
  coverage: any[];
  alerts: any[];
  activitySummaries: any[];
  schoolsCount: number;
  schoolsByGender: { male: number; female: number };
}

/** لقطة شاملة لأداء القسم في سنة دراسية. */
export async function fetchSnapshot(
  token: string,
  academicYear: string
): Promise<SystemSnapshot> {
  const convex = getConvex();
  const [coverage, alerts, activitySummaries, schools] = await Promise.all([
    convex.query(api.coverage.listByYear, { academicYear, token }),
    convex.query(api.alerts.list, { academicYear, token }),
    convex.query(api.activity.summaries, { academicYear, token }),
    convex.query(api.schools.list, { token }),
  ]);

  const list = (schools as any[]) ?? [];
  return {
    academicYear,
    coverage: ((coverage as any[]) ?? []).map((c) => ({
      supervisor: c.supervisor?.name ?? "",
      schoolsRequired: c.schoolsRequired,
      schoolsCovered: c.schoolsCovered,
      coverageRate: c.coverageRate,
      formsCount: c.formsCount,
      formsRate: c.formsRate,
      status: c.status,
    })),
    alerts: (alerts as any[]) ?? [],
    activitySummaries: ((activitySummaries as any[]) ?? []).map((s: any) => ({
      supervisor: s.supervisor?.name ?? s.supervisorName ?? "",
      ...s,
      supervisor_obj: undefined,
    })),
    schoolsCount: list.length,
    schoolsByGender: {
      male: list.filter((s) => s.gender === "male").length,
      female: list.filter((s) => s.gender === "female").length,
    },
  };
}
