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
import { MEETING_TYPES, MEETING_OBJECTIVES_BANK, MEETING_RECOMMENDATION_BANK } from "@/components/visitFormsTemplates";
import { OcrUpload } from "@/components/ui/OcrUpload";
import { formatMeetingMsg } from "@/lib/whatsapp";
import { Plus, X, Check, Trash2, Target, Lightbulb } from "lucide-react";

export default function MeetingDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"meetingForms">;
  const form = useQuery(api.meetingForms.get, token ? { id, token } : "skip");
  const update = useMutation(api.meetingForms.update);
  const sign = useMutation(api.meetingForms.sign);
  const { show, node: toast } = useToast();

  // جلب رقم هاتف المنسق للإرسال عبر واتساب
  const coordinatorPhoneData = useQuery(
    api.teachers.getPhone,
    form?.coordinatorName ? { name: form.coordinatorName } : "skip"
  );

  const [types, setTypes] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [recs, setRecs] = useState<string[]>([]);
  const [attachments, setAttachments] = useState("");
  const [attendance, setAttendance] = useState<{ name: string }[]>([]);
  const [coordinator, setCoordinator] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) {
      setTypes(form.meetingTypes); setObjectives(form.objectives); setSummary(form.summary ?? "");
      setRecs(form.recommendations); setAttachments(form.attachments ?? ""); setAttendance(form.attendance);
      setCoordinator(form.coordinatorName ?? "");
    }
  }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;
  const locked = form.status === "submitted";

  const toggle = (v: string) => setTypes(types.includes(v) ? types.filter((x) => x !== v) : [...types, v]);
  const addObj = (t: string) => { const x = t.trim(); if (x && !objectives.includes(x)) setObjectives([...objectives, x]); };
  const addRec = (t: string) => { const x = t.trim(); if (x && !recs.includes(x)) setRecs([...recs, x]); };
  const objOpts = MEETING_OBJECTIVES_BANK.filter((r) => !objectives.includes(r));
  const recOpts = MEETING_RECOMMENDATION_BANK.filter((r) => !recs.includes(r));

  function handleOcrExtracted(data: Record<string, unknown>) {
    if (data.generalNote && typeof data.generalNote === "string") setSummary((p) => p || data.generalNote as string);
    if (Array.isArray(data.objectives)) {
      const newObjs = (data.objectives as string[]).filter(Boolean);
      setObjectives((prev) => Array.from(new Set([...prev, ...newObjs])));
    }
    if (Array.isArray(data.recommendations)) {
      const newRecs = (data.recommendations as string[]).filter(Boolean);
      setRecs((prev) => Array.from(new Set([...prev, ...newRecs])));
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
      await update({ id, schoolName: form!.schoolName, coordinatorName: coordinator || undefined, day: form!.day, date: form!.date,
        meetingTypes: types, subject: form!.subject, objectives, summary: summary || undefined, recommendations: recs,
        attachments: attachments || undefined, attendance, token: token ?? undefined });
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
      { value: form!.date, label: "التاريخ" },
    ]);
    if (miss) { show(missingMsg(miss), "error"); return; }
    if (!form!.supervisorSignature) { show("يلزم توقيع الموجه أولاً", "error"); return; }
    await saveAll(); await sign({ id, submit: true, token: token ?? undefined }); show("تم اعتماد المحضر رسمياً");
  }

  const meetingSendConfig = form ? {
    formTitle: "محضر اجتماع الزيارة التعارفية",
    recipientName: coordinator || form.coordinatorName || "المنسق",
    recipientPhone: coordinatorPhoneData?.mobile,
    recipientJob: coordinatorPhoneData?.jobTitle ?? "منسق تربوي",
    message: formatMeetingMsg({
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      coordinatorName: coordinator || form.coordinatorName,
      date: form.date,
      objectives,
      recommendations: recs,
      summary: summary || undefined,
      attendance,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/meetings" locked={locked} onSave={saveAll} saving={saving} sendConfig={meetingSendConfig} />
      {!locked && (
        <div className="no-print flex justify-end px-1">
          <OcrUpload formType="meeting" onExtracted={handleOcrExtracted} />
        </div>
      )}
      <div data-pdf-root className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto" style={{ background: "#fff" }}>
        <Header title="محضر اجتماع الزيارة التعارفية" />
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse"><tbody>
            <InfoRow l1="المدرسة" v1={form.schoolName} l2="اليوم / التاريخ" v2={`${form.day} · ${form.date}`} />
            <InfoRow l1="الموجه التربوي" v1={form.supervisorName} l2="المنسق" v2={coordinator || "—"} />
            <InfoRow l1="الموضوع" v1={form.subject ?? "—"} l2="نوع الاجتماع" v2={types.join("، ") || "—"} />
          </tbody></table>
        </div>

        <div className="space-y-2">
          <SectionBar>نوع الاجتماع</SectionBar>
          <div className="flex flex-wrap gap-2">
            {MEETING_TYPES.map((t) => {
              const active = types.includes(t);
              return (
                <button key={t} disabled={locked} onClick={() => toggle(t)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all bg-white text-[#2A1418] ${active ? "border-primary/50 shadow-sm" : "border-gold/25 hover:border-gold/50"} ${locked ? "cursor-default" : "cursor-pointer"}`}>
                  <span className="inline-flex items-center justify-center shrink-0" style={{ width: 16, height: 16, border: "1.5px solid #5C1523", borderRadius: 4, background: active ? "#5C1523" : "#fff" }}>
                    {active && <Check size={11} color="#fff" strokeWidth={3} />}
                  </span>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* الأهداف */}
        <ListSection title="الأهداف" icon={<Target size={14} className="text-gold" />} items={objectives} locked={locked}
          onRemove={(i) => setObjectives(objectives.filter((_, j) => j !== i))} options={objOpts} onAdd={addObj} bankLabel="＋ اختر هدفاً من البنك…" newLabel="أو اكتب هدفاً جديداً…" />

        {/* الملخص */}
        <div className="space-y-3">
          <SectionBar>الملخّص</SectionBar>
          {locked ? <Box>{summary}</Box> : <Area value={summary} onChange={setSummary} placeholder="ملخص ما تم في الاجتماع..." />}
        </div>

        {/* التوصيات */}
        <ListSection title="التوصيات" icon={<Lightbulb size={14} className="text-gold" />} items={recs} locked={locked}
          onRemove={(i) => setRecs(recs.filter((_, j) => j !== i))} options={recOpts} onAdd={addRec} bankLabel="＋ اختر توصية من البنك…" newLabel="أو اكتب توصية جديدة…" />

        {/* المرفقات */}
        <div className="space-y-3">
          <SectionBar>المرفقات</SectionBar>
          {locked ? <Box>{attachments}</Box> : <Area value={attachments} onChange={setAttachments} placeholder="إن وجدت..." />}
        </div>

        {/* الحضور */}
        <div className="space-y-3">
          <SectionBar>الحضور</SectionBar>
          <div className="space-y-2">
            {attendance.map((a, ai) => (
              <div key={ai} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-500 w-5 text-center">{ai + 1}</span>
                {locked ? <span className="flex-1 text-[11px] font-semibold text-[#2A1418] bg-stone-50/40 border border-stone-150 rounded-xl px-3 py-2">{a.name}</span> : (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <SigBlock title="اسم وتوقيع الموجّه التربوي" locked={locked} value={form.supervisorSignature} onSave={(d) => saveSig("supervisor", d)} />
          <SigBlock title="اسم وتوقيع منسق القسم" locked={locked} value={form.coordinatorSignature} onSave={(d) => saveSig("coordinator", d)} />
        </div>
        <Footer code="ES-ESP-P12-F8" />
      </div>
      {form ? <div className="no-print max-w-5xl mx-auto mb-3"><AiFormSummary formType="meeting" formData={form} /></div> : null}
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال المحضر رسمياً" />}
      {toast}
    </div>
  );
}

function ListSection({ title, icon, items, locked, onRemove, options, onAdd, bankLabel, newLabel }: {
  title: string; icon: React.ReactNode; items: string[]; locked: boolean; onRemove: (i: number) => void; options: string[]; onAdd: (t: string) => void; bankLabel: string; newLabel: string;
}) {
  return (
    <div className="space-y-3">
      <SectionBar>{title}</SectionBar>
      <div className="border border-gold/20 rounded-2xl p-4 bg-gold/[0.03] space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-extrabold text-[#A8853A]">{icon} {title}</div>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((r, ri) => (
              <div key={ri} className="flex items-start gap-2 bg-white border border-gold/15 rounded-xl px-3 py-2">
                <span className="text-gold-dark font-bold mt-0.5">•</span>
                <span className="flex-1 text-[11px] font-semibold text-[#2A1418] leading-relaxed">{r}</span>
                {!locked && <button onClick={() => onRemove(ri)} className="text-stone-400 hover:text-red-600 no-print shrink-0"><X size={14} /></button>}
              </div>
            ))}
          </div>
        ) : <p className="text-[10px] text-stone-400 font-semibold">لا توجد عناصر بعد — اختر من البنك أو اكتب عنصراً جديداً.</p>}
        {!locked && (
          <div className="space-y-2 no-print">
            <select value="" onChange={(e) => { if (e.target.value) onAdd(e.target.value); e.target.value = ""; }}
              className="w-full bg-white text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[11px] font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer">
              <option value="">{bankLabel}</option>
              {options.map((r, i) => <option key={i} value={r}>{r}</option>)}
            </select>
            <NewItem placeholder={newLabel} onAdd={onAdd} />
          </div>
        )}
      </div>
    </div>
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
