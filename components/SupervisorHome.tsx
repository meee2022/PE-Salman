"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useActiveYear } from "@/hooks/useActiveYear";
import {
  School, ClipboardCheck, CalendarCheck, Users, FileText,
  UserCircle, ChevronLeft, AlertTriangle,
} from "lucide-react";

// حلقة تغطية بسيطة
function Ring({ pct, size = 96, stroke = 9 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, pct) / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#Eee7d8" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#5C1523" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="font-sans"
        style={{ fontSize: 20, fontWeight: 900, fill: "#5C1523" }}>{pct}%</text>
    </svg>
  );
}

export function SupervisorHome() {
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const id = user?.supervisorId as Id<"supervisors"> | undefined;
  const data = useQuery(api.supervisors.detail, token && id ? { id, academicYear: YEAR, token } : "skip");

  if (!id) {
    return (
      <div className="card-luxurious p-8 text-center text-[#7A6A58] text-sm">
        حسابك غير مرتبط بملف موجّه — تواصل مع المسؤول.
      </div>
    );
  }
  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }
  if (data === null || !data.supervisor) {
    return <div className="card-luxurious p-8 text-center text-[#7A6A58] text-sm">تعذّر تحميل بياناتك.</div>;
  }

  const sup = data.supervisor;
  const coverage = (data as any).coverage;
  const schools = (data as any).schools ?? [];
  const visitsList = (data as any).schoolVisitsList ?? [];
  const liveForms = (data as any).liveFormsList ?? [];
  const totalVisits = visitsList.reduce((s: number, r: any) => s + r.total, 0) || ((data as any).formTotals?.totalVisits ?? 0);
  const drafts = liveForms.filter((f: any) => f.status === "draft").length;
  const covRate = Math.round(coverage?.coverageRate ?? 0);
  const now = new Date();
  const greet = now.getHours() < 12 ? "صباح الخير" : "مساء الخير";
  const first = sup.name.split(" ").slice(0, 2).join(" ");

  const stats = [
    { icon: <School size={18} />, label: "مدارسي المسندة", value: schools.length, tone: "primary" },
    { icon: <CalendarCheck size={18} />, label: "زياراتي المنفّذة", value: totalVisits, tone: "gold" },
    { icon: <ClipboardCheck size={18} />, label: "استماراتي المرفوعة", value: liveForms.length, tone: "green" },
    { icon: <FileText size={18} />, label: "مسوّدات بانتظارك", value: drafts, tone: drafts > 0 ? "amber" : "muted" },
  ];
  const toneCls: Record<string, string> = {
    primary: "bg-primary/5 text-primary", gold: "bg-gold/10 text-gold-dark",
    green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", muted: "bg-black/[0.03] text-[#8A7A72]",
  };

  const actions = [
    { href: `/dashboard/supervisors/${id}`, label: "ملفي الكامل", icon: <UserCircle size={20} /> },
    { href: "/dashboard/forms-center", label: "استماراتي", icon: <ClipboardCheck size={20} /> },
    { href: "/dashboard/activity", label: "سجل نشاطي", icon: <CalendarCheck size={20} /> },
    { href: "/dashboard/teachers", label: "معلموني", icon: <Users size={20} /> },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* هيرو ترحيبي */}
      <div className="hero-gradient-premium rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-gold-light tracking-wide">{greet} 👋</p>
            <h1 className="text-2xl font-black mt-1">{first}</h1>
            <p className="text-white/70 text-sm mt-1">{sup.jobTitle} · العام {YEAR}</p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 border border-gold/20">
            <Ring pct={covRate} />
            <div className="pl-2">
              <p className="text-[11px] text-white/70 font-bold">نسبة تغطيتي</p>
              <p className="text-lg font-black text-gold-light">{coverage?.status ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* مؤشراتي */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <span className={`icon-orb !w-11 !h-11 ${toneCls[s.tone]}`}>{s.icon}</span>
            <div>
              <div className="text-2xl font-black font-sans text-[#1C1008] leading-none">{s.value}</div>
              <div className="text-[11px] font-bold text-[#7A6A58] mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* إجراءات سريعة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}
            className="module-card justify-between group hover:border-gold/30">
            <span className="flex items-center gap-3">
              <span className="icon-orb !w-10 !h-10 bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] text-gold">{a.icon}</span>
              <span className="text-sm font-bold text-[#2A1418]">{a.label}</span>
            </span>
            <ChevronLeft size={16} className="text-[#C0B3AA] group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      {/* سجل زياراتي (أعلى المدارس) */}
      {visitsList.length > 0 && (
        <div className="glass-table-container">
          <div className="px-5 py-3 border-b border-black/[0.04] bg-white/50 flex items-center justify-between">
            <h2 className="section-title text-[#1C1008] font-black text-sm">سجل زياراتي حسب المدرسة</h2>
            <Link href={`/dashboard/supervisors/${id}`} className="text-xs font-bold text-primary hover:underline">عرض الكل ←</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead><tr><th className="text-right">المدرسة</th><th className="text-center">عدد الزيارات</th></tr></thead>
              <tbody>
                {[...visitsList].sort((a: any, b: any) => b.total - a.total).slice(0, 8).map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="font-bold text-[#2A1418]">{r.schoolName}</td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-xl text-[12px] font-black text-white bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] font-sans">{r.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
