"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Database, CheckCircle2, AlertCircle, Loader2, Play } from "lucide-react";
import { ACTIVITY_IMPORT_DATA } from "@/data/activityImportData";
import { useActiveYear } from "@/hooks/useActiveYear";

type LogEntry = { date: string; code: string };
type SupervisorData = { name: string; record_count: number; daily_log: LogEntry[] };

type ImportStatus = "idle" | "running" | "done" | "error";
type SupResult = { name: string; inserted: number; updated: number; total: number; error?: string };

export default function ImportActivityPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const importLogs = useMutation(api.activity.importSupervisorLogs);

  const [status, setStatus]     = useState<ImportStatus>("idle");
  const [current, setCurrent]   = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [results, setResults]   = useState<SupResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (user?.role !== "admin") {
    return <div className="p-8 text-center text-[#8A7A72] font-bold">هذه الصفحة للمدير فقط</div>;
  }

  const supervisors = ACTIVITY_IMPORT_DATA as unknown as SupervisorData[];
  const totalRecords = supervisors.reduce((a, s) => a + s.record_count, 0);

  async function runImport() {
    setStatus("running");
    setProgress(0);
    setResults([]);
    setErrorMsg("");

    const allResults: SupResult[] = [];

    for (let i = 0; i < supervisors.length; i++) {
      const sup = supervisors[i];
      setCurrent(sup.name);
      setProgress(Math.round((i / supervisors.length) * 100));

      try {
        const res = await importLogs({
          supervisorName: sup.name,
          academicYear: YEAR,
          logs: sup.daily_log as any,
          token: token ?? undefined,
        });
        allResults.push({ name: res.supervisorName, inserted: res.inserted, updated: res.updated, total: res.total });
      } catch (err: any) {
        allResults.push({ name: sup.name, inserted: 0, updated: 0, total: 0, error: err.message ?? "خطأ غير معروف" });
      }

      setResults([...allResults]);
    }

    setProgress(100);
    setCurrent("");
    const hasErrors = allResults.some(r => r.error);
    setStatus(hasErrors ? "error" : "done");
  }

  const totalImported = results.reduce((a, r) => a + r.total, 0);

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="استيراد السجلات اليومية"
        subtitle="استيراد بيانات ورقة كود الزيارات من ملف الاحصاءات 2025 مباشرةً إلى قاعدة البيانات"
        icon={<Database size={24} />}
      />

      {/* معلومات البيانات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "موجه", value: supervisors.length },
          { label: "سجل يومي", value: totalRecords.toLocaleString() },
          { label: "العام الدراسي", value: YEAR },
          { label: "المصدر", value: "الاحصاءات 2025.xlsx" },
        ].map(({ label, value }) => (
          <div key={label} className="card-luxurious p-4 text-center bg-white/70">
            <p className="text-2xl font-black text-primary font-sans">{value}</p>
            <p className="text-xs font-semibold text-[#8A7A72] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* جدول الموجهين وعدد سجلاتهم */}
      <div className="card-luxurious bg-white/70 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between">
          <h2 className="font-black text-[#1C1008] text-sm">بيانات الاستيراد لكل موجه</h2>
          {status === "idle" && (
            <button
              onClick={runImport}
              className="btn-primary flex items-center gap-2 text-sm py-2 px-5"
            >
              <Play size={15} /> تشغيل الاستيراد
            </button>
          )}
          {status === "running" && (
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Loader2 size={16} className="animate-spin" />
              {progress}% — جاري استيراد: {current}
            </div>
          )}
          {status === "done" && (
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
              <CheckCircle2 size={16} /> اكتمل — {totalImported.toLocaleString()} سجل
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-sm font-bold text-red-600">
              <AlertCircle size={16} /> اكتمل مع أخطاء
            </div>
          )}
        </div>

        {/* شريط التقدم */}
        {status === "running" && (
          <div className="px-5 py-2 bg-gold/5 border-b border-gold/10">
            <div className="h-2 bg-black/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-gold rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.04] bg-black/[0.02]">
                <th className="text-right px-5 py-2.5 text-xs font-bold text-[#8A7A72]">الموجه</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">السجلات</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">الحالة</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">جديد</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-[#8A7A72]">محدّث</th>
              </tr>
            </thead>
            <tbody>
              {supervisors.map((sup, i) => {
                const res = results.find(r => r.name === sup.name || r.name.includes(sup.name.split(" ")[0]));
                const isActive = status === "running" && current === sup.name;
                return (
                  <tr key={i} className={`border-b border-black/[0.03] last:border-b-0 transition-colors ${isActive ? "bg-gold/10" : ""}`}>
                    <td className="px-5 py-2.5 font-bold text-[#2A1418] text-sm">{sup.name}</td>
                    <td className="px-4 py-2.5 text-center font-sans font-bold text-[#6b5a52] text-sm">{sup.record_count}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isActive && <Loader2 size={14} className="animate-spin text-primary mx-auto" />}
                      {!isActive && res?.error && <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">{res.error}</span>}
                      {!isActive && res && !res.error && <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />}
                      {!isActive && !res && status === "idle" && <span className="text-[10px] text-[#C0B4AE] font-semibold">انتظار</span>}
                      {!isActive && !res && status === "running" && <span className="text-[10px] text-[#C0B4AE]">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center font-sans font-bold text-emerald-600 text-sm">{res ? res.inserted : "—"}</td>
                    <td className="px-4 py-2.5 text-center font-sans font-bold text-gold-dark text-sm">{res ? res.updated : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ملاحظة */}
      <div className="bg-gold/10 border border-gold/25 rounded-2xl p-4 text-xs font-semibold text-[#8a6a1f] leading-relaxed">
        <strong>تنبيه:</strong> الاستيراد آمن تماماً — إذا وُجد سجل بنفس الموجه والتاريخ سيُحدَّث، وإذا كان جديداً سيُضاف. بعد اكتمال الاستيراد يُعاد حساب ملخص كل موجه تلقائياً. يمكن تشغيل الاستيراد أكثر من مرة بأمان.
      </div>
    </div>
  );
}
