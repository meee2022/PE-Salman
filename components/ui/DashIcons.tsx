// أيقونات SVG مخصصة بتصميم 3D حديث للداشبورد

export function IconSupervisors({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="sup-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B2A3F" />
          <stop offset="100%" stopColor="#3D0C16" />
        </linearGradient>
        <linearGradient id="sup-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F9D9A0" />
          <stop offset="100%" stopColor="#E8B86D" />
        </linearGradient>
        <linearGradient id="sup-body2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDEAC0" />
          <stop offset="100%" stopColor="#F0C87A" />
        </linearGradient>
        <filter id="sup-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000030" />
        </filter>
      </defs>
      {/* خلفية */}
      <rect width="48" height="48" rx="14" fill="url(#sup-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.07" />
      {/* شخص خلفي */}
      <circle cx="30" cy="18" r="6" fill="url(#sup-body)" filter="url(#sup-shadow)" />
      <path d="M20 38c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="url(#sup-body)" opacity="0.7" />
      {/* شخص أمامي */}
      <circle cx="19" cy="19" r="7" fill="url(#sup-body2)" filter="url(#sup-shadow)" />
      <path d="M8 40c0-6.075 4.925-11 11-11s11 4.925 11 11" fill="url(#sup-body2)" />
      {/* بريق */}
      <ellipse cx="24" cy="10" rx="8" ry="3" fill="white" fillOpacity="0.12" />
    </svg>
  );
}

export function IconSchools({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="sch-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DFC48E" />
          <stop offset="100%" stopColor="#A8853A" />
        </linearGradient>
        <linearGradient id="sch-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8EC" />
          <stop offset="100%" stopColor="#F5E8C8" />
        </linearGradient>
        <filter id="sch-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000025" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#sch-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* مبنى */}
      <rect x="9" y="22" width="30" height="18" rx="2" fill="url(#sch-wall)" filter="url(#sch-shadow)" />
      {/* سقف مثلث */}
      <path d="M6 23L24 10L42 23Z" fill="white" fillOpacity="0.95" filter="url(#sch-shadow)" />
      <path d="M6 23L24 10L42 23Z" fill="url(#sch-bg)" fillOpacity="0.6" />
      {/* نوافذ */}
      <rect x="12" y="26" width="7" height="6" rx="1.5" fill="#C9A96E" fillOpacity="0.6" />
      <rect x="29" y="26" width="7" height="6" rx="1.5" fill="#C9A96E" fillOpacity="0.6" />
      {/* باب */}
      <rect x="20" y="30" width="8" height="10" rx="1.5" fill="#A8853A" fillOpacity="0.8" />
      {/* علم فوق */}
      <line x1="24" y1="6" x2="24" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 6L30 8L24 10Z" fill="white" fillOpacity="0.9" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconForms({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="frm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="frm-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0FDF8" />
        </linearGradient>
        <filter id="frm-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#00000020" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#frm-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* ورقة */}
      <rect x="11" y="8" width="26" height="33" rx="3.5" fill="url(#frm-paper)" filter="url(#frm-shadow)" />
      {/* مقبض الكليبورد */}
      <rect x="18" y="6" width="12" height="6" rx="3" fill="white" />
      <rect x="20" y="7" width="8" height="4" rx="2" fill="#059669" fillOpacity="0.5" />
      {/* خطوط + ✓ */}
      <path d="M16 21l3 3 6-6" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="27" y="22" width="8" height="1.8" rx="0.9" fill="#D1FAE5" />
      <path d="M16 29l3 3 6-6" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="27" y="30" width="8" height="1.8" rx="0.9" fill="#D1FAE5" />
      <rect x="16" y="37" width="16" height="1.8" rx="0.9" fill="#D1FAE5" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="8" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconCoverage({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="cov-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="cov-bar1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <filter id="cov-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000025" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#cov-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* أعمدة */}
      <rect x="9"  y="31" width="7" height="9" rx="2" fill="url(#cov-bar1)" fillOpacity="0.6" filter="url(#cov-shadow)" />
      <rect x="20" y="23" width="7" height="17" rx="2" fill="url(#cov-bar1)" fillOpacity="0.8" filter="url(#cov-shadow)" />
      <rect x="31" y="14" width="7" height="26" rx="2" fill="url(#cov-bar1)" filter="url(#cov-shadow)" />
      {/* خط الاتجاه */}
      <path d="M12 34L24 24L36 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 0" />
      {/* سهم صاعد */}
      <path d="M32 10L38 13L36 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* خط قاعدة */}
      <line x1="8" y1="40" x2="40" y2="40" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconActivity({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="act-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id="act-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#00000022" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#act-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* تقويم */}
      <rect x="8" y="14" width="32" height="27" rx="4" fill="white" fillOpacity="0.9" filter="url(#act-shadow)" />
      <rect x="8" y="14" width="32" height="10" rx="4" fill="url(#act-bg)" />
      <rect x="8" y="19" width="32" height="5" fill="url(#act-bg)" />
      {/* خطافات */}
      <rect x="16" y="10" width="3.5" height="8" rx="1.75" fill="white" />
      <rect x="28.5" y="10" width="3.5" height="8" rx="1.75" fill="white" />
      {/* ايام */}
      <circle cx="16" cy="30" r="2.5" fill="#BFDBFE" />
      <circle cx="24" cy="30" r="2.5" fill="#2563EB" />
      <circle cx="32" cy="30" r="2.5" fill="#BFDBFE" />
      <circle cx="16" cy="37" r="2.5" fill="#BFDBFE" />
      <circle cx="24" cy="37" r="2.5" fill="#BFDBFE" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconReports({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="rep-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9A96E" />
          <stop offset="100%" stopColor="#7A5A20" />
        </linearGradient>
        <filter id="rep-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000025" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#rep-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* ورقة تقرير */}
      <rect x="10" y="9" width="28" height="34" rx="4" fill="white" fillOpacity="0.92" filter="url(#rep-shadow)" />
      {/* ترويسة */}
      <rect x="14" y="14" width="20" height="3" rx="1.5" fill="#C9A96E" fillOpacity="0.6" />
      {/* أعمدة صغيرة */}
      <rect x="14" y="23" width="5" height="10" rx="1.5" fill="#C9A96E" fillOpacity="0.5" />
      <rect x="21" y="19" width="5" height="14" rx="1.5" fill="#A8853A" fillOpacity="0.7" />
      <rect x="28" y="21" width="5" height="12" rx="1.5" fill="#C9A96E" fillOpacity="0.6" />
      {/* خط */}
      <rect x="14" y="36" width="20" height="2" rx="1" fill="#E8DECF" />
      {/* نجمة تميز */}
      <path d="M37 11l1.2 2.4 2.8.4-2 1.9.5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-1.9 2.8-.4z" fill="#FFF" fillOpacity="0.85" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconRemote({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="rem-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <filter id="rem-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#00000022" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#rem-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* لابتوب */}
      <rect x="8" y="16" width="32" height="20" rx="3" fill="white" fillOpacity="0.9" filter="url(#rem-shadow)" />
      <rect x="10" y="18" width="28" height="16" rx="2" fill="#E0E7FF" />
      {/* قبعة تخرج على الشاشة */}
      <path d="M24 21l8 4-8 4-8-4z" fill="#4338CA" fillOpacity="0.7" />
      <rect x="23" y="25" width="2" height="4" fill="#4338CA" fillOpacity="0.5" />
      <path d="M21 29h6v2.5a3 3 0 01-6 0V29z" fill="#818CF8" fillOpacity="0.7" />
      {/* قاعدة اللابتوب */}
      <path d="M6 36h36l-2 4H8z" fill="white" fillOpacity="0.5" filter="url(#rem-shadow)" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconInterviews({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="int-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
        <filter id="int-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#00000022" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#int-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* شخص */}
      <circle cx="20" cy="18" r="7" fill="white" fillOpacity="0.9" filter="url(#int-shadow)" />
      <path d="M9 38c0-6.075 4.925-11 11-11s11 4.925 11 11" fill="white" fillOpacity="0.85" />
      {/* عدسة تكبير */}
      <circle cx="34" cy="34" r="7" stroke="white" strokeWidth="3" fill="none" filter="url(#int-shadow)" />
      <line x1="39" y1="39" x2="44" y2="44" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="34" cy="34" r="3.5" fill="white" fillOpacity="0.3" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconSettings({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="set-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6B7280" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="set-gear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D1D5DB" />
        </linearGradient>
        <filter id="set-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#00000025" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#set-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.08" />
      {/* ترس كبير */}
      <path d="M24 10a2 2 0 012 2v1.5a9 9 0 012.6 1.1l1.3-.75a2 2 0 012.74.73l2 3.46a2 2 0 01-.73 2.74l-1.3.75A9 9 0 0134 24a9 9 0 01-.13 1.5l1.3.75a2 2 0 01.73 2.74l-2 3.46a2 2 0 01-2.74.73l-1.3-.75A9 9 0 0127 33.5V35a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1.5a9 9 0 01-2.6-1.1l-1.3.75a2 2 0 01-2.74-.73l-2-3.46a2 2 0 01.73-2.74l1.3-.75A9 9 0 0114 24a9 9 0 01.13-1.5l-1.3-.75a2 2 0 01-.73-2.74l2-3.46a2 2 0 012.74-.73l1.3.75A9 9 0 0121 13.5V12a2 2 0 012-2h1z"
        fill="url(#set-gear)" filter="url(#set-shadow)" />
      <circle cx="24" cy="24" r="5" fill="url(#set-bg)" />
      <circle cx="24" cy="24" r="3" fill="white" fillOpacity="0.5" />
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.12" />
    </svg>
  );
}

export function IconMetrics({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="met-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <filter id="met-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#00000022" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#met-bg)" />
      <rect width="48" height="48" rx="14" fill="white" fillOpacity="0.1" />
      {/* دائرة قياس */}
      <circle cx="24" cy="26" r="13" stroke="white" strokeWidth="2.5" strokeOpacity="0.3" fill="none" />
      <path d="M24 26 m-13 0 a13 13 0 0 1 23.3-7.5" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M24 26 m-13 0 a13 13 0 0 1 13-13" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
      {/* مؤشر */}
      <line x1="24" y1="26" x2="30" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="26" r="3" fill="white" filter="url(#met-shadow)" />
      {/* نقط scale */}
      <circle cx="11" cy="26" r="1.5" fill="white" fillOpacity="0.6" />
      <circle cx="37" cy="26" r="1.5" fill="white" fillOpacity="0.6" />
      <circle cx="24" cy="13" r="1.5" fill="white" fillOpacity="0.6" />
      {/* رقم % */}
      <text x="24" y="36" textAnchor="middle" fontSize="7" fontWeight="800" fill="white" fillOpacity="0.85" fontFamily="system-ui">99%</text>
      {/* بريق */}
      <ellipse cx="24" cy="11" rx="9" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}
