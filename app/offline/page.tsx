"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center" dir="rtl">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
        <span className="text-3xl">📡</span>
      </div>
      <h1 className="text-xl font-extrabold text-[#2A1418]">لا يوجد اتصال بالإنترنت</h1>
      <p className="text-sm text-stone-500 font-medium max-w-xs">
        تعذّر الاتصال بالخادم. تحقق من الاتصال بالإنترنت وحاول مجدداً.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-6 py-3 rounded-2xl bg-[#5C1523] text-white text-sm font-extrabold shadow-lg active:scale-95 transition-transform"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
