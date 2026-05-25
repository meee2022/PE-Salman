"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileSignature, CircleCheck, Clock, Trash2, Search, ArrowRight, LayoutList } from "lucide-react";

export interface FormRow {
  _id: string;
  schoolName: string;
  supervisorId: string;
  supervisorName: string;
  status: "draft" | "submitted";
  date: string;
  primary: string;   // النص الأساسي (اسم المعلم/المنسق أو الموضوع)
}

export function SupervisorFormList({ forms, isAdmin, basePath, onDelete, searchPlaceholder }: {
  forms: FormRow[]; isAdmin: boolean; basePath: string;
  onDelete: (id: string) => void; searchPlaceholder: string;
}) {
  const [search, setSearch] = useState("");
  const [selSup, setSelSup] = useState<{ id: string; name: string } | "all" | null>(null);

  const norm = (s: string) => (s || "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
  const searching = search.trim().length > 0;
  const matchSearch = (f: FormRow) => [f.primary, f.schoolName, f.supervisorName].some((x) => norm(x).includes(norm(search)));

  const groupMap = new Map<string, { id: string; name: string; total: number; submitted: number }>();
  forms.forEach((f) => {
    const g = groupMap.get(f.supervisorId) ?? { id: f.supervisorId, name: f.supervisorName, total: 0, submitted: 0 };
    g.total++; if (f.status === "submitted") g.submitted++;
    groupMap.set(f.supervisorId, g);
  });
  const groups = Array.from(groupMap.values()).sort((a, b) => b.total - a.total);

  let listForms = forms;
  let heading: string | null = null;
  if (searching) { listForms = forms.filter(matchSearch); heading = `نتائج البحث (${listForms.length})`; }
  else if (isAdmin && selSup === null) { listForms = []; }
  else if (selSup && selSup !== "all") { listForms = forms.filter((f) => f.supervisorId === selSup.id); heading = `استمارات: ${selSup.name}`; }
  else if (selSup === "all") { heading = `كل الاستمارات (${forms.length})`; }

  const showGrid = isAdmin && !searching && selSup === null;

  return (
    <>
      <div className="card-luxurious p-4 flex items-center gap-3 animate-in focus-within:ring-1 focus-within:ring-gold/45 focus-within:border-gold/60">
        <Search size={18} className="text-primary/50 mr-1" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder}
          className="flex-1 bg-transparent outline-none text-xs font-semibold text-[#2A1418] placeholder:text-stone-400" />
        {search && <button onClick={() => setSearch("")} className="text-xs font-bold text-primary">مسح البحث</button>}
      </div>

      {showGrid ? (
        <div className="space-y-6 animate-in">
          <h2 className="text-xs font-extrabold text-[#5C1523] tracking-wider uppercase opacity-85">مجموعات الموجهين وإحصائيات التقديم</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => setSelSup("all")} className="card-luxurious card-luxurious-hover p-6 flex items-center gap-4 text-right bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] border-none shadow-xl text-white relative overflow-hidden group">
              <div className="pattern-arabesque absolute inset-0 opacity-[0.2] pointer-events-none" />
              <span className="icon-orb bg-white/10 ring-1 ring-white/20 text-gold shadow-md group-hover:scale-105 transition-transform"><LayoutList size={20} /></span>
              <div className="flex-1 min-w-0 relative">
                <p className="font-extrabold text-sm text-white">كل الاستمارات</p>
                <p className="text-[11px] text-white/70 mt-1 font-semibold">{forms.length} استمارة مسجلة</p>
              </div>
              <ChevronLeft size={18} className="text-white/60" />
            </button>
            {groups.map((g) => (
              <button key={g.id} onClick={() => setSelSup({ id: g.id, name: g.name })} className="card-luxurious card-luxurious-hover p-6 flex items-center gap-4 text-right group relative overflow-hidden">
                <span className="icon-orb bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white flex items-center justify-center font-extrabold shrink-0 shadow-md text-xs border border-gold/25">
                  {g.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-xs text-[#2A1418] truncate group-hover:text-primary transition-colors">{g.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-stone-500 font-bold">{g.total} استمارات</span>
                    <span className="w-1 h-1 rounded-full bg-gold/50" />
                    <span className="text-[10px] text-emerald-600 font-bold">{g.submitted} معتمدة</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-[#C7B8A6]" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in">
          {(heading && (selSup || searching)) && (
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-gold/10 pb-3">
              <div className="flex items-center gap-2">
                {isAdmin && !searching && <button onClick={() => setSelSup(null)} className="btn-ghost !py-2 !px-3 text-xs font-bold flex items-center gap-1"><ArrowRight size={14} /> العودة للموجهين</button>}
                <h2 className="text-sm font-extrabold text-[#5C1523] flex items-center gap-2"><span className="w-1.5 h-3 rounded bg-primary" />{heading}</h2>
              </div>
            </div>
          )}
          {listForms.length === 0 ? (
            <div className="card-luxurious p-12 text-center text-stone-500 text-sm flex flex-col items-center justify-center gap-2">
              <Search className="w-8 h-8 text-gold/40" />
              <p className="font-extrabold text-[#5C1523] text-xs">لا توجد استمارات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {listForms.map((f, idx) => (
                <div key={f._id} className="card-luxurious card-luxurious-hover p-5 flex items-center gap-4 group relative overflow-hidden transition-all hover:shadow-xl hover:border-gold/30" style={{ animationDelay: `${idx * 40}ms` }}>
                  <span className="icon-orb bg-primary/5 text-primary shrink-0 group-hover:scale-105 transition-transform"><FileSignature size={20} /></span>
                  <Link href={`${basePath}/${f._id}`} className="flex-1 min-w-0">
                    <p className="font-extrabold text-[#2A1418] text-xs leading-snug group-hover:text-primary transition-colors">{f.schoolName}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] text-stone-500 font-bold">{f.primary}</span>
                      <span className="text-stone-300 text-[10px]">•</span>
                      <span className="text-[10px] text-stone-500 font-bold">{f.date}</span>
                      {isAdmin && f.supervisorName && (<><span className="text-stone-300 text-[10px]">•</span><span className="text-[10px] text-[#A8853A] font-extrabold">{f.supervisorName}</span></>)}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    {f.status === "submitted" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200"><CircleCheck size={11} className="text-emerald-600" /> معتمدة</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-200"><Clock size={11} className="text-amber-600" /> مسودة</span>
                    )}
                    <button onClick={() => onDelete(f._id)} className="text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl p-2 shrink-0 transition-colors" title="حذف"><Trash2 size={14} /></button>
                    <Link href={`${basePath}/${f._id}`} className="text-stone-300 hover:text-[#5C1523] p-1 shrink-0"><ChevronLeft size={18} /></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
