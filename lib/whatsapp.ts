/**
 * lib/whatsapp.ts
 * أدوات إنشاء روابط واتساب وتنسيق رسائل الاستمارات
 */

/** تحويل رقم قطري لصيغة دولية 974XXXXXXXX */
export function normalizeQatarPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("00974")) return d.slice(2);
  if (d.startsWith("974")) return d;
  if (d.length === 8) return "974" + d;
  if (d.startsWith("0") && d.length === 9) return "974" + d.slice(1);
  return d;
}

/** إنشاء رابط wa.me مع نص مُرمَّز */
export function buildWaLink(phone: string, message: string): string {
  return `https://wa.me/${normalizeQatarPhone(phone)}?text=${encodeURIComponent(message)}`;
}

/** فتح واتساب أو نسخ الرسالة إن لم يوجد رقم */
export function sendOrCopy(phone: string | undefined | null, message: string): void {
  if (phone && phone.replace(/\D/g, "").length >= 8) {
    window.open(buildWaLink(phone, message), "_blank");
  } else {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message).then(() => {
        alert("تم نسخ الرسالة. يمكنك لصقها في واتساب يدوياً.");
      });
    }
  }
}

/** تنسيق التاريخ بالعربية */
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-QA-u-nu-latn", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** ─── رسالة استمارة متابعة المنسق ─────────────────────────────────── */
export interface CoordinatorMsgData {
  supervisorName: string;
  schoolName: string;
  coordinatorName: string;
  date: string;
  domains: Array<{ domain: string; recommendations?: string[]; notes?: string }>;
  generalNote?: string;
}
export function formatCoordinatorMsg(d: CoordinatorMsgData): string {
  const lines = [
    `📋 *استمارة متابعة أداء المنسق التربوي*`,
    `_إدارة التوجيه التربوي · التربية البدنية_`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🏫 *المدرسة:* ${d.schoolName}`,
    `👤 *المنسق:* ${d.coordinatorName}`,
    `📅 *التاريخ:* ${fmtDate(d.date)}`,
    ``,
    `📌 *ملخص نتائج الزيارة:*`,
  ];

  for (const dom of d.domains) {
    const recs = [
      ...(dom.recommendations ?? []),
      ...(dom.notes ? [dom.notes] : []),
    ].filter((r) => r.trim());
    if (recs.length > 0) {
      lines.push(``, `▪️ *${dom.domain}*`);
      recs.slice(0, 3).forEach((r) => lines.push(`   • ${r}`));
    }
  }

  if (d.generalNote?.trim()) {
    lines.push(``, `💬 *ملاحظات عامة:*`, d.generalNote);
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✍️ *الموجه التربوي:* ${d.supervisorName}`,
    ``,
    `📎 _يُرجى مراجعة الاستمارة الكاملة في الملف المرفق_`,
  );

  return lines.join("\n");
}

/** ─── رسالة استمارة متابعة المعلم ──────────────────────────────────── */
export interface TeacherMsgData {
  supervisorName: string;
  schoolName: string;
  teacherName: string;
  date: string;
  topic?: string;
  grade?: string;
  domains: Array<{ domain: string; recommendations: string[] }>;
  generalNote?: string;
}
export function formatTeacherMsg(d: TeacherMsgData): string {
  const lines = [
    `📋 *استمارة متابعة أداء المعلم*`,
    `_إدارة التوجيه التربوي · التربية البدنية_`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🏫 *المدرسة:* ${d.schoolName}`,
    `👤 *المعلم:* ${d.teacherName}`,
    `📅 *التاريخ:* ${fmtDate(d.date)}`,
    ...(d.topic ? [`📚 *الموضوع:* ${d.topic}`] : []),
    ...(d.grade ? [`🎓 *الصف:* ${d.grade}`] : []),
    ``,
    `📌 *التوصيات:*`,
  ];

  for (const dom of d.domains) {
    const recs = dom.recommendations.filter((r) => r.trim());
    if (recs.length > 0) {
      lines.push(``, `▪️ *${dom.domain}*`);
      recs.slice(0, 3).forEach((r) => lines.push(`   • ${r}`));
    }
  }

  if (d.generalNote?.trim()) {
    lines.push(``, `💬 *ملاحظات عامة:*`, d.generalNote);
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✍️ *الموجه التربوي:* ${d.supervisorName}`,
    ``,
    `📎 _يُرجى مراجعة الاستمارة الكاملة في الملف المرفق_`,
  );

  return lines.join("\n");
}

/** ─── رسالة محضر اجتماع الزيارة التعارفية ──────────────────────────── */
export interface MeetingMsgData {
  supervisorName: string;
  schoolName: string;
  coordinatorName?: string;
  date: string;
  objectives: string[];
  recommendations: string[];
  summary?: string;
  attendance: Array<{ name: string }>;
}
export function formatMeetingMsg(d: MeetingMsgData): string {
  const lines = [
    `📋 *محضر اجتماع الزيارة التعارفية*`,
    `_إدارة التوجيه التربوي · التربية البدنية_`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🏫 *المدرسة:* ${d.schoolName}`,
    ...(d.coordinatorName ? [`👤 *المنسق:* ${d.coordinatorName}`] : []),
    `📅 *التاريخ:* ${fmtDate(d.date)}`,
    `👥 *الحضور:* ${d.attendance.length > 0 ? d.attendance.map((a) => a.name).join(" · ") : "—"}`,
  ];

  if (d.objectives.length > 0) {
    lines.push(``, `🎯 *أهداف الاجتماع:*`);
    d.objectives.slice(0, 4).forEach((o) => lines.push(`   • ${o}`));
  }

  if (d.recommendations.length > 0) {
    lines.push(``, `✅ *التوصيات:*`);
    d.recommendations.slice(0, 4).forEach((r) => lines.push(`   • ${r}`));
  }

  if (d.summary?.trim()) {
    lines.push(``, `💬 *ملخص الاجتماع:*`, d.summary);
  }

  lines.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✍️ *الموجه التربوي:* ${d.supervisorName}`,
    ``,
    `📎 _يُرجى الاطلاع على المحضر الكامل في الملف المرفق_`,
  );

  return lines.join("\n");
}

/** ─── رسالة عامة لأي استمارة ────────────────────────────────────────── */
export function formatGenericMsg(data: {
  formTitle: string;
  supervisorName: string;
  schoolName: string;
  recipientName: string;
  date: string;
  notes?: string;
}): string {
  return [
    `📋 *${data.formTitle}*`,
    `_إدارة التوجيه التربوي · التربية البدنية_`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🏫 *المدرسة:* ${data.schoolName}`,
    `👤 *المعني:* ${data.recipientName}`,
    `📅 *التاريخ:* ${fmtDate(data.date)}`,
    ...(data.notes ? [``, `💬 *ملاحظات:*`, data.notes] : []),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✍️ *الموجه التربوي:* ${data.supervisorName}`,
    ``,
    `📎 _يُرجى الاطلاع على الاستمارة الكاملة في الملف المرفق_`,
  ].join("\n");
}
