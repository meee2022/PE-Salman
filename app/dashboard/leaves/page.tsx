"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Modal";
import { firstMissing, missingMsg } from "@/lib/formValidation";
import { exportToExcel } from "@/lib/exportExcel";
import { Clock, Plus, Trash2, Download, AlertTriangle, X, Check, Ban } from "lucide-react";

const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const STATUS = {
  pending: { label: "بانتظار الموافقة", cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" },
  approved: { label: "موافَق عليه", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  rejected: { label: "مرفوض", cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
};
// minutes → "2:30"
const fmt = (m: number) => `${Math.floor(Math.abs(m) / 60)}:${String(Math.abs(m) % 60).padStart(2, "0")}`;
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
// Convex wraps thrown errors; keep only our Arabic message
const errText = (err: any, fallback: string) =>
  String(err?.message ?? "").match(/Error: ([^\n]+?)(?: at |\n|$)/)?.[1] ?? fallback;

export default function LeavesPage() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const admin = ["admin", "superadmin"].includes(user?.role ?? "");
  const seesAll = admin || user?.role === "viewer";
  const canWrite = admin || user?.role === "supervisor";

  const rows = useQuery(api.leaves.list, token ? { academicYear: YEAR, token } : "skip");
  const limits = useQuery(api.leaves.limit, token ? { token } : "skip");
  const supervisors = useQuery(api.supervisors.list, token && seesAll ? { token } : "skip");
  const create = useMutation(api.leaves.create);
  const remove = useMutation(api.leaves.remove);
  const decide = useMutation(api.leaves.decide);
  const setLimit = useMutation(api.leaves.setLimit);
  const { show, node: toast } = useToast();

  // false = hourly permission (monthly allowance), true = casual leave (yearly allowance in days)
  const [casual, setCasual] = useState(false);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [focus, setFocus] = useState<string>("");            // admin: selected supervisor
  const [form, setForm] = useState({ date: today(), from: "", to: "", days: "1", reason: "" });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (rows === undefined || limits === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  type Row = (typeof rows)[number];
  type LimitKey = keyof typeof limits;
  // admin-editable allowances shown for the active tab
  const controls: { key: LimitKey; title: string; note: string }[] = casual
    ? [{ key: "casualDays", title: "رصيد الإجازة العارضة السنوي", note: "يوم لكل موجّه في السنة" }]
    : [{ key: "hours", title: "الحد الشهري للاستئذان", note: "ساعات لكل موجّه في الشهر" },
       { key: "perRequest", title: "أقصى مدة للاستئذان الواحد", note: "ساعات للمرة الواحدة" }];
  const amt = (r: Row) => (casual ? r.days ?? 0 : r.minutes);
  const total = (rs: Row[]) => rs.reduce((s, r) => s + amt(r), 0);
  const out = (n: number) => (casual ? String(Math.abs(n)) : fmt(n));
  const unit = casual ? "يوم" : "ساعة";
  const cap = casual ? limits.casualDays : limits.hours * 60;
  const capLabel = casual ? `${limits.casualDays} يوم` : `${limits.hours}:00 ساعة`;
  const monthName = `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
  const period = casual ? `العام ${YEAR}` : monthName;       // window the allowance applies to
  const inPeriod = (r: Row) => casual || r.date.startsWith(month);

  const ofKind = rows.filter((r) => (r.kind === "casual") === casual);
  const records = (seesAll && focus ? ofKind.filter((r) => r.supervisorId === focus) : ofKind);
  // rejected requests stay in the log but never count against the balance
  const counted = ofKind.filter((r) => r.status !== "rejected");
  const mine = records.filter((r) => r.status !== "rejected");
  const personal = !seesAll || !!focus;                        // a single person's view
  const log = records.filter(inPeriod);
  const pending = log.filter((r) => r.status === "pending").length;
  const used = total(mine.filter(inPeriod));
  const left = cap - used;
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;

  // analysis over the whole academic year
  const byMonth = new Map<string, number>();
  const byDay = Array(7).fill(0) as number[];
  for (const r of mine) {
    byMonth.set(r.date.slice(0, 7), (byMonth.get(r.date.slice(0, 7)) ?? 0) + amt(r));
    byDay[new Date(r.date + "T00:00:00").getDay()]++;
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  const monthMax = Math.max(casual ? 1 : cap, 1, ...months.map(([, m]) => m));
  const topDay = byDay.indexOf(Math.max(...byDay));
  const focusName = supervisors?.find((s) => s._id === focus)?.name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const miss = firstMissing([
      ...(admin ? [{ value: focus, label: "الموجّه" }] : []),
      { value: form.date, label: casual ? "تاريخ البداية" : "التاريخ" },
      ...(casual
        ? [{ value: form.days, label: "عدد الأيام" }]
        : [{ value: form.from, label: "من الساعة" }, { value: form.to, label: "إلى الساعة" }, { value: form.reason, label: "السبب" }]),
    ]);
    if (miss) return show(missingMsg(miss), "error");
    if (!casual && form.to <= form.from) return show("وقت النهاية يجب أن يكون بعد وقت البداية", "error");
    setBusy(true);
    try {
      await create({
        supervisorId: admin ? (focus as Id<"supervisors">) : undefined,
        academicYear: YEAR, date: form.date, reason: form.reason, token: token ?? undefined,
        ...(casual ? { kind: "casual" as const, days: Number(form.days) } : { fromTime: form.from, toTime: form.to }),
      });
      setForm({ date: form.date, from: "", to: "", days: "1", reason: "" });
      show(admin ? "تم التسجيل" : "تم إرسال الطلب — بانتظار موافقة التوجيه");
    } catch (err) {
      // the server refuses a request that exceeds the remaining balance
      show(errText(err, "تعذّر التسجيل"), "error");
    } finally { setBusy(false); }
  }

  async function saveLimit(key: LimitKey) {
    const draft = drafts[key] ?? "", n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n) || n < 0) return show("يرجى إدخال رقم صحيح", "error");
    try {
      await setLimit({ key, value: n, token: token ?? undefined });
      setDrafts({ ...drafts, [key]: "" }); show("تم تحديث الحد");
    } catch { show("تعذّر تحديث الحد", "error"); }
  }

  async function act(fn: () => Promise<unknown>, done: string) {
    try { await fn(); show(done); } catch (err) { show(errText(err, "تعذّر تنفيذ العملية"), "error"); }
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="الاستئذان والإجازات العارضة"
        subtitle={`استئذان: ${limits.hours} ساعات شهرياً (بحد أقصى ${limits.perRequest} للمرة) · إجازة عارضة: ${limits.casualDays} أيام سنوياً — العام ${YEAR}`}
        icon={<Clock size={26} />}
        action={
          <button
            onClick={() => exportToExcel(records, [
              { key: "supervisorName", label: "الموجّه" },
              { key: "date", label: "التاريخ" },
              ...(casual
                ? [{ key: "days", label: "عدد الأيام" }]
                : [{ key: "fromTime", label: "من" }, { key: "toTime", label: "إلى" },
                   { key: "minutes", label: "المدة (ساعات)", value: (r: Row) => fmt(r.minutes) }]),
              { key: "reason", label: "السبب" },
              { key: "status", label: "الحالة", value: (r: Row) => STATUS[r.status].label },
            ], `${casual ? "الإجازات_العارضة" : "الاستئذان"}_${YEAR}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all"
          >
            <Download size={14} /> تصدير Excel
          </button>
        }
      />

      {/* kind switch */}
      <div className="flex gap-2" role="group" aria-label="نوع السجل">
        {([["استئذان (ساعات)", false], ["إجازة عارضة (أيام)", true]] as const).map(([label, v]) => (
          <button key={label} aria-pressed={casual === v} onClick={() => setCasual(v)}
            className={casual === v ? "btn-primary" : "btn-ghost"}>{label}</button>
        ))}
      </div>

      {/* admin: allowance control */}
      {admin && controls.map((c) => (
        <div key={c.key} className="card p-5 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <h2 className="section-title !text-base">{c.title}</h2>
            <p className="text-xs text-[#7A6A58]">الحالي: <b className="text-primary font-sans">{limits[c.key]}</b> {c.note}</p>
          </div>
          <label htmlFor={`limit-${c.key}`} className="sr-only">القيمة الجديدة — {c.title}</label>
          <input id={`limit-${c.key}`} type="number" min={0} max={200} step={casual ? 1 : 0.5} inputMode="decimal" value={drafts[c.key] ?? ""}
            onChange={(e) => setDrafts({ ...drafts, [c.key]: e.target.value })} placeholder={casual ? "عدد الأيام" : "عدد الساعات"} className="field !w-36 font-sans" dir="ltr" />
          <button onClick={() => saveLimit(c.key)} className="btn-primary">حفظ الحد</button>
        </div>
      ))}

      {/* month + supervisor filter */}
      <div className="flex items-center gap-3 flex-wrap">
        {!casual && (
          <label className="text-xs font-bold text-[#6b5a52] flex items-center gap-2">
            الشهر
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="field !w-44 font-sans" dir="ltr" />
          </label>
        )}
        {seesAll && (
          <label className="text-xs font-bold text-[#6b5a52] flex items-center gap-2">
            الموجّه
            <select value={focus} onChange={(e) => setFocus(e.target.value)} className="field !w-64">
              <option value="">كل الموجهين</option>
              {(supervisors ?? []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </label>
        )}
        {focus && (
          <button onClick={() => setFocus("")} className="btn-ghost !py-2 text-xs"><X size={14} /> إلغاء التحديد</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* balance or department total */}
        <div className="card-luxurious p-6">
          <h2 className="section-title !text-base mb-1">{personal ? "الرصيد" : "إجمالي القسم"}</h2>
          <p className="text-xs text-[#7A6A58] mb-4">{focusName ?? (personal ? "سجلّي" : "كل الموجهين")} · {period}</p>
          {personal ? (
            <>
              <div className="flex items-end justify-between mb-2">
                <span className="text-4xl font-black font-sans text-primary">{out(used)}</span>
                <span className="text-xs font-bold text-[#7A6A58]">من {capLabel}</span>
              </div>
              <div className="progress-track !h-2.5">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: left <= 0 ? "#dc2626" : "linear-gradient(90deg,#A8853A,#C9A96E)" }} />
              </div>
              {left <= 0 ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={14} /> {left < 0 ? `تجاوز الحد بمقدار ${out(left)} ${unit}` : "انتهى الرصيد — لا يمكن تسجيل المزيد"}
                </p>
              ) : (
                <p className="mt-3 text-xs font-bold text-emerald-700">المتبقي: <span className="font-sans">{out(left)}</span> {unit}</p>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="عدد المرات" value={mine.filter(inPeriod).length} />
              <Stat label={casual ? "إجمالي الأيام" : "إجمالي الساعات"} value={out(used)} />
            </div>
          )}
        </div>

        {/* new record */}
        {canWrite && (
          <form onSubmit={submit} className="card-luxurious p-6 lg:col-span-2 space-y-3">
            <h2 className="section-title !text-base">{admin ? "تسجيل" : "طلب"} {casual ? "إجازة عارضة" : "استئذان"}{admin && focusName ? ` — ${focusName}` : ""}</h2>
            {admin && !focus && <p className="text-xs font-bold text-amber-700">اختر الموجّه من القائمة أعلاه أولاً.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label={casual ? "تاريخ البداية" : "التاريخ"}><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field font-sans" dir="ltr" /></Field>
              {casual ? (
                <Field label="عدد الأيام"><input type="number" min={1} max={30} step={1} inputMode="numeric" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} className="field font-sans" dir="ltr" /></Field>
              ) : (
                <>
                  <Field label="من الساعة"><input type="time" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="field font-sans" dir="ltr" /></Field>
                  <Field label="إلى الساعة"><input type="time" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className="field font-sans" dir="ltr" /></Field>
                </>
              )}
            </div>
            <Field label={casual ? "السبب (اختياري)" : "السبب"}>
              <input value={form.reason} maxLength={300} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="field" placeholder={casual ? "" : "مثال: مراجعة طبية"} />
            </Field>
            <button type="submit" disabled={busy} className="btn-primary"><Plus size={16} /> {busy ? "جارٍ الحفظ..." : admin ? "تسجيل" : "إرسال الطلب"}</button>
          </form>
        )}
      </div>

      {/* records + approval */}
      <div className="glass-table-container">
        <div className="px-5 py-3 border-b border-black/[0.04] bg-white/50 flex items-center justify-between gap-2 flex-wrap">
          <h2 className="section-title !text-base">السجل — {period}</h2>
          <div className="flex items-center gap-2">
            {pending > 0 && <span className={`pill ${STATUS.pending.cls}`}>{STATUS.pending.label}: <span className="font-sans">{pending}</span></span>}
            <span className="pill bg-primary/5 text-primary font-sans">{log.length}</span>
          </div>
        </div>
        {log.length === 0 ? (
          <p className="py-10 text-center text-sm font-bold text-[#8A7A72]">لا توجد سجلات في هذه الفترة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead><tr>
                {seesAll && <th className="text-right">الموجّه</th>}
                <th className="text-center">التاريخ</th><th className="text-center">اليوم</th>
                {!casual && <><th className="text-center">من</th><th className="text-center">إلى</th></>}
                <th className="text-center">{casual ? "عدد الأيام" : "المدة"}</th><th className="text-right">السبب</th>
                <th className="text-center">الحالة</th><th />
              </tr></thead>
              <tbody>
                {log.map((r) => (
                  <tr key={r._id}>
                    {seesAll && <td className="font-bold text-[#2A1418]">{r.supervisorName}</td>}
                    <td className="text-center font-sans">{r.date}</td>
                    <td className="text-center">{WEEKDAYS[new Date(r.date + "T00:00:00").getDay()]}</td>
                    {!casual && <><td className="text-center font-sans">{r.fromTime}</td><td className="text-center font-sans">{r.toTime}</td></>}
                    <td className="text-center font-sans font-black text-primary">{out(amt(r))}</td>
                    <td>{r.reason || "—"}</td>
                    <td className="text-center"><span className={`pill ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span></td>
                    <td className="text-center whitespace-nowrap">
                      {admin && r.status !== "approved" && (
                        <button aria-label="موافقة" title="موافقة"
                          onClick={() => act(() => decide({ id: r._id, approve: true, token: token ?? undefined }), "تمت الموافقة")}
                          className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"><Check size={16} /></button>
                      )}
                      {admin && r.status !== "rejected" && (
                        <button aria-label="رفض" title="رفض"
                          onClick={() => act(() => decide({ id: r._id, approve: false, token: token ?? undefined }), "تم الرفض")}
                          className="p-2 rounded-lg text-red-700 hover:bg-red-50 transition-colors"><Ban size={15} /></button>
                      )}
                      {(admin || (user?.role === "supervisor" && r.status === "pending")) && (
                        <button aria-label="حذف السجل" title="حذف"
                          onClick={() => { if (confirm("حذف هذا السجل؟")) act(() => remove({ id: r._id, token: token ?? undefined }), "تم الحذف"); }}
                          className="p-2 rounded-lg text-[#A89A92] hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* admin overview: every supervisor in the period */}
      {seesAll && !focus && (
        <div className="glass-table-container">
          <div className="px-5 py-3 border-b border-black/[0.04] bg-white/50">
            <h2 className="section-title !text-base">متابعة الموجهين — {period}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead><tr><th className="text-right">الموجّه</th><th className="text-center">عدد المرات</th><th className="text-center">المستخدَم</th><th className="text-center">المتبقي</th><th className="text-center">الحالة</th></tr></thead>
              <tbody>
                {(supervisors ?? []).map((s) => {
                  const r = counted.filter((x) => x.supervisorId === s._id && inPeriod(x));
                  const u = total(r), rest = cap - u;
                  return (
                    <tr key={s._id} onClick={() => setFocus(s._id)} className="cursor-pointer">
                      <td className="font-bold text-[#2A1418]">{s.name}</td>
                      <td className="text-center font-sans font-bold">{r.length}</td>
                      <td className="text-center font-sans font-bold">{out(u)}</td>
                      <td className={`text-center font-sans font-bold ${rest < 0 ? "text-red-700" : ""}`}>{rest < 0 ? `−${out(rest)}` : out(rest)}</td>
                      <td className="text-center">
                        <span className={`pill ${rest < 0 ? STATUS.rejected.cls : u === 0 ? "bg-black/[0.03] text-[#8A7A72]" : rest === 0 ? STATUS.pending.cls : "badge-complete"}`}>
                          {rest < 0 ? "تجاوز الحد" : u === 0 ? "لا يوجد" : rest === 0 ? "انتهى الرصيد" : "ضمن الحد"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* analysis */}
      {mine.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-5 grid grid-cols-2 gap-3 content-start">
            <h2 className="section-title !text-base col-span-2">تحليل العام {YEAR}</h2>
            <Stat label="عدد المرات" value={mine.length} />
            <Stat label={casual ? "إجمالي الأيام" : "إجمالي الساعات"} value={out(total(mine))} />
            <Stat label="متوسط المدة" value={casual ? (total(mine) / mine.length).toFixed(1) : fmt(Math.round(total(mine) / mine.length))} />
            <Stat label="أكثر يوم" value={WEEKDAYS[topDay]} />
          </div>
          <div className="card p-5 lg:col-span-2">
            <h2 className="section-title !text-base mb-4">{casual ? "الأيام لكل شهر" : `الساعات لكل شهر${personal ? " مقابل الحد" : ""}`}</h2>
            <div className="space-y-2.5">
              {months.map(([m, v]) => {
                const over = !casual && personal && v > cap;
                return (
                  <div key={m} className="flex items-center gap-3">
                    <span className="w-16 text-xs font-bold text-[#6b5a52]">{MONTHS[Number(m.slice(5)) - 1]}</span>
                    <div className="flex-1 h-3 rounded-full bg-black/[0.05] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(v / monthMax) * 100}%`, background: over ? "#dc2626" : "#5C1523" }} />
                    </div>
                    <span className={`w-12 text-xs font-black font-sans text-left ${over ? "text-red-700" : "text-primary"}`}>{out(v)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {toast}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#FAF7F3] border border-black/[0.04] p-3 text-center">
      <div className="text-xl font-black font-sans text-primary">{value}</div>
      <div className="text-[11px] font-bold text-[#7A6A58] mt-0.5">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#2A1418] space-y-1.5"><span>{label}</span>{children}</label>;
}
