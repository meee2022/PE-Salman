/**
 * استيراد خطط الموجهين (تصنيف المنسقين والمعلمين) من "ملخص شامل".
 * الاستخدام:  node import-engine/importPlans.mjs           ← تجريبي
 *             node import-engine/importPlans.mjs --apply   ← يكتب
 */
import XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const YEAR = "2025-2026";
const TOKEN = "SEED_BYPASS_TOKEN";
const FILE = "all files/خطة الموجة 2026.xlsx";

function convexUrl() {
  try { const m = readFileSync(".env.local", "utf8").match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)/); if (m) return m[1].trim(); } catch {}
  return process.env.NEXT_PUBLIC_CONVEX_URL;
}
const client = new ConvexHttpClient(convexUrl());

function norm(s){return (s??"").toString().replace(/\xa0/g," ").replace(/​/g,"").replace(/\s+/g," ").trim().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْٰ]/g,"");}
const NUM = (v)=> (typeof v==="number"?v:Number(String(v??"").trim())||0);
const CATWORDS = new Set(["تطوير ذاتي","دعم عام","دعم مكثف","منسق جديد","لا يوجد","عدد المعلمين","مكثف","عام","مستجد","الورقه","تصنيف المنسقين","تصنيف المعلمين","المجموع","الاجمالي"].map(norm));

async function main(){
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets["ملخص شامل"];
  const rows = XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:null});
  const hi = rows.findIndex(r=>(r||[]).some(c=>norm(c)==="عدد المعلمين"));
  if(hi<0){console.error("لم يُعثر على صف الرؤوس"); process.exit(1);}

  const sups = await client.query("supervisors:list",{includeInactive:true,token:TOKEN});
  function matchSup(name){
    const nm = norm(name); const w = nm.split(" ").filter(Boolean);
    const first = w[0], last = w[w.length-1];
    // أولاً: أول كلمة + احتواء آخر كلمة (يتحمّل تكرار/أخطاء)
    let cand = sups.filter(s=>{const sn=norm(s.name); const sw=sn.split(" "); return sw[0]===first && (sn.includes(last)||last.includes(sw[sw.length-1]));});
    if(cand.length===1) return cand[0];
    // ثانياً: أول كلمة فريدة
    cand = sups.filter(s=>norm(s.name).split(" ")[0]===first);
    if(cand.length===1) return cand[0];
    // ثالثاً: تقاطع آخر كلمة
    const c2 = cand.filter(s=>{const sw=norm(s.name).split(" "); return nm.includes(sw[sw.length-1])||sw[sw.length-1].includes(last);});
    return c2.length===1?c2[0]:null;
  }

  console.log(`\n${APPLY?"🟢 تطبيق":"🟡 تجريبي"} — السنة ${YEAR}\n`);
  const out=[]; let unmatched=[];
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i]; if(!r) continue;
    const name=r[0]; if(!name||!norm(name)) continue;
    if(CATWORDS.has(norm(name))) continue;
    if(/^[\d\s.]+$/.test(norm(name))) continue;
    const row={
      coordSelfDev:NUM(r[1]), coordGeneral:NUM(r[2]), coordIntensive:NUM(r[3]), coordNew:NUM(r[4]), coordNone:NUM(r[5]),
      teachersTotal:NUM(r[6]), teachIntensive:NUM(r[7]), teachGeneral:NUM(r[8]), teachSelfDev:NUM(r[9]), teachNew:NUM(r[10]),
    };
    // تخطّي صفوف فارغة تماماً
    if(Object.values(row).every(v=>v===0)) continue;
    const sup=matchSup(name);
    const tag = sup?`✅ ${sup.name}`:`❌ بدون مطابقة`;
    console.log(` • ${norm(name)}  →  ${tag}`);
    console.log(`    منسقون: ذاتي=${row.coordSelfDev} عام=${row.coordGeneral} مكثف=${row.coordIntensive} جديد=${row.coordNew} لا يوجد=${row.coordNone} | معلمون=${row.teachersTotal} (مكثف=${row.teachIntensive} عام=${row.teachGeneral} ذاتي=${row.teachSelfDev} مستجد=${row.teachNew})`);
    if(!sup){unmatched.push(norm(name)); continue;}
    out.push({supervisorId:sup._id, ...row});
  }
  console.log(`\nالنتيجة: ${out.length} مطابَق · ${unmatched.length} بدون مطابقة`+(unmatched.length?` (${unmatched.join("، ")})`:""));

  if(!APPLY){console.log("\n(تجريبي — أضِف --apply)"); return;}
  const res = await client.mutation("supervisorPlans:clearAndBulkImport",{academicYear:YEAR, rows:out});
  console.log(`\n✅ خطط: حُذف ${res.deleted}، أُضيف ${res.inserted}`);
}
main().catch(e=>{console.error("خطأ:",e.message);process.exit(1);});
