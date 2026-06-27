"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { AiFormSummary } from "@/components/ui/AiFormSummary";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import { TopBar, Header, SectionBar, InfoRow, SigBlock, Footer, SubmitBar, NotAvailable, FormSpinner } from "@/components/visitFormUI";
import { formatGenericMsg } from "@/lib/whatsapp";
import { DEPUTY_PRINCIPAL_TEMPLATE, DEPUTY_FOLLOWUP_TYPES } from "@/components/visitFormsTemplates";

type Dom = { domain: string; procedures: string[]; notes: string };

export default function DeputyPrincipalDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"deputyPrincipalForms">;
  const form = useQuery(api.deputyPrincipalForms.get, token ? { id, token } : "skip");
  const recipientPhone = useQuery(api.teachers.getPhone, form?.deputyName ? { name: form.deputyName } : "skip");
  const update = useMutation(api.deputyPrincipalForms.update);
  const sign = useMutation(api.deputyPrincipalForms.sign);
  const { show, node: toast } = useToast();

  const [domains, setDomains] = useState<Dom[]>([]);
  const [generalNote, setGeneralNote] = useState("");
  const [followUpTypes, setFollowUpTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) {
      setDomains(form.domains as Dom[]);
      setGeneralNote(form.generalNote ?? "");
      setFollowUpTypes(form.followUpTypes ?? ["ميدانية"]);
    }
  }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  function setNotes(di: number, notes: string) {
    setDomains((p) => p.map((d, i) => i !== di ? d : { ...d, notes }));
  }

  function toggleFollowUpType(type: string) {
    setFollowUpTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({ id, domains, generalNote, followUpTypes, token: token ?? undefined });
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
      { value: form!.deputyName, label: "اسم النائب" },
      { value: form!.date, label: "التاريخ" },
    ]);
    if (miss) { show(missingMsg(miss), "error"); return; }
    if (!form!.supervisorSignature) { show("يلزم توقيع الموجه أولاً", "error"); return; }
    await saveAll();
    await sign({ id, submit: true, token: token ?? undefined });
    show("تم اعتماد الاستمارة رسمياً");
  }

  const sendConfig = form ? {
    formTitle: "استمارة متابعة أداء نائب المدير للشؤون الأكاديمية",
    recipientName: form.deputyName || "المستلم",
    recipientPhone: recipientPhone?.mobile,
    recipientJob: recipientPhone?.jobTitle,
    message: formatGenericMsg({
      formTitle: "استمارة متابعة أداء نائب المدير للشؤون الأكاديمية",
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      recipientName: form.deputyName || "المستلم",
      date: form.date,
      notes: generalNote || undefined,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/deputy-principal" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />
      <div className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="استمارة متابعة أداء نائب المدير للشؤون الأكاديمية" />

        {/* Header Info Table */}
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse">
            <tbody>
              <InfoRow l1="المدرسة" v1={form.schoolName} l2="اليوم" v2={form.day} />
              <InfoRow l1="مدير المدرسة" v1={form.principalName} l2="التاريخ" v2={form.date} />
              <InfoRow l1="نائب المدير للشؤون الأكاديمية" v1={form.deputyName} l2="الموجّه التربوي" v2={form.supervisorName} />
              <tr>
                <td colSpan={4} style={{ border: "1px solid #BFBFBF", padding: "8px 16px", background: "#F7F4EE", textAlign: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 11, color: "#1C1008", marginInlineEnd: 16 }}>نوع المتابعة:</span>
                  {DEPUTY_FOLLOWUP_TYPES.map((type) => {
                    const selected = followUpTypes.includes(type);
                    return (
                      <span key={type} style={{ marginInline: 12, fontSize: 11, fontWeight: 700, color: "#2A1418", cursor: locked ? "default" : "pointer" }}
                        onClick={locked ? undefined : () => toggleFollowUpType(type)}>
                        {locked
                          ? (selected ? "✓ " : "□ ")
                          : <input type="checkbox" checked={selected} readOnly style={{ marginInlineEnd: 4, accentColor: "#5C1523" }} />
                        }
                        {type}
                      </span>
                    );
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Main Table */}
        <div className="space-y-2">
          <SectionBar>مجالات الإشراف</SectionBar>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg,#5C1523,#4A0F1B)", color: "#fff" }}>
                  <th style={hCell(32)}>م</th>
                  <th style={{ ...hCell(), textAlign: "right", width: "18%" }}>المجال</th>
                  <th style={{ ...hCell(), textAlign: "right", width: "38%" }}>الإجراءات</th>
                  <th style={{ ...hCell(), textAlign: "right", width: "36%" }}>الملاحظات والتوصيات</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d, di) => {
                  const tpl = DEPUTY_PRINCIPAL_TEMPLATE.find((t) => t.domain === d.domain);
                  return (
                    <tr key={di} style={{ background: di % 2 === 0 ? "#fff" : "#FAFAF8" }}>
                      <td style={{ ...bCell(), textAlign: "center", verticalAlign: "middle", fontWeight: 900, color: "#5C1523" }}>{di + 1}</td>
                      <td style={{ ...bCell(), verticalAlign: "middle", fontWeight: 800, color: "#2A1418" }}>{d.domain}</td>
                      <td style={{ ...bCell(), verticalAlign: "top" }}>
                        <ul style={{ paddingInlineStart: 14, margin: 0, lineHeight: 1.8 }}>
                          {(tpl?.procedures ?? d.procedures).map((p, pi) => (
                            <li key={pi} style={{ fontSize: 10, color: "#3A2A2F", fontWeight: 600, listStyleType: "disc" }}>{p}</li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ ...bCell(), verticalAlign: "top" }}>
                        {locked ? (
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#2A1418", lineHeight: 1.7, minHeight: 60, whiteSpace: "pre-wrap" }}>
                            {d.notes || <span style={{ color: "#C0B4AE" }}>—</span>}
                          </div>
                        ) : (
                          <textarea
                            value={d.notes}
                            onChange={(e) => setNotes(di, e.target.value)}
                            placeholder="اكتب الملاحظات والتوصيات..."
                            className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] rounded-lg px-2.5 py-2 outline-none resize-none"
                            style={{ fontSize: 11, fontWeight: 600, minHeight: 80, lineHeight: 1.7 }}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* التعليق العام */}
        <div className="space-y-2">
          <SectionBar>التعليق العام</SectionBar>
          <div className="p-3 border border-gold/20 rounded-lg bg-[#FAFAF8]">
            {locked ? (
              <div style={{ fontSize: 11, fontWeight: 600, color: "#2A1418", lineHeight: 1.8, minHeight: 60, whiteSpace: "pre-wrap" }}>
                {generalNote || <span style={{ color: "#C0B4AE" }}>لا يوجد تعليق عام</span>}
              </div>
            ) : (
              <textarea
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                placeholder="اكتب التعليق العام على الاستمارة..."
                className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] rounded-lg px-3 py-2.5 outline-none resize-none"
                style={{ fontSize: 11, fontWeight: 600, minHeight: 80, lineHeight: 1.7 }}
              />
            )}
          </div>
        </div>

        {/* Signature */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="sm:col-start-1">
            <SigBlock title="توقيع الموجه التربوي" locked={locked} value={form.supervisorSignature} onSave={saveSig} />
          </div>
        </div>

        <Footer code="ES-ESP-P13-F1" />
      </div>
      {form ? <div className="no-print max-w-5xl mx-auto mb-3"><AiFormSummary formType="deputy" formData={form} /></div> : null}
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
