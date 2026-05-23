"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, Component } from "react";
import { AuthProvider } from "@/components/AuthProvider";

/* ── إنشاء Convex client بأمان ──────────────────────────────── */
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://brazen-ox-309.convex.cloud";

let convex: ConvexReactClient;
try {
  convex = new ConvexReactClient(CONVEX_URL);
} catch (e) {
  console.error("[Convex] Failed to init client:", e);
  // fallback مباشر
  convex = new ConvexReactClient("https://brazen-ox-309.convex.cloud");
}

/* ── Error Boundary يمنع كرش الصفحة كلها ───────────────────── */
interface EBState { hasError: boolean; }
class ConvexErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error("[ConvexBoundary]", err); }
  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif", background: "#FCF9F2" }}>
          <div style={{ textAlign: "center", padding: 32 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#5C1523", marginBottom: 8 }}>
              تعذّر الاتصال بالخادم
            </p>
            <p style={{ fontSize: 13, color: "#8A7A72", marginBottom: 16 }}>
              تحقق من اتصالك بالإنترنت وأعد تحميل الصفحة
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "8px 24px", background: "#5C1523", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}
            >
              إعادة التحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Provider الرئيسي ───────────────────────────────────────── */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexErrorBoundary>
      <ConvexProvider client={convex}>
        <AuthProvider>{children}</AuthProvider>
      </ConvexProvider>
    </ConvexErrorBoundary>
  );
}
