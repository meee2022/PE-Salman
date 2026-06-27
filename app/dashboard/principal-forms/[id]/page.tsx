"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { AiFormSummary } from "@/components/ui/AiFormSummary";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import { TopBar, Header, SectionBar, InfoRow, SigBlock, SigImg, SubmitBar, NotAvailable, FormSpinner, NoteInput } from "@/components/visitFormUI";
import { formatGenericMsg } from "@/lib/whatsapp";
import { PRINCIPAL_TEMPLATE } from "@/components/visitFormsTemplates";
import { OcrUpload } from "@/components/ui/OcrUpload";
import { X } from "lucide-react";

type Dom = { domain: string; score: number; indicators: string[]; notes: string[] };

export default function PrincipalFormDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"principalForms">;
  const form = useQuery(api.principalForms.get, token ? { id, token } : "skip");
  const recipientPhone = useQuery(api.teachers.getPhone, form?.principalName ? { name: form.principalName } : "skip");
  const bank = useQuery(api.principalForms.notesBank, token ? { token } : "skip");
  const update = useMutation(api.principalForms.update);
  const sign = useMutation(api.principalForms.sign);
  const { show, node: toast } = useToast();

  const [domains, setDomains] = useState<Dom[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (form) setDomains(form.domains as Dom[]); }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  function addNote(di: number, t: string) {
    const x = t.trim();
    if (!x) return;
    setDomains((p) => p.map((d, i) => i !== di ? d : (d.notes.includes(x) ? d : { ...d, notes: [...d.notes, x] })));
  }
  function rmNote(di: number, ni: number) {
    setDomains((p) => p.map((d, i) => i !== di ? d : { ...d, notes: d.notes.filter((_, j) => j !== ni) }));
  }

  function handleOcrExtracted(data: Record<string, unknown>) {
    if (Array.isArray(data.domains)) {
      setDomains((prev) =>
        prev.map((d) => {
          const match = (data.domains as any[]).find(
            (od) => od.domain && (od.domain as string).includes(d.domain.slice(0, 4))
          );
          if (!match) return d;
          const newNotes: string[] = [];
          if (Array.isArray(match.notes)) newNotes.push(...(match.notes as string[]).filter(Boolean));
          if (match.recommendations && typeof match.recommendations === "string") newNotes.push(match.recommendations);
          if (Array.isArray(match.recommendations)) newNotes.push(...(match.recommendations as string[]).filter(Boolean));
          return newNotes.length > 0 ? { ...d, notes: Array.from(new Set([...d.notes, ...newNotes])) } : d;
        })
      );
    }
    const extras: string[] = [];
    if (Array.isArray(data.recommendations)) extras.push(...(data.recommendations as string[]).filter(Boolean));
    if (extras.length > 0) {
      setDomains((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((d, i) => i === prev.length - 1 ? { ...d, notes: Array.from(new Set([...d.notes, ...extras])) } : d);
      });
    }
    show("✅ تم استخراج البيانات — راجع الحقول قبل الحفظ");
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({ id, domains, token: token ?? undefined });
      show("تم حفظ التغييرات");
    } finally { setSaving(false); }
  }

  async function saveSig(d: string | null) {
    await sign({ id, supervisorSignature: d ?? "", token: token ?? undefined });
    show(d ? "تم حفظ التوقيع" : "تم مسح التوقيع");
  }

  async function submitForm() {
    const miss = firstMissing([
      { value: form!.schoolName, label: "اسم المدرسة" },
      { value: form!.principalName, label: "اسم مدير المدرسة" },
      { value: form!.date, label: "التاريخ" },
    ]);
    if (miss) { show(missingMsg(miss), "error"); return; }
    if (!form!.supervisorSignature) { show("يلزم توقيع الموجه أولاً", "error"); return; }
    await saveAll();
    await sign({ id, submit: true, token: token ?? undefined });
    show("تم اعتماد الاستمارة رسمياً");
  }

  const sendConfig = form ? {
    formTitle: "استمارة متابعة أداء مدير المدرسة",
    recipientName: form.principalName || "المستلم",
    recipientPhone: recipientPhone?.mobile,
    recipientJob: recipientPhone?.jobTitle,
    message: formatGenericMsg({
      formTitle: "استمارة متابعة أداء مدير المدرسة",
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      recipientName: form.principalName || "المستلم",
      date: form.date,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/principal-forms" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />
      {!locked && (
        <div className="no-print flex justify-end px-1">
          <OcrUpload formType="principal" onExtracted={handleOcrExtracted} />
        </div>
      )}
      <div data-pdf-root className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="استمارة متابعة أداء مدير المدرسة – إدارة التوجيه التربوي" />

        {/* Header Info Table */}
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse">
            <tbody>
              <InfoRow l1="المدرسة" v1={form.schoolName} l2="التاريخ" v2={form.date} />
              <InfoRow l1="مدير المدرسة" v1={form.principalName} l2="نائب المدير للشؤون الأكاديمية" v2={form.deputyName ?? "—"} />
            </tbody>
          </table>
        </div>

        {/* Main Table */}
        <div className="space-y-2">
          <SectionBar>مجالات متابعة أداء مدير المدرسة</SectionBar>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg,#5C1523,#4A0F1B)", color: "#fff" }}>
                  <th style={{ ...hCell(), textAlign: "right", width: "22%" }}>المجال الرئيسي</th>
                  <th style={{ ...hCell(), textAlign: "right", width: "40%" }}>مؤشرات الأداء</th>
                  <th style={{ ...hCell(), textAlign: "right", width: "38%" }}>الملاحظات والتوصيات</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d, di) => {
                  const tpl = PRINCIPAL_TEMPLATE.find((t) => t.domain === d.domain);
                  const opts = Array.from(new Set([...(tpl?.bank ?? []), ...(bank ?? [])])).filter((r) => !d.notes.includes(r));
                  return (
                    <tr key={di} style={{ background: di % 2 === 0 ? "#fff" : "#FAFAF8" }}>
                      <td style={{ ...bCell(), verticalAlign: "middle", fontWeight: 800, color: "#2A1418" }}>
                        <div>{d.domain}</div>
                        <div style={{ fontSize: 10, color: "#A8853A", fontWeight: 700, marginTop: 4 }}>({d.score} درجة)</div>
                      </td>
                      <td style={{ ...bCell(), verticalAlign: "top" }}>
                        <ul style={{ paddingInlineStart: 14, margin: 0, lineHeight: 1.8 }}>
                          {(tpl?.indicators ?? d.indicators).map((ind, ii) => (
                            <li key={ii} style={{ fontSize: 10, color: "#3A2A2F", fontWeight: 600, listStyleType: "disc", marginBottom: 2 }}>{ind}</li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ ...bCell(), verticalAlign: "top" }}>
                        <div className="space-y-1.5">
                          {d.notes.length > 0 ? d.notes.map((n, ni) => (
                            <div key={ni} className="flex items-start gap-1">
                              <span style={{ color: "#A8853A", fontWeight: 700 }}>•</span>
                              <span className="flex-1" style={{ fontWeight: 600, color: "#2A1418", lineHeight: 1.6 }}>{n}</span>
                              {!locked && <button onClick={() => rmNote(di, ni)} className="text-stone-400 hover:text-red-600 no-print shrink-0"><X size={12} /></button>}
                            </div>
                          )) : <span className="text-stone-300 no-print" style={{ fontSize: 10 }}>—</span>}
                          {!locked && <NoteInput opts={opts} onAdd={(t) => addNote(di, t)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature row */}
        <div className="space-y-3">
          <SectionBar>اسم المتابع وتوقيعه</SectionBar>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="text-center text-xs font-extrabold text-[#5C1523] py-2 border-b-2 border-[#5C1523]">{form.supervisorName}</div>
              <SigBlock title="توقيع الموجه التربوي" locked={locked} value={form.supervisorSignature} onSave={saveSig} />
            </div>
          </div>
        </div>

        {/* Disclaimer note */}
        <div className="text-[10px] text-stone-400 font-semibold border-t border-stone-100 pt-3 text-center">
          الرجوع إلى الدليل التفسيري لمؤشرات الأداء؛ والمتابعة وفق المؤشرات الفرعية المخصصة لإدارة التوجيه التربوي.
        </div>
      </div>
      {form ? <div className="no-print max-w-5xl mx-auto mb-3"><AiFormSummary formType="principal" formData={form} /></div> : null}
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال الاستمارة رسمياً" />}
      {toast}
    </div>
  );
}

function hCell(): React.CSSProperties {
  return { border: "1px solid #C9A96E", padding: "8px 10px", fontSize: 11, fontWeight: 800, textAlign: "center" };
}
function bCell(): React.CSSProperties {
  return { border: "1px solid #E2D9C8", padding: "7px 9px", verticalAlign: "top" };
}
