"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const MotionLink = motion(Link);
const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  href: string;
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  svgIcon?: React.ReactNode;
  count?: number | string;
  color?: "primary" | "gold" | "green" | "blue";
}

const orb: Record<NonNullable<Props["color"]>, string> = {
  primary: "bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] text-gold",
  gold:    "bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white",
  green:   "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white",
  blue:    "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
};

const hoverBorder: Record<NonNullable<Props["color"]>, string> = {
  primary: "hover:border-[#5C1523]/30 hover:shadow-[0_12px_32px_-12px_rgba(92,21,35,0.18)]",
  gold:    "hover:border-[#DFC48E]/40 hover:shadow-[0_12px_32px_-12px_rgba(201,169,110,0.18)]",
  green:   "hover:border-emerald-500/20 hover:shadow-[0_12px_32px_-12px_rgba(16,185,129,0.12)]",
  blue:    "hover:border-sky-500/20 hover:shadow-[0_12px_32px_-12px_rgba(14,165,233,0.12)]",
};

export function SectionCard({ href, title, desc, icon, svgIcon, count, color = "primary" }: Props) {
  const reduce = useReducedMotion();
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.45, ease: EASE },
        whileHover: { y: -2 },
        whileTap: { scale: 0.985 },
      };
  return (
    <MotionLink href={href} className={`module-card group border border-transparent transition-colors duration-300 ${hoverBorder[color]}`} {...reveal}>
      {svgIcon ? (
        <div className="shrink-0 transform group-hover:scale-110 group-hover:-rotate-2 transition-all duration-300 drop-shadow-md">
          {svgIcon}
        </div>
      ) : icon ? (
        <div className={`icon-orb ${orb[color]} shadow-sm transform group-hover:scale-105 group-hover:rotate-2 transition-all duration-300`}>
          {icon}
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-[#1C1008] group-hover:text-primary transition-colors duration-200 truncate">{title}</p>
          {count != null && (
            <span className="shrink-0 text-[11px] font-bold text-primary bg-primary/10 group-hover:bg-primary/20 rounded-full px-2 py-0.5 transition-colors duration-200">{count}</span>
          )}
        </div>
        {desc && <p className="text-xs text-[#7A6A58] mt-1 truncate">{desc}</p>}
      </div>
      <ChevronLeft size={18} className="text-[#C7B8A6] group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300 shrink-0" />
    </MotionLink>
  );
}
