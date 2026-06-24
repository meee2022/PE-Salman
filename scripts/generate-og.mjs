// توليد صورة Open Graph (1200×630) بهوية التوجيه التربوي (عنابي + ذهبي) → public/og-image.png
// تشغيل: node scripts/generate-og.mjs   (تعتمد على @resvg/resvg-js وخط Cairo المحلي)
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const ROOT = process.cwd();
const FONT_DIR = path.resolve(ROOT, "node_modules/@expo-google-fonts/cairo");
const bold = path.join(FONT_DIR, "700Bold/Cairo_700Bold.ttf");
const regular = path.join(FONT_DIR, "400Regular/Cairo_400Regular.ttf");

const TITLE = "التوجيه التربوي للتربية البدنية";
const SUBTITLE = "نظام إدارة الإشراف · الزيارات · التقارير";
const TAG = "وزارة التربية والتعليم · دولة قطر";

const C = {
  deep: "#3B0A14", primary: "#5C1523", dark: "#4A0F1B", light: "#7A1E30",
  gold: "#C9A96E", goldL: "#DFC48E", goldText: "#EBD9B4",
};

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.dark}"/>
      <stop offset="0.55" stop-color="${C.primary}"/>
      <stop offset="1" stop-color="${C.deep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.16" cy="0.18" r="0.5">
      <stop offset="0" stop-color="${C.gold}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="orb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.light}"/>
      <stop offset="1" stop-color="${C.dark}"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <circle cx="170" cy="120" r="220" fill="none" stroke="${C.gold}" stroke-opacity="0.08" stroke-width="1.5"/>
  <circle cx="170" cy="120" r="320" fill="none" stroke="${C.gold}" stroke-opacity="0.06" stroke-width="1.5"/>

  <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="${C.gold}" stroke-opacity="0.45" stroke-width="2"/>

  <!-- شعار: حلقة عنابية + رمز التربية البدنية (دمبل) ذهبي -->
  <g transform="translate(600 184)">
    <rect x="-60" y="-60" width="120" height="120" rx="32" fill="url(#orb)" stroke="${C.gold}" stroke-opacity="0.6" stroke-width="2"/>
    <g transform="translate(-34 -6)" fill="${C.gold}">
      <rect x="0" y="-13" width="9" height="26" rx="2"/>
      <rect x="10" y="-20" width="9" height="40" rx="2"/>
      <rect x="49" y="-20" width="9" height="40" rx="2"/>
      <rect x="59" y="-13" width="9" height="26" rx="2"/>
      <rect x="19" y="-5" width="30" height="10"/>
    </g>
  </g>

  <text x="600" y="358" text-anchor="middle" font-family="Cairo" font-weight="700" font-size="60" fill="#FFFFFF">${TITLE}</text>
  <text x="600" y="414" text-anchor="middle" font-family="Cairo" font-weight="400" font-size="29" fill="${C.goldL}">${SUBTITLE}</text>

  <rect x="360" y="466" width="480" height="56" rx="28" fill="${C.gold}" fill-opacity="0.14" stroke="${C.gold}" stroke-opacity="0.4" stroke-width="1"/>
  <text x="600" y="503" text-anchor="middle" font-family="Cairo" font-weight="400" font-size="23" fill="${C.goldText}">${TAG}</text>
</svg>`;

const resvg = new Resvg(svg, {
  font: { fontFiles: [bold, regular], loadSystemFonts: false, defaultFontFamily: "Cairo" },
  fitTo: { mode: "width", value: 1200 },
});
const png = resvg.render().asPng();

const outDir = path.resolve(ROOT, "public");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "og-image.png");
fs.writeFileSync(out, png);
console.log(`generate-og: wrote ${out} (${png.length} bytes)`);
