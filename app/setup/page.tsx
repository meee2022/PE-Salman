"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, Star } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const bootstrap = useMutation(api.auth.bootstrapSuperAdmin);

  const [name, setName]         = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  const [done, setDone]         = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    try {
      const res = await bootstrap({ name, username, password, secretKey });
      if (res.ok) setDone(true);
      else setErr(res.error ?? "تعذّر الإنشاء");
    } catch (e: any) {
      setErr(e.message ?? "خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FCF9F2] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-5 border border-gold/20">
          <span className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
            <Star size={38} className="text-white fill-white" />
          </span>
          <h1 className="text-2xl font-black text-[#2A1418]">تم الإنشاء بنجاح! 🎉</h1>
          <p className="text-sm text-[#8A7A72] font-semibold leading-relaxed">
            تم إنشاء حساب السوبر أدمن الخاص بك. يمكنك الآن تسجيل الدخول بالبيانات التي اخترتها.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3.5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all duration-300"
          >
            الذهاب لصفحة تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCF9F2] flex items-center justify-center p-4"
      style={{ backgroundImage: "radial-gradient(ellipse at top, #f5e9d4 0%, #FCF9F2 60%)" }}>
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5C1523] to-[#4A0F1B] items-center justify-center shadow-xl shadow-primary/30">
            <ShieldCheck size={30} className="text-gold" />
          </span>
          <h1 className="text-2xl font-black text-[#2A1418]">إعداد السوبر أدمن</h1>
          <p className="text-sm text-[#8A7A72] font-semibold">
            إنشاء الحساب الرئيسي لنظام سلمان الرياضي
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl border border-gold/20 overflow-hidden">
          {/* Gold bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#5C1523] via-[#C9A96E] to-[#5C1523]" />

          <div className="p-6 space-y-4">
            {err && (
              <div className="bg-red-50 text-red-700 text-xs font-bold rounded-xl px-4 py-3 border border-red-200/60">
                {err}
              </div>
            )}

            {/* المفتاح السري */}
            <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 space-y-2">
              <label className="block text-xs font-black text-amber-800">🔑 المفتاح السري للتفعيل</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                placeholder="أدخل المفتاح السري"
                dir="ltr"
                required
              />
              <p className="text-[10px] text-amber-700 font-semibold">
                المفتاح: <span className="font-black tracking-wider" dir="ltr">PE_SUPER_2026</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A1418] mb-1.5">الاسم الكامل</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8DECF] bg-[#FCF9F2]/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                placeholder="مثال: محمد كمال"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A1418] mb-1.5">اسم المستخدم (للدخول)</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8DECF] bg-[#FCF9F2]/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                placeholder="مثال: mohamd أو بريدك الإلكتروني"
                dir="ltr"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-[#2A1418] mb-1.5">كلمة المرور</label>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8DECF] bg-[#FCF9F2]/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 pr-10"
                placeholder="٦ أحرف على الأقل"
                dir="ltr"
                required
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute left-3 top-[34px] text-[#A89A92] hover:text-primary transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A1418] mb-1.5">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8DECF] bg-[#FCF9F2]/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                placeholder="أعد كتابة كلمة المرور"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="px-6 pb-6">
            <button
              type="submit"
              disabled={busy || !name || !username || !password || !secretKey}
              className="w-full py-3.5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <Star size={16} className="text-gold fill-gold" />
              {busy ? "جارٍ الإنشاء..." : "إنشاء حساب السوبر أدمن"}
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] text-[#C0B4AE] font-semibold">
          هذه الصفحة تعمل مرة واحدة فقط — بعد إنشاء السوبر أدمن تُرفض أي محاولة إضافية
        </p>
      </div>
    </div>
  );
}
