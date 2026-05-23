"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Dumbbell, User, Lock, LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // إن كان مسجّلاً بالفعل، حوّله للوحة
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await login(username, password);
      if (res.ok) router.replace("/dashboard");
      else setError(res.error ?? "تعذّر تسجيل الدخول");
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden
      bg-gradient-to-br from-[#5C1523] via-[#4A0F1B] to-[#3A0B14]">
      {/* نقش زخرفي + وهج */}
      <div className="pattern-arabesque absolute inset-0 opacity-[0.4]" />
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-gold/5 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* الشعار */}
        <div className="text-center mb-8">
          <div className="icon-orb mx-auto bg-gradient-to-br from-[#DFC48E] to-[#A8853A] shadow-xl" style={{ width: 72, height: 72 }}>
            <Dumbbell size={34} className="text-[#4A0F1B]" />
          </div>
          <h1 className="text-gold font-extrabold text-xl mt-4">نظام التوجيه التربوي</h1>
          <p className="text-white/60 text-sm mt-1">قسم التربية البدنية — وزارة التربية والتعليم</p>
        </div>

        {/* البطاقة */}
        <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl p-7 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#2A1418]">تسجيل الدخول</h2>
            <p className="text-xs text-[#8A7A72] mt-1">أدخل بيانات حسابك للمتابعة</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 ring-1 ring-red-200">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#2A1418] mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A298]" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr"
                className="field pr-10 text-left" placeholder="admin أو البريد الإلكتروني" autoFocus />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2A1418] mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A298]" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
                className="field pr-10 text-left" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={busy || !username || !password}
            className="btn-primary w-full justify-center !py-3 text-base">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {busy ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>

        <p className="text-center text-white/40 text-xs mt-6">© {new Date().getFullYear()} قسم التربية البدنية — قطر</p>
      </div>
    </div>
  );
}
