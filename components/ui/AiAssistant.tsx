"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, Bot } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "مين أعلى 3 موجّهين في نسبة التغطية؟",
  "مين الموجّهون اللي محتاجين متابعة؟",
  "كم عدد المدارس وتوزيعها حسب الجنس؟",
  "اعمل لي ملخص أداء القسم هذا العام",
];

/* ────────────────────────────────────────────────────────────────────
   المساعد الذكي — زر عائم + نافذة محادثة تستعلم عن بيانات النظام الحقيقية
   ──────────────────────────────────────────────────────────────────── */
export function AiAssistant() {
  const { token, user } = useAuth();
  const year = useActiveYear();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // لا يظهر قبل تسجيل الدخول
  if (!token || !user) return null;

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          token,
          academicYear: year,
          userName: user?.name,
          role: user?.role,
        }),
      });
      const data = await res.json();
      const reply = data?.reply ?? data?.error ?? "حدث خطأ غير متوقّع.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "تعذّر الاتصال بالخادم. تأكّد من الاتصال وحاول مجدداً." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* الزر العائم */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="المساعد الذكي"
          className="no-print fixed z-50 bottom-24 lg:bottom-6 left-4 sm:left-6 flex items-center gap-2 px-4 h-12 rounded-full
            bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] text-white shadow-xl hover:scale-105 active:scale-95 transition-transform"
        >
          <Sparkles size={18} className="text-gold" />
          <span className="text-sm font-bold hidden sm:inline">المساعد الذكي</span>
        </button>
      )}

      {/* نافذة المحادثة */}
      {open && (
        <div className="no-print fixed z-50 inset-x-0 bottom-0 lg:inset-auto lg:bottom-6 lg:left-6
          lg:w-[400px] h-[78vh] lg:h-[600px] flex flex-col bg-white lg:rounded-3xl rounded-t-3xl
          shadow-2xl border border-black/[0.06] overflow-hidden animate-sheet">
          {/* الرأس */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="icon-orb !w-9 !h-9 bg-white/10">
                <Bot size={18} className="text-gold" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold">المساعد الذكي</p>
                <p className="text-[10px] text-white/60">يجيب من بيانات النظام الحقيقية</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>

          {/* الرسائل */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAF7F3]">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-center py-4">
                  <span className="icon-orb !w-14 !h-14 mx-auto bg-gold/15">
                    <Sparkles size={24} className="text-gold-dark" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-[#2A1418]">كيف أساعدك اليوم؟</p>
                  <p className="text-xs text-[#7A6A58] mt-1">اسألني عن التغطية، الموجّهين، الزيارات، أو المدارس.</p>
                </div>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-right text-xs font-medium text-[#5b4a3e] bg-white border border-black/[0.06]
                        rounded-xl px-3 py-2.5 hover:border-gold/40 hover:bg-gold/[0.04] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-white border border-black/[0.06] text-[#2A1418] rounded-tl-sm"}`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-end">
                <div className="bg-white border border-black/[0.06] rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2 text-[#7A6A58]">
                  <Loader2 size={15} className="animate-spin" />
                  <span className="text-xs">يحلّل البيانات…</span>
                </div>
              </div>
            )}
          </div>

          {/* الإدخال */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="shrink-0 flex items-center gap-2 p-3 border-t border-black/[0.06] bg-white safe-bottom"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك…"
              disabled={loading}
              className="flex-1 bg-[#F5F1EC] rounded-xl px-3.5 py-2.5 text-sm outline-none
                focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center
                disabled:opacity-40 hover:bg-[#4A0F1B] transition-colors"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
