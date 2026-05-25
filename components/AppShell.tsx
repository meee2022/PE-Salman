"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Home, Users, School, CalendarDays, BarChart3, ClipboardList,
  UserSearch, GraduationCap, Settings, Dumbbell, MoreHorizontal,
  LogOut, X, ChevronDown, UserCircle, ShieldCheck, FileBarChart2, BookOpen,
  Search, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { useActiveYear } from "@/hooks/useActiveYear";

interface NavItem { href: string; label: string; icon: LucideIcon }

function buildNav(role?: string, supervisorId?: string) {
  if (role === "supervisor") {
    const home = supervisorId ? `/dashboard/supervisors/${supervisorId}` : "/dashboard/settings";
    return {
      primary: [
        { href: home, label: "ملفي", icon: UserCircle },
        { href: "/dashboard/teachers", label: "المعلمون", icon: Users },
        { href: "/dashboard/activity", label: "النشاط", icon: CalendarDays },
        { href: "/dashboard/forms-center", label: "الاستمارات", icon: ClipboardList },
      ] as NavItem[],
      secondary: [
        { href: "/dashboard/remote", label: "التعلم عن بعد", icon: GraduationCap },
        { href: "/dashboard/compliance", label: "المواثيق والالتزام", icon: ShieldCheck },
        { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
      ] as NavItem[],
    };
  }
  return {
    primary: [
      { href: "/dashboard", label: "الرئيسية", icon: Home },
      { href: "/dashboard/supervisors", label: "الموجهون", icon: Users },
      { href: "/dashboard/reports", label: "التقارير", icon: FileBarChart2 },
      { href: "/dashboard/schools", label: "المدارس", icon: School },
      { href: "/dashboard/activity", label: "النشاط", icon: CalendarDays },
    ] as NavItem[],
    secondary: [
      { href: "/dashboard/plans", label: "الخطط", icon: BookOpen },
      { href: "/dashboard/coverage", label: "التغطية والمؤشرات", icon: BarChart3 },
      { href: "/dashboard/forms-center", label: "الاستمارات", icon: ClipboardList },
      { href: "/dashboard/interviews", label: "المقابلات", icon: UserSearch },
      { href: "/dashboard/remote", label: "التعلم عن بعد", icon: GraduationCap },
      { href: "/dashboard/teachers", label: "المعلمون", icon: Users },
      { href: "/dashboard/compliance", label: "المواثيق والالتزام", icon: ShieldCheck },
      { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
    ] as NavItem[],
  };
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { primary, secondary } = buildNav(user?.role, user?.supervisorId as string | undefined);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <TopBar primary={primary} secondary={secondary} onSearch={() => setSearchOpen(true)} />

      <main className="flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 lg:pb-8 space-y-5">
          {children}
        </div>
      </main>

      <BottomNav primary={primary} hasMore={secondary.length > 0} onMore={() => setMoreOpen(true)} />

      {moreOpen && <MoreSheet items={secondary} onClose={() => setMoreOpen(false)} />}
    </div>
  );
}

/* ─────────────────────────── الشريط العلوي ─────────────────────────── */
function TopBar({ primary, secondary, onSearch }: { primary: NavItem[]; secondary: NavItem[]; onSearch: () => void }) {
  const isActive = useIsActive();
  const [moreOpen, setMoreOpen] = useState(false);
  const { token, user } = useAuth();
  const YEAR = useActiveYear();
  const alertCount = useQuery(
    api.alerts.count,
    token && user?.role !== "supervisor" ? { academicYear: YEAR, token } : "skip"
  );

  return (
    <header className="no-print sticky top-0 z-40 safe-top bg-white/85 backdrop-blur-xl border-b border-black/[0.05]">
      <div className="max-w-6xl mx-auto h-[var(--topbar-h)] px-4 sm:px-6 flex items-center gap-4">
        {/* العلامة */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="icon-orb !w-9 !h-9 bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] shadow-sm">
            <Dumbbell size={18} className="text-gold" />
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-[13px] font-extrabold text-primary">التوجيه التربوي</p>
            <p className="text-[10px] text-[#7A6A58]">التربية البدنية</p>
          </div>
        </Link>

        {/* تنقّل أفقي — سطح المكتب */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors
                  ${active ? "bg-primary text-white shadow-sm" : "text-[#5b4a3e] hover:bg-black/[0.04]"}`}>
                <Icon size={17} className={active ? "text-gold" : ""} /> {label}
              </Link>
            );
          })}
          {secondary.length > 0 && (
            <div className="relative">
              <button onClick={() => setMoreOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-[#5b4a3e] hover:bg-black/[0.04] transition-colors">
                المزيد <ChevronDown size={15} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute left-0 top-12 z-20 bg-white border border-black/[0.06] rounded-2xl shadow-xl min-w-56 py-1.5 animate-in">
                    {secondary.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gold/10
                          ${isActive(href) ? "text-primary font-bold bg-primary/[0.03]" : "text-[#4b3a32]"}`}>
                        <Icon size={17} className="text-gold-dark" /> {label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </nav>

        {/* أزرار البحث والتنبيهات */}
        <div className="mr-auto lg:mr-0 flex items-center gap-1">
          {/* زر البحث الشامل */}
          <button
            onClick={onSearch}
            title="بحث شامل (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[#7A6A58] hover:bg-black/[0.04] hover:text-primary transition-colors"
          >
            <Search size={18} />
            <span className="hidden sm:inline text-xs font-medium text-[#C0B3AA]">Ctrl K</span>
          </button>

          {/* جرس التنبيهات — للأدمن فقط */}
          {user?.role !== "supervisor" && (
            <Link
              href="/dashboard/coverage"
              title="التنبيهات النشطة"
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[#7A6A58] hover:bg-black/[0.04] hover:text-primary transition-colors"
            >
              <Bell size={18} />
              {alertCount != null && alertCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center font-sans">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </Link>
          )}

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────── قائمة الملف ─────────────────────────── */
function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const roleLabel = user?.role === "admin" ? "رئيس التوجيه" : user?.role === "supervisor" ? "موجه" : "مستخدم";

  async function handleLogout() { await logout(); router.replace("/login"); }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pr-1 pl-2 py-1 rounded-full hover:bg-black/[0.04] transition-colors">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white flex items-center justify-center text-sm font-bold shadow-sm">
          {user?.name?.[0] ?? "؟"}
        </div>
        <span className="hidden md:block text-xs font-semibold text-[#2A1418] max-w-28 truncate">{user?.name}</span>
        <ChevronDown size={14} className={`hidden md:block text-[#A89A92] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-12 z-20 bg-white border border-black/[0.06] rounded-2xl shadow-xl min-w-56 overflow-hidden animate-in">
            <div className="px-4 py-3 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] text-white">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-[11px] text-white/60">{roleLabel}</p>
            </div>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4b3a32] hover:bg-gold/10 transition-colors">
              <Settings size={16} className="text-gold-dark" /> الإعدادات
            </Link>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── التنقّل السفلي (موبايل) ─────────────────────────── */
function BottomNav({ primary, hasMore, onMore }: { primary: NavItem[]; hasMore: boolean; onMore: () => void }) {
  const isActive = useIsActive();
  return (
    <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-black/[0.06] safe-bottom">
      <div className="flex items-stretch px-2">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className="tab-item">
              <Icon size={21} className={active ? "text-primary" : "text-[#A89A92]"} />
              <span className={active ? "text-primary font-bold" : "text-[#A89A92]"}>{label}</span>
              <span className={`h-0.5 w-6 rounded-full mt-0.5 transition-colors ${active ? "bg-primary" : "bg-transparent"}`} />
            </Link>
          );
        })}
        {hasMore && (
          <button onClick={onMore} className="tab-item">
            <MoreHorizontal size={21} className="text-[#A89A92]" />
            <span className="text-[#A89A92]">المزيد</span>
            <span className="h-0.5 w-6 rounded-full mt-0.5 bg-transparent" />
          </button>
        )}
      </div>
    </nav>
  );
}

/* ─────────────────────────── لوح "المزيد" (موبايل) ─────────────────────────── */
function MoreSheet({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const { logout } = useAuth();
  const router = useRouter();
  const isActive = useIsActive();
  async function handleLogout() { await logout(); router.replace("/login"); }

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-[#2A1418]/40 animate-fade" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl safe-bottom animate-sheet">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="absolute right-1/2 translate-x-1/2 top-2 w-10 h-1 rounded-full bg-black/10" />
          <h3 className="font-bold text-[#2A1418] mt-1">المزيد</h3>
          <button onClick={onClose} className="text-[#A89A92] hover:text-[#2A1418]"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors
                ${isActive(href) ? "border-primary/30 bg-primary/[0.04]" : "border-black/[0.05] hover:bg-black/[0.02]"}`}>
              <span className="icon-orb !w-10 !h-10 bg-gold/10 text-gold-dark"><Icon size={18} /></span>
              <span className="text-sm font-semibold text-[#2A1418]">{label}</span>
            </Link>
          ))}
        </div>
        <div className="px-4 pb-5">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
            <LogOut size={17} /> تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
