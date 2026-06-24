"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { ForcePasswordChange } from "@/components/ui/ForcePasswordChange";

function supervisorHome(supervisorId?: string) {
  return supervisorId ? `/dashboard/supervisors/${supervisorId}` : "/dashboard/settings";
}

function isAllowedForSupervisor(pathname: string, home: string) {
  return (
    pathname === home ||
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/forms") ||
    pathname.startsWith("/dashboard/teacher-forms") ||
    pathname.startsWith("/dashboard/exam-forms") ||
    pathname.startsWith("/dashboard/exam-followup") ||
    pathname.startsWith("/dashboard/exam-arbitration") ||
    pathname.startsWith("/dashboard/prof-dev") ||
    pathname.startsWith("/dashboard/meetings") ||
    pathname.startsWith("/dashboard/new-teacher") ||
    pathname.startsWith("/dashboard/teachers") ||
    pathname.startsWith("/dashboard/activity") ||
    pathname.startsWith("/dashboard/remote") ||
    pathname.startsWith("/dashboard/compliance") ||
    pathname.startsWith("/dashboard/plans") ||
    pathname.startsWith("/dashboard/deputy-principal") ||
    pathname.startsWith("/dashboard/principal-forms") ||
    pathname.startsWith("/dashboard/prof-licenses")
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "supervisor") {
      const home = supervisorHome(user.supervisorId);
      if (!isAllowedForSupervisor(pathname, home)) router.replace(home);
    }
  }, [loading, user, pathname, router]);

  // أثناء التحميل أو إعادة التوجيه
  const redirectingSupervisor =
    user?.role === "supervisor" && !isAllowedForSupervisor(pathname, supervisorHome(user.supervisorId));

  if (loading || !user || redirectingSupervisor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  // بوابة إجبارية: تغيير كلمة المرور الافتراضية قبل أي استخدام
  if (user.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return <AppShell>{children}</AppShell>;
}
