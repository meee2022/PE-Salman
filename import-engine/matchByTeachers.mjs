/**
 * مطابقة المدارس غير المربوطة في سجل الزيارات عبر أسماء المعلمين (مضمونة).
 * لكل صف غير مربوط: نجلب معلميه من ملف العمل، ونجد مدرسة القاعدة ذات أكبر تطابق معلمين.
 * الاستخدام: node import-engine/matchByTeachers.mjs [--apply]
 */
import XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const YEAR = "2025-2026";
const TOKEN = "SEED_BYPASS_TOKEN";
const FILE = "all files/الاستمارات والزيارات.xlsx";
function convexUrl(){try{const m=readFileSync(".env.local","utf8").match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)/);if(m)return m[1].trim();}catch{}return process.env.NEXT_PUBLIC_CONVEX_URL;}
const client = new ConvexHttpClient(convexUrl());
const norm=s=>(s??"").toString().replace(/\xa0/g," ").replace(/​/g,"").replace(/\s+/g," ").trim().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْٰ]/g,"");
// مفتاح معلم: أول كلمتين + آخر كلمة (يتحمّل اختلاف الترتيب/الكنية)
function teacherKeys(name){const w=norm(name).split(" ").filter(Boolean);const ks=new Set();if(w.length){ks.add(w[0]+"|"+w[w.length-1]);if(w.length>=2)ks.add(w[0]+"|"+w[1]);}return ks;}

function readSchoolsSheet(wb,sheet){
  const ws=wb.Sheets[sheet];if(!ws)return [];const rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:null});
  const hi=rows.findIndex(r=>(r||[]).some(c=>norm(c)==="المدرسه"));const H=rows[hi].map(norm);
  const ci=H.indexOf("المدرسه"),si=H.indexOf("الموجه"),coi=H.indexOf("المنسق");
  const ti=[];for(let k=1;k<=6;k++){const x=H.indexOf("المعلم "+k);if(x>=0)ti.push(x);}
  const out=[];
  for(let i=hi+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const sn=norm(r[ci]);if(!sn)continue;
    const teachers=ti.map(x=>r[x]).filter(Boolean).map(norm);
    out.push({school:sn,sup:norm(r[si]),coord:norm(r[coi]),teachers});
  }
  return out;
}

async function main(){
  const wb=XLSX.readFile(FILE);
  const entries=[...readSchoolsSheet(wb,"مدارس البنين"),...readSchoolsSheet(wb,"مدارس البنات")];

  const sv=await client.query("schoolVisits:listAll",{academicYear:YEAR});
  const sups=await client.query("supervisors:list",{includeInactive:true,token:TOKEN});const supById={};sups.forEach(s=>supById[s._id]=s);
  const schools=await client.query("schools:list",{token:TOKEN});const schById={};schools.forEach(s=>schById[s._id]=s);
  const teachers=await client.query("teachers:list",{token:TOKEN});
  // فهرس: مفتاح معلم → [schoolName]
  const teacherToSchools={};
  for(const t of teachers){ if(!t.schoolName)continue; for(const k of teacherKeys(t.name)){(teacherToSchools[k]??=new Set()).add(t.schoolName);} }
  const schoolByName={};schools.forEach(s=>schoolByName[norm(s.name)]=s);

  const unlinked=sv.filter(r=>!r.schoolId);
  const usedSchoolIds=new Set(sv.filter(r=>r.schoolId).map(r=>r.schoolId)); // المدارس المربوطة بالفعل
  console.log(`\n${APPLY?"🟢 تطبيق":"🟡 تجريبي"} — صفوف غير مربوطة: ${unlinked.length}\n`);
  const updates=[];let fail=[];
  for(const row of unlinked){
    const sup=supById[row.supervisorId];const shortN=norm(row.schoolName);
    // أوجد مدخل ملف العمل بنفس الاسم والموجِّه (أو الاسم فقط)
    let ent=entries.filter(e=>e.school===shortN && sup && (e.sup.includes(norm(sup.name).split(" ")[0])||norm(sup.name).includes(e.sup.split(" ")[0])));
    if(!ent.length) ent=entries.filter(e=>e.school===shortN);
    const allTeachers=[...new Set(ent.flatMap(e=>e.teachers))];
    if(!allTeachers.length){fail.push(row.schoolName+" (لا معلمين في الملف)");continue;}
    // صوّت لمدارس القاعدة حسب تطابق المعلمين
    const votes={};
    for(const tn of allTeachers){ for(const k of teacherKeys(tn)){ const set=teacherToSchools[k]; if(set) for(const sn of set) votes[sn]=(votes[sn]||0)+1; } }
    const ranked=Object.entries(votes).sort((a,b)=>b[1]-a[1]);
    if(!ranked.length){fail.push(row.schoolName+" (معلمون غير معروفين بالقاعدة)");continue;}
    const [bestName,bestVotes]=ranked[0];const second=ranked[1]?ranked[1][1]:0;
    const dbSchool=schoolByName[norm(bestName)];
    let conf = bestVotes>=2 && bestVotes>second;
    const dup = dbSchool && usedSchoolIds.has(dbSchool._id);
    console.log(`• "${row.schoolName}" /${sup?.name.split(" ")[0]} → "${bestName}" (تطابق ${bestVotes} معلم${second?` · التالي ${second}`:""}) ${dup?"⛔مكرّرة":conf?"✅":"⚠️غير حاسم"}`);
    if(conf && dbSchool && !dup){ updates.push({id:row._id,schoolId:dbSchool._id,schoolName:dbSchool.name}); usedSchoolIds.add(dbSchool._id); }
    else fail.push(row.schoolName);
  }
  console.log(`\nجاهز للربط: ${updates.length} | لم يُحسم: ${fail.length}`+(fail.length?` (${fail.join(" | ")})`:""));
  if(!APPLY){console.log("\n(تجريبي — أضِف --apply)");return;}
  if(updates.length){const res=await client.mutation("schoolVisits:relink",{updates});console.log(`\n✅ رُبط ${res.updated} مدرسة عبر مطابقة المعلمين.`);}
}
main().catch(e=>{console.error("خطأ:",e.message);process.exit(1);});
