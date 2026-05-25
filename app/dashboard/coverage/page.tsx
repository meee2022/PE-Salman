"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, NumField, useToast } from "@/components/ui/Modal";
import { PrintButton, PrintHeader, PrintSignature } from "@/components/ui/PrintReport";
import { BarChart3, Pencil, SlidersHorizontal } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

export default function CoveragePage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = ["admin","superadmin"].includes(user?.role ?? "");
  const coverage  = useQuery(api.coverage.listByYear, token ? { academicYear: YEAR, token } : "skip");
  const summaries = useQuery(api.activity.summaries, token ? { academicYear: YEAR, token } : "skip");
  const updateKpi = useMutation(api.coverage.updateKpi);
  const setRequiredForAll = useMutation(api.coverage.setRequiredForAll);

  const [edit, setEdit] = useState<{ supId: Id<"supervisors">; required: number; covered: number; forms: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allVal, setAllVal] = useState(10);
  const { show, node: toast } = useToast();

  if (!coverage || !summaries) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-gold/10 border-t-gold animate-spin" />
          <div className="absolute inset-2 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin" style={{ animationDirection: "reverse", animationDuration: "1s" }} />
        </div>
      </div>
    );
  }

  async function saveEdit() {
    if (!edit) return;
    await updateKpi({ supervisorId: edit.supId, academicYear: YEAR,
      schoolsRequired: edit.required, schoolsCovered: edit.covered, formsCount: edit.forms, token: token ?? undefined });
    setEdit(null); show("تم تحديث التغطية وإعادة حساب النِّسب والحالة");
  }
  async function applyAll() {
    const n = await setRequiredForAll({ academicYear: YEAR, required: allVal, token: token ?? undefined });
    setShowAll(false); show(`تم ضبط المطلوب = ${allVal} لـ ${n} موجه`);
  }

  const sorted = [...coverage].sort((a, b) => b.coverageRate - a.coverageRate);
  const shortName = (full?: string | null) =>
    full ? full.split(" ").slice(0, 2).join(" ") : "—";

  const maxCoverage = Math.max(...sorted.map((r) => r.schoolsRequired), 1);
  const actSorted = [...summaries].sort((a, b) =>
    ((b.VS ?? 0) + (b.CL ?? 0)) - ((a.VS ?? 0) + (a.CL ?? 0))
  );
  const maxAct = Math.max(...actSorted.map((r) => (r.VS ?? 0) + (r.CL ?? 0) + (r.OF ?? 0) + (r.TR ?? 0) + (r.MT ?? 0)), 1);

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="التغطية والمؤشرات" 
        subtitle={`تحليل إحصائي تفصيلي لأداء الموجهين — العام الدراسي ${YEAR}`} 
        icon={<BarChart3 size={26} />}
        action={
          <div className="flex gap-2">
            <PrintButton label="تصدير تقرير المؤشرات (PDF)" />
            {isAdmin && (
              <button onClick={() => setShowAll(true)} className="btn-primary">
                <SlidersHorizontal size={16} /> تعديل المطلوب للجميع
              </button>
            )}
          </div>
        } 
      />

      <PrintHeader title="تقرير التغطية والمؤشرات" subtitle={`العام الدراسي ${YEAR}`} />

      {/* الرسوم البيانية الإحصائية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── شارت التغطية (مطلوب / مغطّى / استمارات) ── */}
        <div className="card-luxurious p-6 bg-white/70 backdrop-blur-md">
          <h2 className="section-title text-[#1C1008] font-black mb-1">مقارنة التغطية والاستمارات</h2>
          <p className="text-[11px] text-[#A89A92] font-semibold mb-5">مطلوب · مغطّى · استمارات — لكل موجه</p>
          {/* مفتاح الألوان */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {[["#E8DECF","مطلوب"],["#5C1523","مغطّى"],["#C9A96E","استمارات"]].map(([c,l])=>(
              <span key={l} className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b5a52]">
                <span className="w-3 h-3 rounded-sm" style={{background:c}}/>
                {l}
              </span>
            ))}
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pl-1">
            {sorted.map((r) => {
              const name = shortName(r.supervisor?.name);
              const reqPct  = (r.schoolsRequired / maxCoverage) * 100;
              const covPct  = (r.schoolsCovered  / maxCoverage) * 100;
              const formPct = (r.formsCount      / maxCoverage) * 100;
              return (
                <div key={r._id} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#2A1418] truncate max-w-[140px]" title={r.supervisor?.name ?? ""}>{name}</span>
                    <span className={`text-[11px] font-black font-sans ${r.coverageRate >= 100 ? "text-emerald-600" : r.coverageRate >= 80 ? "text-primary" : "text-orange-500"}`}>
                      {Math.round(r.coverageRate)}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{width:`${reqPct}%`, background:"#E8DECF"}}/>
                    </div>
                    <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{width:`${covPct}%`, background:"#5C1523"}}/>
                    </div>
                    <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{width:`${formPct}%`, background:"#C9A96E"}}/>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[10px] text-[#A89A92] font-semibold font-sans">{r.schoolsRequired}</span>
                    <span className="text-[10px] text-[#A89A92] font-semibold font-sans">{r.schoolsCovered}</span>
                    <span className="text-[10px] text-[#A89A92] font-semibold font-sans">{r.formsCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── شارت الأنشطة (زيارات / مكتب / تطوير) ── */}
        {actSorted.length > 0 && (
          <div className="card-luxurious p-6 bg-white/70 backdrop-blur-md" style={{ animationDelay: "80ms" }}>
            <h2 className="section-title text-[#1C1008] font-black mb-1">توزيع الأنشطة الإشرافية</h2>
            <p className="text-[11px] text-[#A89A92] font-semibold mb-5">زيارات · مكتب · تطوير — لكل موجه</p>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {[["#5C1523","زيارات"],["#C9A96E","مكتب"],["#7AB8C9","تطوير"]].map(([c,l])=>(
                <span key={l} className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b5a52]">
                  <span className="w-3 h-3 rounded-sm" style={{background:c}}/>
                  {l}
                </span>
              ))}
            </div>
            <div className="space-y-3.5 max-h-[340px] overflow-y-auto pl-1">
              {actSorted.map((r) => {
                const visits  = (r.VS ?? 0) + (r.CL ?? 0);
                const office  = r.OF ?? 0;
                const develop = (r.TR ?? 0) + (r.MT ?? 0);
                const total   = visits + office + develop;
                const name    = shortName(r.supervisor?.name);
                return (
                  <div key={r._id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#2A1418] truncate max-w-[140px]" title={r.supervisor?.name ?? ""}>{name}</span>
                      <span className="text-[11px] font-black text-[#6b5a52] font-sans">{total} يوم</span>
                    </div>
                    {/* شريط مجمّع نسبي */}
                    <div className="h-5 bg-black/[0.04] rounded-xl overflow-hidden flex">
                      {visits  > 0 && <div title={`زيارات: ${visits}`}  className="h-full transition-all duration-700" style={{width:`${(visits/maxAct)*100}%`,  background:"#5C1523"}}/>}
                      {office  > 0 && <div title={`مكتب: ${office}`}    className="h-full transition-all duration-700" style={{width:`${(office/maxAct)*100}%`,  background:"#C9A96E"}}/>}
                      {develop > 0 && <div title={`تطوير: ${develop}`}  className="h-full transition-all duration-700" style={{width:`${(develop/maxAct)*100}%`, background:"#7AB8C9"}}/>}
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[10px] text-[#5C1523] font-bold font-sans">{visits}</span>
                      <span className="text-[10px] text-[#A8853A] font-bold font-sans">{office}</span>
                      <span className="text-[10px] text-sky-600 font-bold font-sans">{develop}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* تفاصيل التغطية بالجدول الزجاجي */}
      <div className="glass-table-container" style={{ animationDelay: "120ms" }}>
        <div className="px-6 py-4 border-b border-black/[0.04] bg-white/50">
          <h2 className="section-title text-[#1C1008] font-black">تفاصيل مؤشرات التغطية للموجهين</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th className="text-center w-16">الترتيب</th>
                <th className="text-right">الموجه التربوي</th>
                <th className="text-center">المدارس المطلوبة</th>
                <th className="text-center">المدارس المغطّاة</th>
                <th className="text-center">الاستمارات</th>
                <th className="text-center">نسبة التغطية الكلية</th>
                <th className="text-center">نسبة الاستمارات</th>
                <th className="text-center">حالة الزيارات</th>
                {isAdmin && <th className="text-center no-print">تعديل</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row._id} className="group">
                  <td className="text-center">
                    <div className="flex justify-center">
                      <span className={`crown-badge ${
                        i === 0 ? "crown-gold" : i === 1 ? "crown-silver" : i === 2 ? "crown-bronze" : "bg-black/[0.04] text-[#A89A92] border border-black/[0.05]"
                      }`}>
                        {i + 1}
                      </span>
                    </div>
                  </td>
                  <td className="font-bold text-[#2A1418]">{row.supervisor?.name ?? "—"}</td>
                  <td className="text-center text-xs font-bold text-[#6b5a52] font-sans">{row.schoolsRequired}</td>
                  <td className="text-center text-xs font-bold text-[#6b5a52] font-sans">{row.schoolsCovered}</td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-xl bg-gold/10 text-gold-dark font-extrabold text-xs border border-gold/10 font-sans">
                      {row.formsCount}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`font-black font-sans text-sm ${row.coverageRate >= 100 ? "text-emerald-600" : row.coverageRate >= 80 ? "text-primary" : "text-orange-500"}`}>
                      {Math.round(row.coverageRate)}%
                    </span>
                  </td>
                  <td className="text-center text-xs font-bold text-[#6b5a52] font-sans">{Math.round(row.formsRate)}%</td>
                  <td className="text-center"><StatusBadge status={row.status} /></td>
                  {isAdmin && (
                    <td className="text-center no-print">
                      <button 
                        onClick={() => setEdit({ supId: row.supervisorId, required: row.schoolsRequired, covered: row.schoolsCovered, forms: row.formsCount })}
                        className="text-primary hover:bg-primary/5 rounded-xl p-2 transition-all"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PrintSignature />

      {/* مودال تعديل تغطية موجه منفرد */}
      {edit && (
        <Modal title="تعديل مؤشرات التغطية والزيارات" onClose={() => setEdit(null)}>
          <div className="p-6 space-y-4">
            <NumField label="عدد المدارس المطلوبة" value={edit.required} onChange={(v) => setEdit({ ...edit, required: v })} />
            <NumField label="عدد المدارس المغطّاة" value={edit.covered} onChange={(v) => setEdit({ ...edit, covered: v })} />
            <NumField label="إجمالي الاستمارات الرقمية" value={edit.forms} onChange={(v) => setEdit({ ...edit, forms: v })} />
            <div className="bg-gold/10 border border-gold/25 rounded-2xl p-4 text-xs font-semibold text-[#8a6a1f] leading-relaxed">
              تنبيه: سيقوم النظام بإعادة حساب نسب التغطية، نسب الاستمارات، وحالة الزيارات للموجه تلقائياً فور الحفظ بناءً على هذه الأرقام الجديدة.
            </div>
          </div>
          <ModalFooter onClose={() => setEdit(null)} onSave={saveEdit} />
        </Modal>
      )}

      {/* مودال تعديل المطلوب لجميع الموجهين */}
      {showAll && (
        <Modal title="تعديل المطلوب لجميع الموجهين" onClose={() => setShowAll(false)}>
          <div className="p-6 space-y-4">
            <NumField label="عدد المدارس المطلوب الجديد للكل" value={allVal} onChange={setAllVal} />
            <div className="bg-gold/10 border border-gold/25 rounded-2xl p-4 text-xs font-semibold text-[#8a6a1f] leading-relaxed">
              تنبيه: سيتم تطبيق هذا الرقم كقيمة افتراضية مستهدفة لـ <strong>جميع الموجهين</strong> المسجلين للعام {YEAR}، وسيُعاد احتساب نسب الأداء والحالة لهم فوراً.
            </div>
          </div>
          <ModalFooter onClose={() => setShowAll(false)} onSave={applyAll} />
        </Modal>
      )}
      {toast}
    </div>
  );
}
