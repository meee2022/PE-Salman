"use client";

/**
 * WhatsAppSendModal — نافذة إرسال الاستمارة عبر واتساب
 *
 * الاستخدام:
 *   <WhatsAppSendModal
 *     open={open} onClose={() => setOpen(false)}
 *     formTitle="استمارة متابعة المنسق"
 *     recipientName="أحمد الرئيسي"
 *     recipientPhone="55557771"  // اختياري - يُجلب تلقائياً من teachers
 *     message={formattedMessage}
 *   />
 */

import { X, Printer, MessageCircle, Copy, Check } from "lucide-react";
import { buildWaLink } from "@/lib/whatsapp";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  formTitle: string;
  recipientName: string;
  recipientPhone?: string | null;
  recipientJob?: string;
  message: string;
}

export function WhatsAppSendModal({
  open, onClose, formTitle, recipientName,
  recipientPhone, recipientJob, message,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [printed, setPrinted] = useState(false);

  if (!open) return null;

  const hasPhone = !!recipientPhone && recipientPhone.replace(/\D/g, "").length >= 8;

  function handlePrint() {
    window.print();
    setPrinted(true);
  }

  function handleWa() {
    if (hasPhone) {
      window.open(buildWaLink(recipientPhone!, message), "_blank");
    } else {
      handleCopy();
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div
      className="fixed inset-0 bg-[#1C0A0D]/65 backdrop-blur-md flex items-end sm:items-center justify-center z-[200] p-4 animate-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gold/20 animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── رأس النافذة ─── */}
        <div className="relative px-5 py-4 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] border-b border-gold/20">
          <div className="pattern-arabesque absolute inset-0 opacity-30 pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-white/50 hover:text-white transition-colors z-10"
          >
            <X size={17} />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shadow-md shrink-0">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-white text-sm leading-tight">إرسال الاستمارة</p>
              <p className="text-[10px] text-gold/70 leading-tight mt-0.5">{formTitle}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* ─── المستلم ─── */}
          <div className="flex items-center gap-3 p-3.5 bg-[#FCF9F2] rounded-2xl border border-gold/15">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-base">👤</span>
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-[#2A1418] text-sm leading-tight truncate">{recipientName}</p>
              {recipientJob && (
                <p className="text-[10px] text-stone-500 font-bold">{recipientJob}</p>
              )}
              {hasPhone ? (
                <p className="text-[10px] text-emerald-700 font-extrabold mt-0.5 dir-ltr text-right">
                  +{recipientPhone!.replace(/\D/g, "").replace(/^00/, "")}
                </p>
              ) : (
                <p className="text-[10px] text-amber-600 font-bold mt-0.5">رقم الهاتف غير متاح في النظام</p>
              )}
            </div>
          </div>

          {/* ─── معاينة الرسالة ─── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-stone-500 font-extrabold">معاينة الرسالة</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[9px] font-extrabold text-stone-400 hover:text-primary transition-colors px-1.5"
              >
                {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                {copied ? "تم النسخ" : "نسخ"}
              </button>
            </div>
            <div
              dir="rtl"
              className="bg-[#E7FFDB] rounded-2xl rounded-tr-sm p-3 border border-green-200/50 shadow-inner text-[10px] font-semibold text-[#1C1008] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap"
            >
              {message.slice(0, 500)}{message.length > 500 ? "\n…" : ""}
            </div>
          </div>

          {/* ─── خطوتان ─── */}
          <div className="space-y-2.5">
            {/* الخطوة 1: طباعة PDF */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/60">
              <span className="w-7 h-7 rounded-full bg-amber-400 text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-sm">
                1
              </span>
              <p className="text-[10px] font-extrabold text-amber-900 flex-1 leading-snug">
                {printed ? "✅ تم تحميل/طباعة الاستمارة" : "حمّل الاستمارة كملف PDF"}
              </p>
              <button
                onClick={handlePrint}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-extrabold shadow-sm transition-all ${
                  printed
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-400 hover:bg-amber-500 text-white"
                }`}
              >
                <Printer size={11} />
                {printed ? "تم" : "PDF"}
              </button>
            </div>

            {/* الخطوة 2: فتح واتساب */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/60">
              <span className="w-7 h-7 rounded-full bg-[#25D366] text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-sm">
                2
              </span>
              <p className="text-[10px] font-extrabold text-emerald-900 flex-1 leading-snug">
                {hasPhone
                  ? "افتح واتساب وأرسل الرسالة + PDF"
                  : "انسخ الرسالة وأرسلها يدوياً مع PDF"}
              </p>
              <button
                onClick={handleWa}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1DA856] text-white text-[10px] font-extrabold shadow-sm transition-all"
              >
                <MessageCircle size={11} />
                {hasPhone ? "واتساب" : "نسخ"}
              </button>
            </div>
          </div>

          {/* ─── تلميح ─── */}
          {!hasPhone && (
            <p className="text-[9px] text-stone-400 font-bold text-center leading-snug">
              💡 يمكن إضافة رقم الهاتف في صفحة المعلمين لتفعيل الإرسال المباشر
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
