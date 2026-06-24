"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { ShieldAlert, Loader2, Eye, EyeOff } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────
   بوابة إجبارية لتغيير كلمة المرور الافتراضية — تمنع استخدام النظام
   حتى يضبط المستخدم كلمة مرور جديدة (إغلاق ثغرة الكلمات الافتراضية).
   ──────────────────────────────────────────────────────────────────── */
export function ForcePasswordChange() {
  const { token } = useAuth();
  const changePassword = useMutation(api.auth.changePassword);
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirmP, setConfirmP] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newP.length < 6) return setError("كلمة المرور الجديدة قصيرة (٦ أحرف على الأقل)");
    if (newP !== confirmP) return setError("كلمتا المرور غير متطابقتين");
    if (!token) return;
    setBusy(true);
    try {
      const res = await changePassword({ token, oldPassword: oldP, newPassword: newP });
      if (!res.ok) setError(res.error ?? "تعذّر تغيير كلمة المرور");
      // عند النجاح: تتحدّث بيانات المستخدم تلقائيًا (mustChangePassword=false) فتختفي البوابة
    } catch {
      setError("حدث خطأ، حاول مجددًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#FAF7F3] to-[#F0E8DC]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gold/20 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white text-center">
          <span className="icon-orb !w-14 !h-14 mx-auto bg-white/10 mb-2">
            <ShieldAlert size={26} className="text-gold" />
          </span>
          <h1 className="text-lg font-extrabold">تأمين الحساب مطلوب</h1>
          <p className="text-xs text-white/70 mt-1">لأمان بياناتك، يجب تغيير كلمة المرور الافتراضية قبل المتابعة.</p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-3.5">
          <Field label="كلمة المرور الحالية" value={oldP} onChange={setOldP} type={show ? "text" : "password"} />
          <Field label="كلمة المرور الجديدة" value={newP} onChange={setNewP} type={show ? "text" : "password"} />
          <Field label="تأكيد كلمة المرور الجديدة" value={confirmP} onChange={setConfirmP} type={show ? "text" : "password"} />

          <button type="button" onClick={() => setShow((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#7A6A58] hover:text-primary transition-colors">
            {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? "إخفاء" : "إظهار"} كلمات المرور
          </button>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold hover:bg-[#4A0F1B] transition-colors disabled:opacity-50">
            {busy && <Loader2 size={17} className="animate-spin" />}
            حفظ ومتابعة
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#2A1418] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full bg-[#F5F1EC] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold/40"
      />
    </div>
  );
}
