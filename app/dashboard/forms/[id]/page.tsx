"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { PrintButton } from "@/components/ui/PrintReport";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { useToast } from "@/components/ui/Modal";
import { STATUS_OPTIONS } from "@/components/coordinatorTemplate";
import { ArrowRight, Save, CheckCircle2, ChevronRight, FileSpreadsheet, ShieldAlert, Award, FileSignature } from "lucide-react";

type Ev = { text: string; status: string };
type Dom = { domain: string; indicator: string; evidences?: Ev[]; notes?: string };

export default function FormDetailPage({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const id = params.id as Id<"coordinatorForms">;
  const form = useQuery(api.coordinatorForms.get, token ? { id, token } : "skip");
  const update = useMutation(api.coordinatorForms.update);
  const sign = useMutation(api.coordinatorForms.sign);
  const { show, node: toast } = useToast();

  const [domains, setDomains] = useState<Dom[]>([]);
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) {
      setDomains(form.domains as Dom[]);
      setGeneral(form.generalNote ?? "");
    }
  }, [form?._id]); // eslint-disable-line

  if (form === undefined) return <Spinner />;
  
  if (form === null) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/forms" className="btn-ghost w-fit flex items-center gap-1 text-xs font-bold">
          <ArrowRight size={14} /> العودة للاستمارات
        </Link>
        <div className="card-luxurious p-12 text-center text-stone-500 text-sm animate-in flex flex-col items-center justify-center gap-3">
          <ShieldAlert className="w-10 h-10 text-rose-600 animate-bounce" />
          <p className="font-extrabold text-[#5C1523] text-base">عذراً، الاستمارة غير متاحة</p>
          <p className="text-xs text-stone-400">قد لا تملك الصلاحية الكافية لعرض هذه الاستمارة، أو أنه تم حذفها.</p>
        </div>
      </div>
    );
  }

  const locked = form.status === "submitted";

  function setStatus(di: number, ei: number, status: string) {
    setDomains((prev) =>
      prev.map((d, i) =>
        i !== di
          ? d
          : {
              ...d,
              evidences: (d.evidences ?? []).map((e, j) => (j !== ei ? e : { ...e, status })),
            }
      )
    );
  }

  async function saveAll() {
    setSaving(true);
    try {
      await update({
        id,
        schoolName: form!.schoolName,
        coordinatorName: form!.coordinatorName,
        subject: form!.subject,
        day: form!.day,
        date: form!.date,
        domains,
        generalNote: general || undefined,
        token: token ?? undefined,
      });
      show("تم حفظ التغييرات بنجاح");
    } finally {
      setSaving(false);
    }
  }

  async function saveSig(which: "supervisor" | "coordinator", dataUrl: string | null) {
    await sign({
      id,
      [which === "supervisor" ? "supervisorSignature" : "coordinatorSignature"]: dataUrl ?? "",
      token: token ?? undefined,
    });
    show(dataUrl ? "تم حفظ التوقيع الرسمي بنجاح" : "تم مسح التوقيع");
  }

  async function submitForm() {
    if (!form!.supervisorSignature || !form!.coordinatorSignature) {
      show("يلزم توقيع الموجه والمنسق أولاً لاعتماد الاستمارة");
      return;
    }
    await saveAll();
    await sign({ id, submit: true, token: token ?? undefined });
    show("تم اعتماد الاستمارة وإرسالها رسمياً");
  }

  return (
    <div className="space-y-6">
      {/* شريط الإجراءات والتحكم العلوي (مخفي عند الطباعة) */}
      <div className="no-print flex items-center justify-between gap-4 flex-wrap bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gold/15 shadow-lg mb-2 animate-in">
        <Link href="/dashboard/forms" className="btn-ghost hover:ring-1 hover:ring-gold/30 text-xs font-bold flex items-center gap-1.5">
          <ArrowRight size={14} /> العودة للاستمارات
        </Link>
        
        <div className="flex items-center gap-3">
          {locked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-600 animate-pulse" />
              معتمدة ومرسلة رسمياً للمنسق
            </span>
          ) : (
            <button
              onClick={saveAll}
              disabled={saving}
              className="btn-primary shadow-md shadow-primary/10 flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-5"
            >
              <Save size={14} className="text-gold" />
              {saving ? "جاري الحفظ..." : "حفظ التغييرات المؤقتة"}
            </button>
          )}
          <PrintButton />
        </div>
      </div>

      {/* ====== المستند الرسمي (مطابق تماماً لمقاييس الطباعة الرسمية بلمسة فخامة على الشاشة) ====== */}
      <div
        className="card-luxurious p-6 sm:p-12 space-y-8 bg-white border-2 border-gold/15 shadow-2xl relative animate-in print:p-0 print:border-none print:shadow-none max-w-5xl mx-auto"
        style={{ background: "#fff" }}
      >
        {/* إطار الشاشة الزخرفي الفاخر (مخفي في الطباعة) */}
        <div className="absolute inset-2 border border-gold/10 pointer-events-none rounded-[20px] no-print" />
        <div className="absolute inset-[11px] border border-gold/5 pointer-events-none rounded-[16px] no-print" />

        {/* ترويسة رسمية: الشعار يمين · العنوان وسط · الإدارة يسار */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#5C1523] pb-4 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ministry-logo.jpeg"
            alt="وزارة التربية والتعليم والتعليم العالي"
            className="h-12 sm:h-20 object-contain shrink-0"
          />
          <div className="text-center flex-1">
            <h1 className="text-sm sm:text-lg font-extrabold text-[#5C1523] tracking-wide">
              استمارة الإشراف على أداء المنسق
            </h1>
            <p className="text-[10px] text-[#A8853A] font-extrabold mt-1 no-print">
              دولة قطر · قطاع الشؤون التعليمية
            </p>
          </div>
          <div className="text-left text-[10px] sm:text-xs font-bold text-[#1C1008] leading-relaxed shrink-0">
            <p>إدارة التوجيه التربوي</p>
            <p>قسم التربية البدنية</p>
          </div>
        </div>

        {/* المعلومات الأساسية للمستند */}
        <div className="space-y-3">
          <SectionBar>المعلومات الأساسية</SectionBar>
          <table className="w-full text-xs sm:text-sm border-collapse">
            <tbody>
              <InfoRow l1="المدرسة الرياضية" v1={form.schoolName} l2="اليوم الإشرافي" v2={form.day} />
              <InfoRow l1="المادة التعليمية" v1={form.subject} l2="تاريخ الزيارة" v2={form.date} />
              <InfoRow l1="المنسق المعني" v1={form.coordinatorName} l2="الموجه التربوي" v2={form.supervisorName} />
            </tbody>
          </table>
        </div>

        {/* جدول مجالات التقييم الثمانية والأدلة والشواهد */}
        <div className="space-y-3">
          <SectionBar>مجالات التقييم والأدلة والمؤشرات الميدانية</SectionBar>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] sm:text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white">
                  <Th w="4%">م</Th>
                  <Th w="18%">مجال التقييم</Th>
                  <Th w="32%">المؤشرات المعيارية</Th>
                  <Th w="32%">الأدلة والشواهد الميدانية</Th>
                  <Th w="14%">حالة الإشراف</Th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d, di) => {
                  const evs = d.evidences ?? [];
                  return evs.map((ev, ei) => (
                    <tr key={`${di}-${ei}`} className="hover:bg-gold/5 transition-colors">
                      {ei === 0 && (
                        <Td center rowSpan={evs.length} className="font-extrabold text-[#5C1523] align-middle bg-stone-50/50">
                          {di + 1}
                        </Td>
                      )}
                      {ei === 0 && (
                        <Td rowSpan={evs.length} className="font-extrabold text-[#2A1418] align-top bg-stone-50/20">
                          {d.domain}
                        </Td>
                      )}
                      {ei === 0 && (
                        <Td rowSpan={evs.length} className="text-stone-600 align-top leading-relaxed font-semibold">
                          {d.indicator}
                        </Td>
                      )}
                      <Td className="text-[#2A1418] align-middle font-medium leading-relaxed">
                        {ev.text}
                      </Td>
                      <Td center className="align-middle">
                        {locked ? (
                          <span className={statusCls(ev.status)}>{ev.status}</span>
                        ) : (
                          <div className="flex flex-col gap-1 items-center">
                            <select
                              value={ev.status}
                              onChange={(e) => setStatus(di, ei, e.target.value)}
                              className="bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[10px] font-extrabold rounded-xl px-2 py-1.5 outline-none transition-all cursor-pointer no-print w-full max-w-[125px] shadow-sm"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <span className={`print-only ${statusCls(ev.status)}`}>{ev.status}</span>
                          </div>
                        )}
                      </Td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-stone-400 font-semibold leading-relaxed">
            * يتم تحديد مستوى أداء المنسق الرياضي بناءً على الدليل التفسيري التابع لقسم التربية البدنية.
          </p>
        </div>

        {/* التوصيات العامة والتغذية الراجعة */}
        <div className="space-y-3">
          <SectionBar>التوصيات العامة والتوجيهات الفنية</SectionBar>
          {locked ? (
            <div className="border border-gold/15 rounded-2xl p-4 text-xs font-semibold text-[#2A1418] bg-stone-50/30 min-h-[80px] whitespace-pre-wrap leading-relaxed">
              {general || "لا توجد توصيات عامة مسجلة."}
            </div>
          ) : (
            <>
              <textarea
                value={general}
                onChange={(e) => setGeneral(e.target.value)}
                rows={3}
                className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-xs font-semibold px-4 py-3.5 rounded-2xl transition-all resize-y no-print placeholder:text-stone-400 shadow-sm"
                placeholder="اكتب التوصيات والملاحظات الإشرافية الموجهة للمنسق الرياضي لمتابعة الأداء وتطوير الكفاءة..."
              />
              <div className="print-only border border-stone-200 rounded-lg p-4 text-xs whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {general || "—"}
              </div>
            </>
          )}
        </div>

        {/* التواقيع الرسمية والمصادقة */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <div className="text-center text-xs font-extrabold text-white py-2 rounded-t-2xl bg-gradient-to-l from-[#5C1523] to-[#4A0F1B]">
                اعتماد وتوقيع الموجّه التربوي
              </div>
              <div className="border-2 border-t-0 border-dashed border-gold/15 rounded-b-2xl p-3 bg-stone-50/10">
                {locked ? (
                  <SigImg value={form.supervisorSignature} />
                ) : (
                  <SignaturePad
                    label=""
                    value={form.supervisorSignature}
                    onSave={(d) => saveSig("supervisor", d)}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-center text-xs font-extrabold text-white py-2 rounded-t-2xl bg-gradient-to-l from-[#5C1523] to-[#4A0F1B]">
                توقيع منسق المادة بالمدرسة
              </div>
              <div className="border-2 border-t-0 border-dashed border-gold/15 rounded-b-2xl p-3 bg-stone-50/10">
                {locked ? (
                  <SigImg value={form.coordinatorSignature} />
                ) : (
                  <SignaturePad
                    label=""
                    value={form.coordinatorSignature}
                    onSave={(d) => saveSig("coordinator", d)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* تذييل النموذج والرموز الفنية */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-150 pt-3 text-[9px] font-bold text-stone-400">
          <span>رمز النموذج المعتمد: ES-ESP-P12-F3</span>
          <span>رقم الإصدار الإشرافي: 1</span>
          <span>تاريخ النشر والإصدار: 03-06-2024</span>
          <span>مستوى السرية والخصوصية: تصنيف داخلي خاص</span>
        </div>
      </div>

      {/* إجراء الاعتماد والترحيل النهائي للمسودة */}
      {!locked && (
        <div className="no-print flex justify-center pt-6 animate-in pb-10">
          <button
            onClick={submitForm}
            className="btn-primary shadow-xl shadow-primary/20 !px-10 !py-4 w-fit text-xs font-extrabold flex items-center gap-2.5 hover:ring-2 hover:ring-gold/45 active:scale-95 transition-all duration-200"
          >
            <CheckCircle2 size={18} className="text-gold animate-pulse" />
            اعتماد وإرسال تقييم المنسق رسمياً
          </button>
        </div>
      )}

      {toast}
    </div>
  );
}

function statusCls(s: string) {
  const base = "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-extrabold shadow-sm border ";
  if (s === "مستكمل") return base + "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "مستكمل جزئياً") return base + "bg-amber-50 text-amber-700 border-amber-200";
  return base + "bg-red-50 text-red-700 border-red-200";
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-right text-[11px] font-extrabold text-[#5C1523] bg-gradient-to-l from-gold/15 to-transparent px-3 py-2 border-r-[3px] border-[#C9A96E] rounded-l-lg select-none">
      {children}
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: string }) {
  return (
    <th
      style={{
        width: w,
        border: "1px solid #C9A96E",
        padding: "8px 10px",
        fontSize: 11,
        fontWeight: 800,
        textAlign: "center",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  center,
  rowSpan,
  className = "",
}: {
  children: React.ReactNode;
  center?: boolean;
  rowSpan?: number;
  className?: string;
}) {
  return (
    <td
      rowSpan={rowSpan}
      className={className}
      style={{
        border: "1px solid #E2D9C8",
        padding: "8px 10px",
        textAlign: center ? "center" : "right",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function InfoRow({ l1, v1, l2, v2 }: { l1: string; v1: string; l2: string; v2: string }) {
  const grayLbl: React.CSSProperties = {
    border: "1px solid #D2C8B5",
    padding: "8px 12px",
    background: "#F4EFE6",
    fontWeight: 800,
    fontSize: 11,
    color: "#5C1523",
    whiteSpace: "nowrap",
    textAlign: "right",
    width: "15%",
  };
  const val: React.CSSProperties = {
    border: "1px solid #D2C8B5",
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "#2A1418",
    textAlign: "right",
    width: "35%",
  };
  return (
    <tr>
      <td style={grayLbl}>{l1}</td>
      <td style={val}>{v1 || "—"}</td>
      <td style={grayLbl}>{l2}</td>
      <td style={val}>{v2 || "—"}</td>
    </tr>
  );
}

function SigImg({ value }: { value?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <div className="h-24 flex items-center justify-center">
      {value ? (
        <img src={value} alt="توقيع رسمي" className="max-h-20 object-contain hover:scale-105 transition-transform" />
      ) : (
        <span className="text-[10px] text-stone-400 font-extrabold flex items-center gap-1">
          <FileSignature size={14} className="text-stone-300" /> بانتظار التوقيع الرسمي
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
    </div>
  );
}

