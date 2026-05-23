"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrintButton, PrintHeader, PrintSignature } from "@/components/ui/PrintReport";
import {
  ArrowRight, School, ClipboardCheck, CalendarCheck, TrendingUp,
  Phone, Mail, IdCard, Briefcase, MapPin, ClipboardList, ChevronDown,
} from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

const CODE_LABELS: Record<string, string> = {
  VS: "زيارة صفية", CL: "زيارة عارضة", OF: "عمل مكتبي", MT: "اجتماع",
  TR: "تطوير مهني", AC: "أنشطة", SP: "مهمة رسمية", VP: "مهمة عمل",
  OL: "تعلم عن بعد", WP: "إذن عمل", LV: "إجازة", SL: "إجازة مرضية", AB: "غياب",
};

const VISIT_CODES = ["VS", "CL"];
const WORK_CODES  = ["OF", "MT", "TR", "AC", "SP", "VP", "OL"];
const LEAVE_CODES = ["LV", "SL", "WP", "AB"];

const FORM_TYPES: { key: string; label: string }[] = [
  { key: "classroomVisits",      label: "زيارات صفية للتقييم" },
  { key: "examApproval",         label: "اعتماد اختبارات التربية البدنية" },
  { key: "examJudging",          label: "تحكيم اختبارات الأداء" },
  { key: "coordinatorFollowup",  label: "متابعة وتقييم منسق المادة" },
];

export default function SupervisorDetailPage({ params }: { params: { id: string } }) {
  const [showLiveForms, setShowLiveForms] = useState(false);
  const { token } = useAuth();
  const YEAR = useActiveYear();
  const data = useQuery(api.supervisors.detail,
    token ? { id: params.id as Id<"supervisors">, academicYear: YEAR, token } : "skip");

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-gold/10 border-t-gold animate-spin" />
          <div className="absolute inset-2 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin" style={{ animationDirection: "reverse", animationDuration: "1s" }} />
        </div>
      </div>
    );
  }
  
  if (data === null || !data.supervisor) {
    return (
      <div className="space-y-4 animate-in">
        <PageHeader title="الموجه غير موجود في النظام" />
        <Link href="/dashboard/supervisors" className="btn-ghost w-fit font-bold rounded-xl shadow-sm">
          <ArrowRight size={16} /> الرجوع لقائمة الموجهين
        </Link>
      </div>
    );
  }

  const { supervisor: sup, coverage, activity, formTotals, schools,
          liveFormsList = [], liveFormsCount = 0, liveFormsSubmitted = 0 } = data as typeof data & {
    liveFormsList?: { _id: string; schoolName: string; coordinatorName: string; date: string; status: string }[];
    liveFormsCount?: number;
    liveFormsSubmitted?: number;
  };

  const codeVal = (c: string) => (activity ? ((activity as Record<string, unknown>)[c] as number) ?? 0 : 0);
  const formVal = (k: string) => (formTotals ? ((formTotals as Record<string, unknown>)[k] as number) ?? 0 : 0);
  const totalVisits = codeVal("VS") + codeVal("CL");
  const initials = sup.name.split(" ").slice(0, 2).map((w) => w[0]).join("");

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title={sup.name}
        subtitle={sup.jobTitle}
        icon={
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-light to-gold-dark flex items-center justify-center text-white text-base font-extrabold shadow-inner">
            {initials}
          </div>
        }
        action={
          <div className="flex gap-2">
            <PrintButton label="تصدير ملف الموجه (PDF)" />
            <Link href="/dashboard/supervisors"
              className="no-print flex items-center gap-2 bg-white/10 ring-1 ring-white/15 hover:ring-white/25 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-white/15 transition-all backdrop-blur-sm shadow-sm">
              <ArrowRight size={16} /> رجوع
            </Link>
          </div>
        }
      />

      <PrintHeader title={`ملف الموجه التربوي: ${sup.name}`} subtitle={`${sup.jobTitle} — العام الدراسي ${YEAR}`} />

      {/* بطاقات المؤشرات الرقمية المحدثة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <KpiCard 
          title="إجمالي الزيارات الميدانية" 
          value={totalVisits}
          sub={`${codeVal("VS")} صفية · ${codeVal("CL")} عارضة`} 
          icon={<CalendarCheck size={20} />} 
          color="primary" 
          delay={0} 
        />
        <KpiCard 
          title="المدارس المغطّاة" 
          value={coverage?.schoolsCovered ?? schools.length}
          sub={`من أصل ${coverage?.schoolsRequired ?? schools.length} مدارس مسندة`} 
          icon={<School size={20} />} 
          color="gold" 
          delay={60} 
        />
        <KpiCard
          title="إجمالي الاستمارات المرفوعة"
          value={(formTotals?.totalVisits ?? 0) + liveFormsCount}
          sub={liveFormsCount > 0 ? `${liveFormsCount} مدخلة رقمياً · ${formTotals?.totalVisits ?? 0} مستوردة` : "إجمالي النماذج الرقمية المعتمدة"}
          icon={<ClipboardCheck size={20} />}
          color="green"
          delay={120}
        />
        <KpiCard 
          title="نسبة التغطية المنجزة" 
          value={`${Math.round(coverage?.coverageRate ?? 0)}%`}
          sub="معدل الزيارات الفعلي المستهدف"
          icon={<TrendingUp size={20} />} 
          color="blue" 
          delay={180} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ملف البيانات الشخصية والمهنية */}
        <div className="card-luxurious p-6 bg-white/70 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-black/[0.04] pb-3">
            <h2 className="section-title text-[#1C1008] font-black">البيانات المهنية</h2>
            <span className={`pill backdrop-blur-sm text-[11px] font-bold ${sup.gender === "male" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70" : "bg-pink-50 text-pink-700 ring-1 ring-pink-200/70"}`}>
              {sup.gender === "male" ? "ذكر" : "أنثى"}
            </span>
          </div>
          <div className="divide-y divide-black/[0.03]">
            <InfoRow icon={<Briefcase size={14} />} label="المسمى الوظيفي" value={sup.jobTitle} />
            <InfoRow icon={<IdCard size={14} />} label="الرقم الوظيفي" value={sup.jobNumber} ltr />
            {sup.officePhone && <InfoRow icon={<Phone size={14} />} label="هاتف المكتب" value={sup.officePhone} ltr />}
            {sup.email && <InfoRow icon={<Mail size={14} />} label="البريد الإلكتروني" value={sup.email} ltr />}
            {sup.nationality && <InfoRow icon={<MapPin size={14} />} label="الجنسية والبلد" value={sup.nationality} />}
          </div>
          {coverage && (
            <div className="pt-4 border-t border-black/[0.04] flex items-center justify-between">
              <span className="text-xs font-bold text-[#8A7A72]">حالة التغطية والزيارات</span>
              <StatusBadge status={coverage.status} />
            </div>
          )}
        </div>

        {/* تفاصيل النماذج والاستمارات الرقمية */}
        <div className="card-luxurious p-6 bg-white/70 backdrop-blur-md flex flex-col justify-between" style={{ animationDelay: "80ms" }}>
          <div>
            <h2 className="section-title text-[#1C1008] font-black mb-4 border-b border-black/[0.04] pb-3">النماذج والاستمارات المرفوعة</h2>
            <div className="space-y-4">
              {FORM_TYPES.map((f) => {
                const val = formVal(f.key);
                const max = Math.max(...FORM_TYPES.map((x) => formVal(x.key)), 1);
                return (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6b5a52]">{f.label}</span>
                      <span className="text-xs font-black text-primary font-sans">{val}</span>
                    </div>
                    <div className="h-2 bg-black/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500" style={{ width: `${(val / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-black/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2A1418]">إجمالي الاستمارات المسلمة</span>
              <span className="text-lg font-black text-gold-dark font-sans">
                {(formTotals?.totalVisits ?? 0) + liveFormsCount} استمارة
              </span>
            </div>
            {/* زر عرض الاستمارات المدخلة رقمياً */}
            {liveFormsCount > 0 && (
              <button
                onClick={() => setShowLiveForms((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all no-print"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-primary">
                  <ClipboardList size={14} />
                  الاستمارات المدخلة عبر الموقع
                  <span className="pill bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-lg font-sans">{liveFormsCount}</span>
                </span>
                <ChevronDown size={14} className={`text-primary transition-transform ${showLiveForms ? "rotate-180" : ""}`} />
              </button>
            )}
            {showLiveForms && liveFormsCount > 0 && (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {liveFormsList.map((f) => (
                  <div key={f._id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/[0.02] border border-black/[0.03]">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#2A1418] truncate">{f.schoolName}</p>
                      <p className="text-[10px] text-[#8A7A72] truncate">{f.coordinatorName} · {f.date}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap ${
                      f.status === "submitted"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                        : "bg-gold/10 text-gold-dark border border-gold/20"
                    }`}>
                      {f.status === "submitted" ? "معتمدة" : "مسودة"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ملخص سجل الأنشطة والغياب */}
        <div className="card-luxurious p-6 bg-white/70 backdrop-blur-md flex flex-col justify-between" style={{ animationDelay: "160ms" }}>
          <div>
            <h2 className="section-title text-[#1C1008] font-black mb-4 border-b border-black/[0.04] pb-3">سجل النشاط الشهري والدوام</h2>
            <div className="space-y-4">
              <CodeGroup title="سجل الزيارات الميدانية والمهام" codes={VISIT_CODES} codeVal={codeVal} tone="text-emerald-700 bg-emerald-500/10 border-emerald-500/10" />
              <CodeGroup title="أيام التطوير والمهمات والمكتب" codes={WORK_CODES} codeVal={codeVal} tone="text-primary bg-primary/5 border-primary/5" />
              <CodeGroup title="الإجازات، الأذونات والغياب" codes={LEAVE_CODES} codeVal={codeVal} tone="text-orange-500 bg-orange-500/5 border-orange-500/5" />
            </div>
          </div>
          {activity && (
            <div className="pt-4 mt-4 border-t border-black/[0.04] flex items-center justify-between">
              <span className="text-xs font-bold text-[#2A1418]">أيام التمدرس الفعلية</span>
              <span className="text-lg font-black text-sky-700 font-sans">{activity.schoolingDays} يوم</span>
            </div>
          )}
        </div>
      </div>

      {/* المدارس المسندة بتصميم زجاجي رائع */}
      <div className="glass-table-container animate-in" style={{ animationDelay: "200ms" }}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-black/[0.04] bg-white/50">
          <h2 className="section-title text-[#1C1008] font-black">قائمة المدارس المسندة للموجه</h2>
          <span className="pill bg-primary/5 text-primary border border-primary/10 font-bold text-xs">{schools.length} مدرسة مسندة</span>
        </div>
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th className="text-right">اسم المنشأة التعليمية</th>
                <th className="text-center">فئة الطلاب</th>
                <th className="text-center">المرحلة الدراسية</th>
                <th className="text-center">عدد المعلمين</th>
                <th className="text-center">عدد المنسقين</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((sc) => sc && (
                <tr key={sc._id} className="group">
                  <td className="font-bold text-[#2A1418]">
                    <div className="flex items-center gap-3">
                      <span className="icon-orb !w-9 !h-9 bg-primary/5 text-primary transform group-hover:scale-105 transition-transform duration-300">
                        <School size={15} />
                      </span>
                      {sc.name}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`pill backdrop-blur-sm text-[11px] font-bold ${sc.gender === "male" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70" : "bg-pink-50 text-pink-700 ring-1 ring-pink-200/70"}`}>
                      {sc.gender === "male" ? "بنين" : "بنات"}
                    </span>
                  </td>
                  <td className="text-center text-xs font-semibold text-[#8A7A72]">{sc.level ?? "—"}</td>
                  <td className="text-center text-xs font-bold text-[#6b5a52] font-sans">{sc.teachers ?? "—"}</td>
                  <td className="text-center text-xs font-bold text-[#6b5a52] font-sans">{sc.coordinators ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {schools.length === 0 && (
          <div className="py-12 text-center text-[#8A7A72] text-sm font-bold bg-white/50">
            لا توجد مدارس مسندة حالياً لهذا الموجه في العام الحالي
          </div>
        )}
      </div>

      <PrintSignature />
    </div>
  );
}

function InfoRow({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value?: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-2.5">
      <span className="flex items-center gap-2 text-[#8A7A72] font-semibold"><span className="text-gold-dark">{icon}</span>{label}</span>
      <span className="font-bold text-[#2A1418] truncate" dir={ltr ? "ltr" : undefined}>{value ?? "—"}</span>
    </div>
  );
}

function CodeGroup({ title, codes, codeVal, tone }: {
  title: string; codes: string[]; codeVal: (c: string) => number; tone: string;
}) {
  const active = codes.filter((c) => codeVal(c) > 0);
  if (active.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold text-[#8A7A72]">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {active.map((c) => (
          <span key={c} className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-bold ${tone}`}>
            <span>{CODE_LABELS[c]}</span>
            <span className="font-black font-sans">{codeVal(c)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
