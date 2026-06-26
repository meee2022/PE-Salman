/**
 * إعادة بناء سجل الزيارات بمطابقة شاملة بالمعلمين (الأدق) + احتياطي بالاسم/المرحلة + منع التكرار.
 * الاستخدام: node import-engine/teacherRebuild.mjs [--apply]
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

const FILLER=new Set(["للبنين","للبنات","المدرسه","مدرسه","بنين","بنات","التخصصيه","تخصصيه","ال"]);
const STAGE={ابتدائي:"ابتدائي",الابتدائيه:"ابتدائي",ابتدائيه:"ابتدائي",اعدادي:"اعدادي",الاعداديه:"اعدادي",اعداديه:"اعدادي",اعدادى:"اعدادي",ثانوي:"ثانوي",الثانويه:"ثانوي",ثانويه:"ثانوي",نموذجي:"نموذجي",النموذجيه:"نموذجي",نموذجيه:"نموذجي"};
const norm=s=>(s??"").toString().replace(/\xa0/g," ").replace(/​/g,"").replace(/\s+/g," ").trim().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْٰ]/g,"");
function fuzzyStage(n0){const n=norm(n0);if(/ابتد?ت?ائ?ي|ابتدا/.test(n))return"ابتدائي";if(/اعداد?ي|اعدا/.test(n))return"اعدادي";if(/ثانو/.test(n))return"ثانوي";if(/نموذج/.test(n))return"نموذجي";return null;}
function core(name){return norm(name).split(" ").filter(w=>w&&!FILLER.has(w)&&!STAGE[w]);}
const joined=name=>core(name).join("");
function ov(a,b){const B=new Set(b);let n=0;for(const x of new Set(a))if(B.has(x))n++;return n;}
const NUM=v=>(typeof v==="number"?v:Number(String(v??"").trim())||0);
function keyOf(name){const w=norm(name).split(" ").filter(Boolean);return !w.length?"":w.length===1?w[0]:w[0]+"|"+w[w.length-1];}
function tKeys(name){const w=norm(name).split(" ").filter(Boolean);const ks=new Set();if(w.length){ks.add(w[0]+"|"+w[w.length-1]);if(w.length>=2)ks.add(w[0]+"|"+w[1]);}return ks;}

function readVisits(wb,sheet,origin){
  const ws=wb.Sheets[sheet];const rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:null});
  const hi=rows.findIndex(r=>(r||[]).some(c=>norm(c)==="المدرسه"));const H=rows[hi].map(norm);const col=n=>H.indexOf(norm(n));
  const I={school:col("المدرسة"),stage:col("المرحلة"),sup:col("الموجه"),t1:col("استمارات المعلمين الفصل 1"),t2:col("استمارات المعلمين الفصل 2"),em:col("اعتماد الاختبار منتصف الفصل"),en:col("اعتماد الاختبار نهاية الفصل"),ea:col("اعتماد الاختبارات"),fm:col("متابعة تنفيذ الاختبار منتصف الفصل"),fn:col("متابعة تنفيذ الاختبار نهاية الفصل"),cm:col("استمارات المنسقين"),cev:col("استمارات تقييم المنسقين"),rem:col("التعلم عن بعد"),lic:col("الرخص المهنية"),spec:col("الموجه المختص"),prin:col("مدراء المدارس"),pd:col("التطوير المهني")};
  const out=[];
  for(let i=hi+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const sup=r[I.sup];if(!sup||!norm(sup)||/^[\d\s.]+$/.test(norm(sup)))continue;const sn=norm(r[I.school]);if(!sn)continue;
    const tf=NUM(r[I.t1])+NUM(r[I.t2]);const ap=NUM(r[I.em])+NUM(r[I.en])+(I.ea>=0?NUM(r[I.ea]):0);const ff=NUM(r[I.fm])+NUM(r[I.fn]);const cf=NUM(r[I.cm])+NUM(r[I.cev]);
    const ex=NUM(r[I.rem])+NUM(r[I.lic])+(I.spec>=0?NUM(r[I.spec]):0)+NUM(r[I.prin])+(I.pd>=0?NUM(r[I.pd]):0);
    out.push({supKey:keyOf(sup),school:sn,origin,stage:(I.stage>=0?(STAGE[norm(r[I.stage])]||fuzzyStage(r[I.stage])):null),teacherForms:tf,examApproval:ap,examFollow:ff,coordForms:cf,total:tf+ap+ff+cf+ex});
  }
  return out;
}
function readRoster(wb,sheet){
  const ws=wb.Sheets[sheet];if(!ws)return [];const rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:null});
  const hi=rows.findIndex(r=>(r||[]).some(c=>norm(c)==="المدرسه"));const H=rows[hi].map(norm);const ci=H.indexOf("المدرسه"),si=H.indexOf("الموجه");const ti=[];for(let k=1;k<=6;k++){const x=H.indexOf("المعلم "+k);if(x>=0)ti.push(x);}
  const out=[];for(let i=hi+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const sn=norm(r[ci]);if(!sn)continue;out.push({school:sn,supKey:keyOf(r[si]),teachers:ti.map(x=>r[x]).filter(Boolean).map(norm)});}
  return out;
}

async function main(){
  const wb=XLSX.readFile(FILE);
  const visits=[...readVisits(wb,"موجهات","female"),...readVisits(wb,"موجهين","male")];
  const roster=[...readRoster(wb,"مدارس البنين"),...readRoster(wb,"مدارس البنات")];
  const rosterByKey={};roster.forEach(e=>{(rosterByKey[e.supKey+"|"+e.school]??=[]).push(...e.teachers);(rosterByKey["*|"+e.school]??=[]).push(...e.teachers);});

  const sups=await client.query("supervisors:list",{includeInactive:true,token:TOKEN});
  const supByKey={};const supByFirst={};sups.forEach(s=>{supByKey[keyOf(s.name)]=s;const f=norm(s.name).split(" ")[0];(supByFirst[f]??=[]).push(s);});
  function matchSup(k){if(supByKey[k])return supByKey[k];const f=k.split("|")[0];const last=k.split("|").slice(-1)[0];let c=supByFirst[f]||[];if(c.length===1)return c[0];const c2=c.filter(s=>norm(s.name).includes(last));return c2.length===1?c2[0]:null;}

  const schools=await client.query("schools:list",{token:TOKEN});
  const dbS=schools.map(s=>({id:s._id,name:s.name,core:core(s.name),joined:joined(s.name),gender:s.gender,stage:STAGE[norm(s.level)]||fuzzyStage(s.name)||norm(s.level)}));
  const dbById={};dbS.forEach(s=>dbById[s.id]=s);
  const freq={};dbS.forEach(s=>new Set(s.core).forEach(w=>freq[w]=(freq[w]||0)+1));
  const teachers=await client.query("teachers:list",{token:TOKEN});
  const tIndex={};for(const t of teachers){if(!t.schoolName)continue;const sid=(dbS.find(s=>s.name===t.schoolName)||{}).id;if(!sid)continue;for(const k of tKeys(t.name))(tIndex[k]??=new Map()).set(sid,(tIndex[k]?.get(sid)||0)+1);}

  function genderOK(row,s){return row.origin==="male"?s.gender==="male":(s.gender==="female"||(row.stage==="نموذجي"||fuzzyStage(row.school)==="نموذجي")&&s.gender==="male");}
  // 1) ترشيح بالمعلمين
  function teacherRank(row){
    const ts=[...new Set(rosterByKey[row.supKey+"|"+row.school]||rosterByKey["*|"+row.school]||[])];
    const votes=new Map();
    for(const tn of ts)for(const k of tKeys(tn)){const m=tIndex[k];if(m)for(const [sid,v] of m){if(genderOK(row,dbById[sid]))votes.set(sid,(votes.get(sid)||0)+1);}}
    return [...votes.entries()].sort((a,b)=>b[1]-a[1]).map(([id,v])=>({id,v}));
  }
  // 2) ترشيح بالاسم/المرحلة (احتياطي)
  function nameRank(row){
    const c=core(row.school),j=joined(row.school),rstage=row.stage||fuzzyStage(row.school);
    const res=[];
    for(const s of dbS){if(!genderOK(row,s))continue;const o=ov(c,s.core);const contain=(j.length>=5&&s.joined.length>=5&&(j.includes(s.joined)||s.joined.includes(j)));let base=o+(contain?2:0);if(j===s.joined)base=Math.max(base,5);if(base<=0)continue;const sm=rstage&&s.stage&&rstage===s.stage;const uniq=c.some(w=>s.core.includes(w)&&freq[w]===1);if(o>=2||contain||uniq||(o>=1&&sm))res.push({id:s.id,score:base+(sm?2:0)});}
    return res.sort((a,b)=>b.score-a.score);
  }

  const rows=visits.map(row=>({row,sup:matchSup(row.supKey),tr:teacherRank(row),nr:nameRank(row)})).filter(x=>x.sup);
  const taken=new Set();
  // مرحلة 1: مطابقة حواف بأعلى الأصوات أولاً (أمثل عالميًا) — المعلمون votes>=2
  const edges=[];rows.forEach((x,ri)=>x.tr.forEach(c=>{if(c.v>=2)edges.push({ri,id:c.id,v:c.v});}));
  edges.sort((a,b)=>b.v-a.v);
  const rowTaken=new Set();
  for(const e of edges){if(rowTaken.has(e.ri)||taken.has(e.id))continue;rows[e.ri].assigned=e.id;rows[e.ri].via="teacher";rowTaken.add(e.ri);taken.add(e.id);}
  // مرحلة 2: الباقي بالاسم/المرحلة
  for(const x of rows){if(x.assigned)continue;const pick=x.nr.find(c=>!taken.has(c.id));if(pick){taken.add(pick.id);x.assigned=pick.id;x.via="name";}}
  // مرحلة 3: معلمون بصوت واحد للباقي
  for(const x of rows){if(x.assigned)continue;const pick=x.tr.find(c=>!taken.has(c.id));if(pick&&pick.v>=1){taken.add(pick.id);x.assigned=pick.id;x.via="teacher1";}}

  let byT=0,byN=0,unl=0;const payload=[];
  for(const x of rows){const s=x.assigned?dbById[x.assigned]:null;if(x.via==="teacher"||x.via==="teacher1")byT++;else if(x.via==="name")byN++;if(!s)unl++;
    payload.push({supervisorId:x.sup._id,schoolId:s?s.id:undefined,schoolName:s?s.name:x.row.school,schoolNameKey:norm(s?s.name:x.row.school),total:x.row.total,teacherForms:x.row.teacherForms,examApproval:x.row.examApproval,examFollow:x.row.examFollow,coordForms:x.row.coordForms});}
  const linked=payload.filter(p=>p.schoolId).length;const uniq=new Set(payload.filter(p=>p.schoolId).map(p=>p.schoolId)).size;
  const unmatched=rows.filter(x=>!x.assigned).map(x=>x.row.school+"/"+x.sup.name.split(" ")[0]);
  console.log(`\n${APPLY?"🟢 تطبيق":"🟡 تجريبي"} — صفوف:${payload.length} | مربوط:${linked} (معلمين:${byT} اسم:${byN}) | فريد:${uniq} | تكرار:${linked-uniq===0?"لا ✅":(linked-uniq)} | غير مربوط:${unl}`);
  if(unmatched.length)console.log("غير مربوط:",unmatched.join(" | "));
  if(!APPLY){console.log("\n(تجريبي — أضِف --apply)");return;}
  const res=await client.mutation("schoolVisits:clearAndBulkImport",{academicYear:YEAR,rows:payload});
  console.log(`✅ حُذف ${res.deleted}، أُضيف ${res.inserted}`);
}
main().catch(e=>{console.error("خطأ:",e.message);process.exit(1);});
