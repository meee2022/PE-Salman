"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import { TopBar, Header, SectionBar, InfoRow, SigBlock, Footer, SubmitBar, NotAvailable, FormSpinner } from "@/components/visitFormUI";
import { formatGenericMsg } from "@/lib/whatsapp";
import { TRAINING_METHODS } from "@/components/visitFormsTemplates";
import { OcrUpload } from "@/components/ui/OcrUpload";
import { Check } from "lucide-react";

type Row = { criterion: string; method: string; responsible: string; timeframe: string; indicators: string; done: boolean };

export default function NewTeacherDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"newTeacherPlans">;
  const form = useQuery(api.newTeacherPlans.get, token ? { id, token } : "skip");
  const recipientPhone = useQuery(api.teachers.getPhone, form?.teacherName ? { name: form.teacherName } : "skip");
  const update = useMutation(api.newTeacherPlans.update);
  const sign = useMutation(api.newTeacherPlans.sign);
  const { show, node: toast } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [coordinator, setCoordinator] = useState("");
  const [deputy, setDeputy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (form) { setRows(form.rows as Row[]); setCoordinator(form.coordinatorName ?? ""); setDeputy(form.deputyName ?? ""); } }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  function setField(ri: number, key: keyof Row, val: string | boolean) {
    setRows((p) => p.map((r, i) => i !== ri ? r : { ...r, [key]: val }));
  }
  function handleOcrExtracted(data: Record<string, unknown>) {
    if (Array.isArray(data.rows)) {
      setRows((prev) =>
        prev.map((r, ri) => {
          const src = (data.rows as any[])[ri];
          if (!src) return r;
          return {
            ...r,
            method: typeof src.method === "string" && src.method ? src.method : r.method,
            responsible: typeof src.responsible === "string" && src.responsible ? src.responsible : r.responsible,
            timeframe: typeof src.timeframe === "string" && src.timeframe ? src.timeframe : r.timeframe,
            indicators: typeof src.indicators === "string" && src.indicators ? src.indicators : r.indicators,
          };
        })
      );
    }
    show("✅ تم استخراج البيانات — راجع الحقول قبل الحفظ");
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({ id, schoolName: form!.schoolName, teacherName: form!.teacherName, coordinatorName: coordinator || undefined, deputyName: deputy || undefined, section: form!.section, rows, token: token ?? undefined });
      show("تم حفظ التغييرات");
    } finally { setSaving(false); }
  }
  async function saveSig(which: "supervisor" | "teacher" | "coordinator", d: string | null) {
    const key = which === "supervisor" ? "supervisorSignature" : which === "teacher" ? "teacherSignature" : "coordinatorSignature";
    await sign({ id, [key]: d ?? "", token: token ?? undefined });
    show(d ? "تم حفظ التوقيع" : "تم مسح التوقيع");
  }
  async function submitForm() {
    if (!form!.supervisorSignature && !form!.coordinatorSignature) { show("يلزم توقيع المنسق أو الموجه أولاً"); return; }
    await saveAll(); await sign({ id, submit: true, token: token ?? undefined }); show("تم اعتماد الخطة رسمياً");
  }

  const sendConfig = form ? {
    formTitle: "خطة تهيئة وتطوير معلم مستجد",
    recipientName: form.teacherName || "المستلم",
    recipientPhone: recipientPhone?.mobile,
    recipientJob: recipientPhone?.jobTitle,
    message: formatGenericMsg({
      formTitle: "خطة تهيئة وتطوير معلم مستجد",
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      recipientName: form.teacherName || "المستلم",
      date: form.academicYear,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/new-teacher" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />
      {!locked && (
        <div className="no-print flex justify-end px-1">
          <OcrUpload formType="newTeacher" onExtracted={handleOcrExtracted} />
        </div>
      )}
      <div className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="خطة تهيئة وتطوير معلم مستجد" />
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse"><tbody>
            <InfoRow l1="المدرسة" v1={form.schoolName} l2="القسم" v2={form.section ?? "التربية الرياضية"} />
            <InfoRow l1="اسم المعلم" v1={form.teacherName} l2="الموجه التربوي" v2={form.supervisorName} />
          </tbody></table>
        </div>

        <div className="space-y-3">
          <SectionBar>معايير التهيئة والتطوير</SectionBar>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-[11px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white">
                  <Th w="22%">المعيار</Th>
                  <Th w="12%">أسلوب التدريب</Th>
                  <Th w="12%">مسؤول التنفيذ</Th>
                  <Th w="12%">الإطار الزمني</Th>
                  <Th w="30%">مؤشرات التنفيذ</Th>
                  <Th w="12%">المتابعة</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-gold/5">
                    <Td className="font-bold text-[#2A1418] align-top leading-relaxed">{r.criterion}</Td>
                    <Td className="align-top">
                      {locked ? r.method : (
                        <select value={r.method} onChange={(e) => setField(ri, "method", e.target.value)} className="w-full bg-[#FCF9F2] border border-gold/25 text-[10px] font-semibold rounded-lg px-1.5 py-1 outline-none no-print">
                          {TRAINING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      )}
                    </Td>
                    <Td className="align-top">
                      {locked ? r.responsible : <input value={r.responsible} onChange={(e) => setField(ri, "responsible", e.target.value)} className="w-full bg-[#FCF9F2] border border-gold/25 text-[10px] font-semibold rounded-lg px-1.5 py-1 outline-none no-print" />}
                    </Td>
                    <Td className="align-top">
                      {locked ? (r.timeframe || "—") : <input value={r.timeframe} onChange={(e) => setField(ri, "timeframe", e.target.value)} placeholder="مثال: شهر 11/2025" className="w-full bg-[#FCF9F2] border border-gold/25 text-[10px] font-semibold rounded-lg px-1.5 py-1 outline-none no-print" />}
                    </Td>
                    <Td className="align-top">
                      {locked ? (r.indicators || "—") : <textarea value={r.indicators} onChange={(e) => setField(ri, "indicators", e.target.value)} rows={2} className="w-full bg-[#FCF9F2] border border-gold/25 text-[10px] font-semibold rounded-lg px-1.5 py-1 outline-none resize-y no-print" />}
                    </Td>
                    <Td center className="align-middle">
                      {locked ? (
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-[10px] font-extrabold border ${r.done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-stone-100 text-stone-500 border-stone-200"}`}>{r.done ? "تم" : "لم يتم"}</span>
                      ) : (
                        <button onClick={() => setField(ri, "done", !r.done)} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border no-print transition-all ${r.done ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-500 border-gold/30"}`}>
                          {r.done && <Check size={11} />} {r.done ? "تم" : "لم يتم"}
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <SigBlock title="اسم وتوقيع المعلم" locked={locked} value={form.teacherSignature} onSave={(d) => saveSig("teacher", d)} />
          <SigBlock title="اسم وتوقيع المنسق" locked={locked} value={form.coordinatorSignature} onSave={(d) => saveSig("coordinator", d)} />
          <SigBlock title="اعتماد الموجه التربوي" locked={locked} value={form.supervisorSignature} onSave={(d) => saveSig("supervisor", d)} />
        </div>
        <Footer code="ES-ESP-P12" />
      </div>
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال الخطة رسمياً" />}
      {toast}
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: string }) {
  return <th style={{ width: w, border: "1px solid #C9A96E", padding: "7px 8px", fontSize: 10.5, fontWeight: 800, textAlign: "center" }}>{children}</th>;
}
function Td({ children, center, className = "" }: { children: React.ReactNode; center?: boolean; className?: string }) {
  return <td className={className} style={{ border: "1px solid #E2D9C8", padding: "6px 8px", textAlign: center ? "center" : "right", verticalAlign: "top" }}>{children}</td>;
}
