import * as XLSX from "xlsx";

/**
 * تصدير مصفوفة بيانات إلى ملف Excel
 * @param data مصفوفة البيانات
 * @param columns تعريف الأعمدة — يدعم:
 *   - { key, label }                 ← الوضع الأساسي: يسحب data[key]
 *   - { key, label, value: fn }      ← وضع محوّل: يستخدم fn(row) بدلاً من data[key]
 * @param filename اسم الملف بدون .xlsx
 */
export function exportToExcel<T extends object>(
  data: T[],
  columns: { key: string; label: string; value?: (row: T) => unknown }[],
  filename: string
) {
  const rows = data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      const val = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
      obj[col.label] = val ?? "";
    }
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // عرض الأعمدة تلقائياً بناءً على أطول عنوان
  const colWidths = columns.map((col) => ({
    wch: Math.max(col.label.length * 1.8, 14),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "البيانات");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
