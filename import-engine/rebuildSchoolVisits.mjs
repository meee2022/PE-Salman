/**
 * إعادة بناء سجل الزيارات من الإكسيل مع مطابقة صارمة (الجنس + المرحلة + جوهر الاسم).
 * يكتب schoolId + الاسم الرسمي الكامل مباشرة. يمنع المطابقة الخاطئة عبر الأجناس/المراحل.
 * الاستخدام: node import-engine/rebuildSchoolVisits.mjs [--apply]
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

const FILLER = new Set(["للبنين","للبنات","المدرسه","مدرسه","بنين","بنات","التخصصيه","تخصصيه","ال"]);
const STAGE = {ابتدائي:"ابتدائي",الابتدائيه:"ابتدائي",ابتدائيه:"ابتدائي",اعدادي:"اعدادي",الاعداديه:"اعدادي",اعداديه:"اعدادي",اعدادى:"اعدادي",ثانوي:"ثانوي",الثانويه:"ثانوي",ثانويه:"ثانوي",نموذجي:"نموذجي",النموذجيه:"نموذجي",نموذجيه:"نموذجي"};
const norm=s=>(s??"").toString().replace(/\xa0/g," ").replace(/​/g,"").replace(/\s+/g," ").trim().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْٰ]/g,"");
function fuzzyStage(n0){const n=norm(n0);if(/ابتد?ت?ائ?ي|ابتدا/.test(n))return"ابتدائي";if(/اعداد?ي|اعدا/.test(n))return"اعدادي";if(/ثانو/.test(n))return"ثانوي";if(/نموذج/.test(n))return"نموذجي";return null;}
function core(name){return norm(name).split(" ").filter(w=>w&&!FILLER.has(w)&&!STAGE[w]);}
const joined=name=>core(name).join("");
function ov(a,b){const B=new Set(b);let n=0;for(const x of new Set(a))if(B.has(x))n++;return n;}
const NUM=v=>(typeof v==="number"?v:Number(String(v??"").trim())||0);
function keyOf(name){const w=norm(name).split(" ").filter(Boolean);return !w.length?"":w.length===1?w[0]:w[0]+"|"+w[w.length-1];}

function readSheet(wb,sheet,origin){
  const ws=wb.Sheets[sheet];const rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:null});
  const hi=rows.findIndex(r=>(r||[]).some(c=>norm(c)==="المدرسه"));const H=rows[hi].map(norm);
  const col=n=>H.indexOf(norm(n));
  const idx={school:col("المدرسة"),stage:col("المرحلة"),sup:col("الموجه"),t1:col("استمارات المعلمين الفصل 1"),t2:col("استمارات المعلمين الفصل 2"),em:col("اعتماد الاختبار منتصف الفصل"),en:col("اعتماد الاختبار نهاية الفصل"),ea:col("اعتماد الاختبارات"),fm:col("متابعة تنفيذ الاختبار منتصف الفصل"),fn:col("متابعة تنفيذ الاختبار نهاية الفصل"),cm:col("استمارات المنسقين"),cev:col("استمارات تقييم المنسقين"),rem:col("التعلم عن بعد"),lic:col("الرخص المهنية"),spec:col("الموجه المختص"),prin:col("مدراء المدارس"),pd:col("التطوير المهني")};
  const out=[];
  for(let i=hi+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const sup=r[idx.sup];if(!sup||!norm(sup)||/^[\d\s.]+$/.test(norm(sup)))continue;
    const school=norm(r[idx.school]);if(!school)continue;
    const teacherForms=NUM(r[idx.t1])+NUM(r[idx.t2]);
    const examApproval=NUM(r[idx.em])+NUM(r[idx.en])+(idx.ea>=0?NUM(r[idx.ea]):0);
    const examFollow=NUM(r[idx.fm])+NUM(r[idx.fn]);
    const coordForms=NUM(r[idx.cm])+NUM(r[idx.cev]);
    const extra=NUM(r[idx.rem])+NUM(r[idx.lic])+(idx.spec>=0?NUM(r[idx.spec]):0)+NUM(r[idx.prin])+(idx.pd>=0?NUM(r[idx.pd]):0);
    const total=teacherForms+examApproval+examFollow+coordForms+extra;
    const stage=(idx.stage>=0?(STAGE[norm(r[idx.stage])]||fuzzyStage(r[idx.stage])):null);
    out.push({supKey:keyOf(sup),school,stage,origin,teacherForms,examApproval,examFollow,coordForms,total});
  }
  return out;
}

async function main(){
  const wb=XLSX.readFile(FILE);
  const rows=[...readSheet(wb,"موجهات","female"),...readSheet(wb,"موجهين","male")];
  const sups=await client.query("supervisors:list",{includeInactive:true,token:TOKEN});
  const supByKey={};const supByFirst={};sups.forEach(s=>{supByKey[keyOf(s.name)]=s;const f=norm(s.name).split(" ")[0];(supByFirst[f]??=[]).push(s);});
  function matchSup(name){const k=keyOf(name);if(supByKey[k])return supByKey[k];const w=norm(name).split(" ");const f=w[0],last=w[w.length-1];let c=supByFirst[f]||[];if(c.length===1)return c[0];const c2=c.filter(s=>norm(s.name).includes(last));return c2.length===1?c2[0]:null;}

  const schools=await client.query("schools:list",{token:TOKEN});
  const dbS=schools.map(s=>({id:s._id,name:s.name,core:core(s.name),joined:joined(s.name),gender:s.gender,stage:STAGE[`${norm(s.level)}`]||fuzzyStage(s.name)||norm(s.level)}));
  const freq={};dbS.forEach(s=>new Set(s.core).forEach(w=>freq[w]=(freq[w]||0)+1));

  function matchSchool(row){
    const c=core(row.school),j=joined(row.school);
    const rstage=row.stage||fuzzyStage(row.school);
    // قيد الجنس: موجهين→بنين | موجهات→بنات أو نموذجي(بنين)
    const cands=dbS.filter(s=>{
      if(row.origin==="male") return s.gender==="male";
      return s.gender==="female" || (rstage==="نموذجي" && s.gender==="male");
    });
    let best=null,bestSc=0,bestOv=0,ties=[];
    for(const s of cands){
      const o=ov(c,s.core);const contain=(j.length>=5&&s.joined.length>=5&&(j.includes(s.joined)||s.joined.includes(j)));
      let base=o+(contain?2:0);if(j===s.joined)base=Math.max(base,5);if(base<=0)continue;
      const stageMatch=rstage&&s.stage&&rstage===s.stage;
      let sc=base+(stageMatch?2:0); // المرحلة وزنها أعلى لمنع خلط المراحل
      if(sc>bestSc+1e-9){bestSc=sc;bestOv=o;best=s;ties=[{s,o,contain,stageMatch}];}
      else if(Math.abs(sc-bestSc)<1e-9){ties.push({s,o,contain,stageMatch});}
    }
    if(!best)return null;
    const top=ties[0];
    const strong=bestOv>=2||top.contain;
    const uniq=top.s.core.some(w=>c.includes(w)&&freq[w]===1);
    const okStage=bestOv>=1&&top.stageMatch;
    if(!(strong||uniq||okStage))return null;
    if(ties.length>1){const st=ties.filter(t=>t.stageMatch);if(st.length===1)return st[0].s;return null;}
    return best;
  }

  const dbById={};dbS.forEach(s=>dbById[s.id]=s);
  const payload=[];let unmatched=[];
  for(const row of rows){
    const sup=matchSup(row.supKey.replace("|"," "));
    if(!sup)continue;
    const m=matchSchool(row);
    payload.push({supervisorId:sup._id,schoolId:m?m.id:undefined,schoolName:m?m.name:row.school,schoolNameKey:norm(m?m.name:row.school),total:row.total,teacherForms:row.teacherForms,examApproval:row.examApproval,examFollow:row.examFollow,coordForms:row.coordForms,_short:row.school,_stage:row.stage||fuzzyStage(row.school)});
  }
  // فكّ التكرار: لو مدرسة مربوطة بأكثر من صف، نُبقي الصف ذا المرحلة المطابقة فقط؛ غيره يرجع لاسمه المختصر
  const bySchool={};payload.forEach(p=>{if(p.schoolId)(bySchool[p.schoolId]??=[]).push(p);});
  let unlinkedDup=0;
  for(const [sid,grp] of Object.entries(bySchool)){
    if(grp.length<2)continue;
    const dbStage=dbById[sid]?.stage;
    const exact=grp.filter(p=>p._stage&&p._stage===dbStage);
    const keep=exact.length===1?exact[0]:null; // نُبقي واحداً فقط لو تميّز بالمرحلة
    for(const p of grp){ if(p!==keep){ p.schoolId=undefined; p.schoolName=p._short; p.schoolNameKey=norm(p._short); unlinkedDup++; } }
  }
  payload.forEach(p=>{ if(!p.schoolId)unmatched.push(`${p._short} / ${(sups.find(s=>s._id===p.supervisorId)||{}).name?.split(" ")[0]}`); delete p._short; delete p._stage; });
  const linked=payload.filter(p=>p.schoolId).length;
  const uniq=new Set(payload.filter(p=>p.schoolId).map(p=>p.schoolId)).size;

  console.log(`\n${APPLY?"🟢 تطبيق":"🟡 تجريبي"} — صفوف: ${payload.length} | مربوط: ${linked} | مدارس فريدة: ${uniq} | غير مربوط: ${unmatched.length} (منها ${unlinkedDup} فُكّت لتعارض)`);
  console.log("تحقّق التفرّد:", linked===uniq?"✅ لا تكرار":"⚠️ ما زال هناك تكرار");
  if(unmatched.length)console.log("غير مربوط (يبقى بالاسم المختصر):",unmatched.join(" | "));

  if(!APPLY){console.log("\n(تجريبي — أضِف --apply)");return;}
  const res=await client.mutation("schoolVisits:clearAndBulkImport",{academicYear:YEAR,rows:payload});
  console.log(`✅ حُذف ${res.deleted}، أُضيف ${res.inserted}`);
}
main().catch(e=>{console.error("خطأ:",e.message);process.exit(1);});
