"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import { TopBar, Header, SectionBar, InfoRow, SigBlock, Footer, SubmitBar, NotAvailable, FormSpinner } from "@/components/visitFormUI";
import { formatGenericMsg } from "@/lib/whatsapp";
import { OcrUpload } from "@/components/ui/OcrUpload";

type Act = { context: string; outcome: string; tools: string; description: string; score: string };

export default function ExamFormDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"examForms">;
  const form = useQuery(api.examForms.get, token ? { id, token } : "skip");
  const recipientPhone = useQuery(api.teachers.getPhone, form?.teacherName ? { name: form.teacherName } : "skip");
  const update = useMutation(api.examForms.update);
  const sign = useMutation(api.examForms.sign);
  const { show, node: toast } = useToast();

  const [acts, setActs] = useState<Act[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (form) { setActs(form.activities as Act[]); setNote(form.supervisorNote ?? ""); } }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  function setField(ai: number, key: keyof Act, val: string) {
    setActs((prev) => prev.map((a, i) => i !== ai ? a : { ...a, [key]: val }));
  }
  async function saveAll() {
    setSaving(true);
    try {
      await update({ id, schoolName: form!.schoolName, teacherName: form!.teacherName, stage: form!.stage, grade: form!.grade, day: form!.day, date: form!.date, term: form!.term, activities: acts, supervisorNote: note || undefined, token: token ?? undefined });
      show("تم حفظ التغييرات");
    } finally { setSaving(false); }
  }
  async function saveSig(which: "supervisor" | "teacher", d: string | null) {
    await sign({ id, [which === "supervisor" ? "supervisorSignature" : "teacherSignature"]: d ?? "", token: token ?? undefined });
    show(d ? "تم حفظ التوقيع" : "تم مسح التوقيع");
  }
  function handleOcrExtracted(data: Record<string, unknown>) {
    if (data.supervisorNote && typeof data.supervisorNote === "string") setNote(data.supervisorNote);
    if (Array.isArray(data.activities)) {
      setActs((prev) =>
        prev.map((a, ai) => {
          const src = (data.activities as any[])[ai];
          if (!src) return a;
          return {
            context: typeof src.context === "string" && src.context ? src.context : a.context,
            outcome: typeof src.outcome === "string" && src.outcome ? src.outcome : a.outcome,
            tools: typeof src.tools === "string" && src.tools ? src.tools : a.tools,
            description: typeof src.description === "string" && src.description ? src.description : a.description,
            score: typeof src.score === "string" && src.score ? src.score : (typeof src.score === "number" ? String(src.score) : a.score),
          };
        })
      );
    }
    show("✅ تم استخراج البيانات — راجع الحقول قبل الحفظ");
  }

  async function submitForm() {
    const miss = firstMissing([
      { value: form!.schoolName, label: "اسم المدرسة" },
      { value: form!.teacherName, label: "اسم المعلم" },
      { value: form!.date, label: "التاريخ" },
    ]);
    if (miss) { show(missingMsg(miss), "error"); return; }
    if (!form!.supervisorSignature) { show("يلزم توقيع الموجه أولاً", "error"); return; }
    await saveAll();
    await sign({ id, submit: true, token: token ?? undefined });
    show("تم اعتماد الاستمارة رسمياً");
  }

  const sendConfig = form ? {
    formTitle: "استمارة الاختبار العملي",
    recipientName: form.teacherName || "المستلم",
    recipientPhone: recipientPhone?.mobile,
    recipientJob: recipientPhone?.jobTitle,
    message: formatGenericMsg({
      formTitle: "استمارة الاختبار العملي",
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      recipientName: form.teacherName || "المستلم",
      date: form.date,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/exam-forms" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />
      {!locked && (
        <div className="no-print flex justify-end px-1">
          <OcrUpload formType="exam" onExtracted={handleOcrExtracted} />
        </div>
      )}
      <div className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="استمارة الاختبار العملي" />
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse"><tbody>
            <InfoRow l1="المدرسة" v1={form.schoolName} l2="اليوم / التاريخ" v2={`${form.day} · ${form.date}`} />
            <InfoRow l1="المنسق / المعلم" v1={form.teacherName} l2="المرحلة" v2={form.stage ?? "—"} />
            <InfoRow l1="الصف" v1={form.grade ?? "—"} l2="الفصل الدراسي" v2={form.term ?? "—"} />
            <InfoRow l1="الموجه التربوي" v1={form.supervisorName} l2="المادة" v2="التربية البدنية" />
          </tbody></table>
        </div>

        {acts.map((a, ai) => (
          <div key={ai} className="space-y-3">
            <SectionBar>{ai === 0 ? "النشاط الأول" : "النشاط الثاني"}</SectionBar>
            <table className="w-full text-[11px] sm:text-xs border-collapse"><tbody>
              <ActRow label="السياق التعليمي / الموضوع" value={a.context} locked={locked} onChange={(v) => setField(ai, "context", v)} />
              <ActRow label="ناتج التعلم" value={a.outcome} locked={locked} onChange={(v) => setField(ai, "outcome", v)} />
              <ActRow label="الأدوات المستخدمة في الاختبار" value={a.tools} locked={locked} onChange={(v) => setField(ai, "tools", v)} />
              <ActRow label="وصف الاختبار (الأنشطة)" value={a.description} locked={locked} onChange={(v) => setField(ai, "description", v)} big />
              <ActRow label="توزيع الدرجات" value={a.score} locked={locked} onChange={(v) => setField(ai, "score", v)} />
            </tbody></table>
          </div>
        ))}

        <div className="space-y-3">
          <SectionBar>اعتماد الموجه والملاحظات</SectionBar>
          {locked ? (
            <div className="border border-gold/15 rounded-2xl p-4 text-xs font-semibold text-[#2A1418] bg-stone-50/30 min-h-[70px] whitespace-pre-wrap leading-relaxed">{note || "—"}</div>
          ) : (
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-4 py-3.5 rounded-2xl resize-y no-print shadow-sm" placeholder="ملاحظات الموجه واعتماده للاختبار..." />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <SigBlock title="اعتماد وتوقيع الموجّه التربوي" locked={locked} value={form.supervisorSignature} onSave={(d) => saveSig("supervisor", d)} />
          <SigBlock title="توقيع المنسق / المعلم" locked={locked} value={form.teacherSignature} onSave={(d) => saveSig("teacher", d)} />
        </div>
        <Footer code="ES-ESP-P18-F1" />
      </div>
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال الاستمارة رسمياً" />}
      {toast}
    </div>
  );
}

function ActRow({ label, value, locked, onChange, big }: { label: string; value: string; locked: boolean; onChange: (v: string) => void; big?: boolean }) {
  return (
    <tr>
      <td style={{ border: "1px solid #D2C8B5", padding: "8px 12px", background: "#F4EFE6", fontWeight: 800, fontSize: 11, color: "#5C1523", textAlign: "right", width: "22%", verticalAlign: "top" }}>{label}</td>
      <td style={{ border: "1px solid #D2C8B5", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#2A1418", textAlign: "right" }}>
        {locked ? <span className="whitespace-pre-wrap leading-relaxed">{value || "—"}</span> : (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={big ? 3 : 1} className="w-full bg-[#FCF9F2] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[11px] font-semibold px-2.5 py-1.5 rounded-lg resize-y no-print" />
        )}
      </td>
    </tr>
  );
}

