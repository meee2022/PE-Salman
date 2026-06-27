"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PrintButton } from "@/components/ui/PrintReport";
import { PdfButton } from "@/components/ui/PdfButton";
import { WhatsAppSendModal } from "@/components/ui/WhatsAppSendModal";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { useToast } from "@/components/ui/Modal";
import { RATING_LEVELS, TEACHER_TEMPLATE, FOLLOWUP_OPTIONS, BROADCAST_OPTIONS } from "@/components/teacherTemplate";
import { formatTeacherMsg } from "@/lib/whatsapp";
import { ArrowRight, Save, CheckCircle2, ShieldAlert, FileSignature, Plus, X, Check, Send } from "lucide-react";
import { OcrUpload } from "@/components/ui/OcrUpload";
import { AiFormSummary } from "@/components/ui/AiFormSummary";

type Crit = { text: string; rating: string };
type Dom = { domain: string; criteria: Crit[]; recommendations: string[] };

const GREY = "#C9C9C9";        // الرصاصي للعناوين والحقول كما في الأصل
const GREY_LT = "#E2E2E2";

export default function TeacherFormDetailPage({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"teacherForms">;
  const form = useQuery(api.teacherForms.get, token ? { id, token } : "skip");
  const bank = useQuery(api.teacherForms.recommendationsBank, token ? { token } : "skip");
  const update = useMutation(api.teacherForms.update);
  const sign = useMutation(api.teacherForms.sign);
  const { show, node: toast } = useToast();

  // جلب رقم هاتف المعلم للإرسال عبر واتساب
  const teacherPhone = useQuery(
    api.teachers.getPhone,
    form?.teacherName ? { name: form.teacherName } : "skip"
  );
  const [sendOpen, setSendOpen] = useState(false);

  const [domains, setDomains] = useState<Dom[]>([]);
  const [general, setGeneral] = useState("");
  const [followUp, setFollowUp] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) {
      setDomains(form.domains as Dom[]);
      setGeneral(form.generalNote ?? "");
      setFollowUp(form.followUpOptions ?? (form.followUpType ? [form.followUpType] : []));
    }
  }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <Spinner />;
  if (form === null) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/teacher-forms" className="btn-ghost w-fit flex items-center gap-1 text-xs font-bold"><ArrowRight size={14} /> العودة للاستمارات</Link>
        <div className="card-luxurious p-12 text-center text-stone-500 text-sm flex flex-col items-center justify-center gap-3">
          <ShieldAlert className="w-10 h-10 text-rose-600" />
          <p className="font-extrabold text-[#5C1523] text-base">عذراً، الاستمارة غير متاحة</p>
        </div>
      </div>
    );
  }

  const locked = form.status === "submitted";

  function setRating(di: number, ci: number, rating: string) {
    setDomains((prev) => prev.map((d, i) => i !== di ? d : { ...d, criteria: d.criteria.map((c, j) => j !== ci ? c : { ...c, rating }) }));
  }
  function addRec(di: number, text: string) {
    const t = text.trim();
    if (!t) return;
    setDomains((prev) => prev.map((d, i) => i !== di ? d : (d.recommendations.includes(t) ? d : { ...d, recommendations: [...d.recommendations, t] })));
  }
  function removeRec(di: number, ri: number) {
    setDomains((prev) => prev.map((d, i) => i !== di ? d : { ...d, recommendations: d.recommendations.filter((_, j) => j !== ri) }));
  }
  function toggleFollowUp(opt: string) {
    setFollowUp((prev) => prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]);
  }

  function handleOcrExtracted(data: Record<string, unknown>) {
    if (data.generalNote && typeof data.generalNote === "string") setGeneral((p) => p || data.generalNote as string);
    if (Array.isArray(data.domains)) {
      setDomains((prev) =>
        prev.map((d) => {
          const match = (data.domains as any[]).find(
            (od) => od.domain && (od.domain as string).includes(d.domain.slice(0, 4))
          );
          if (!match) return d;
          const updatedRecs = Array.isArray(match.recommendations)
            ? Array.from(new Set([...d.recommendations, ...(match.recommendations as string[]).filter(Boolean)]))
            : d.recommendations;
          const updatedCriteria = Array.isArray(match.criteria)
            ? d.criteria.map((c, ci) => {
                const srcC = (match.criteria as any[])[ci];
                if (!srcC || !srcC.rating) return c;
                return { ...c, rating: srcC.rating };
              })
            : d.criteria;
          return { ...d, recommendations: updatedRecs, criteria: updatedCriteria };
        })
      );
    }
    show("✅ تم استخراج البيانات — راجع الحقول قبل الحفظ");
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({
        id, schoolName: form!.schoolName, teacherName: form!.teacherName, subject: form!.subject,
        topic: form!.topic, grade: form!.grade, day: form!.day, date: form!.date,
        followUpType: form!.followUpType, followUpOptions: followUp, domains, generalNote: general || undefined, token: token ?? undefined,
      });
      show("تم حفظ التغييرات بنجاح");
    } finally { setSaving(false); }
  }
  async function saveSig(which: "supervisor" | "teacher", dataUrl: string | null) {
    await sign({ id, [which === "supervisor" ? "supervisorSignature" : "teacherSignature"]: dataUrl ?? "", token: token ?? undefined });
    show(dataUrl ? "تم حفظ التوقيع" : "تم مسح التوقيع");
  }
  async function submitForm() {
    const miss = firstMissing([
      { value: form!.schoolName, label: "اسم المدرسة" },
      { value: form!.teacherName, label: "اسم المعلم" },
      { value: form!.subject, label: "المادة" },
      { value: form!.date, label: "التاريخ" },
      { value: domains, label: "تقييم جميع المؤشرات", ok: (d) => Array.isArray(d) && d.length > 0 && d.every((x: any) => (x.criteria ?? []).every((c: any) => c.rating)) },
    ]);
    if (miss) { show(missingMsg(miss), "error"); return; }
    if (!form!.supervisorSignature || !form!.teacherSignature) { show("يلزم توقيع الموجه والمعلم أولاً", "error"); return; }
    await saveAll();
    await sign({ id, submit: true, token: token ?? undefined });
    show("تم اعتماد الاستمارة وإرسالها رسمياً");
  }

  const waMessage = form ? formatTeacherMsg({
    supervisorName: form.supervisorName,
    schoolName: form.schoolName,
    teacherName: form.teacherName,
    date: form.date,
    topic: form.topic,
    grade: form.grade,
    domains: domains,
    generalNote: general || undefined,
  }) : "";

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between gap-4 flex-wrap bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gold/15 shadow-lg mb-2 animate-in">
        <Link href="/dashboard/teacher-forms" className="btn-ghost text-xs font-bold flex items-center gap-1.5"><ArrowRight size={14} /> العودة للاستمارات</Link>
        <div className="flex items-center gap-3">
          {locked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200"><CheckCircle2 size={14} className="text-emerald-600" /> معتمدة ومرسلة رسمياً</span>
          ) : (
            <button onClick={saveAll} disabled={saving} className="btn-primary shadow-md flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-5"><Save size={14} className="text-gold" />{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
          )}
          {/* زر الإرسال عبر واتساب */}
          {form && (
            <button
              onClick={() => setSendOpen(true)}
              className="btn-ghost flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-4 text-[#25D366] border-[#25D366]/25 hover:bg-[#25D366]/10 hover:border-[#25D366]/40 shadow-sm"
            >
              <Send size={13} />
              إرسال
            </button>
          )}
          {!locked && <OcrUpload formType="teacher" onExtracted={handleOcrExtracted} />}
          <PdfButton filename="استمارة-المعلم" label="تصدير PDF مطابق" />
          <PrintButton />
        </div>
      </div>
      {form && (
        <AiFormSummary
          formType="teacher"
          formData={{
            teacherName: form.teacherName, schoolName: form.schoolName,
            supervisorName: form.supervisorName, date: form.date,
            followUpType: form.followUpType, followUpOptions: followUp,
            domains, generalNote: general,
          }}
        />
      )}
      {form && (
        <WhatsAppSendModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          formTitle="استمارة متابعة أداء المعلم"
          recipientName={form.teacherName}
          recipientPhone={teacherPhone?.mobile}
          recipientJob={teacherPhone?.jobTitle ?? "معلم تربية بدنية"}
          message={waMessage}
        />
      )}

      <div data-pdf-root className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        {/* ترويسة */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#5C1523] pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ministry-logo.jpeg" alt="وزارة التربية والتعليم والتعليم العالي" className="h-12 sm:h-20 object-contain shrink-0" />
          <div className="text-center flex-1">
            <h1 className="text-sm sm:text-lg font-extrabold text-[#5C1523] tracking-wide">استمارة الإشراف على أداء المعلم</h1>
            <p className="text-[10px] text-[#A8853A] font-extrabold mt-1 no-print">دولة قطر · قطاع الشؤون التعليمية</p>
          </div>
          <div className="text-left text-[10px] sm:text-xs font-bold text-[#1C1008] leading-relaxed shrink-0">
            <p>إدارة التوجيه التربوي</p>
            <p>قسم التربية البدنية</p>
          </div>
        </div>

        {/* المعلومات الأساسية */}
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse">
            <tbody>
              <InfoRow l1="المدرسة" v1={form.schoolName} l2="اليوم / التاريخ" v2={`${form.day} · ${form.date}`} />
              <InfoRow l1="المادة" v1={form.subject} l2="الموضوع" v2={form.topic ?? "—"} />
              <InfoRow l1="الصف" v1={form.grade ?? "—"} l2="المعلم" v2={form.teacherName} />
              <tr>
                <td style={lblCell()}>الموجه التربوي</td>
                <td style={valCell()}>{form.supervisorName || "—"}</td>
                <td style={lblCell()}>نوع المتابعة</td>
                <td style={{ ...valCell(), padding: "6px 10px" }}>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {FOLLOWUP_OPTIONS.map((o) => <CheckOpt key={o} label={o} on={followUp.includes(o)} locked={locked} onClick={() => toggleFollowUp(o)} />)}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={lblCell()}></td>
                <td style={valCell()}></td>
                <td style={lblCell()}>ملاحظات</td>
                <td style={{ ...valCell(), padding: "6px 10px" }}>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {BROADCAST_OPTIONS.map((o) => <CheckOpt key={o} label={o} on={followUp.includes(o)} locked={locked} onClick={() => toggleFollowUp(o)} />)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ══ جدول التقييم الرسمي: المجال | معايير الأداء | 5 مستويات | التوصيات ══ */}
        <div className="space-y-2">
          <SectionBar>مجالات ومعايير الأداء</SectionBar>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr style={{ background: GREY, color: "#1C1008" }}>
                  <th style={hCell(28)}>المجال</th>
                  <th style={{ ...hCell(), textAlign: "right" }}>معايير الأداء</th>
                  {RATING_LEVELS.map((r) => (
                    <th key={r} style={{ ...hCell(36), height: 165, padding: "6px 2px", verticalAlign: "middle" }}>
                      <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", display: "inline-block", lineHeight: 1.15, fontSize: 10 }}>{r}</div>
                    </th>
                  ))}
                  <th style={{ ...hCell(), width: "26%", textAlign: "right" }}>التوصيات<br/><span style={{ fontSize: 8, fontWeight: 600 }}>(تتضمن توجيهات لزيادة أثر الممارسات في تعلم الطالب)</span></th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d, di) => {
                  const tpl = TEACHER_TEMPLATE.find((t) => t.domain === d.domain);
                  const bankOptions = Array.from(new Set([...(tpl?.recommendationBank ?? []), ...(bank ?? [])])).filter((r) => !d.recommendations.includes(r));
                  const n = d.criteria.length;
                  // خلية مدموجة بصرياً بلا rowspan (لتتدفّق الصفحات): حد علوي بأول صف، سفلي بآخر صف
                  const merge = (ci: number): React.CSSProperties => ({
                    borderRight: "1px solid #C9C9C9", borderLeft: "1px solid #C9C9C9",
                    borderTop: ci === 0 ? "1px solid #C9C9C9" : "none",
                    borderBottom: ci === n - 1 ? "1px solid #C9C9C9" : "none",
                    padding: "7px 9px",
                  });
                  return d.criteria.map((c, ci) => (
                    <tr key={`${di}-${ci}`} style={{ background: "#fff" }}>
                      <td style={{ ...merge(ci), writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", verticalAlign: "middle", fontWeight: 900, color: "#1C1008", background: GREY_LT, whiteSpace: "nowrap", width: 28 }}>{ci === 0 ? d.domain : ""}</td>
                      <td style={{ ...bCell(), textAlign: "right", fontWeight: 600, color: "#2A1418", lineHeight: 1.6 }}>{c.text}</td>
                      {RATING_LEVELS.map((level) => {
                        const sel = c.rating === level;
                        return (
                          <td key={level} onClick={locked ? undefined : () => setRating(di, ci, level)}
                            style={{ ...bCell(), textAlign: "center", verticalAlign: "middle", cursor: locked ? "default" : "pointer", background: "#fff", width: 34 }}>
                            {sel ? <span style={{ color: "#15803D", fontWeight: 900, fontSize: 15 }}>✓</span> : <span style={{ color: "#D6D6D6" }} className="no-print">∙</span>}
                          </td>
                        );
                      })}
                      <td style={{ ...merge(ci), verticalAlign: "top", textAlign: "right" }}>
                        {ci === 0 && (
                          <div className="space-y-1.5">
                            {d.recommendations.length > 0 ? d.recommendations.map((r, ri) => (
                              <div key={ri} className="flex items-start gap-1">
                                <span style={{ color: "#A8853A", fontWeight: 700 }}>•</span>
                                <span className="flex-1" style={{ fontWeight: 600, color: "#2A1418", lineHeight: 1.6 }}>{r}</span>
                                {!locked && <button onClick={() => removeRec(di, ri)} className="text-stone-400 hover:text-red-600 no-print shrink-0"><X size={12} /></button>}
                              </div>
                            )) : <span className="text-stone-300 no-print" style={{ fontSize: 10 }}>—</span>}
                            {!locked && (
                              <div className="space-y-1.5 no-print pt-1">
                                <select value="" onChange={(e) => { if (e.target.value) addRec(di, e.target.value); e.target.value = ""; }}
                                  className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] rounded-lg px-2 py-1.5 outline-none cursor-pointer" style={{ fontSize: 10 }}>
                                  <option value="">＋ من البنك…</option>
                                  {bankOptions.map((r, i) => <option key={i} value={r}>{r}</option>)}
                                </select>
                                <NewRecInput onAdd={(t) => addRec(di, t)} />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-stone-400 font-semibold leading-relaxed">* التوصيات تتضمن توجيهات لزيادة أثر الممارسات في تعلم الطالب.</p>
        </div>

        {/* ملاحظات وتوصيات عامة */}
        <div className="space-y-3">
          <SectionBar>ملاحظات وتوصيات عامة</SectionBar>
          {locked ? (
            <div className="border border-gold/15 rounded-2xl p-4 text-xs font-semibold text-[#2A1418] bg-stone-50/30 min-h-[70px] whitespace-pre-wrap leading-relaxed">{general || "لا توجد ملاحظات عامة."}</div>
          ) : (
            <textarea value={general} onChange={(e) => setGeneral(e.target.value)} rows={3}
              className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-4 py-3.5 rounded-2xl resize-y no-print placeholder:text-stone-400 shadow-sm"
              placeholder="ملاحظات وتوصيات عامة حول أداء المعلم..." />
          )}
        </div>

        {/* التواقيع */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="text-center text-xs font-extrabold text-white py-2 rounded-t-2xl bg-gradient-to-l from-[#5C1523] to-[#4A0F1B]">اعتماد وتوقيع الموجّه التربوي</div>
            <div className="border-2 border-t-0 border-dashed border-gold/15 rounded-b-2xl p-3 bg-stone-50/10">
              {locked ? <SigImg value={form.supervisorSignature} /> : <SignaturePad label="" value={form.supervisorSignature} onSave={(d) => saveSig("supervisor", d)} />}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-center text-xs font-extrabold text-white py-2 rounded-t-2xl bg-gradient-to-l from-[#5C1523] to-[#4A0F1B]">توقيع المعلم</div>
            <div className="border-2 border-t-0 border-dashed border-gold/15 rounded-b-2xl p-3 bg-stone-50/10">
              {locked ? <SigImg value={form.teacherSignature} /> : <SignaturePad label="" value={form.teacherSignature} onSave={(d) => saveSig("teacher", d)} />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-150 pt-3 text-[9px] font-bold text-stone-400">
          <span>رمز النموذج المعتمد: ES-ESP-P12-F2</span>
          <span>رقم الإصدار: 1</span>
          <span>تاريخ الإصدار: 03-06-2024</span>
          <span>التصنيف: داخلي</span>
        </div>
      </div>

      {!locked && (
        <div className="no-print flex justify-center pt-6 animate-in pb-10">
          <button onClick={submitForm} className="btn-primary shadow-xl shadow-primary/20 !px-10 !py-4 w-fit text-xs font-extrabold flex items-center gap-2.5 hover:ring-2 hover:ring-gold/45 active:scale-95 transition-all duration-200">
            <CheckCircle2 size={18} className="text-gold" /> اعتماد وإرسال تقييم المعلم رسمياً
          </button>
        </div>
      )}
      {toast}
    </div>
  );
}

function NewRecInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { onAdd(val); setVal(""); } }}
        placeholder="أو اكتب توصية جديدة ثم اضغط ＋"
        className="flex-1 bg-white text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[11px] font-semibold rounded-xl px-3 py-2.5 outline-none" />
      <button onClick={() => { onAdd(val); setVal(""); }} disabled={!val.trim()}
        className="btn-primary !py-2 !px-3 text-xs disabled:opacity-40"><Plus size={14} /></button>
    </div>
  );
}

function hCell(width?: number): React.CSSProperties {
  return { border: "1px solid #A8A8A8", padding: "8px 10px", fontSize: 11, fontWeight: 800, textAlign: "center", width };
}
function bCell(): React.CSSProperties {
  return { border: "1px solid #C9C9C9", padding: "7px 9px", verticalAlign: "top" };
}
function lblCell(): React.CSSProperties {
  return { border: "1px solid #BFBFBF", padding: "8px 12px", background: GREY, fontWeight: 800, fontSize: 11, color: "#1C1008", whiteSpace: "nowrap", textAlign: "right", width: "15%" };
}
function valCell(): React.CSSProperties {
  return { border: "1px solid #BFBFBF", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#2A1418", textAlign: "right", width: "35%" };
}

// خانة اختيار رسمية (مربع ✓) — تظهر في التعبئة والطباعة
function CheckOpt({ label, on, locked, onClick }: { label: string; on: boolean; locked: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={locked} onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1C1008] ${locked ? "cursor-default" : "cursor-pointer"}`}>
      <span className="inline-flex items-center justify-center shrink-0" style={{ width: 15, height: 15, border: "1.5px solid #5C1523", borderRadius: 3, background: on ? "#5C1523" : "#fff" }}>
        {on && <Check size={10} color="#fff" strokeWidth={3.5} />}
      </span>
      {label}
    </button>
  );
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#5C1523", color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 12, padding: "7px 12px", border: "1px solid #4A0F1B" }} className="select-none">{children}</div>;
}
function InfoRow({ l1, v1, l2, v2 }: { l1: string; v1: string; l2: string; v2: string }) {
  return <tr><td style={lblCell()}>{l1}</td><td style={valCell()}>{v1 || "—"}</td><td style={lblCell()}>{l2}</td><td style={valCell()}>{v2 || "—"}</td></tr>;
}
function SigImg({ value }: { value?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <div className="h-24 flex items-center justify-center">{value ? <img src={value} alt="توقيع" className="max-h-20 object-contain" /> : <span className="text-[10px] text-stone-400 font-extrabold flex items-center gap-1"><FileSignature size={14} className="text-stone-300" /> بانتظار التوقيع</span>}</div>;
}
function Spinner() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
}
