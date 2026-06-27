"use client";

import { useState } from "react";
import Link from "next/link";
import { PrintButton } from "@/components/ui/PrintReport";
import { PdfButton } from "@/components/ui/PdfButton";
import { WhatsAppSendModal } from "@/components/ui/WhatsAppSendModal";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { ArrowRight, Save, CheckCircle2, ShieldAlert, FileSignature, Plus, Send } from "lucide-react";

export interface SendConfig {
  formTitle: string;
  recipientName: string;
  recipientPhone?: string | null;
  recipientJob?: string;
  message: string;
}

export function TopBar({
  back, locked, onSave, saving, sendConfig,
}: {
  back: string; locked: boolean; onSave: () => void; saving: boolean;
  sendConfig?: SendConfig;
}) {
  const [sendOpen, setSendOpen] = useState(false);
  return (
    <>
      <div className="no-print flex items-center justify-between gap-4 flex-wrap bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gold/15 shadow-lg mb-2 animate-in">
        <Link href={back} className="btn-ghost text-xs font-bold flex items-center gap-1.5"><ArrowRight size={14} /> العودة للاستمارات</Link>
        <div className="flex items-center gap-3">
          {locked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200"><CheckCircle2 size={14} className="text-emerald-600" /> معتمدة ومرسلة</span>
          ) : (
            <button onClick={onSave} disabled={saving} className="btn-primary shadow-md flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-5"><Save size={14} className="text-gold" />{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
          )}
          {/* زر الإرسال عبر واتساب */}
          {sendConfig && (
            <button
              onClick={() => setSendOpen(true)}
              className="btn-ghost flex items-center gap-1.5 text-xs font-extrabold !py-2.5 !px-4 text-[#25D366] border-[#25D366]/25 hover:bg-[#25D366]/10 hover:border-[#25D366]/40 shadow-sm"
            >
              <Send size={13} />
              إرسال
            </button>
          )}
          <PdfButton filename="استمارة" label="تصدير PDF مطابق" />
          <PrintButton label="طباعة" />
        </div>
      </div>
      {sendConfig && (
        <WhatsAppSendModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          formTitle={sendConfig.formTitle}
          recipientName={sendConfig.recipientName}
          recipientPhone={sendConfig.recipientPhone}
          recipientJob={sendConfig.recipientJob}
          message={sendConfig.message}
        />
      )}
    </>
  );
}

export function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-[#5C1523] pb-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ministry-logo.jpeg" alt="الوزارة" className="h-12 sm:h-20 object-contain shrink-0" />
      <div className="text-center flex-1">
        <h1 className="text-sm sm:text-lg font-extrabold text-[#5C1523] tracking-wide">{title}</h1>
        <p className="text-[10px] text-[#A8853A] font-extrabold mt-1 no-print">دولة قطر · قطاع الشؤون التعليمية</p>
      </div>
      <div className="text-left text-[10px] sm:text-xs font-bold text-[#1C1008] leading-relaxed shrink-0"><p>إدارة التوجيه التربوي</p><p>قسم التربية البدنية</p></div>
    </div>
  );
}

export function SectionBar({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#5C1523", color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 12, padding: "7px 12px", border: "1px solid #4A0F1B" }} className="select-none">{children}</div>;
}

export function InfoRow({ l1, v1, l2, v2 }: { l1: string; v1: string; l2: string; v2: string }) {
  const lbl: React.CSSProperties = { border: "1px solid #BFBFBF", padding: "8px 12px", background: "#C9C9C9", fontWeight: 800, fontSize: 11, color: "#1C1008", whiteSpace: "nowrap", textAlign: "right", width: "15%" };
  const val: React.CSSProperties = { border: "1px solid #BFBFBF", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#2A1418", textAlign: "right", width: "35%" };
  return <tr><td style={lbl}>{l1}</td><td style={val}>{v1 || "—"}</td><td style={lbl}>{l2}</td><td style={val}>{v2 || "—"}</td></tr>;
}

export function SigBlock({ title, locked, value, onSave }: { title: string; locked: boolean; value?: string; onSave: (d: string | null) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-center text-xs font-extrabold text-white py-2 rounded-t-2xl bg-gradient-to-l from-[#5C1523] to-[#4A0F1B]">{title}</div>
      <div className="border-2 border-t-0 border-dashed border-gold/15 rounded-b-2xl p-3 bg-stone-50/10">
        {locked ? <SigImg value={value} /> : <SignaturePad label="" value={value} onSave={onSave} />}
      </div>
    </div>
  );
}

export function SigImg({ value }: { value?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <div className="h-24 flex items-center justify-center">{value ? <img src={value} alt="توقيع" className="max-h-20 object-contain" /> : <span className="text-[10px] text-stone-400 font-extrabold flex items-center gap-1"><FileSignature size={14} className="text-stone-300" /> بانتظار التوقيع</span>}</div>;
}

export function Footer({ code }: { code: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-150 pt-3 text-[9px] font-bold text-stone-400"><span>رمز النموذج: {code}</span><span>رقم الإصدار: 1</span><span>تاريخ الإصدار: 03-06-2024</span><span>التصنيف: داخلي</span></div>;
}

export function SubmitBar({ onSubmit, label }: { onSubmit: () => void; label: string }) {
  return (
    <div className="no-print flex justify-center pt-6 animate-in pb-10">
      <button onClick={onSubmit} className="btn-primary shadow-xl shadow-primary/20 !px-10 !py-4 w-fit text-xs font-extrabold flex items-center gap-2.5 hover:ring-2 hover:ring-gold/45 active:scale-95 transition-all"><CheckCircle2 size={18} className="text-gold" /> {label}</button>
    </div>
  );
}

export function NotAvailable() {
  return (
    <div className="space-y-6">
      <div className="card-luxurious p-12 text-center text-stone-500 text-sm flex flex-col items-center justify-center gap-3"><ShieldAlert className="w-10 h-10 text-rose-600" /><p className="font-extrabold text-[#5C1523] text-base">عذراً، الاستمارة غير متاحة</p></div>
    </div>
  );
}

export function FormSpinner() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" /></div>;
}

/**
 * NoteInput — اختر من البنك ثم عدّل النص قبل الإضافة، أو اكتب ملاحظة جديدة.
 * الاختيار من القائمة يُملأ حقل النص (قابل للتعديل) بدلاً من الإضافة الفورية.
 */
export function NoteInput({
  opts,
  onAdd,
  placeholder = "اكتب ملاحظة أو عدّل من البنك ثم اضغط ＋",
  bankLabel = "＋ اختر من البنك…",
}: {
  opts: string[];
  onAdd: (t: string) => void;
  placeholder?: string;
  bankLabel?: string;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-1.5 no-print pt-1">
      {opts.length > 0 && (
        <select
          value=""
          onChange={(e) => { if (e.target.value) { setVal(e.target.value); e.currentTarget.value = ""; } }}
          className="w-full bg-[#FCF9F2] text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] rounded-lg px-2 py-1.5 outline-none cursor-pointer"
          style={{ fontSize: 10 }}
        >
          <option value="">{bankLabel}</option>
          {opts.map((r, i) => <option key={i} value={r}>{r}</option>)}
        </select>
      )}
      <div className="flex items-center gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }}
          placeholder={placeholder}
          className="flex-1 bg-white text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] text-[11px] font-semibold rounded-xl px-3 py-2.5 outline-none"
        />
        <button
          onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}
          disabled={!val.trim()}
          className="btn-primary !py-2 !px-3 text-xs disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
