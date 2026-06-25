/**
 * مطابقة أسماء المدارس في سجل الزيارات (المختصرة) بالأسماء الرسمية الكاملة في القاعدة.
 * يحدّث schoolVisits.schoolId + schoolName بالاسم الكامل.
 * الاستخدام:  node import-engine/relinkSchoolVisits.mjs           ← تجريبي
 *             node import-engine/relinkSchoolVisits.mjs --apply   ← يكتب
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const YEAR = "2025-2026";
const TOKEN = "SEED_BYPASS_TOKEN";

function convexUrl() {
  try { const m = readFileSync(".env.local", "utf8").match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)/); if (m) return m[1].trim(); } catch {}
  return process.env.NEXT_PUBLIC_CONVEX_URL;
}
const client = new ConvexHttpClient(convexUrl());

// نُبقي كلمات المرحلة (ابتدائي/اعدادي/ثانوي/نموذجي) لأنها مميِّزة؛ نزيل الجنس والحشو فقط
const FILLER = new Set(["للبنين","للبنات","المدرسه","مدرسه","بنين","بنات","التخصصيه","تخصصيه","ال"]);
const STAGE = { ابتدائي:"ابتدائي", الابتدائيه:"ابتدائي", ابتدائيه:"ابتدائي", اعدادي:"اعدادي", الاعداديه:"اعدادي", اعداديه:"اعدادي", ثانوي:"ثانوي", الثانويه:"ثانوي", ثانويه:"ثانوي", نموذجي:"نموذجي", النموذجيه:"نموذجي", نموذجيه:"نموذجي" };
function norm(s){return (s??"").toString().replace(/\xa0/g," ").replace(/​/g,"").replace(/\s+/g," ").trim().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْٰ]/g,"");}
function stageOf(name){for(const w of norm(name).split(" ")) if(STAGE[w]) return STAGE[w]; return null;}
// كشف المرحلة المتسامح مع الأخطاء الإملائية (الابتدايه/الابتتدائيه…)
function fuzzyStage(name){const n=norm(name); if(/ابتد?ت?ائ?يه|ابتدائي|ابتدا/.test(n))return"ابتدائي"; if(/اعداد?يه|اعدادي|اعدا/.test(n))return"اعدادي"; if(/ثانو/.test(n))return"ثانوي"; if(/نموذج/.test(n))return"نموذجي"; return null;}
// جوهر الاسم = بلا حشو وبلا كلمات المرحلة (المرحلة تُستخدم للترجيح فقط)
function core(name){return norm(name).split(" ").filter(w=>w && !FILLER.has(w) && !STAGE[w]);}
function joined(name){return core(name).join("");}
function overlap(a,b){const B=new Set(b); let n=0; for(const x of new Set(a)) if(B.has(x))n++; return n;}

async function main(){
  const schools = await client.query("schools:list",{token:TOKEN});
  const sups = await client.query("supervisors:list",{includeInactive:true,token:TOKEN});
  const supGender={}; sups.forEach(s=>supGender[s._id]=s.gender);
  const asg = await client.query("assignments:listByYear",{academicYear:YEAR,token:TOKEN});
  const asgBySchool={}; asg.forEach(a=>asgBySchool[a.schoolId]=a.supervisorId);
  const visits = await client.query("schoolVisits:listAll",{academicYear:YEAR});

  // فهرسة المدارس (مع الجنس والمرحلة)
  const dbSchools = schools.map(s=>({ id:s._id, name:s.name, core:core(s.name), joined:joined(s.name), gender:s.gender, stage:stageOf(s.name)||fuzzyStage(s.name)||norm(s.level) }));
  // تكرار كل كلمة جوهرية عبر المدارس (لمعرفة الكلمات النادرة المميِّزة)
  const freq={}; dbSchools.forEach(s=>new Set(s.core).forEach(w=>freq[w]=(freq[w]||0)+1));

  function match(vname, supId){
    const c=core(vname), j=joined(vname), vstage=stageOf(vname)||fuzzyStage(vname);
    const sg=supGender[supId];
    const expectGender = sg==="female" ? (vstage==="نموذجي"?"male":"female") : "male";
    let best=null,bestScore=0,bestOv=0,ties=[];
    for(const s of dbSchools){
      const ov=overlap(c,s.core);
      const contain = (j.length>=5 && s.joined.length>=5 && (j.includes(s.joined)||s.joined.includes(j)));
      let base = ov + (contain?2:0);
      if(j===s.joined) base=Math.max(base,5);
      if(base<=0) continue;
      const stageMatch = vstage && s.stage && vstage===s.stage;
      const genMatch = s.gender===expectGender;
      let sco = base + (stageMatch?1:0) + (genMatch?0.5:0);
      if(sco>bestScore+1e-9){bestScore=sco;bestOv=ov;best=s;ties=[{s,ov,contain,stageMatch,genMatch}];}
      else if(Math.abs(sco-bestScore)<1e-9){ties.push({s,ov,contain,stageMatch,genMatch});}
    }
    if(!best) return {best:null,conflict:false};
    // عتبة القبول
    const top = ties[0];
    const strong = bestOv>=2 || top.contain;                              // تطابق قوي
    const uniqueToken = top.s.core.some(w=>c.includes(w) && freq[w]===1);  // كلمة اسم فريدة عالميًا
    const resolvedByStageGender = bestOv>=1 && ties.length===1 && (top.stageMatch || top.genMatch);
    const accept = strong || uniqueToken || resolvedByStageGender;
    if(!accept) return {best:null,conflict:false};
    if(ties.length>1){
      const inSup=ties.filter(t=>asgBySchool[t.s.id]===supId);
      if(inSup.length===1) return {best:inSup[0].s,conflict:false};
      const g=ties.filter(t=>t.genMatch);
      if(g.length===1) return {best:g[0].s,conflict:false};
      const st=ties.filter(t=>t.stageMatch && t.genMatch);
      if(st.length===1) return {best:st[0].s,conflict:false};
      return {best:null,conflict:true,ties:ties.map(t=>t.s)};
    }
    return {best,conflict:false};
  }

  let ok=0, unmatched=[], conflicts=[];
  const updates=[];
  for(const v of visits){
    if(v.schoolId){ ok++; continue; } // مربوطة مسبقاً
    const r=match(v.schoolName, v.supervisorId);
    if(r.conflict){ conflicts.push(v.schoolName+" ↔ ["+r.ties.map(t=>t.name).join(" | ")+"]"); continue; }
    if(!r.best){ unmatched.push(v.schoolName); continue; }
    ok++; updates.push({id:v._id, schoolId:r.best.id, schoolName:r.best.name, _from:v.schoolName});
  }

  console.log(`\n${APPLY?"🟢 تطبيق":"🟡 تجريبي"} — إجمالي صفوف الزيارات: ${visits.length}`);
  console.log(`مطابَق: ${updates.length} | بدون مطابقة: ${unmatched.length} | تعارض: ${conflicts.length}\n`);
  updates.slice(0,12).forEach(u=>console.log(`  ✓ "${u._from}"  →  "${u.schoolName}"`));
  if(updates.length>12) console.log(`  … و ${updates.length-12} غيرها`);
  if(unmatched.length) console.log("\n❌ بدون مطابقة:", unmatched.join(" | "));
  if(conflicts.length) console.log("\n⚠️ تعارض (لم تُحدّث):", conflicts.join("  ||  "));

  if(!APPLY){ console.log("\n(تجريبي — أضِف --apply)"); return; }
  // دفعات
  for(let i=0;i<updates.length;i+=50){
    const batch=updates.slice(i,i+50).map(({id,schoolId,schoolName})=>({id,schoolId,schoolName}));
    const res=await client.mutation("schoolVisits:relink",{updates:batch});
    process.stdout.write(`  حُدّث ${Math.min(i+50,updates.length)}/${updates.length}\r`);
  }
  console.log(`\n✅ تم ربط ${updates.length} مدرسة بالاسم الرسمي الكامل.`);
}
main().catch(e=>{console.error("خطأ:",e.message);process.exit(1);});
