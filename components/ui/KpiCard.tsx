"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const MotionLink = motion(Link);
const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  svgIcon?: React.ReactNode;  // أيقونة SVG مخصصة تحل محل icon-orb
  color?: "primary" | "gold" | "green" | "blue";
  delay?: number;
  href?: string;
}

const orbStyles: Record<NonNullable<Props["color"]>, string> = {
  primary: "bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] text-white",
  gold:    "bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white",
  green:   "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white",
  blue:    "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
};

const accentBar: Record<NonNullable<Props["color"]>, string> = {
  primary: "from-[#7A1E30] to-[#4A0F1B]",
  gold:    "from-[#DFC48E] to-[#A8853A]",
  green:   "from-emerald-400 to-emerald-600",
  blue:    "from-sky-400 to-sky-600",
};

export function KpiCard({ title, value, sub, icon, svgIcon, color = "primary", delay = 0, href }: Props) {
  const inner = (
    <>
      {/* شريط لوني علوي فخم */}
      <div className={`absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-l ${accentBar[color]}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#8A7A72] mb-2 tracking-wide">{title}</p>
          <p className="text-3xl font-extrabold text-[#2A1418] leading-none tracking-tight font-sans">{value}</p>
          {sub && <p className="text-xs font-medium text-[#A89A92] mt-2.5 truncate">{sub}</p>}
        </div>
        {svgIcon ? (
          <div className="shrink-0 transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 drop-shadow-lg">
            {svgIcon}
          </div>
        ) : icon ? (
          <div className={`icon-orb ${orbStyles[color]} shadow-md transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300`}>
            {icon}
          </div>
        ) : null}
      </div>

      {href && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary opacity-70 group-hover:opacity-100 mt-4 transition-all">
          <span>عرض التفاصيل</span>
          <ArrowLeft size={12} className="transform group-hover:-translate-x-1 transition-transform duration-300" />
        </div>
      )}
    </>
  );

  const reduce = useReducedMotion();
  const className = "card-luxurious card-luxurious-hover relative overflow-hidden p-5 sm:p-6 block group";

  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.5, ease: EASE, delay: delay / 1000 },
        whileHover: { y: -4 },
        whileTap: { scale: 0.985 },
      };

  if (href) {
    return (
      <MotionLink href={href} className={className} {...reveal}>
        {inner}
      </MotionLink>
    );
  }

  return (
    <motion.div className={className} {...reveal}>
      {inner}
    </motion.div>
  );
}
