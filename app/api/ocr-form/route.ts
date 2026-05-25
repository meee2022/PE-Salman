import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── وصف هيكل كل استمارة لـ Claude ────────────────────────────────
const FORM_PROMPTS: Record<string, string> = {
  coordinator: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "زيارة إشرافية لمعلم التربية البدنية".

استخرج البيانات التالية وأعدها بصيغة JSON فقط (بدون أي نص إضافي):
{
  "coordinatorName": "اسم المنسق/المعلم",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ بصيغة YYYY-MM-DD",
  "grade": "الصف/المرحلة",
  "subject": "الوحدة/الدرس",
  "maleCount": عدد الطلاب الذكور (رقم أو null),
  "femaleCount": عدد الطالبات الإناث (رقم أو null),
  "domains": [
    {
      "domain": "اسم المجال",
      "indicator": "المؤشر",
      "score": الدرجة (رقم أو null),
      "notes": "الملاحظات"
    }
  ],
  "strengths": ["نقاط القوة"],
  "improvements": ["مجالات التطوير"],
  "generalNote": "الملاحظة العامة أو التوصية",
  "supervisorName": "اسم الموجه إن وُجد"
}
`,

  exam: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "اختبار التربية البدنية العملي".

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "teacherName": "اسم المعلم",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "stage": "المرحلة (ابتدائي/إعدادي/ثانوي)",
  "grade": "الصف",
  "unit": "الوحدة",
  "lesson": "الدرس",
  "activities": [
    {
      "name": "اسم المهارة/النشاط",
      "context": "السياق",
      "outcome": "النواتج",
      "tools": "الأدوات",
      "score": الدرجة (رقم)
    }
  ],
  "totalScore": المجموع الكلي (رقم),
  "supervisorNote": "ملاحظة الموجه"
}
`,

  meeting: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "محضر اجتماع الزيارة التعارفية".

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "coordinatorName": "اسم المنسق",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "meetingTypes": ["نوع الاجتماع"],
  "objectives": ["الأهداف"],
  "recommendations": ["التوصيات"],
  "attendance": [{"name": "اسم الحاضر"}],
  "generalNote": "الملاحظة العامة"
}
`,

  newTeacher: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "خطة تطوير ومتابعة معلم مستجد".

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "teacherName": "اسم المعلم",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "rows": [
    {
      "criterion": "المعيار/المجال",
      "method": "أسلوب التدريب",
      "responsible": "المسؤول",
      "timeframe": "الإطار الزمني",
      "indicators": "مؤشرات النجاح",
      "done": false
    }
  ],
  "generalNote": "ملاحظة عامة"
}
`,

  examFollowup: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "متابعة تنفيذ الاختبار العملي".

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "teacherName": "اسم المعلم",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "stage": "المرحلة",
  "domains": [
    {
      "domain": "اسم المجال",
      "level": "مستوى الأداء (ممتاز/جيد جداً/جيد/يحتاج تطوير)",
      "notes": "الملاحظات"
    }
  ],
  "generalNote": "الملاحظة العامة"
}
`,

  profDev: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "التطوير المهني".

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "coordinatorName": "اسم المشارك",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "topic": "موضوع التطوير المهني",
  "supervisionTypes": ["نوع الإشراف"],
  "supervisionMethods": ["أسلوب الإشراف"],
  "recommendations": ["التوصيات"],
  "generalNote": "الملاحظة العامة"
}
`,

  principal: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "متابعة مدير المدرسة".

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "principalName": "اسم المدير",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "domains": [
    {
      "domain": "المجال",
      "score": الدرجة (رقم),
      "indicators": "المؤشرات",
      "notes": "الملاحظات"
    }
  ],
  "totalScore": المجموع (رقم),
  "recommendations": ["التوصيات"],
  "generalNote": "الملاحظة العامة"
}
`,

  deputy: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "متابعة النائب الأكاديمي".

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "deputyName": "اسم النائب الأكاديمي",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "followUpTypes": ["نوع المتابعة"],
  "domains": [
    {
      "domain": "المجال",
      "procedures": "الإجراءات",
      "notes": "الملاحظات"
    }
  ],
  "recommendations": ["التوصيات"],
  "generalNote": "الملاحظة العامة"
}
`,

  teacher: `
أنت مساعد ذكاء اصطناعي متخصص في قراءة استمارات التربية البدنية العربية.
هذه استمارة "إشراف على أداء المعلم" (زيارة صفية).

استخرج البيانات التالية وأعدها بصيغة JSON فقط:
{
  "teacherName": "اسم المعلم",
  "schoolName": "اسم المدرسة",
  "date": "التاريخ YYYY-MM-DD",
  "subject": "المادة",
  "topic": "الموضوع / الدرس",
  "grade": "الصف",
  "domains": [
    {
      "domain": "اسم المجال",
      "criteria": [
        {
          "text": "نص المعيار",
          "rating": "مستوى التقييم المحدد (ممتاز/جيد جداً/جيد/مقبول/يحتاج تطوير)"
        }
      ],
      "recommendations": ["التوصيات لهذا المجال"]
    }
  ],
  "generalNote": "الملاحظات والتوصيات العامة"
}
`,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const formType = (formData.get("formType") as string) ?? "coordinator";

    if (!file) {
      return NextResponse.json({ error: "لم يتم رفع صورة" }, { status: 400 });
    }

    // تحويل الصورة إلى base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = (file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif") || "image/jpeg";

    const prompt = FORM_PROMPTS[formType] ?? FORM_PROMPTS.coordinator;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // استخراج JSON من الرد
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "لم يتمكن Claude من استخراج البيانات من الصورة" }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: extracted });

  } catch (err: any) {
    console.error("OCR error:", err);
    return NextResponse.json(
      { error: err?.message ?? "خطأ في معالجة الصورة" },
      { status: 500 }
    );
  }
}
