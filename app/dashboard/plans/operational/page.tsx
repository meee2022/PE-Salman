"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, TxtField, useToast } from "@/components/ui/Modal";
import { printOperationalPlan } from "@/lib/exportUtils";
import { OPERATIONAL_PLAN_DATA } from "@/data/operationalPlanData";
import {
  ListChecks, Printer, Plus, Pencil, Trash2, ChevronRight, Database,
  Loader2, CopyPlus, Target, ArrowRight, Check,
} from "lucide-react";

type OpRow = Doc<"operationalPlans">;
type RowForm = {
  id?: Id<"operationalPlans">;
  domain: string; domainOrder: number;
  objective: string; objectiveOrder: number;
  action: string; endDate: string; responsible: string; outputs: string; kpi: string;
};

const DOMAIN_COLORS = ["#5C1523", "#0284C7", "#059669", "#A8853A"];

export default function OperationalPlanPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const isAdmin = ["admin", "superadmin"].includes(user?.role ?? "");

  const rows = useQuery(api.operationalPlans.listByYear, token ? { academicYear: YEAR, token } : "skip");
  const createRow = useMutation(api.operationalPlans.create);
  const updateRow = useMutation(api.operationalPlans.update);
  const removeRow = useMutation(api.operationalPlans.remove);
  const seedPlan  = useMutation(api.operationalPlans.bulkSeed);

  const { show: showToast, node: toastNode } = useToast();
  const [form, setForm] = useState<RowForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // جمّع حسب المجال ← الهدف
  const grouped = useMemo(() => {
    if (!rows) return [];
    const domains = Array.from(new Set([...rows].sort((a, b) => a.domainOrder - b.domainOrder).map(r => r.domain)));
    return domains.map((domain) => {
      const domRows = rows.filter(r => r.domain === domain);
      const objectives = Array.from(new Set([...domRows].sort((a, b) => a.objectiveOrder - b.objectiveOrder).map(r => r.objective)));
      return {
        domain,
        domainOrder: domRows[0]?.domainOrder ?? 0,
        objectives: objectives.map(objective => ({
          objective,
          actions: domRows.filter(r => r.objective === objective),
        })),
      };
    });
  }, [rows]);

  async function handleSeed() {
    if (!confirm(`سيتم تحميل بنود الخطة الإجرائية (${OPERATIONAL_PLAN_DATA.length} إجراء) للعام ${YEAR}. متابعة؟`)) return;
    setSeeding(true);
    try {
      await seedPlan({ academicYear: YEAR, items: OPERATIONAL_PLAN_DATA as any, token: token ?? undefined });
      showToast("تم تحميل الخطة الإجرائية بنجاح");
    } catch (e: any) {
      showToast("خطأ: " + (e.message ?? "فشل التحميل"));
    }
    setSeeding(false);
  }

  async function saveForm() {
    if (!form) return;
    setSaving(true);
    try {
      if (form.id) {
        await updateRow({
          id: form.id, domain: form.domain, objective: form.objective,
          action: form.action, endDate: form.endDate, responsible: form.responsible,
          outputs: form.outputs, kpi: form.kpi, token: token ?? undefined,
        });
        showToast("تم تحديث الإجراء");
      } else {
        await createRow({
          academicYear: YEAR, domain: form.domain, domainOrder: form.domainOrder,
          objective: form.objective, objectiveOrder: form.objectiveOrder,
          action: form.action, endDate: form.endDate, responsible: form.responsible,
          outputs: form.outputs, kpi: form.kpi, token: token ?? undefined,
        });
        showToast("تمت إضافة الإجراء");
      }
      setForm(null);
    } catch (e: any) {
      showToast("خطأ: " + (e.message ?? "فشل الحفظ"));
    }
    setSaving(false);
  }

  async function del(id: Id<"operationalPlans">) {
    if (!confirm("حذف هذا الإجراء؟")) return;
    await removeRow({ id, token: token ?? undefined });
    showToast("تم الحذف");
  }

  function handlePrint() {
    if (!rows || !rows.length) return;
    printOperationalPlan({ year: YEAR, rows });
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="الخطة الإجرائية العامة"
        subtitle={`قسم التربية البدنية — العام الأكاديمي ${YEAR}`}
        icon={<ListChecks size={24} />}
        action={
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {rows && rows.length > 0 && (
              <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-sm transition-all" title="طباعة / حفظ PDF">
                <Printer size={14} /> طباعة / PDF
              </button>
            )}
            {isAdmin && rows && rows.length > 0 && (
              <button onClick={() => setForm({ domain: grouped[0]?.domain ?? "", domainOrder: 1, objective: grouped[0]?.objectives[0]?.objective ?? "", objectiveOrder: 1, action: "", endDate: "", responsible: "", outputs: "", kpi: "" })} className="btn-primary text-xs">
                <Plus size={14} /> إضافة إجراء
              </button>
            )}
          </div>
        }
      />

      {/* مسار التنقل */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A7A72]">
        <Link href="/dashboard/plans" className="hover:text-primary transition-colors">الخطط</Link>
        <ChevronRight size={13} className="rotate-180" />
        <span className="text-primary">الخطة الإجرائية العامة</span>
      </div>

      {/* تحميل / فارغ */}
      {rows === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <div className="card-luxurious bg-white/70 p-10 text-center space-y-4">
          <div className="icon-orb !w-14 !h-14 bg-primary/5 text-primary mx-auto"><ListChecks size={26} /></div>
          <div>
            <h3 className="font-black text-[#1C1008] text-lg">لا توجد خطة إجرائية للعام {YEAR}</h3>
            <p className="text-sm text-[#8A7A72] font-semibold mt-1">يمكنك تحميل البنود الجاهزة (4 مجالات · 8 أهداف · {OPERATIONAL_PLAN_DATA.length} إجراء) ثم تعديلها</p>
          </div>
          {isAdmin && (
            <button onClick={handleSeed} disabled={seeding} className="btn-primary mx-auto">
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              تحميل بنود الخطة الإجرائية
            </button>
          )}
        </div>
      ) : (
        <>
          {/* بطاقات ملخص */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "المجالات", value: grouped.length },
              { label: "الأهداف", value: grouped.reduce((a, g) => a + g.objectives.length, 0) },
              { label: "الإجراءات", value: rows.length },
              { label: "العام الدراسي", value: YEAR },
            ].map(s => (
              <div key={s.label} className="card-luxurious p-4 text-center bg-white/70">
                <p className="text-2xl font-black text-primary font-sans">{s.value}</p>
                <p className="text-xs font-semibold text-[#8A7A72] mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* المجالات */}
          {grouped.map((g, di) => {
            const color = DOMAIN_COLORS[di % DOMAIN_COLORS.length];
            return (
              <div key={g.domain} className="space-y-4">
                <div className="rounded-2xl px-5 py-3.5 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
                  <span className="text-white font-black text-base">{g.domain}</span>
                </div>

                {g.objectives.map((obj) => (
                  <div key={obj.objective} className="card-luxurious bg-white/70 overflow-hidden">
                    <div className="px-5 py-3 flex items-start gap-2.5 border-b border-black/[0.05] bg-black/[0.015]">
                      <Target size={16} className="text-gold-dark mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-[#8A7A72]">الهدف</span>
                        <p className="font-black text-[#2A1418] text-sm leading-snug">{obj.objective}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-l from-primary to-[#7A1E30]">
                            <th className="text-right px-4 py-2.5 text-[11px] font-bold text-white" style={{ minWidth: 240 }}>الإجراءات</th>
                            <th className="text-center px-3 py-2.5 text-[11px] font-bold text-white whitespace-nowrap">تاريخ الانتهاء</th>
                            <th className="text-center px-3 py-2.5 text-[11px] font-bold text-white">المنفذ/المسؤول</th>
                            <th className="text-right px-4 py-2.5 text-[11px] font-bold text-white" style={{ minWidth: 180 }}>المخرجات المتوقَّعة</th>
                            <th className="text-right px-4 py-2.5 text-[11px] font-bold text-white" style={{ minWidth: 180 }}>مؤشر الأداء</th>
                            {isAdmin && <th className="px-2 py-2.5 text-[11px] font-bold text-white"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {obj.actions.map((a, i) => (
                            <tr key={a._id} className={i % 2 === 0 ? "bg-white" : "bg-[#FCF9F2]"}>
                              <td className="px-4 py-2.5 text-[12px] font-semibold text-[#2A1418] align-top leading-relaxed">{a.action}</td>
                              <td className="px-3 py-2.5 text-[11px] font-bold text-gold-dark text-center align-top whitespace-nowrap">{a.endDate || "—"}</td>
                              <td className="px-3 py-2.5 text-[11px] font-bold text-primary text-center align-top">{a.responsible || "—"}</td>
                              <td className="px-4 py-2.5 text-[11px] text-[#4b3a32] align-top leading-relaxed whitespace-pre-line">{a.outputs || "—"}</td>
                              <td className="px-4 py-2.5 text-[11px] text-[#4b3a32] align-top leading-relaxed whitespace-pre-line">{a.kpi || "—"}</td>
                              {isAdmin && (
                                <td className="px-2 py-2.5 align-top">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => setForm({ id: a._id, domain: a.domain, domainOrder: a.domainOrder, objective: a.objective, objectiveOrder: a.objectiveOrder, action: a.action, endDate: a.endDate, responsible: a.responsible, outputs: a.outputs, kpi: a.kpi })} className="text-primary hover:bg-primary/5 rounded-lg p-1.5 transition-all" title="تعديل"><Pencil size={13} /></button>
                                    <button onClick={() => del(a._id)} className="text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-all" title="حذف"><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}

      {/* نافذة إضافة/تعديل */}
      {form && (
        <Modal title={form.id ? "تعديل إجراء" : "إضافة إجراء جديد"} onClose={() => setForm(null)} wide>
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TxtField label="المجال" required value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} />
              <TxtField label="الهدف" required value={form.objective} onChange={(v) => setForm({ ...form, objective: v })} />
            </div>
            <TxtArea label="الإجراء" required value={form.action} onChange={(v) => setForm({ ...form, action: v })} />
            <div className="grid grid-cols-2 gap-3">
              <TxtField label="تاريخ الانتهاء" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} placeholder="مثال: سبتمبر 2025 / مستمر / فصلي" />
              <TxtField label="المنفذ / المسؤول" value={form.responsible} onChange={(v) => setForm({ ...form, responsible: v })} />
            </div>
            <TxtArea label="المخرجات المتوقَّعة" value={form.outputs} onChange={(v) => setForm({ ...form, outputs: v })} />
            <TxtArea label="مؤشر الأداء والقيم المستهدفة" value={form.kpi} onChange={(v) => setForm({ ...form, kpi: v })} />
          </div>
          <ModalFooter onClose={() => setForm(null)} onSave={saveForm} saving={saving} disabled={!form.action.trim() || !form.domain.trim() || !form.objective.trim()} />
        </Modal>
      )}
      {toastNode}
    </div>
  );
}

// حقل نصي متعدد الأسطر
function TxtArea({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#2A1418] mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="field resize-y leading-relaxed" style={{ minHeight: 70 }} />
    </div>
  );
}
