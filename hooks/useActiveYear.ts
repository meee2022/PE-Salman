"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const FALLBACK = "2025-2026";

/**
 * يجيب السنة الدراسية النشطة من قاعدة البيانات.
 * لو التحميل لسه جاري، يرجع الـ fallback "2025-2026"
 * عشان الصفحات ما توقفش.
 */
export function useActiveYear(): string {
  const year = useQuery(api.settings.activeYear);
  return year ?? FALLBACK;
}
