/**
 * إسناد المدارس النموذجية للموجِّهات (الإناث) حسب ملف "موجهات".
 * القاعدة: المدارس النموذجية طلابها بنين لكن تدرّسهم معلمات → تتبع الموجهات.
 * الاستخدام:  node import-engine/assignModelSchools.mjs           ← تجريبي
 *             node import-engine/assignModelSchools.mjs --apply   ← يكتب
 */
import XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const YEAR = "2025-2026";
const TOKEN = "SEED_BYPASS_TOKEN";
const FILE = "all files/الاستمارات والزيارات.xlsx";

function convexUrl() {
  try { const m = readFileSync(".env.local", "utf8").match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)/); if (m) return m[1].trim(); } catch {}
  return process.env.NEXT_PUBLIC_CONVEX_URL;
}
const client = new ConvexHttpClient(convexUrl());

const FILLER = new Set(["النموذجيه","نموذجي","نموذجيه","للبنين","للبنات","الابتدائيه","الاعداديه","الثانويه","المشتركه","المدرسه","مدرسه","بنين","بنات","ابتدائي","اعدادي","ثانوي","ال"]);
function norm(s){return (s??"").toString().replace(/\xa0/g," ").replace(/​/g,"").replace(/\s+/g," ").trim().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْٰ]/g,"");}
function coreTokens(name){return norm(name).split(" ").filter(w=>w && !FILLER.has(w));}
function keyOf(name){const w=norm(name).split(" ").filter(Boolean); if(!w.length)return ""; return w.length===1?w[0]:w[0]+"|"+w[w.length-1];}

function overlap(a,b){const A=new Set(a),B=new Set(b); let n=0; for(const x of A) if(B.has(x))n++; return n;}

async function main(){
  // 1) ملف موجهات: school → supervisor
  const wb=XLSX.readFile(FILE);
  const ws=wb.Sheets["موجهات"];
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:null});
  const hi=rows.findIndex(r=>(r||[]).some(c=>norm(c)==="المدرسه"));
  const H=rows[hi].map(norm); const ci=H.indexOf("المدرسه"), si=H.indexOf("الموجه");
  const excel=[];
  for(let i=hi+1;i<rows.length;i++){const r=rows[i]; if(!r)continue; const sn=r[ci], sup=r[si];
    if(!sn||!norm(sn))continue; if(!sup||/^[\d\s.]+$/.test(norm(sup)))continue;
    excel.push({school:norm(sn), core:coreTokens(sn), sup:norm(sup)});
  }

  // 2) القاعدة
  const sups=await client.query("supervisors:list",{includeInactive:true,token:TOKEN});
  const supByKey={}; const supByFirst={};
  for(const s of sups){supByKey[keyOf(s.name)]=s; const f=norm(s.name).split(" ")[0]; (supByFirst[f]??=[]).push(s);}
  function matchSup(name){const k=keyOf(name); if(supByKey[k])return supByKey[k]; const f=name.split(" ")[0]; const c=supByFirst[f]||[]; if(c.length===1)return c[0]; const last=name.split(" ").slice(-1)[0]; const c2=c.filter(s=>norm(s.name).includes(last)); return c2.length===1?c2[0]:null;}

  const schools=await client.query("schools:list",{token:TOKEN});
  const asg=await client.query("assignments:listByYear",{academicYear:YEAR});
  const asgBySchool={}; asg.forEach(a=>asgBySchool[a.schoolId]=a.supervisorId);
  const model=schools.filter(s=>norm(s.level)==="نموذجي"||/نموذج/.test(norm(s.name)));

  console.log(`\n${APPLY?"🟢 تطبيق":"🟡 تجريبي"} — مدارس نموذجية: ${model.length}\n`);
  let ok=0, skip=0, fail=[];
  const plan=[];
  for(const sc of model){
    const core=coreTokens(sc.name); const joined=core.join("");
    // أفضل تطابق في ملف موجهات (تقاطع الكلمات + احتواء بدون مسافات كحل احتياطي)
    let best=null, bestScore=0;
    for(const e of excel){
      let sco=overlap(core,e.core);
      const ej=e.core.join("");
      if(ej.length>=6 && joined.length>=6 && (joined.includes(ej)||ej.includes(joined))) sco=Math.max(sco,2);
      if(sco>bestScore || (sco===bestScore && best && e.core.length<best.core.length)){bestScore=sco; best=e;}
    }
    const need=Math.min(2, core.length); // يتطلب تطابق كلمتين على الأقل (أو الكل لو أقصر)
    if(!best || bestScore<need){fail.push(sc.name); continue;}
    const sup=matchSup(best.sup);
    if(!sup){fail.push(sc.name+" (موجِّهة غير معروفة: "+best.sup+")"); continue;}
    const cur=asgBySchool[sc._id];
    const curSup=cur?sups.find(s=>s._id===cur):null;
    const status = cur ? (curSup&&curSup.gender==="female"?"(مسندة لموجِّهة بالفعل)":"(نقل من "+(curSup?curSup.name:"?")+")") : "(جديدة)";
    console.log(` • ${sc.name}  →  ${sup.name}  ${status}`);
    plan.push({sc,sup}); ok++;
  }
  console.log(`\nجاهز للإسناد: ${ok} | فشل المطابقة: ${fail.length}`);
  if(fail.length) console.log("  لم تُطابَق:", fail.join(" | "));

  if(!APPLY){console.log("\n(تجريبي — أضِف --apply)"); return;}
  console.log("\n⏳ الإسناد...");
  for(const p of plan){
    await client.mutation("assignments:assign",{schoolId:p.sc._id, supervisorId:p.sup._id, academicYear:YEAR, notes:"مدرسة نموذجية — تتبع الموجهات", token:TOKEN});
  }
  console.log(`✅ تم إسناد ${plan.length} مدرسة نموذجية للموجِّهات.`);
}
main().catch(e=>{console.error("خطأ:",e.message);process.exit(1);});
