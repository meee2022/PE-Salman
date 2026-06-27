// مساعد تحقق بسيط لرسائل خطأ محددة على الاستمارات
// يُعيد اسم أول خانة ناقصة (أو null لو الكل مكتمل)

export type FieldCheck = {
  value: unknown;
  label: string;
  ok?: (v: any) => boolean; // شرط مخصّص (اختياري)
};

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "number") return Number.isNaN(v);
  return false;
}

/** يُعيد label أول خانة ناقصة، أو null إن اكتملت كلها. */
export function firstMissing(fields: FieldCheck[]): string | null {
  for (const f of fields) {
    const bad = f.ok ? !f.ok(f.value) : isEmpty(f.value);
    if (bad) return f.label;
  }
  return null;
}

/** رسالة موحّدة: "يرجى ملء خانة: …" */
export function missingMsg(label: string): string {
  return `يرجى ملء خانة: ${label}`;
}
