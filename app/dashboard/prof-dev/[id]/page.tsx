"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import { TopBar, Header, SectionBar, InfoRow, SigBlock, Footer, SubmitBar, NotAvailable, FormSpinner } from "@/components/visitFormUI";
import { formatGenericMsg } from "@/lib/whatsapp";
import { SUPERVISION_TYPES, SUPERVISION_METHODS, PROFDEV_RECOMMENDATION_BANK } from "@/components/visitFormsTemplates";
import { OcrUpload } from "@/components/ui/OcrUpload";
import { Plus, X, Lightbulb, Check, Trash2 } from "lucide-react";

type Att = { name: string };

export default function ProfDevDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"profDevForms">;
  const form = useQuery(api.profDevForms.get, token ? { id, token } : "skip");
  const bank = useQuery(api.profDevForms.recommendationsBank, token ? { token } : "skip");
  const update = useMutation(api.profDevForms.update);
  const sign = useMutation(api.profDevForms.sign);
  const { show, node: toast } = useToast();

  const [types, setTypes] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [recs, setRecs] = useState<string[]>([]);
  const [attachments, setAttachments] = useState("");
  const [attendance, setAttendance] = useState<Att[]>([]);
  const [coordinator, setCoordinator] = useState("");
  const [saving, setSaving] = useState(false);

  const recipientPhone = useQuery(api.teachers.getPhone, coordinator ? { name: coordinator } : form?.coordinatorName ? { name: form.coordinatorName } : "skip");

  useEffect(() => {
    if (form) {
      setTypes(form.supervisionTypes); setMethods(form.supervisionMethods);
      setSummary(form.summary ?? ""); setRecs(form.recommendations);
      setAttachments(form.attachments ?? ""); setAttendance(form.attendance as Att[]);
      setCoordinator(form.coordinatorName ?? "");
    }
  }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) => set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  const addRec = (t: string) => { const x = t.trim(); if (x && !recs.includes(x)) setRecs([...recs, x]); };
  const recOptions = Array.from(new Set([...PROFDEV_RECOMMENDATION_BANK, ...(bank ?? [])])).filter((r) => !recs.includes(r));

  function handleOcrExtracted(data: Record<string, unknown>) {
    if (data.generalNote && typeof data.generalNote === "string") setSummary((p) => p || data.generalNote as string);
    if (Array.isArray(data.recommendations)) {
      const newRecs = (data.recommendations as string[]).filter(Boolean);
      setRecs((prev) => Array.from(new Set([...prev, ...newRecs])));
    }
    if (Array.isArray(data.supervisionTypes)) {
      const valid = (data.supervisionTypes as string[]).filter((t) => (SUPERVISION_TYPES as readonly string[]).includes(t));
      if (valid.length > 0) setTypes((prev) => Array.from(new Set([...prev, ...valid])));
    }
    if (Array.isArray(data.supervisionMethods)) {
      const valid = (data.supervisionMethods as string[]).filter((m) => (SUPERVISION_METHODS as readonly string[]).includes(m));
      if (valid.length > 0) setMethods((prev) => Array.from(new Set([...prev, ...valid])));
    }
    if (Array.isArray(data.attendance)) {
      const names = (data.attendance as any[]).map((a) => typeof a === "string" ? a : a?.name).filter(Boolean) as string[];
      if (names.length > 0) setAttendance((prev) => {
        const existing = new Set(prev.map((x) => x.name));
        const toAdd = names.filter((n) => !existing.has(n)).map((n) => ({ name: n }));
        return [...prev.filter((x) => x.name), ...toAdd];
      });
    }
    show("✅ تم استخراج البيانات — راجع الحقول قبل الحفظ");
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({ id, schoolName: form!.schoolName, coordinatorName: coordinator || undefined, day: form!.day, date: form!.date, term: form!.term,
        supervisionTypes: types, supervisionMethods: methods, topic: form!.topic, summary: summary || undefined,
        recommendations: recs, attachments: attachments || undefined, attendance, token: token ?? undefined });
      show("تم حفظ التغييرات");
    } finally { setSaving(false); }
  }
  async function saveSig(which: "supervisor" | "coordinator", d: string | null) {
    await sign({ id, [which === "supervisor" ? "supervisorSignature" : "coordinatorSignature"]: d ?? "", token: token ?? undefined });
    show(d ? "تم حفظ التوقيع" : "تم مسح التوقيع");
  }
  async function submitForm() {
    if (!form!.supervisorSignature) { show("يلزم توقيع الموجه أولاً"); return; }
    await saveAll(); await sign({ id, submit: true, token: token ?? undefined }); show("تم اعتماد الاستمارة رسمياً");
  }

  const sendConfig = form ? {
    formTitle: "استمارة التطوير المهني",
    recipientName: coordinator || form.coordinatorName || "المستلم",
    recipientPhone: recipientPhone?.mobile,
    recipientJob: recipientPhone?.jobTitle,
    message: formatGenericMsg({
      formTitle: "استمارة التطوير المهني",
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      recipientName: coordinator || form.coordinatorName || "المستلم",
      date: form.date,
      notes: summary || undefined,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/prof-dev" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />
      {!locked && (
        <div className="no-print flex justify-end px-1">
          <OcrUpload formType="profDev" onExtracted={handleOcrExtracted} />
        </div>
      )}
      <div className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="استمارة التطوير المهني" />
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse"><tbody>
            <InfoRow l1="المدرسة" v1={form.schoolName} l2="اليوم / التاريخ" v2={`${form.day} · ${form.date}`} />
            <InfoRow l1="الموجه التربوي" v1={form.supervisorName} l2="الفصل الدراسي" v2={form.term ?? "—"} />
            <InfoRow l1="الموضوع" v1={form.topic ?? "—"} l2="المنسق" v2={coordinator || "—"} />
          </tbody></table>
        </div>

        {/* نوع الإشراف + الأسلوب */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionBar>نوع الإشراف</SectionBar>
            <div className="flex flex-wrap gap-2">
              {SUPERVISION_TYPES.map((t) => <Chip key={t} label={t} active={types.includes(t)} locked={locked} onClick={() => toggle(types, setTypes, t)} />)}
            </div>
          </div>
          <div className="space-y-2">
            <SectionBar>الأسلوب الإشرافي</SectionBar>
            <div className="flex flex-wrap gap-2">
              {SUPERVISION_METHODS.map((t) => <Chip key={t} label={t} active={methods.includes(t)} locked={locked} onClick={() => toggle(methods, setMethods, t)} />)}
            </div>
          </div>
        </div>

        {/* الملخص */}
        <div className="space-y-3">
          <SectionBar>الملخّص</SectionBar>
          {locked ? <Box>{summary}</Box> : <Area value={summary} onChange={setSummary} placeholder="ملخص ما تم تناوله في الجلسة..." />}
        </div>

        {/* التوصيات مع البنك */}
        <div className="space-y-3">
          <SectionBar>التوصيات</SectionBar>
          <div className="border border-gold/20 rounded-2xl p-4 bg-gold/[0.03] space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-[#A8853A]"><Lightbulb size={14} className="text-gold" /> التوصيات</div>
            {recs.length > 0 ? (
              <div className="space-y-2">
                {recs.map((r, ri) => (
                  <div key={ri} className="flex items-start gap-2 bg-white border border-gold/15 rounded-xl px-3 py-2">
                    <span className="text-gold-dark font-bold mt-0.5">•</span>
                    <span className="flex-1 text-[11px] font-semibold text-[#2A1418] leading-relaxed">{r}</span>
                    {!locked && <button onClick={() => setRecs(recs.filter((_, j) => j !== ri))} className="text-stone-400 hover:text-red-600 no-print shrink-0"><X size={14} /></button>}
                  </div>
                ))}
              </div>
            ) : <p className="text-[10px] text-stone-400 font-semibold">لا توجد توصيات بعد — اختر من البنك أو اكتب توصية جديدة.</p>}
            {!locked && (
              <div className="space-y-2 no-print">
                <select value="" onChange={(e) => { if (e.target.value) addRec(e.target.value); e.target.value = ""; }}
                  className="w-full bg-white text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[11px] font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer">
                  <option value="">＋ اختر توصية من البنك…</option>
                  {recOptions.map((r, i) => <option key={i} value={r}>{r}</option>)}
                </select>
                <NewItem placeholder="أو اكتب توصية جديدة ثم اضغط ＋" onAdd={addRec} />
              </div>
            )}
          </div>
        </div>

        {/* المرفقات */}
        <div className="space-y-3">
          <SectionBar>المرفقات</SectionBar>
          {locked ? <Box>{attachments}</Box> : <Area value={attachments} onChange={setAttachments} placeholder="مثل: الصور – استبانات التغذية الراجعة – العرض التقديمي – مذكرة المادة العلمية والمراجع..." />}
        </div>

        {/* الحضور */}
        <div className="space-y-3">
          <SectionBar>الحضور</SectionBar>
          <div className="space-y-2">
            {attendance.map((a, ai) => (
              <div key={ai} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-500 w-5 text-center">{ai + 1}</span>
                {locked ? (
                  <span className="flex-1 text-[11px] font-semibold text-[#2A1418] bg-stone-50/40 border border-stone-150 rounded-xl px-3 py-2">{a.name}</span>
                ) : (
                  <>
                    <input value={a.name} onChange={(e) => setAttendance(attendance.map((x, j) => j === ai ? { name: e.target.value } : x))} className="flex-1 bg-[#FCF9F2] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[11px] font-semibold px-3 py-2 rounded-xl no-print" placeholder="اسم الحاضر..." />
                    <button onClick={() => setAttendance(attendance.filter((_, j) => j !== ai))} className="text-stone-400 hover:text-red-600 no-print"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
            {!locked && <button onClick={() => setAttendance([...attendance, { name: "" }])} className="btn-ghost text-xs font-bold flex items-center gap-1 no-print"><Plus size={14} /> إضافة حاضر</button>}
          </div>
        </div>

        {/* التواقيع */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <SigBlock title="اعتماد وتوقيع الموجّه التربوي" locked={locked} value={form.supervisorSignature} onSave={(d) => saveSig("supervisor", d)} />
          <SigBlock title="توقيع المنسق" locked={locked} value={form.coordinatorSignature} onSave={(d) => saveSig("coordinator", d)} />
        </div>
        <Footer code="ES-ESA-P11-F4" />
      </div>
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال الاستمارة رسمياً" />}
      {toast}
    </div>
  );
}

function Chip({ label, active, locked, onClick }: { label: string; active: boolean; locked: boolean; onClick: () => void }) {
  return (
    <button disabled={locked} onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all bg-white text-[#2A1418] ${active ? "border-primary/50 shadow-sm" : "border-gold/25 hover:border-gold/50"} ${locked ? "cursor-default" : "cursor-pointer"}`}>
      <span className="inline-flex items-center justify-center shrink-0" style={{ width: 16, height: 16, border: "1.5px solid #5C1523", borderRadius: 4, background: active ? "#5C1523" : "#fff" }}>
        {active && <Check size={11} color="#fff" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}
function Area({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-4 py-3.5 rounded-2xl resize-y no-print shadow-sm" placeholder={placeholder} />;
}
function Box({ children }: { children: React.ReactNode }) {
  return <div className="border border-gold/15 rounded-2xl p-4 text-xs font-semibold text-[#2A1418] bg-stone-50/30 min-h-[60px] whitespace-pre-wrap leading-relaxed">{children || "—"}</div>;
}
function NewItem({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onAdd(val); setVal(""); } }}
        placeholder={placeholder} className="flex-1 bg-white text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[11px] font-semibold rounded-xl px-3 py-2.5 outline-none" />
      <button onClick={() => { onAdd(val); setVal(""); }} disabled={!val.trim()} className="btn-primary !py-2 !px-3 text-xs disabled:opacity-40"><Plus size={14} /></button>
    </div>
  );
}
