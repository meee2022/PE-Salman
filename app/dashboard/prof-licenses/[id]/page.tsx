"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { AiFormSummary } from "@/components/ui/AiFormSummary";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Modal";
import {
  TopBar, Header, SectionBar, InfoRow, SigBlock, Footer, SubmitBar, NotAvailable, FormSpinner, NoteInput,
} from "@/components/visitFormUI";
import { formatGenericMsg } from "@/lib/whatsapp";
import {
  TEACHING_STANDARDS, COORDINATION_STANDARDS, FORM_VARIANTS, SCORE_LEVELS,
  TEACHING_RECOMMENDATIONS, COORDINATION_RECOMMENDATIONS,
  TeachingScoreEntry, CoordinationScoreEntry,
} from "@/components/profLicenseTemplates";
import { X, ChevronDown, ChevronUp } from "lucide-react";

// ── حساب ─────────────────────────────────────────────────────────────────────
function sumArr(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }
function calcAvgScore(e1: number[], e2: number[], e3: number[], numEvals: number): number {
  const sums = numEvals === 3 ? [sumArr(e1), sumArr(e2), sumArr(e3)] : [sumArr(e1), sumArr(e2)];
  const filled = sums.filter((s) => s > 0);
  if (filled.length === 0) return 0;
  return filled.reduce((a, b) => a + b, 0) / filled.length;
}
function calcPct(scores: TeachingScoreEntry[] | CoordinationScoreEntry[], standards: typeof TEACHING_STANDARDS, numEvals: number): number {
  let achieved = 0, max = 0;
  for (let i = 0; i < standards.length; i++) {
    const e = scores[i]; if (!e) continue;
    const e3 = "evaluator3" in e ? e.evaluator3 : [];
    const avg = calcAvgScore(e.evaluator1, e.evaluator2, e3, numEvals);
    if (avg === 0) continue;
    achieved += avg;
    max += standards[i].maxScore;
  }
  if (max === 0) return 0;
  return Math.round((achieved / max) * 1000) / 10;
}

// ── مكوّن صف المؤشر ──────────────────────────────────────────────────────────
function IndicatorRow({
  idx, text, e1, e2, e3, numEvals, locked,
  onScore,
}: {
  idx: number; text: string; e1: number; e2: number; e3: number; numEvals: number; locked: boolean;
  onScore: (eval_: 1 | 2 | 3, val: number) => void;
}) {
  const avgSums = numEvals === 3 ? [e1, e2, e3] : [e1, e2];
  const filled = avgSums.filter((s) => s > 0);
  const avg = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;

  return (
    <tr style={{ background: "#fff" }}>
      <td style={bCell("center", 28)}><span style={{ color: "#5C1523", fontWeight: 900, fontSize: 11 }}>{idx + 1}</span></td>
      <td style={{ ...bCell("right"), minWidth: 180 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#2A1418", lineHeight: 1.55 }}>{text}</span>
      </td>
      {([1, 2, ...(numEvals === 3 ? [3] : [])] as (1 | 2 | 3)[]).map((evalNum) => {
        const val = evalNum === 1 ? e1 : evalNum === 2 ? e2 : e3;
        return (
          <td key={evalNum} style={bCell("center", 80)}>
            {locked ? (
              <span style={{ fontWeight: 700, color: scoreColor(val), fontSize: 12 }}>{val > 0 ? val : "—"}</span>
            ) : (
              <select
                value={val}
                onChange={(e) => onScore(evalNum, Number(e.target.value))}
                className="w-full rounded-lg border text-xs font-bold text-center"
                style={{ border: "1px solid #E2D9C8", background: "#FAFAF8", padding: "4px 2px", color: scoreColor(val) }}
              >
                <option value={0} style={{ color: "#aaa" }}>—</option>
                {SCORE_LEVELS.map((s) => (
                  <option key={s.value} value={s.value}>{s.value} — {s.label}</option>
                ))}
              </select>
            )}
          </td>
        );
      })}
      <td style={{ ...bCell("center", 64), background: avg > 0 ? "#F0FAF4" : "#fff" }}>
        <span style={{ fontWeight: 900, fontSize: 12, color: avg > 0 ? "#15803D" : "#ccc" }}>
          {avg > 0 ? avg.toFixed(1) : "—"}
        </span>
      </td>
    </tr>
  );
}

// ── مكوّن قسم المعيار ─────────────────────────────────────────────────────────
function StandardSection({
  stdIndex, standard, scores, notes, notesBank, numEvals, locked, evalLabels,
  onScore, onAddNote, onRemoveNote,
}: {
  stdIndex: number;
  standard: { standard: string; maxScore: number; indicators: string[] };
  scores: { evaluator1: number[]; evaluator2: number[]; evaluator3: number[] };
  notes: string[];
  notesBank: string[];
  numEvals: number;
  locked: boolean;
  evalLabels: string[];
  onScore: (indicatorIdx: number, eval_: 1 | 2 | 3, val: number) => void;
  onAddNote: (txt: string) => void;
  onRemoveNote: (ni: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const e3Arr = scores.evaluator3;
  const e1Sum = sumArr(scores.evaluator1);
  const e2Sum = sumArr(scores.evaluator2);
  const e3Sum = numEvals === 3 ? sumArr(e3Arr) : 0;
  const sums = numEvals === 3 ? [e1Sum, e2Sum, e3Sum] : [e1Sum, e2Sum];
  const filled = sums.filter((s) => s > 0);
  const avgSum = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
  const pct = standard.maxScore > 0 ? Math.round((avgSum / standard.maxScore) * 100) : 0;

  const opts = notesBank.filter((b) => !notes.includes(b));

  return (
    <div className="border border-gold/20 rounded-xl overflow-hidden">
      {/* رأس المعيار */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-right"
        style={{ background: "linear-gradient(135deg,#5C1523,#4A0F1B)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-[11px] font-bold">{stdIndex + 1}</span>
          <span className="text-white font-black text-sm">{standard.standard}</span>
        </div>
        <div className="flex items-center gap-3">
          {avgSum > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ background: "#fff2", color: "#C9A96E" }}>
              {avgSum.toFixed(1)} / {standard.maxScore} &nbsp;({pct}%)
            </span>
          )}
          {collapsed ? <ChevronDown size={16} className="text-white/60" /> : <ChevronUp size={16} className="text-white/60" />}
        </div>
      </button>

      {!collapsed && (
        <div>
          {/* جدول الدرجات */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#FCF3E8" }}>
                  <th style={hCell(28)}>م</th>
                  <th style={{ ...hCell(), textAlign: "right" }}>المؤشر</th>
                  {evalLabels.slice(0, numEvals).map((lbl, i) => (
                    <th key={i} style={hCell(80)}>{lbl}</th>
                  ))}
                  <th style={hCell(64)}>المتوسط</th>
                </tr>
              </thead>
              <tbody>
                {standard.indicators.map((ind, ii) => (
                  <IndicatorRow
                    key={ii} idx={ii} text={ind}
                    e1={scores.evaluator1[ii] ?? 0}
                    e2={scores.evaluator2[ii] ?? 0}
                    e3={e3Arr[ii] ?? 0}
                    numEvals={numEvals} locked={locked}
                    onScore={(ev, val) => onScore(ii, ev, val)}
                  />
                ))}
                {/* صف المجموع */}
                <tr style={{ background: "#F9F3E8" }}>
                  <td colSpan={2} style={{ ...bCell("right"), fontWeight: 900, color: "#5C1523", fontSize: 11 }}>
                    مجموع المعيار (من {standard.maxScore})
                  </td>
                  {([1, 2, ...(numEvals === 3 ? [3] : [])] as (1 | 2 | 3)[]).map((ev) => {
                    const s = ev === 1 ? e1Sum : ev === 2 ? e2Sum : e3Sum;
                    return (
                      <td key={ev} style={{ ...bCell("center"), fontWeight: 900, color: "#5C1523", fontSize: 12 }}>
                        {s > 0 ? s : "—"}
                      </td>
                    );
                  })}
                  <td style={{ ...bCell("center"), background: "#F0FAF4", fontWeight: 900, color: "#15803D", fontSize: 12 }}>
                    {avgSum > 0 ? avgSum.toFixed(1) : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* الملاحظات والتوصيات */}
          <div className="p-3 bg-[#FDFAF4] border-t border-gold/15">
            <p className="text-[11px] font-bold text-[#5C1523] mb-2">الملاحظات والتوصيات لهذا المعيار</p>
            {notes.length > 0 && (
              <div className="space-y-1 mb-2">
                {notes.map((n, ni) => (
                  <div key={ni} className="flex items-start gap-1">
                    <span style={{ color: "#A8853A", fontWeight: 700 }}>•</span>
                    <span className="flex-1 text-[11px] font-semibold text-[#2A1418] leading-relaxed">{n}</span>
                    {!locked && (
                      <button onClick={() => onRemoveNote(ni)} className="text-stone-400 hover:text-red-600 no-print shrink-0 mt-0.5">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!locked && <NoteInput opts={opts} onAdd={onAddNote} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────────
export default function ProfLicenseDetail({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"profLicenseForms">;
  const form = useQuery(api.profLicenseForms.get, token ? { id, token } : "skip");
  const recipientPhone = useQuery(api.teachers.getPhone, form?.teacherName ? { name: form.teacherName } : "skip");
  const extraBank = useQuery(api.profLicenseForms.notesBank, token ? { token } : "skip");
  const update = useMutation(api.profLicenseForms.update);
  const sign = useMutation(api.profLicenseForms.sign);
  const { show, node: toast } = useToast();

  const [teachingScores, setTeachingScores] = useState<TeachingScoreEntry[]>([]);
  const [coordScores, setCoordScores] = useState<CoordinationScoreEntry[]>([]);
  const [teachingNotes, setTeachingNotes] = useState<string[][]>([]);
  const [coordNotes, setCoordNotes] = useState<string[][]>([]);
  const [generalNotes, setGeneralNotes] = useState<string[]>([]);
  const [evalNames, setEvalNames] = useState({ e1: "", e2: "", e3: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form) return;
    setTeachingScores(form.teachingScores as TeachingScoreEntry[]);
    setCoordScores((form.coordinationScores ?? []) as CoordinationScoreEntry[]);
    setTeachingNotes((form.teachingNotes ?? TEACHING_STANDARDS.map(() => [])) as string[][]);
    setCoordNotes((form.coordinationNotes ?? COORDINATION_STANDARDS.map(() => [])) as string[][]);
    setGeneralNotes(form.generalNotes ?? []);
    setEvalNames({ e1: form.evaluator1Name ?? "", e2: form.evaluator2Name ?? "", e3: form.evaluator3Name ?? "" });
  }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <FormSpinner />;
  if (form === null) return <NotAvailable />;

  const locked = form.status === "submitted";
  const variant = FORM_VARIANTS.find((v) => v.id === form.formVariant) ?? FORM_VARIANTS[0];
  const numEvals = variant.numEvaluators;
  const hasCoord = variant.hasCoordination;

  // اختصر التسميات: استخدم الاسم المُدخل أو الافتراضي
  const evalLabels = [
    evalNames.e1 || variant.evaluatorLabels[0],
    evalNames.e2 || variant.evaluatorLabels[1],
    ...(numEvals === 3 ? [evalNames.e3 || variant.evaluatorLabels[2]] : []),
  ];

  // ── التعديل على الدرجات ─────────────────────────────────────────────────────
  function setTeachScore(si: number, ii: number, ev: 1 | 2 | 3, val: number) {
    setTeachingScores((prev) => prev.map((s, i) => {
      if (i !== si) return s;
      const arr = ev === 1 ? [...s.evaluator1] : ev === 2 ? [...s.evaluator2] : [...s.evaluator3];
      arr[ii] = val;
      return { ...s, [ev === 1 ? "evaluator1" : ev === 2 ? "evaluator2" : "evaluator3"]: arr };
    }));
  }

  function setCoordScore(si: number, ii: number, ev: 1 | 2, val: number) {
    setCoordScores((prev) => prev.map((s, i) => {
      if (i !== si) return s;
      const arr = ev === 1 ? [...s.evaluator1] : [...s.evaluator2];
      arr[ii] = val;
      return { ...s, [ev === 1 ? "evaluator1" : "evaluator2"]: arr };
    }));
  }

  // ── الملاحظات ────────────────────────────────────────────────────────────────
  function addTeachNote(si: number, txt: string) {
    const x = txt.trim(); if (!x) return;
    setTeachingNotes((p) => p.map((arr, i) => i !== si ? arr : (arr.includes(x) ? arr : [...arr, x])));
  }
  function rmTeachNote(si: number, ni: number) {
    setTeachingNotes((p) => p.map((arr, i) => i !== si ? arr : arr.filter((_, j) => j !== ni)));
  }
  function addCoordNote(si: number, txt: string) {
    const x = txt.trim(); if (!x) return;
    setCoordNotes((p) => p.map((arr, i) => i !== si ? arr : (arr.includes(x) ? arr : [...arr, x])));
  }
  function rmCoordNote(si: number, ni: number) {
    setCoordNotes((p) => p.map((arr, i) => i !== si ? arr : arr.filter((_, j) => j !== ni)));
  }
  function addGenNote(txt: string) {
    const x = txt.trim(); if (!x) return;
    setGeneralNotes((p) => p.includes(x) ? p : [...p, x]);
  }
  function rmGenNote(ni: number) { setGeneralNotes((p) => p.filter((_, j) => j !== ni)); }

  // ── حفظ ──────────────────────────────────────────────────────────────────────
  async function saveAll() {
    setSaving(true);
    try {
      await update({
        id, schoolName: form!.schoolName, teacherName: form!.teacherName, level: form!.level,
        evaluator1Name: evalNames.e1 || undefined,
        evaluator2Name: evalNames.e2 || undefined,
        evaluator3Name: evalNames.e3 || undefined,
        teachingScores, coordinationScores: hasCoord ? coordScores : undefined,
        teachingNotes, coordinationNotes: hasCoord ? coordNotes : undefined,
        generalNotes, token: token ?? undefined,
      });
      show("تم حفظ التغييرات");
    } finally { setSaving(false); }
  }

  async function saveSig(which: "supervisor" | "teacher", d: string | null) {
    await sign({ id, [which === "supervisor" ? "supervisorSignature" : "teacherSignature"]: d ?? "", token: token ?? undefined });
    show(d ? "تم حفظ التوقيع" : "تم مسح التوقيع");
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

  // ── حساب النسب الإجمالية ────────────────────────────────────────────────────
  const teachPct = calcPct(teachingScores, TEACHING_STANDARDS, numEvals);
  const coordPct = hasCoord ? calcPct(coordScores as TeachingScoreEntry[], COORDINATION_STANDARDS, 2) : 0;

  // بنك الملاحظات العام
  const allBankNotes = extraBank ?? [];

  const sendConfig = form ? {
    formTitle: "استمارة تقييم أداء المعلم / المنسق للرخصة المهنية",
    recipientName: form.teacherName || "المستلم",
    recipientPhone: recipientPhone?.mobile,
    recipientJob: recipientPhone?.jobTitle,
    message: formatGenericMsg({
      formTitle: "استمارة تقييم أداء المعلم / المنسق للرخصة المهنية",
      supervisorName: form.supervisorName,
      schoolName: form.schoolName,
      recipientName: form.teacherName || "المستلم",
      date: form.date,
    }),
  } : undefined;

  return (
    <div className="space-y-6">
      <TopBar back="/dashboard/prof-licenses" locked={locked} onSave={saveAll} saving={saving} sendConfig={sendConfig} />

      <div
        className="card-luxurious p-6 sm:p-10 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-6xl mx-auto"
        style={{ background: "#fff" }}
      >
        <Header title="استمارة تقييم أداء المعلم / المنسق للرخصة المهنية" />

        {/* المعلومات الأساسية */}
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse"><tbody>
            <InfoRow l1="المدرسة" v1={form.schoolName} l2="التاريخ" v2={form.date} />
            <InfoRow l1="اسم المعلم / المنسق" v1={form.teacherName} l2="الوظيفة" v2={form.teacherRole} />
            <InfoRow l1="المستوى المتقدم له" v1={form.level} l2="النموذج" v2={variant.label} />
            <InfoRow l1="الفصل الدراسي" v1={`الفصل ${form.term}`} l2="المحاولة" v2={`المحاولة ${form.attempt}`} />
            <InfoRow l1="العام الأكاديمي" v1={form.academicYear} l2="الموجه التربوي" v2={form.supervisorName} />
          </tbody></table>
        </div>

        {/* أسماء المقيّمين */}
        {!locked && (
          <div className="space-y-3">
            <SectionBar>أسماء أعضاء لجنة التقييم</SectionBar>
            <div className={`grid grid-cols-1 sm:grid-cols-${numEvals} gap-3`}>
              {variant.evaluatorLabels.slice(0, numEvals).map((lbl, i) => {
                const key = `e${i + 1}` as "e1" | "e2" | "e3";
                return (
                  <div key={i}>
                    <label className="block text-[11px] font-bold text-[#2A1418] mb-1">{lbl}</label>
                    <input
                      value={evalNames[key]}
                      onChange={(e) => setEvalNames({ ...evalNames, [key]: e.target.value })}
                      placeholder={`اسم ${lbl}...`}
                      className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 text-xs font-semibold px-3 py-2 rounded-xl"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {locked && (evalNames.e1 || evalNames.e2 || evalNames.e3) && (
          <div className="space-y-2">
            <SectionBar>أعضاء لجنة التقييم</SectionBar>
            <div className="flex flex-wrap gap-4">
              {variant.evaluatorLabels.slice(0, numEvals).map((lbl, i) => {
                const key = `e${i + 1}` as "e1" | "e2" | "e3";
                return evalNames[key] ? (
                  <div key={i} className="text-xs font-semibold text-[#2A1418]">
                    <span className="text-[#5C1523] font-black">{lbl}:</span> {evalNames[key]}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* ── المهام التدريسية ── */}
        <div className="space-y-3">
          <SectionBar>
            أولاً: تقييم المهام التدريسية
            {teachPct > 0 && (
              <span className="mr-3 text-xs font-bold px-2 py-0.5 rounded-lg bg-green-50 text-green-700 border border-green-200">
                النسبة الإجمالية: {teachPct}%
              </span>
            )}
          </SectionBar>
          <div className="space-y-3">
            {TEACHING_STANDARDS.map((std, si) => {
              const sc = teachingScores[si] ?? { evaluator1: [], evaluator2: [], evaluator3: [] };
              const tNotes = teachingNotes[si] ?? [];
              const bankRec = TEACHING_RECOMMENDATIONS.find((r) => r.standard === std.standard)?.bank ?? [];
              const combinedBank = Array.from(new Set([...bankRec, ...allBankNotes])).filter((r) => !tNotes.includes(r));
              return (
                <StandardSection
                  key={si} stdIndex={si} standard={std}
                  scores={{ evaluator1: sc.evaluator1, evaluator2: sc.evaluator2, evaluator3: sc.evaluator3 }}
                  notes={tNotes} notesBank={combinedBank}
                  numEvals={numEvals} locked={locked} evalLabels={evalLabels}
                  onScore={(ii, ev, val) => setTeachScore(si, ii, ev, val)}
                  onAddNote={(t) => addTeachNote(si, t)}
                  onRemoveNote={(ni) => rmTeachNote(si, ni)}
                />
              );
            })}
          </div>
        </div>

        {/* ── المهام التنسيقية (نموذج 1-3 فقط) ── */}
        {hasCoord && (
          <div className="space-y-3">
            <SectionBar>
              ثانياً: تقييم المهام التنسيقية
              {coordPct > 0 && (
                <span className="mr-3 text-xs font-bold px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                  النسبة الإجمالية: {coordPct}%
                </span>
              )}
            </SectionBar>
            <div className="space-y-3">
              {COORDINATION_STANDARDS.map((std, si) => {
                const sc = coordScores[si] ?? { evaluator1: [], evaluator2: [] };
                const cNotes = coordNotes[si] ?? [];
                const bankRec = COORDINATION_RECOMMENDATIONS.find((r) => r.standard === std.standard)?.bank ?? [];
                const combinedBank = Array.from(new Set([...bankRec, ...allBankNotes])).filter((r) => !cNotes.includes(r));
                return (
                  <StandardSection
                    key={si} stdIndex={si} standard={std}
                    scores={{ evaluator1: sc.evaluator1, evaluator2: sc.evaluator2, evaluator3: [] }}
                    notes={cNotes} notesBank={combinedBank}
                    numEvals={2} locked={locked}
                    evalLabels={[evalLabels[0], evalLabels[1]]}
                    onScore={(ii, ev, val) => setCoordScore(si, ii, ev as 1 | 2, val)}
                    onAddNote={(t) => addCoordNote(si, t)}
                    onRemoveNote={(ni) => rmCoordNote(si, ni)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── ملخص النسب ── */}
        {(teachPct > 0 || (hasCoord && coordPct > 0)) && (
          <div className="space-y-3">
            <SectionBar>ملخص نتائج التقييم</SectionBar>
            <div className={`grid gap-4 ${hasCoord ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <ScoreCard label="نسبة المهام التدريسية" pct={teachPct} color="#5C1523" />
              {hasCoord && <ScoreCard label="نسبة المهام التنسيقية" pct={coordPct} color="#0369A1" />}
              {hasCoord && (
                <ScoreCard
                  label="النسبة النهائية المجمّعة"
                  pct={Math.round(((teachPct + coordPct) / 2) * 10) / 10}
                  color="#15803D"
                />
              )}
            </div>
            <div className="text-[11px] text-[#8A7A72] font-semibold text-center">
              المعيار المرجعي: الخبير ≥ 85% · الكفء 70–84% · المتمرس 50–69%
            </div>
          </div>
        )}

        {/* ── الملاحظات العامة ── */}
        <div className="space-y-2">
          <SectionBar>الملاحظات العامة للموجه</SectionBar>
          {generalNotes.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {generalNotes.map((n, ni) => (
                <div key={ni} className="flex items-start gap-1">
                  <span style={{ color: "#A8853A", fontWeight: 700 }}>•</span>
                  <span className="flex-1 text-sm font-semibold text-[#2A1418] leading-relaxed">{n}</span>
                  {!locked && (
                    <button onClick={() => rmGenNote(ni)} className="text-stone-400 hover:text-red-600 no-print shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!locked && (
            <NoteInput
              opts={allBankNotes.filter((b) => !generalNotes.includes(b))}
              onAdd={addGenNote}
              placeholder="اكتب ملاحظة عامة أو توصية ختامية..."
            />
          )}
        </div>

        {/* ── التوقيعات ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <SigBlock title="توقيع المعلم / المنسق" locked={locked} value={form.teacherSignature} onSave={(d) => saveSig("teacher", d)} />
          <SigBlock title="توقيع الموجه التربوي" locked={locked} value={form.supervisorSignature} onSave={(d) => saveSig("supervisor", d)} />
        </div>

        <Footer code={form.formVariant === "1-3" ? "نموذج(1-3)" : form.formVariant === "5-1" ? "نموذج(5-1)" : "نموذج(3-1)"} />
      </div>

      {form ? <div className="no-print max-w-5xl mx-auto mb-3"><AiFormSummary formType="profLicense" formData={form} /></div> : null}
      {!locked && <SubmitBar onSubmit={submitForm} label="اعتماد وإرسال استمارة الرخصة المهنية رسمياً" />}
      {toast}
    </div>
  );
}

// ── مكوّن بطاقة النسبة ────────────────────────────────────────────────────────
function ScoreCard({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="text-center p-4 rounded-2xl border-2 bg-white" style={{ borderColor: `${color}30` }}>
      <p className="text-xs font-bold mb-1" style={{ color: "#8A7A72" }}>{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{pct}%</p>
      <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function scoreColor(v: number) {
  if (v === 4) return "#15803D";
  if (v === 3) return "#0369A1";
  if (v === 2) return "#D97706";
  if (v === 1) return "#DC2626";
  return "#ccc";
}
function hCell(width?: number): React.CSSProperties {
  return { border: "1px solid #C9A96E", padding: "7px 8px", fontSize: 10, fontWeight: 800, textAlign: "center", color: "#5C1523", width };
}
function bCell(align: "left" | "right" | "center" = "right", width?: number): React.CSSProperties {
  return { border: "1px solid #E2D9C8", padding: "6px 8px", verticalAlign: "middle", textAlign: align, width };
}
