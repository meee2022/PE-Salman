"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { TopBar, Header, SectionBar, InfoRow, SigBlock, Footer, SubmitBar, NotAvailable, FormSpinner, NoteInput } from "@/components/visitFormUI";
import { COORDINATOR_TEMPLATE } from "@/components/coordinatorTemplate";
import { formatCoordinatorMsg } from "@/lib/whatsapp";
import { X } from "lucide-react";
import { OcrUpload } from "@/components/ui/OcrUpload";
import { AiFormSummary } from "@/components/ui/AiFormSummary";

type Dom = { domain: string; indicator: string; recommendations?: string[]; notes?: string };

export default function CoordinatorFormDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"coordinatorForms">;
  const form = useQuery(api.coordinatorForms.get, token ? { id, token } : "skip");
  const bank = useQuery(api.coordinatorForms.recommendationsBank, token ? { token } : "skip");
  const update = useMutation(api.coordinatorForms.update);
  const sign = useMutation(api.coordinatorForms.sign);
  const { show, node: toast } = useToast();

  // جلب رقم هاتف المنسق للإرسال عبر واتساب
  const coordinatorPhone = useQuery(
    api.teachers.getPhone,
    form?.coordinatorName ? { name: form.coordinatorName } : "skip"
  );

  const [domains, setDomains] = useState<Dom[]>([]);
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) {
      // ترقية البيانات القديمة: لو فيها notes نص نحوله لقائمة
      const ds = (form.domains as Dom[]).map((d) => ({
        ...d,
        recommendations: d.recommendations ?? (d.notes ? [d.notes] : []),
      }));
      setDomains(ds);
      setGeneral(form.generalNote ?? "");
    }
  }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  function addRec(di: number, t: string) {
    const x = t.trim(); if (!x) return;
    setDomains((p) => p.map((d, i) => i !== di ? d : ((d.recommendations ?? []).includes(x) ? d : { ...d, recommendations: [...(d.recommendations ?? []), x] })));
  }
  function rmRec(di: number, ri: number) {
    setDomains((p) => p.map((d, i) => i !== di ? d : { ...d, recommendations: (d.recommendations ?? []).filter((_, j) => j !== ri) }));
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({
        id, schoolName: form!.schoolName, coordinatorName: form!.coordinatorName, subject: form!.subject,
        day: form!.day, date: form!.date,
        domains: domains.map((d) => ({ domain: d.domain, indicator: d.indicator, recommendations: d.recommendations ?? [] })),
        generalNote: general || undefined, token: token ?? undefined,
      });
      show("تم حفظ التغييرات");
    } finally { setSaving(false); }
  }
  async function saveSig(which: "supervisor" | "coordinator", d: string | null) {
    await sign({ id, [which === "supervisor" ? "supervisorSignature" : "coordinatorSignature"]: d ?? "", token: token ?? undefined });
    show(d ? "تم حفظ التوقيع" : "تم مسح التوقيع");
  }
  async function submitForm() {
    const miss = firstMissing([
      { value: form!.schoolName, label: "اسم المدرسة" },
      { value: form!.coordinatorName, label: "اسم المنسق" },
      { value: form!.subject, label: "المادة" },
      { value: form!.date, label: "التاريخ" },
      { value: domains, label: "توصيات المجالات", ok: (d) => Array.isArray(d) && d.some((x: any) => (x.recommendations ?? []).length > 0) },
    ]);
    if (miss) { show(missingMsg(miss), "error"); return; }
    if (!form!.supervisorSignature || !form!.coordinatorSignature) { show("يلزم توقيع الموجه والمنسق أولاً", "error"); return; }
    await saveAll(); await sign({ id, submit: true, token: token ?? undefined }); show("تم اعتماد الاستمارة رسمياً");
  }

  // معالجة البيانات المستخرجة من الصورة بواسطة Claude
  function handleOcrExtracted(data: Record<string, unknown>) {
    // تعبئة الملاحظة العامة
    if (data.generalNote && typeof data.generalNote === "string") {
      setGeneral(data.generalNote);
    }
    // تعبئة التوصيات لكل مجال بناءً على التشابه في الاسم
    if (Array.isArray(data.domains)) {
      setDomains((prev) =>
        prev.map((d) => {
          const match = (data.domains as any[]).find(
            (od) => od.domain && (od.domain as string).includes(d.domain.slice(0, 4))
          );
          if (!match) return d;
          const recs: string[] = [];
          if (Array.isArray(match.recommendations)) recs.push(...match.recommendations.filter(Boolean));
          if (Array.isArray(match.strengths)) recs.push(...match.strengths.filter(Boolean));
          if (match.notes && typeof match.notes === "string") recs.push(match.notes);
          return recs.length > 0 ? { ...d, recommendations: [...new Set([...(d.recommendations ?? []), ...recs])] } : d;
        })
      );
    }
    // لو فيه توصيات عامة في strengths/improvements نضيفها للملاحظة
    const extras: string[] = [];
    if (Array.isArray(data.strengths)) extras.push(...(data.strengths as string[]).filter(Boolean));
    if (Array.isArray(data.improvements)) extras.push(...(data.improvements as string[]).filter(Boolean));
    if (extras.length > 0) {
      setGeneral((prev) => {
        const combined = [prev, ...extras].filter(Boolean).join(" · ");
        return combined;
      });
    }
    show("✅ تم استخراج البيانات — راجع الحقول قبل الحفظ");
  }

  // بناء إعدادات الإرسال عبر واتساب
  const sendConfig = form ? {
    formTitle: "استمارة متابعة أداء المنسق",
    recipientName: form.coordinatorName,
    recipientPhone: coordinatorPhone?.mobile,
    recipientJob: coordinatorPhone?.jobTitle ?? "منسق تربوي",
    message: formatCoordinatorMsg({
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      coordinatorName: form.coordinatorName,
      date: form.date,
      domains: domains,
      generalNote: general || undefined,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/forms" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />
      {!locked && (
        <div className="no-print flex justify-end px-1">
          <OcrUpload formType="coordinator" onExtracted={handleOcrExtracted} />
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        <AiFormSummary
          formType="coordinator"
          formData={{
            schoolName: form.schoolName, coordinatorName: form.coordinatorName,
            supervisorName: form.supervisorName, subject: form.subject, date: form.date,
            domains: domains.map((d) => ({ domain: d.domain, indicator: d.indicator, recommendations: d.recommendations ?? [] })),
            generalNote: general,
          }}
        />
      </div>
      <div className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="استمارة الإشراف على أداء المنسق" />
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse"><tbody>
            <InfoRow l1="المدرسة" v1={form.schoolName} l2="اليوم" v2={form.day} />
            <InfoRow l1="المادة" v1={form.subject} l2="التاريخ" v2={form.date} />
            <InfoRow l1="المنسق" v1={form.coordinatorName} l2="الموجه التربوي" v2={form.supervisorName} />
          </tbody></table>
        </div>

        <div className="space-y-3">
          <SectionBar>مجالات التقييم ومؤشرات الأداء والتوصيات</SectionBar>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] sm:text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white">
                  <Th w="4%">م</Th>
                  <Th w="20%">المجال</Th>
                  <Th w="38%">مؤشرات الأداء</Th>
                  <Th w="38%">الملاحظات والتوصيات</Th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d, di) => {
                  const tpl = COORDINATOR_TEMPLATE.find((t) => t.domain === d.domain);
                  const opts = Array.from(new Set([...(tpl?.recommendationBank ?? []), ...(bank ?? [])])).filter((r) => !(d.recommendations ?? []).includes(r));
                  return (
                    <tr key={di} className="hover:bg-gold/5 transition-colors">
                      <Td center className="font-extrabold text-[#5C1523] align-middle bg-stone-50/50">{di + 1}</Td>
                      <Td className="font-extrabold text-[#2A1418] align-top bg-stone-50/20">{d.domain}</Td>
                      <Td className="text-stone-600 align-top leading-relaxed font-semibold">{d.indicator}</Td>
                      <Td className="align-top">
                        <div className="space-y-2">
                          {(d.recommendations ?? []).length > 0 ? (d.recommendations ?? []).map((r, ri) => (
                            <div key={ri} className="flex items-start gap-1.5 bg-white border border-gold/15 rounded-lg px-2 py-1.5">
                              <span className="text-gold-dark font-bold mt-0.5">•</span>
                              <span className="flex-1 text-[11px] font-semibold text-[#2A1418] leading-relaxed">{r}</span>
                              {!locked && <button onClick={() => rmRec(di, ri)} className="text-stone-400 hover:text-red-600 no-print shrink-0"><X size={13} /></button>}
                            </div>
                          )) : <p className="text-[10px] text-stone-400 font-semibold no-print">اختر توصية من البنك أو اكتب توصية جديدة.</p>}
                          {!locked && <NoteInput opts={opts} onAdd={(t) => addRec(di, t)} placeholder="توصية جديدة أو عدّل من البنك…" bankLabel="＋ اختر توصية من البنك…" />}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-stone-400 font-semibold leading-relaxed">* يتم تقديم التغذية الراجعة للمنسق بناءً على الدليل التفسيري للاستمارة.</p>
        </div>

        <div className="space-y-3">
          <SectionBar>ملاحظات عامة (اختياري)</SectionBar>
          {locked ? (
            <div className="border border-gold/15 rounded-2xl p-4 text-xs font-semibold text-[#2A1418] bg-stone-50/30 min-h-[60px] whitespace-pre-wrap leading-relaxed">{general || "—"}</div>
          ) : (
            <textarea value={general} onChange={(e) => setGeneral(e.target.value)} rows={2} className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-4 py-3 rounded-2xl resize-y no-print shadow-sm" placeholder="ملاحظات عامة إضافية..." />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <SigBlock title="اعتماد وتوقيع الموجّه التربوي" locked={locked} value={form.supervisorSignature} onSave={(d) => saveSig("supervisor", d)} />
          <SigBlock title="توقيع منسق المادة بالمدرسة" locked={locked} value={form.coordinatorSignature} onSave={(d) => saveSig("coordinator", d)} />
        </div>
        <Footer code="ES-ESP-P12-F3" />
      </div>
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال تقييم المنسق رسمياً" />}
      {toast}
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: string }) {
  return <th style={{ width: w, border: "1px solid #C9A96E", padding: "8px 10px", fontSize: 11, fontWeight: 800, textAlign: "center" }}>{children}</th>;
}
function Td({ children, center, className = "" }: { children: React.ReactNode; center?: boolean; className?: string }) {
  return <td className={className} style={{ border: "1px solid #E2D9C8", padding: "8px 10px", textAlign: center ? "center" : "right", verticalAlign: "top" }}>{children}</td>;
}
