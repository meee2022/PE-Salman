interface Props {
  status: string;
  className?: string;
}

const MAP: Record<string, { label: string; cls: string }> = {
  "✅مكتمل":  { label: "مكتمل",  cls: "badge-complete"  },
  "✅ممتاز":  { label: "ممتاز",  cls: "badge-excellent" },
  "🏆متميز":  { label: "متميز",  cls: "badge-champion"  },
  "⚠️قريب":   { label: "قريب",   cls: "badge-near"      },
};

const DOT: Record<string, string> = {
  "✅مكتمل": "bg-emerald-500",
  "✅ممتاز": "bg-sky-500",
  "🏆متميز": "bg-[#A8853A]",
  "⚠️قريب":  "bg-orange-500",
};

export function StatusBadge({ status, className = "" }: Props) {
  const key = status.replace(/\s+/g, "");
  const entry = MAP[key] ?? { label: status, cls: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" };
  const dot = DOT[key] ?? "bg-gray-400";
  return (
    <span className={`pill ${entry.cls} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {entry.label}
    </span>
  );
}
