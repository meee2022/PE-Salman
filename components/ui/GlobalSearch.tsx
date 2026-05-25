"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Search, X, Users, School, User } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  type: "supervisor" | "school" | "teacher";
  href: string;
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const supervisors = useQuery(api.supervisors.list, open && token ? { token } : "skip");
  const schools     = useQuery(api.schools.list,     open && token ? { token } : "skip");
  const teachers    = useQuery(api.teachers.list,    open && token ? { token } : "skip");

  // فتح → تركيز تلقائي على حقل البحث
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  // إغلاق بـ Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = query.trim();
  const results: SearchResult[] = q.length < 2 ? [] : [
    ...(supervisors ?? [])
      .filter((s) => s.name?.includes(q) || s.name?.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map((s) => ({
        id: s._id as string,
        name: s.name,
        subtitle: s.jobTitle ?? "موجه تربوي",
        type: "supervisor" as const,
        href: `/dashboard/supervisors/${s._id}`,
      })),
    ...(schools ?? [])
      .filter((s) => s.name?.includes(q))
      .slice(0, 4)
      .map((s) => ({
        id: s._id as string,
        name: s.name,
        subtitle: s.gender === "male" ? "بنين" : "بنات",
        type: "school" as const,
        href: `/dashboard/schools`,
      })),
    ...(teachers ?? [])
      .filter((t) => t.name?.includes(q))
      .slice(0, 3)
      .map((t) => ({
        id: t._id as string,
        name: t.name,
        subtitle: t.schoolName ?? "",
        type: "teacher" as const,
        href: `/dashboard/teachers`,
      })),
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4" dir="rtl">
      {/* الخلفية */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* النافذة */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden animate-in">
        {/* شريط البحث */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06]">
          <Search size={18} className="text-gold-dark shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن موجه، مدرسة، أو معلم..."
            className="flex-1 outline-none text-sm font-medium text-[#2A1418] placeholder:text-[#C0B3AA] bg-transparent"
            dir="rtl"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[#C0B3AA] hover:text-[#7A6A58] transition-colors">
              <X size={16} />
            </button>
          )}
          <button onClick={onClose} className="text-[11px] font-bold text-[#C0B3AA] border border-black/[0.08] rounded-lg px-2 py-1 hover:bg-black/[0.03]">
            ESC
          </button>
        </div>

        {/* النتائج */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto divide-y divide-black/[0.04]">
            {results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gold/5 transition-colors group"
              >
                <span className="icon-orb !w-9 !h-9 bg-gold/10 text-gold-dark shrink-0 group-hover:bg-gold/20 transition-colors">
                  {r.type === "supervisor" ? <Users size={15} /> : r.type === "school" ? <School size={15} /> : <User size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#2A1418] truncate">{r.name}</p>
                  <p className="text-[11px] text-[#8A7A72] truncate">{r.subtitle}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                  r.type === "supervisor" ? "bg-primary/10 text-primary" :
                  r.type === "school" ? "bg-gold/10 text-gold-dark" :
                  "bg-sky-50 text-sky-700"
                }`}>
                  {r.type === "supervisor" ? "موجه" : r.type === "school" ? "مدرسة" : "معلم"}
                </span>
              </Link>
            ))}
          </div>
        )}

        {q.length >= 2 && results.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[#8A7A72] font-medium">
            لا توجد نتائج لـ &quot;{query}&quot;
          </p>
        )}

        {q.length < 2 && (
          <div className="px-4 py-5 text-center space-y-1">
            <p className="text-xs text-[#C0B3AA] font-medium">اكتب حرفين على الأقل للبحث</p>
            <p className="text-[10px] text-[#D8CFC0]">يشمل البحث: الموجهون · المدارس · المعلمون</p>
          </div>
        )}
      </div>
    </div>
  );
}
