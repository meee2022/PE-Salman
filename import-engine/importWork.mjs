/**
 * استيراد أعمال الموجهين (الاستمارات والزيارات) إلى coverageKpis + formTotals
 * المصدر: all files/الاستمارات والزيارات.xlsx (شيتا "موجهات" و "موجهين")
 * الاستخدام:  node import-engine/importWork.mjs            ← تشغيل تجريبي (لا يكتب)
 *             node import-engine/importWork.mjs --apply    ← يكتب فعلياً
 */
import XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const YEAR = "2025-2026";
const TOKEN = "SEED_BYPASS_TOKEN";
const FILE = "all files/الاستمارات والزيارات.xlsx";

function convexUrl() {
  try {
    const env = readFileSync(".env.local", "utf8");
    const m = env.match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)/);
    if (m) return m[1].trim();
  } catch {}
  return process.env.NEXT_PUBLIC_CONVEX_URL;
}
const client = new ConvexHttpClient(convexUrl());

// ── تطبيع الاسم العربي ──
function norm(s) {
  return (s ?? "").toString().replace(/\xa0/g, " ").replace(/​/g, "")
    .replace(/\s+/g, " ").trim()
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ً-ْٰ]/g, "");
}
// مفتاح المطابقة: أول + آخر كلمة
function keyOf(name) {
  const w = norm(name).split(" ").filter(Boolean);
  if (w.length === 0) return "";
  return w.length === 1 ? w[0] : w[0] + "|" + w[w.length - 1];
}

const NUM = (v) => (typeof v === "number" ? v : Number(String(v ?? "").trim()) || 0);

// ── قراءة شيت وتجميع لكل موجه حسب رؤوس الأعمدة ──
function readSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null });
  // صف الرؤوس = الأول الذي يحوي "المدرسة"
  const hi = rows.findIndex((r) => (r || []).some((c) => norm(c) === "المدرسه"));
  const header = rows[hi].map((c) => norm(c));
  const col = (name) => header.indexOf(norm(name));
  const idx = {
    school: col("المدرسة"),
    sup: col("الموجه"),
    t1: col("استمارات المعلمين الفصل 1"), t2: col("استمارات المعلمين الفصل 2"),
    em: col("اعتماد الاختبار منتصف الفصل"), en: col("اعتماد الاختبار نهاية الفصل"),
    ea: col("اعتماد الاختبارات"),
    fm: col("متابعة تنفيذ الاختبار منتصف الفصل"), fn: col("متابعة تنفيذ الاختبار نهاية الفصل"),
    cm: col("استمارات المنسقين"), cev: col("استمارات تقييم المنسقين"),
    rem: col("التعلم عن بعد"), lic: col("الرخص المهنية"),
    spec: col("الموجه المختص"), prin: col("مدراء المدارس"), pd: col("التطوير المهني"),
  };
  const out = {};
  const schoolRows = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const supName = r[idx.sup];
    if (!supName || !norm(supName)) continue;
    if (/^[\d\s.]+$/.test(norm(supName))) continue; // تخطّي صفوف المجاميع (الموجه = رقم)
    const k = keyOf(supName);
    const teacherForms = NUM(r[idx.t1]) + NUM(r[idx.t2]);
    const examApproval = NUM(r[idx.em]) + NUM(r[idx.en]) + (idx.ea >= 0 ? NUM(r[idx.ea]) : 0);
    const examFollow = NUM(r[idx.fm]) + NUM(r[idx.fn]);
    const coordForms = NUM(r[idx.cm]) + NUM(r[idx.cev]);
    const extra = NUM(r[idx.rem]) + NUM(r[idx.lic]) + (idx.spec >= 0 ? NUM(r[idx.spec]) : 0)
      + NUM(r[idx.prin]) + (idx.pd >= 0 ? NUM(r[idx.pd]) : 0);
    const total = teacherForms + examApproval + examFollow + coordForms + extra;
    const a = (out[k] ??= { name: norm(supName), raw: supName, schools: 0, covered: 0,
      total: 0, teacherForms: 0, examApproval: 0, examFollow: 0, coordForms: 0 });
    a.schools++; if (total > 0) a.covered++;
    a.total += total; a.teacherForms += teacherForms; a.examApproval += examApproval;
    a.examFollow += examFollow; a.coordForms += coordForms;
    const schoolName = norm(r[idx.school]);
    if (schoolName) schoolRows.push({ supKey: k, schoolName, total, teacherForms, examApproval, examFollow, coordForms });
  }
  return { agg: out, schoolRows };
}

function merge(...maps) {
  const m = {};
  for (const src of maps) for (const [k, v] of Object.entries(src)) {
    if (!m[k]) { m[k] = { ...v }; continue; }
    const t = m[k];
    for (const f of ["schools", "covered", "total", "teacherForms", "examApproval", "examFollow", "coordForms"]) t[f] += v[f];
  }
  return m;
}

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
function statusOf(cov, formsR) {
  if (cov >= 100 && formsR >= 300) return "🏆متميز";
  if (cov >= 100 && formsR >= 200) return "✅ممتاز";
  if (cov >= 100) return "✅مكتمل";
  return "⚠️قريب";
}

async function main() {
  const wb = XLSX.readFile(FILE);
  const s1 = readSheet(wb, "موجهات"), s2 = readSheet(wb, "موجهين");
  const agg = merge(s1.agg, s2.agg);
  const schoolRows = [...s1.schoolRows, ...s2.schoolRows];

  const sups = await client.query("supervisors:list", { includeInactive: true, token: TOKEN });
  const byKey = {};
  for (const s of sups) byKey[keyOf(s.name)] = s;
  // فهرس احتياطي: بالكلمة الأولى الفريدة
  const byFirst = {};
  for (const s of sups) { const f = norm(s.name).split(" ")[0]; (byFirst[f] ??= []).push(s); }

  function matchSup(a) {
    const k = keyOf(a.name);
    if (byKey[k]) return byKey[k];
    const first = a.name.split(" ")[0];
    const cand = byFirst[first] || [];
    if (cand.length === 1) return cand[0];
    // طابق بآخر كلمة أيضاً
    const last = a.name.split(" ").slice(-1)[0];
    const c2 = cand.filter((s) => norm(s.name).includes(last));
    if (c2.length === 1) return c2[0];
    return null;
  }

  console.log(`\n${APPLY ? "🟢 تطبيق فعلي" : "🟡 تشغيل تجريبي (لا كتابة)"} — السنة ${YEAR}\n`);
  const list = Object.values(agg).sort((a, b) => b.total - a.total);
  let matched = 0, unmatched = [];
  const writes = [];
  const keyToSupId = {};
  for (const a of list) {
    const s = matchSup(a);
    const req = a.schools, cov = a.covered, forms = a.total;
    const covRate = pct(cov, req), formsRate = pct(forms, req);
    const status = statusOf(covRate, formsRate);
    const tag = s ? `✅ ${s.name}` : `❌ بدون مطابقة`;
    console.log(`• ${a.name}  →  ${tag}`);
    console.log(`   مدارس=${req} مغطّى=${cov} | إجمالي الأعمال=${forms} (معلمين=${a.teacherForms} اعتماد=${a.examApproval} متابعة=${a.examFollow} منسقين=${a.coordForms}) | تغطية=${covRate}% الحالة=${status}`);
    if (!s) { unmatched.push(a.name); continue; }
    matched++;
    keyToSupId[keyOf(a.name)] = s._id;
    writes.push({ s, req, cov, forms, covRate, formsRate, status, a });
  }

  // بناء صفوف زيارات المدارس (دمج التكرار بنفس الموجه+المدرسة)
  const svMap = {};
  for (const row of schoolRows) {
    const supId = keyToSupId[row.supKey];
    if (!supId) continue;
    const mk = supId + "|" + row.schoolName;
    const e = (svMap[mk] ??= { supervisorId: supId, schoolName: row.schoolName, schoolNameKey: row.schoolName, total: 0, teacherForms: 0, examApproval: 0, examFollow: 0, coordForms: 0 });
    e.total += row.total; e.teacherForms += row.teacherForms; e.examApproval += row.examApproval;
    e.examFollow += row.examFollow; e.coordForms += row.coordForms;
  }
  const svRows = Object.values(svMap);
  console.log(`\nصفوف زيارات المدارس المُجهّزة: ${svRows.length}`);
  console.log(`\nالنتيجة: ${matched} مطابَق · ${unmatched.length} بدون مطابقة` + (unmatched.length ? ` (${unmatched.join("، ")})` : ""));

  if (!APPLY) { console.log("\n(تشغيل تجريبي — أضِف --apply للكتابة الفعلية)"); return; }

  console.log("\n⏳ الكتابة في القاعدة...");
  for (const w of writes) {
    await client.mutation("coverage:upsert", {
      supervisorId: w.s._id, academicYear: YEAR,
      schoolsRequired: w.req, schoolsCovered: w.cov, formsCount: w.forms,
      coverageRate: w.covRate, formsRate: w.formsRate, status: w.status,
    });
    await client.mutation("coverage:upsertFormTotals", {
      supervisorId: w.s._id, academicYear: YEAR,
      totalVisits: w.forms, classroomVisits: w.a.teacherForms,
      examApproval: w.a.examApproval, schoolsCount: w.req,
      examJudging: w.a.examFollow, coordinatorFollowup: w.a.coordForms,
    });
    console.log(`   ✓ ${w.s.name}`);
  }
  const res = await client.mutation("schoolVisits:clearAndBulkImport", { academicYear: YEAR, rows: svRows });
  console.log(`   ✓ زيارات المدارس: حُذف ${res.deleted}، أُضيف ${res.inserted}`);
  console.log("\n✅ تم.");
}
main().catch((e) => { console.error("خطأ:", e.message); process.exit(1); });
