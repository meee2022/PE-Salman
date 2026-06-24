"use client";

import React from "react";

/* ────────────────────────────────────────────────────────────────────
   عارض Markdown خفيف (بدون مكتبات) — يدعم العناوين والقوائم والجداول
   والنص الغامق. مصمَّم لمخرجات الذكاء الاصطناعي العربية (RTL).
   ──────────────────────────────────────────────────────────────────── */

function renderInline(text: string, key: React.Key): React.ReactNode {
  // **غامق**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <React.Fragment key={key}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-bold text-primary">{p.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </React.Fragment>
  );
}

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let listBuf: string[] = [];
  let tableBuf: string[] = [];

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pr-5 space-y-1 my-2 text-[#3a2b24]">
        {listBuf.map((it, idx) => (
          <li key={idx} className="text-sm leading-relaxed">{renderInline(it, idx)}</li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf
      .filter((r) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(r)) // إزالة صف الفاصل
      .map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
    const [head, ...body] = rows;
    blocks.push(
      <div key={`tbl-${blocks.length}`} className="my-3 overflow-x-auto rounded-xl border border-black/[0.06]">
        <table className="w-full text-sm border-collapse">
          {head && (
            <thead>
              <tr className="bg-primary text-white">
                {head.map((c, idx) => (
                  <th key={idx} className="px-3 py-2 text-right font-bold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri} className={ri % 2 ? "bg-[#FAF7F3]" : "bg-white"}>
                {r.map((c, ci) => (
                  <td key={ci} className="px-3 py-2 text-right text-[#3a2b24] border-t border-black/[0.04]">
                    {renderInline(c, ci)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("|")) {
      flushList();
      tableBuf.push(trimmed);
      i++;
      continue;
    } else {
      flushTable();
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      flushList();
      const level = trimmed.match(/^#+/)![0].length;
      const txt = trimmed.replace(/^#+\s/, "");
      const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-sm", "text-sm"];
      blocks.push(
        <h3 key={`h-${i}`} className={`${sizes[level - 1]} font-extrabold text-primary mt-4 mb-1.5 border-r-[3px] border-gold pr-2`}>
          {renderInline(txt, i)}
        </h3>
      );
    } else if (/^[-*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      listBuf.push(trimmed.replace(/^[-*]\s/, "").replace(/^\d+[.)]\s/, ""));
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed text-[#3a2b24] my-1.5">
          {renderInline(trimmed, i)}
        </p>
      );
    }
    i++;
  }
  flushList();
  flushTable();

  return <div className={className} dir="rtl">{blocks}</div>;
}
