"use client";

/**
 * صفحة الهبوط — نظام إدارة التوجيه التربوي
 *
 * البنية:
 *  ① Hero         — ترحيب + شعار + زر دخول
 *  ② FeaturesGrid — 6 بطاقات (نمط 21st.dev bento-card) مع Framer Motion
 *  ③ StatsBar     — 3 أرقام إحصائية محورية
 *  ④ CTA Footer   — دعوة للدخول
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Users, School, ClipboardList, GraduationCap,
  CalendarDays, FileText, ArrowLeft, Sparkles,
} from "lucide-react";

/* ── ثوابت الحركة ─────────────────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1] as const;

/* ── بيانات البطاقات ───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Users size={22} />,
    color: "primary" as const,
    title: "متابعة الموجهين",
    desc: "إدارة ملفات الموجهين ورصد أدائهم الميداني وفق مؤشرات دقيقة وآنية.",
    span: "col-span-1",
  },
  {
    icon: <School size={22} />,
    color: "gold" as const,
    title: "تغطية المدارس",
    desc: "تتبّع نسب الزيارات والتغطية لكل مدرسة مع خريطة أداء تفاعلية.",
    span: "col-span-1",
  },
  {
    icon: <ClipboardList size={22} />,
    color: "primary" as const,
    title: "الاستمارات الرقمية",
    desc: "إصدار استمارات الإشراف على المنسق وتوقيعها إلكترونياً مباشرة من الموقع.",
    span: "col-span-1 lg:col-span-2",
    wide: true,
  },
  {
    icon: <GraduationCap size={22} />,
    color: "blue" as const,
    title: "التعلم عن بُعد",
    desc: "إحصائيات ومؤشرات الدروس الافتراضية وتحليلات الاستطلاعات الإلكترونية.",
    span: "col-span-1 lg:col-span-2",
    wide: true,
  },
  {
    icon: <CalendarDays size={22} />,
    color: "green" as const,
    title: "سجل النشاط الرياضي",
    desc: "توثيق الأنشطة والفعاليات الرياضية طوال العام الدراسي وأرشفتها.",
    span: "col-span-1",
  },
  {
    icon: <FileText size={22} />,
    color: "gold" as const,
    title: "تقارير PDF احترافية",
    desc: "تصدير تقارير موقّعة بتنسيق وزاري معتمد وطباعتها بضغطة واحدة.",
    span: "col-span-1",
  },
] satisfies FeatureItem[];

type ColorKey = "primary" | "gold" | "green" | "blue";

interface FeatureItem {
  icon: React.ReactNode;
  color: ColorKey;
  title: string;
  desc: string;
  span: string;
  wide?: boolean;
}

/* ── ألوان الأيقونات ───────────────────────────────────────────── */
const orbBg: Record<ColorKey, string> = {
  primary: "bg-gradient-to-br from-[#7A1E30] to-[#4A0F1B] text-[#DFC48E]",
  gold:    "bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white",
  green:   "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white",
  blue:    "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
};

const accentLine: Record<ColorKey, string> = {
  primary: "from-[#5C1523] to-[#7A1E30]",
  gold:    "from-[#A8853A] to-[#DFC48E]",
  green:   "from-emerald-500 to-emerald-400",
  blue:    "from-sky-500 to-sky-400",
};

/* ── إحصائيات المنصة ──────────────────────────────────────────── */
const STATS = [
  { value: "٢٦+", label: "موجهاً تربوياً" },
  { value: "٢٠٠+", label: "مدرسة مُشرَف عليها" },
  { value: "١٠٠٪", label: "رقمنة المستندات" },
];

/* ════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#FCF9F2] overflow-x-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 100% 0%, rgba(201,169,110,0.07) 0%, transparent 50%),
          radial-gradient(circle at 0% 100%, rgba(92,21,35,0.05) 0%, transparent 45%)
        `,
      }}
    >
      {/* ①  H E R O ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 flex flex-col items-center text-center">
        {/* خلفية نقش عربي */}
        <div
          className="pattern-arabesque absolute inset-0 opacity-[0.25] pointer-events-none"
          aria-hidden
        />
        {/* هالات ضوئية */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-[#5C1523]/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-[#C9A96E]/[0.08] blur-3xl pointer-events-none" />

        {/* شارة "جديد" */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/30 bg-white/70 backdrop-blur-sm px-4 py-1.5 text-xs font-bold text-[#A8853A] shadow-sm"
        >
          <Sparkles size={13} className="text-[#C9A96E]" />
          منصة التوجيه التربوي الرقمية — قسم التربية البدنية
        </motion.div>

        {/* العنوان الرئيسي */}
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
          className="max-w-2xl text-4xl sm:text-5xl font-extrabold text-[#2A1418] leading-[1.2] tracking-tight"
        >
          إدارة الإشراف التربوي{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#5C1523] to-[#7A1E30]">
            بدقة رقمية كاملة
          </span>
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
          className="mt-5 max-w-lg text-[15px] text-[#8A7A72] leading-relaxed"
        >
          منصة متكاملة لرصد أداء الموجهين، متابعة تغطية المدارس، وإصدار
          الاستمارات الرسمية — استبدالاً كاملاً لملفات Excel والنماذج الورقية.
        </motion.p>

        {/* أزرار */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.26 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/login"
            className="btn-primary text-base px-7 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-[#5C1523]/20"
          >
            <span>دخول المنصة</span>
            <ArrowLeft size={17} />
          </Link>
          <Link
            href="/dashboard"
            className="btn-ghost text-base px-7 py-3 rounded-2xl"
          >
            استعراض الداشبورد
          </Link>
        </motion.div>
      </section>

      {/* ②  F E A T U R E S   G R I D ──────────────────────────── */}
      <section className="px-4 sm:px-6 pb-20 max-w-5xl mx-auto">
        {/* تيتل القسم */}
        <FadeSection delay={0}>
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest text-[#A8853A] uppercase mb-2">
              ماذا تقدّم المنصة
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A1418]">
              كل ما تحتاجه في مكان واحد
            </h2>
            <p className="mt-2 text-sm text-[#8A7A72] max-w-md mx-auto">
              أدوات متكاملة صُمِّمت خصيصاً لفريق الإشراف التربوي في قسم
              التربية البدنية.
            </p>
          </div>
        </FadeSection>

        {/* الشبكة */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto"
          variants={reduce ? undefined : containerVariants}
          initial={reduce ? undefined : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={{ once: true, amount: 0.1 }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={reduce ? undefined : itemVariants}
              className={`${f.span}`}
            >
              <FeatureCard feature={f} index={i} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ③  S T A T S   B A R ────────────────────────────────────── */}
      <FadeSection delay={0.05} className="px-4 pb-20 max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] p-8 sm:p-10">
          <div className="pattern-arabesque absolute inset-0 opacity-[0.35] pointer-events-none" />
          <div className="absolute left-0 top-0 w-64 h-64 rounded-full bg-[#C9A96E]/10 blur-3xl pointer-events-none" />

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                variants={reduce ? undefined : itemVariants}
                initial={reduce ? undefined : "hidden"}
                whileInView={reduce ? undefined : "show"}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-1"
              >
                <p className="text-4xl font-extrabold text-[#DFC48E] font-sans tracking-tight">
                  {s.value}
                </p>
                <p className="text-sm text-white/60 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* ④  C T A   F O O T E R ──────────────────────────────────── */}
      <FadeSection delay={0.05} className="px-4 pb-24 max-w-2xl mx-auto text-center">
        <p className="text-xs font-bold tracking-widest text-[#A8853A] uppercase mb-3">
          ابدأ الآن
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A1418] mb-4">
          جاهز للدخول؟
        </h2>
        <p className="text-sm text-[#8A7A72] mb-7">
          سجّل دخولك للوصول إلى لوحة التحكم الكاملة وجميع أدوات الإشراف.
        </p>
        <Link
          href="/login"
          className="btn-primary text-base px-10 py-3.5 rounded-2xl inline-flex items-center gap-2 shadow-xl shadow-[#5C1523]/25"
        >
          <span>تسجيل الدخول</span>
          <ArrowLeft size={18} />
        </Link>
      </FadeSection>
    </main>
  );
}

/* ════ مكوّنات مساعدة ════════════════════════════════════════════ */

/* متغيّرات Framer */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
};

/* FadeSection — تلاشٍ عند التمرير */
function FadeSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* FeatureCard — بطاقة ميزة واحدة */
function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -4 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={`
        group relative overflow-hidden rounded-3xl bg-white border border-black/[0.03]
        p-6 h-full flex flex-col gap-4
        ${feature.wide ? "sm:flex-row sm:items-start sm:gap-6" : ""}
      `}
      style={{
        boxShadow:
          "0 1px 3px rgba(42,20,24,0.03), 0 8px 24px -8px rgba(42,20,24,0.07)",
      }}
    >
      {/* شريط لوني علوي */}
      <div
        className={`absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-l ${accentLine[feature.color]} opacity-80`}
      />

      {/* توهّج خلفي خفيف عند المرور */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
          ${feature.color === "primary" ? "bg-[#5C1523]/[0.025]" : ""}
          ${feature.color === "gold"    ? "bg-[#C9A96E]/[0.04]"  : ""}
          ${feature.color === "green"   ? "bg-emerald-500/[0.03]" : ""}
          ${feature.color === "blue"    ? "bg-sky-500/[0.03]"     : ""}
        `}
      />

      {/* أيقونة */}
      <div
        className={`
          icon-orb ${orbBg[feature.color]} shadow-md shrink-0
          transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300
        `}
      >
        {feature.icon}
      </div>

      {/* نص */}
      <div className="relative">
        <h3 className="font-extrabold text-[#2A1418] text-base leading-snug mb-1.5">
          {feature.title}
        </h3>
        <p className="text-sm text-[#8A7A72] leading-relaxed">{feature.desc}</p>
      </div>
    </motion.div>
  );
}
