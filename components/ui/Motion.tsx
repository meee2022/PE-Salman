"use client";

import { motion, useReducedMotion, type Variants, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

/* ────────────────────────────────────────────────────────────────
   نظام الحركة الموحّد (Framer Motion) — تلاشٍ عند التمرير، كشف
   متتابع للعناصر، وانتقالات سلسة عند المرور. يحترم تفضيل تقليل
   الحركة لدى المستخدم (prefers-reduced-motion).
   ──────────────────────────────────────────────────────────────── */

const EASE = [0.16, 1, 0.3, 1] as const; // نفس منحنى البطاقات الفاخرة

// ── متغيّرات الكشف المتتابع للحاويات ──────────────────────────────
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* ── FadeIn: تلاشٍ صاعد عند ظهور العنصر في الشاشة ──────────────── */
type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  once?: boolean;
};

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(function FadeIn(
  { children, delay = 0, y = 16, once = true, ...rest },
  ref
) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

/* ── Stagger: حاوية تُظهر أبناءها بتتابع عند التمرير ───────────── */
type StaggerProps = HTMLMotionProps<"div"> & { once?: boolean; amount?: number };

export const Stagger = forwardRef<HTMLDivElement, StaggerProps>(function Stagger(
  { children, once = true, amount = 0.15, ...rest },
  ref
) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div ref={ref} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
        {children as React.ReactNode}
      </div>
    );
  }
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

/* ── StaggerItem: عنصر داخل حاوية Stagger ──────────────────────── */
export const StaggerItem = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  function StaggerItem({ children, ...rest }, ref) {
    const reduce = useReducedMotion();
    if (reduce) {
      return (
        <div ref={ref} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
          {children as React.ReactNode}
        </div>
      );
    }
    return (
      <motion.div ref={ref} variants={fadeUpItem} {...rest}>
        {children}
      </motion.div>
    );
  }
);

/* ── HoverLift: رفع/تكبير سلس عند المرور والضغط ────────────────── */
type HoverLiftProps = HTMLMotionProps<"div"> & { lift?: number; scale?: number };

export const HoverLift = forwardRef<HTMLDivElement, HoverLiftProps>(
  function HoverLift({ children, lift = -4, scale = 1.0, ...rest }, ref) {
    const reduce = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        whileHover={reduce ? undefined : { y: lift, scale }}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.3, ease: EASE }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

export { motion };
