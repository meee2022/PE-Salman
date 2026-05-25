"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}

export function PageHeader({ title, subtitle, icon, action, back }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="no-print card relative overflow-hidden p-6
      bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] border-none">
      <div className="pattern-arabesque absolute inset-0 opacity-[0.6] pointer-events-none" />
      {/* وهج ذهبي */}
      <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-gold/10 blur-2xl pointer-events-none" />

      {back && (
        <Link href={back.href}
          className="relative inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all w-fit">
          <ArrowRight size={14} /> {back.label}
        </Link>
      )}

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="icon-orb bg-white/10 ring-1 ring-white/15 backdrop-blur-sm text-gold"
              style={{ width: 56, height: 56 }}>
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-white/60 mt-1">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </motion.div>
  );
}
