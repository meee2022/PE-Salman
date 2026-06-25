/**
 * إضافة مدرسة "هند بنت عتبة الإعدادية للبنات" (ناقصة) بكامل بياناتها وربطها بسجل الزيارات.
 * الاستخدام: node import-engine/addHindBintOtba.mjs --apply
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const YEAR = "2025-2026";
const TOKEN = "SEED_BYPASS_TOKEN";
function convexUrl(){try{const m=readFileSync(".env.local","utf8").match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)/);if(m)return m[1].trim();}catch{}return process.env.NEXT_PUBLIC_CONVEX_URL;}
const client = new ConvexHttpClient(convexUrl());
const norm=s=>(s??"").toString().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْٰ]/g,"").replace(/\s+/g," ").trim();

const SCHOOL_NAME = "هند بنت عتبة الإعدادية للبنات";
const LEVEL = "إعدادي";
const COORD = "اميرة عبدالنبي الشوك";
const TEACHERS = ["رنا محمد طيارة", "ليلى عبدالله علي جاسم الجسيمان", "أروى عبدالله محمد بليده"];

async function main(){
  const sups = await client.query("supervisors:list",{includeInactive:true,token:TOKEN});
  const fajr = sups.find(s=>norm(s.name).includes("فجر"));
  if(!fajr){console.error("لم يُعثر على الموجِّهة فجر"); process.exit(1);}

  const sv = await client.query("schoolVisits:listAll",{academicYear:YEAR});
  const visitRow = sv.find(r=>norm(r.schoolName).includes("هند بنت عتبه"));

  console.log(`المدرسة: ${SCHOOL_NAME}`);
  console.log(`الموجِّهة: ${fajr.name} | المنسقة: ${COORD} | المعلمات: ${TEACHERS.length}`);
  console.log(`سجل الزيارة الموجود: ${visitRow?`نعم (${visitRow.total} زيارة)`:"لا"}`);
  if(!APPLY){console.log("\n(تجريبي — أضِف --apply)"); return;}

  // 1) إنشاء المدرسة
  const schoolId = await client.mutation("schools:create",{
    name: SCHOOL_NAME, gender: "female", level: LEVEL, teachers: TEACHERS.length, coordinators: 1,
    notes: `أُضيفت يدوياً — المنسقة: ${COORD}`, token: TOKEN,
  });
  console.log("✓ أُنشئت المدرسة:", schoolId);

  // 2) الإسناد لفجر
  await client.mutation("assignments:assign",{schoolId, supervisorId: fajr._id, academicYear: YEAR, token: TOKEN});
  console.log("✓ أُسندت للموجِّهة فجر");

  // 3) ربط سجل الزيارات بالاسم الكامل
  if(visitRow){
    await client.mutation("schoolVisits:relink",{updates:[{id:visitRow._id, schoolId, schoolName: SCHOOL_NAME}]});
    console.log("✓ رُبط سجل الزيارات بالاسم الكامل");
  }

  // 4) إضافة المعلمات الثلاث
  const teachers = TEACHERS.map((name,i)=>({
    schoolCode: "HBO-EG", schoolName: SCHOOL_NAME, level: LEVEL, supervisorName: fajr.name,
    name, jobTitle: "معلمة تربية بدنية", classification: "عام",
    personalId: `HBO-${i+1}`, employeeId: "", gender: "female",
    nationality: "", mobile: "", email: "",
  }));
  const n = await client.mutation("teachers:bulkImport",{teachers});
  console.log(`✓ أُضيفت ${n} معلمات`);

  console.log("\n✅ تمت إضافة مدرسة هند بنت عتبة بكامل بياناتها.");
}
main().catch(e=>{console.error("خطأ:",e.message);process.exit(1);});
