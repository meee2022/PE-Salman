"use client";

import { useState, useRef } from "react";
import { ScanLine, Upload, X, Loader2, CheckCircle, AlertCircle, Camera } from "lucide-react";

interface OcrUploadProps {
  formType: string;
  onExtracted: (data: Record<string, unknown>) => void;
  label?: string;
}

export function OcrUpload({ formType, onExtracted, label }: OcrUploadProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    setDone(false);
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function analyze() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("formType", formType);
      const res = await fetch("/api/ocr-form", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "فشل التحليل");
      }
      onExtracted(json.data);
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setPreview(null);
        setFileName("");
        setDone(false);
        if (inputRef.current) inputRef.current.value = "";
      }, 1800);
    } catch (e: any) {
      setError(e?.message ?? "خطأ غير معروف");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setFileName("");
    setError(null);
    setDone(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      {/* زر الفتح */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold
          bg-gradient-to-l from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/20
          hover:shadow-violet-500/40 hover:scale-[1.02] transition-all border border-violet-400/20"
      >
        <ScanLine size={15} />
        {label ?? "رفع استمارة ورقية وتحليلها"}
      </button>

      {/* المودال */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-violet-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس */}
            <div className="relative bg-gradient-to-l from-violet-700 to-purple-600 px-6 py-5 overflow-hidden">
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
              />
              <button
                onClick={() => !loading && setOpen(false)}
                className="absolute left-4 top-4 text-white/60 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 relative">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ScanLine size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">تحليل استمارة ورقية</h3>
                  <p className="text-xs text-white/70 mt-0.5">Claude AI سيقرأ الاستمارة ويعبّي الحقول تلقائياً</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* منطقة الرفع */}
              {!preview ? (
                <div
                  onDrop={onDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-violet-200 rounded-2xl p-8 text-center cursor-pointer
                    hover:border-violet-400 hover:bg-violet-50/50 transition-all group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 group-hover:bg-violet-200 transition-colors flex items-center justify-center">
                      <Upload size={24} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="font-extrabold text-[#2A1418] text-sm">اسحب الصورة هنا أو اضغط للرفع</p>
                      <p className="text-xs text-[#8A7A72] mt-1">PNG · JPG · WEBP · PDF (صفحة واحدة)</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Camera size={14} className="text-violet-400" />
                      <span className="text-xs text-violet-600 font-bold">أو صوّر الاستمارة بالجوال مباشرةً</span>
                    </div>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={onInputChange}
                    capture="environment"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* معاينة الصورة */}
                  <div className="relative rounded-2xl overflow-hidden border border-violet-100 bg-[#FDFAF5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="preview"
                      className="w-full max-h-56 object-contain"
                    />
                    <button
                      onClick={reset}
                      disabled={loading}
                      className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-[#8A7A72] text-center truncate">{fileName}</p>
                </div>
              )}

              {/* رسالة خطأ */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-700">{error}</p>
                </div>
              )}

              {/* رسالة نجاح */}
              {done && (
                <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <p className="text-xs font-extrabold text-emerald-700">تم استخراج البيانات وتعبئة الاستمارة! راجع الحقول قبل الحفظ.</p>
                </div>
              )}

              {/* تنبيه */}
              <div className="flex items-start gap-2 p-3 bg-amber-50/80 border border-amber-100 rounded-xl">
                <span className="text-amber-500 text-sm mt-px">⚠️</span>
                <p className="text-[10px] font-semibold text-amber-700 leading-relaxed">
                  راجع البيانات المستخرجة دائماً قبل الحفظ — الذكاء الاصطناعي قد يخطئ في الأرقام أو الأسماء غير الواضحة.
                </p>
              </div>

              {/* أزرار */}
              <div className="flex gap-3">
                <button
                  onClick={() => !loading && setOpen(false)}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold text-[#5b4a3e] bg-black/[0.04] hover:bg-black/[0.07] transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={analyze}
                  disabled={!preview || loading || done}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white
                    bg-gradient-to-l from-violet-600 to-purple-500
                    hover:shadow-lg hover:shadow-violet-500/25 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      جاري التحليل...
                    </>
                  ) : done ? (
                    <>
                      <CheckCircle size={14} />
                      تم ✓
                    </>
                  ) : (
                    <>
                      <ScanLine size={14} />
                      تحليل الاستمارة
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
