"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import { TopBar, Header, SectionBar, InfoRow, SigBlock, Footer, SubmitBar, NotAvailable, FormSpinner, NoteInput } from "@/components/visitFormUI";
import { formatGenericMsg } from "@/lib/whatsapp";
import { FOLLOWUP_RATINGS, FOLLOWUP_TEMPLATE } from "@/components/visitFormsTemplates";
import { OcrUpload } from "@/components/ui/OcrUpload";
import { X } from "lucide-react";

type Dom = { domain: string; rating: string; notes: string[] };

export default function ExamFollowupDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"examFollowupForms">;
  const form = useQuery(api.examFollowupForms.get, token ? { id, token } : "skip");
  const recipientPhone = useQuery(api.teachers.getPhone, form?.teacherName ? { name: form.teacherName } : "skip");
  const bank = useQuery(api.examFollowupForms.notesBank, token ? { token } : "skip");
  const update = useMutation(api.examFollowupForms.update);
  const sign = useMutation(api.examFollowupForms.sign);
  const { show, node: toast } = useToast();

  const [domains, setDomains] = useState<Dom[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (form) setDomains(form.domains as Dom[]); }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  function setRating(di: number, rating: string) { setDomains((p) => p.map((d, i) => i !== di ? d : { ...d, rating })); }
  function addNote(di: number, t: string) { const x = t.trim(); if (!x) return; setDomains((p) => p.map((d, i) => i !== di ? d : (d.notes.includes(x) ? d : { ...d, notes: [...d.notes, x] }))); }
  function rmNote(di: number, ni: number) { setDomains((p) => p.map((d, i) => i !== di ? d : { ...d, notes: d.notes.filter((_, j) => j !== ni) })); }

  function handleOcrExtracted(data: Record<string, unknown>) {
    if (Array.isArray(data.domains)) {
      setDomains((prev) =>
        prev.map((d) => {
          const match = (data.domains as any[]).find(
            (od) => od.domain && (od.domain as string).includes(d.domain.slice(0, 4))
          );
          if (!match) return d;
          const rating = typeof match.level === "string" && FOLLOWUP_RATINGS.includes(match.level) ? match.level : d.rating;
          const newNotes: string[] = [];
          if (typeof match.notes === "string" && match.notes) newNotes.push(match.notes);
          if (Array.isArray(match.notes)) newNotes.push(...(match.notes as string[]).filter(Boolean));
          return {
            ...d,
            rating,
            notes: newNotes.length > 0 ? Array.from(new Set([...d.notes, ...newNotes])) : d.notes,
          };
        })
      );
    }
    show("✅ تم استخراج البيانات — راجع الحقول قبل الحفظ");
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({ id, schoolName: form!.schoolName, teacherName: form!.teacherName, stage: form!.stage, day: form!.day, date: form!.date, term: form!.term, domains, token: token ?? undefined });
      show("تم حفظ التغييرات");
    } finally { setSaving(false); }
  }
  async function saveSig(d: string | null) { await sign({ id, supervisorSignature: d ?? "", token: token ?? undefined }); show(d ? "تم حفظ التوقيع" : "تم مسح التوقيع"); }
  async function submitForm() {
    const miss = firstMissing([
      { value: form!.schoolName, label: "اسم المدرسة" },
      { value: form!.teacherName, label: "اسم المعلم" },
      { value: form!.date, label: "التاريخ" },
    ]);
    if (miss) { show(missingMsg(miss), "error"); return; }
    if (!form!.supervisorSignature) { show("يلزم توقيع الموجه أولاً", "error"); return; }
    await saveAll(); await sign({ id, submit: true, token: token ?? undefined }); show("تم اعتماد الاستمارة رسمياً");
  }

  const sendConfig = form ? {
    formTitle: "استمارة متابعة تنفيذ الاختبار",
    recipientName: form.teacherName || "المستلم",
    recipientPhone: recipientPhone?.mobile,
    recipientJob: recipientPhone?.jobTitle,
    message: formatGenericMsg({
      formTitle: "استمارة متابعة تنفيذ الاختبار",
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      recipientName: form.teacherName || "المستلم",
      date: form.date,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/exam-followup" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />
      {!locked && (
        <div className="no-print flex justify-end px-1">
          <OcrUpload formType="examFollowup" onExtracted={handleOcrExtracted} />
        </div>
      )}
      <div className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="استمارة متابعة تنفيذ الاختبار" />
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse"><tbody>
            <InfoRow l1="المدرسة" v1={form.schoolName} l2="اليوم / التاريخ" v2={`${form.day} · ${form.date}`} />
            <InfoRow l1="المنسق / المعلم" v1={form.teacherName} l2="المرحلة" v2={form.stage ?? "—"} />
            <InfoRow l1="الموجه التربوي" v1={form.supervisorName} l2="الفصل الدراسي" v2={form.term ?? "—"} />
          </tbody></table>
        </div>

        <div className="space-y-2">
          <SectionBar>مجالات متابعة تنفيذ الاختبار</SectionBar>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg,#5C1523,#4A0F1B)", color: "#fff" }}>
                  <th style={hCell(26)}>م</th>
                  <th style={{ ...hCell(), textAlign: "right", width: "22%" }}>المجال</th>
                  {FOLLOWUP_RATINGS.map((r) => (
                    <th key={r} style={{ ...hCell(38), height: 165, padding: "6px 2px", verticalAlign: "middle" }}>
                      <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", display: "inline-block", lineHeight: 1.15, fontSize: 10 }}>{r}</div>
                    </th>
                  ))}
                  <th style={{ ...hCell(), textAlign: "right", width: "44%" }}>الملاحظات والتوصيات</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d, di) => {
                  const tpl = FOLLOWUP_TEMPLATE.find((t) => t.domain === d.domain);
                  const opts = Array.from(new Set([...(tpl?.bank ?? []), ...(bank ?? [])])).filter((r) => !d.notes.includes(r));
                  return (
                    <tr key={di} style={{ background: "#fff" }}>
                      <td style={{ ...bCell(), textAlign: "center", verticalAlign: "middle", fontWeight: 900, color: "#5C1523" }}>{di + 1}</td>
                      <td style={{ ...bCell(), textAlign: "right", verticalAlign: "middle", fontWeight: 800, color: "#2A1418" }}>{d.domain}</td>
                      {FOLLOWUP_RATINGS.map((level) => {
                        const sel = d.rating === level;
                        return (
                          <td key={level} onClick={locked ? undefined : () => setRating(di, level)}
                            style={{ ...bCell(), textAlign: "center", verticalAlign: "middle", cursor: locked ? "default" : "pointer", background: "#fff" }}>
                            {sel ? <span style={{ color: "#15803D", fontWeight: 900, fontSize: 15 }}>✓</span> : <span style={{ color: "#D6D6D6" }} className="no-print">∙</span>}
                          </td>
                        );
                      })}
                      <td style={{ ...bCell(), textAlign: "right" }}>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="sm:col-start-1">
            <SigBlock title="موجه التربية البدنية" locked={locked} value={form.supervisorSignature} onSave={saveSig} />
          </div>
        </div>
        <Footer code="ES-ESP-P18-F3" />
      </div>
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال الاستمارة رسمياً" />}
      {toast}
    </div>
  );
}


function hCell(width?: number): React.CSSProperties {
  return { border: "1px solid #C9A96E", padding: "8px 10px", fontSize: 11, fontWeight: 800, textAlign: "center", width };
}
function bCell(): React.CSSProperties {
  return { border: "1px solid #E2D9C8", padding: "7px 9px", verticalAlign: "top" };
}
