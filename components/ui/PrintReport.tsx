"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Printer } from "lucide-react";

// زر تنزيل/طباعة PDF (يستخدم طباعة المتصفح → دعم عربي/RTL مثالي)
export function PrintButton({ label = "تنزيل PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-ghost no-print">
      <Printer size={16} /> {label}
    </button>
  );
}

// ترويسة التقرير — تظهر عند الطباعة فقط، وتقرأ بيانات الجهة من الإعدادات
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { token } = useAuth();
  const org = useQuery(api.settings.org, token ? { token } : "skip");
  const today = new Date().toLocaleDateString("ar-EG-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="print-only" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #5C1523", paddingBottom: 10 }}>
        <div>
          <p style={{ fontWeight: 800, color: "#5C1523", fontSize: 13 }}>{org?.["org.ministry"]}</p>
          <p style={{ fontSize: 12, color: "#2A1418" }}>{org?.["org.department"]} — {org?.["org.section"]}</p>
        </div>
        <p style={{ fontSize: 11, color: "#7A6A58" }}>التاريخ: {today}</p>
      </div>
      <div style={{ textAlign: "center", margin: "12px 0 4px" }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1C1008" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: "#7A6A58", marginTop: 2 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// تذييل بتوقيع رئيس التوجيه — يظهر عند الطباعة فقط
export function PrintSignature() {
  const { token } = useAuth();
  const org = useQuery(api.settings.org, token ? { token } : "skip");
  const head = org?.["org.headName"];
  const manager = org?.["org.managerName"];
  if (!head && !manager) return null;

  return (
    <div className="print-only" style={{ marginTop: 28, display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
      {head && (
        <div style={{ textAlign: "center", fontSize: 12 }}>
          <p style={{ color: "#7A6A58" }}>رئيس قسم التوجيه</p>
          <p style={{ fontWeight: 700, color: "#1C1008", marginTop: 18 }}>{head}</p>
        </div>
      )}
      {manager && (
        <div style={{ textAlign: "center", fontSize: 12 }}>
          <p style={{ color: "#7A6A58" }}>مدير إدارة التوجيه التربوي</p>
          <p style={{ fontWeight: 700, color: "#1C1008", marginTop: 18 }}>{manager}</p>
        </div>
      )}
    </div>
  );
}
