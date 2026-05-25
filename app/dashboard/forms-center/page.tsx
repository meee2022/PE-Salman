"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClipboardList, ClipboardCheck, FileSpreadsheet, ListChecks, GraduationCap, ChevronLeft, FolderOpen, FileText, UserPlus, Gavel, Building2, UserCog, Award } from "lucide-react";

const FORMS = [
  { href: "/dashboard/forms", icon: ClipboardList, title: "استمارة الإشراف على المنسق", desc: "تقييم أداء منسق المادة عبر مجالات الإشراف ومؤشرات الأداء", code: "ES-ESP-P12-F3", color: "from-[#5C1523] to-[#7A1E30]", accent: "bg-primary/10 text-primary", q: "coordinatorForms" },
  { href: "/dashboard/teacher-forms", icon: ClipboardCheck, title: "استمارة الإشراف على المعلم", desc: "تقييم أداء المعلم داخل الحصة + بنك التوصيات", code: "ES-ESP-P12-F2", color: "from-sky-700 to-sky-500", accent: "bg-sky-50 text-sky-700", q: "teacherForms" },
  { href: "/dashboard/exam-forms", icon: FileSpreadsheet, title: "استمارة الاختبار العملي", desc: "تصميم الاختبار العملي بنشاطاته ودرجاته", code: "ES-ESP-P18-F1", color: "from-emerald-700 to-emerald-500", accent: "bg-emerald-50 text-emerald-700", q: "examForms" },
  { href: "/dashboard/exam-followup", icon: ListChecks, title: "استمارة متابعة تنفيذ الاختبار", desc: "تقييم تنفيذ الاختبار عبر 5 مجالات وملاحظات", code: "ES-ESP-P18-F3", color: "from-amber-600 to-amber-400", accent: "bg-amber-50 text-amber-700", q: "examFollowupForms" },
  { href: "/dashboard/exam-arbitration", icon: Gavel, title: "استمارة تحكيم اختبار تربية بدنية", desc: "تحكيم الاختبار العملي عبر 5 مجالات مع الملاحظات وتوقيع المنسق", code: "ES-ESP-P18-F2", color: "from-orange-700 to-orange-500", accent: "bg-orange-50 text-orange-700", q: "examArbitrationForms" },
  { href: "/dashboard/prof-dev", icon: GraduationCap, title: "استمارة التطوير المهني", desc: "جلسات التطوير المهني مع الملخص والتوصيات والحضور", code: "ES-ESA-P11-F4", color: "from-violet-700 to-violet-500", accent: "bg-violet-50 text-violet-700", q: "profDevForms" },
  { href: "/dashboard/meetings", icon: FileText, title: "محضر اجتماع الزيارة التعارفية", desc: "محضر الزيارة التعارفية مع الأهداف والتوصيات والحضور", code: "ES-ESP-P12-F8", color: "from-teal-700 to-teal-500", accent: "bg-teal-50 text-teal-700", q: "meetingForms" },
  { href: "/dashboard/new-teacher", icon: UserPlus, title: "خطة تهيئة معلم مستجد", desc: "خطة تطوير ومتابعة المعلم المستجد بمعاييرها الستة", code: "ES-ESP-P12", color: "from-rose-700 to-rose-500", accent: "bg-rose-50 text-rose-700", q: "newTeacherPlans" },
  { href: "/dashboard/deputy-principal", icon: UserCog, title: "استمارة متابعة أداء نائب المدير", desc: "متابعة نائب المدير للشؤون الأكاديمية عبر 4 مجالات إشرافية", code: "ES-ESP-P13-F1", color: "from-cyan-700 to-cyan-500", accent: "bg-cyan-50 text-cyan-700", q: "deputyPrincipalForms" },
  { href: "/dashboard/principal-forms", icon: Building2, title: "استمارة متابعة أداء مدير المدرسة", desc: "متابعة مدير المدرسة عبر مجالات القيادة والإدارة والجوانب الشخصية", code: "", color: "from-indigo-700 to-indigo-500", accent: "bg-indigo-50 text-indigo-700", q: "principalForms" },
  { href: "/dashboard/prof-licenses", icon: Award, title: "استمارات الرخصة المهنية", desc: "تقييم أداء المعلمين والمنسقين للرخصة المهنية (3 نماذج: خبير بدون منسق، خبير بمنسق، منسق بمهام تدريسية)", code: "نموذج 3-1 | 5-1 | 1-3", color: "from-yellow-700 to-yellow-500", accent: "bg-yellow-50 text-yellow-700", q: "profLicenseForms" },
];

export default function FormsCenterPage() {
  const { token } = useAuth();
  const YEAR = useActiveYear();
  const a = useQuery(api.coordinatorForms.list, token ? { academicYear: YEAR, token } : "skip");
  const b = useQuery(api.teacherForms.list, token ? { academicYear: YEAR, token } : "skip");
  const c = useQuery(api.examForms.list, token ? { academicYear: YEAR, token } : "skip");
  const d = useQuery(api.examFollowupForms.list, token ? { academicYear: YEAR, token } : "skip");
  const arb = useQuery(api.examArbitrationForms.list, token ? { academicYear: YEAR, token } : "skip");
  const e = useQuery(api.profDevForms.list, token ? { academicYear: YEAR, token } : "skip");
  const f = useQuery(api.meetingForms.list, token ? { academicYear: YEAR, token } : "skip");
  const g = useQuery(api.newTeacherPlans.list, token ? { academicYear: YEAR, token } : "skip");
  const h = useQuery(api.deputyPrincipalForms.list, token ? { academicYear: YEAR, token } : "skip");
  const k = useQuery(api.principalForms.list, token ? { academicYear: YEAR, token } : "skip");
  const lic = useQuery(api.profLicenseForms.list, token ? { academicYear: YEAR, token } : "skip");
  const counts: Record<string, number | undefined> = {
    coordinatorForms: a?.length, teacherForms: b?.length, examForms: c?.length,
    examFollowupForms: d?.length, examArbitrationForms: arb?.length,
    profDevForms: e?.length, meetingForms: f?.length, newTeacherPlans: g?.length,
    deputyPrincipalForms: h?.length, principalForms: k?.length, profLicenseForms: lic?.length,
  };

  return (
    <div className="space-y-8 animate-in">
      <PageHeader title="الاستمارات الإشرافية" subtitle={`جميع استمارات الزيارات والإشراف — العام الدراسي ${YEAR}`} icon={<FolderOpen size={24} />} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FORMS.map(({ href, icon: Icon, title, desc, code, color, accent, q }) => (
          <Link key={href} href={href} className="card-luxurious p-0 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group">
            <div className={`h-2 bg-gradient-to-l ${color}`} />
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className={`icon-orb !w-11 !h-11 ${accent} border border-current/10`}><Icon size={20} /></span>
                <ChevronLeft size={16} className="text-[#C0B4AE] group-hover:text-primary transition-colors mt-1" />
              </div>
              <div>
                <h3 className="font-black text-[#1C1008] text-base leading-snug">{title}</h3>
                <p className="text-xs text-[#8A7A72] font-semibold mt-1 leading-relaxed">{desc}</p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg font-mono">{code}</span>
                {counts[q] !== undefined && (
                  <span className="pill bg-primary/5 text-primary border border-primary/10 text-[11px] font-bold">{counts[q]} استمارة</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
