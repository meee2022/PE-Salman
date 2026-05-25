"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import { BookOpen, Trophy, GraduationCap, ClipboardCheck, ChevronLeft, Lock, ListChecks } from "lucide-react";

const PLAN_TYPES = [
  {
    href: "/dashboard/plans/operational",
    icon: ListChecks,
    title: "الخطة الإجرائية العامة",
    desc: "مجالات وأهداف وإجراءات القسم ومؤشرات الأداء",
    color: "from-[#5C1523] to-[#7A1E30]",
    accent: "bg-primary/10 text-primary",
    available: true,
  },
  {
    href: "/dashboard/plans/activities",
    icon: Trophy,
    title: "خطة الأنشطة اللاصفية",
    desc: "فعاليات القسم والمدارس المعتمدة للعام الدراسي",
    color: "from-gold-dark to-gold",
    accent: "bg-gold/10 text-gold-dark",
    available: true,
  },
  {
    href: "#",
    icon: GraduationCap,
    title: "خطط الموجهين",
    desc: "الخطط الإشرافية الفردية لكل موجه",
    color: "from-sky-700 to-sky-500",
    accent: "bg-sky-50 text-sky-700",
    available: false,
  },
  {
    href: "#",
    icon: ClipboardCheck,
    title: "خطط الدروس المشاهدة",
    desc: "جداول الدروس المخطط مشاهدتها ومتابعتها",
    color: "from-emerald-700 to-emerald-500",
    accent: "bg-emerald-50 text-emerald-700",
    available: false,
  },
];

export default function PlansPage() {
  const { token } = useAuth();
  const YEAR = useActiveYear();
  const activities = useQuery(api.activityPlans.listByYear, { academicYear: YEAR, token: token ?? undefined });

  const deptCount   = activities?.filter(a => a.type === "department").length ?? 0;
  const schoolCount = activities?.filter(a => a.type === "school").length ?? 0;

  return (
    <div className="space-y-8 animate-in">
      <PageHeader
        title="الخطط"
        subtitle={`خطط العام الدراسي ${YEAR} — الأنشطة والإشراف والدروس`}
        icon={<BookOpen size={24} />}
      />

      {/* بطاقات الخطط */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLAN_TYPES.map(({ href, icon: Icon, title, desc, color, accent, available }) => (
          available ? (
            <Link key={href} href={href}
              className="card-luxurious p-0 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group">
              <div className={`h-2 bg-gradient-to-l ${color}`} />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className={`icon-orb !w-11 !h-11 ${accent} border border-current/10`}>
                    <Icon size={20} />
                  </span>
                  <ChevronLeft size={16} className="text-[#C0B4AE] group-hover:text-primary transition-colors mt-1" />
                </div>
                <div>
                  <h3 className="font-black text-[#1C1008] text-base">{title}</h3>
                  <p className="text-xs text-[#8A7A72] font-semibold mt-1 leading-relaxed">{desc}</p>
                </div>
                {href === "/dashboard/plans/activities" && activities !== undefined && (
                  <div className="flex gap-2 pt-1">
                    <span className="pill bg-primary/5 text-primary border border-primary/10 text-[11px] font-bold">
                      {deptCount} فعالية قسم
                    </span>
                    <span className="pill bg-gold/10 text-gold-dark border border-gold/20 text-[11px] font-bold">
                      {schoolCount} فعالية مدرسة
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <div key={title}
              className="card-luxurious p-0 overflow-hidden opacity-60 cursor-not-allowed">
              <div className={`h-2 bg-gradient-to-l ${color} opacity-40`} />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className={`icon-orb !w-11 !h-11 ${accent} border border-current/10`}>
                    <Icon size={20} />
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#C0B4AE] bg-black/[0.04] px-2 py-1 rounded-lg">
                    <Lock size={11} /> قريباً
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-[#1C1008] text-base">{title}</h3>
                  <p className="text-xs text-[#8A7A72] font-semibold mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* ملخص سريع للأنشطة */}
      {activities !== undefined && activities.length > 0 && (
        <div className="card-luxurious bg-white/70 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[#1C1008] text-sm">أحدث الأنشطة المعتمدة</h2>
            <Link href="/dashboard/plans/activities" className="text-xs font-bold text-primary hover:underline">
              عرض الكل ←
            </Link>
          </div>
          <div className="space-y-2">
            {activities.slice(0, 5).map(a => (
              <div key={a._id} className="flex items-center gap-3 py-2 border-b border-black/[0.04] last:border-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${a.type === "department" ? "bg-primary" : "bg-gold"}`} />
                <span className="flex-1 text-sm font-bold text-[#2A1418] truncate">{a.activityName}</span>
                <span className="text-xs text-[#8A7A72] font-semibold shrink-0">{a.dateText}</span>
                <span className="text-[10px] font-bold text-[#8A7A72] bg-black/[0.04] px-2 py-0.5 rounded-lg shrink-0">{a.organizer}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
