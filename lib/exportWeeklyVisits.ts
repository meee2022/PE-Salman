import * as XLSX from "xlsx";
import { getWeekInfo } from "./weeklySchedule";

// Builds the ministry's "جدول الزيارات الأسبوعي" workbook (one sheet per week,
// supervisors × Sunday–Thursday) from the daily activity log.

type Log = { supervisorId: string; date: string; code: string; notes?: string };
type Sup = { name: string; ids: string[] }; // ids: the supervisor plus any duplicate records

// Wording follows the Teams file
const LABEL: Record<string, string> = {
  OF: "مكتب", VS: "زيارة", CL: "إجازة عارضة", CA: "إجازة عارضة", LV: "إجازة دورية",
  SL: "إجازة مرضية", HC: "إجازة الحج", TR: "تطوير مهني", MT: "اجتماع", AC: "أنشطة رياضية",
  SP: "مهمة رسمية", VP: "مهمة عمل", OL: "عمل عن بعد", WP: "إذن رسمي", AB: "غياب",
};
// For these the note (school / venue) replaces the generic label
const NOTE_ONLY = new Set(["VS", "TR", "MT", "AC", "SP", "VP"]);

export function cellText(l?: Log): string {
  if (!l) return "";
  const label = LABEL[l.code] ?? l.code, note = l.notes?.trim();
  if (!note || note === label) return label;
  return NOTE_ONLY.has(l.code) ? note : `${label} - ${note}`;
}

// Date maths in UTC so the local timezone never shifts a day
const addDays = (ds: string, n: number) => {
  const d = new Date(ds + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const sundayOf = (ds: string) => addDays(ds, -new Date(ds + "T00:00:00Z").getUTCDay());

/** Returns false when there is nothing to export. */
export function downloadWeeklyVisits(sups: Sup[], logs: Log[], filename: string): boolean {
  if (!logs.length) return false;
  const byKey = new Map(logs.map((l) => [`${l.supervisorId}_${l.date}`, l]));
  const dates = logs.map((l) => l.date).sort();
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  // every week from the first to the last logged one, so week numbers stay continuous
  let n = 0;
  for (let sun = sundayOf(dates[0]); sun <= dates[dates.length - 1]; sun = addDays(sun, 7)) {
    n++;
    const days = [0, 1, 2, 3, 4].map((i) => addDays(sun, i));
    const ws = XLSX.utils.aoa_to_sheet([
      ["", "", "جدول زيارات الموجهين الأسبوعي"],
      ["الإدارة", "", "التوجيه التربوي", "القسم", "التربية البدنية", "الأسبوع", getWeekInfo(sun)?.label ?? `الأسبوع (${n})`],
      ["م", "الاسم", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "المناوبة"],
      ["", "", ...days],
      ...sups.map((s, i) => [
        i + 1, s.name,
        ...days.map((d) => cellText(s.ids.map((id) => byKey.get(`${id}_${d}`)).find(Boolean))),
      ]),
    ]);
    ws["!merges"] = ["C1:G1", "A2:B2", "A3:A4", "B3:B4"].map((r) => XLSX.utils.decode_range(r));
    ws["!cols"] = [{ wch: 4 }, { wch: 32 }, ...days.map(() => ({ wch: 28 })), { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, `الأسبوع (${n})`);
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
  return true;
}
