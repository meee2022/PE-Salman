import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-opus-4-8";

/* ────────────────────────────────────────────────────────────────────
   تلخيص استمارة — يحوّل بيانات استمارة مُعبّأة إلى ملخص + نقاط قوة وضعف
   وتوصية مهنية. يستقبل نوع الاستمارة وبياناتها كـ JSON.
   ──────────────────────────────────────────────────────────────────── */
const FORM_LABELS: Record<string, string> = {
  coordinator: "زيارة إشرافية لمعلم/منسق التربية البدنية",
  teacher: "زيارة إشرافية على معلم",
  exam: "اختبار التربية البدنية العملي",
  examFollowup: "متابعة تنفيذ الاختبار",
  meeting: "اجتماع تعارفي",
  newTeacher: "خطة تطوير معلم مستجد",
  profDev: "جلسة تطوير مهني",
  principal: "متابعة مدير المدرسة",
  deputy: "متابعة النائب الأكاديمي",
  examArbitration: "تحكيم الاختبار العملي",
  profLicense: "تقييم الرخصة المهنية",
};

export async function POST(req: NextRequest) {
  try {
    const { token, formType, formData } = await req.json();
    if (!token) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
    if (!formData) return NextResponse.json({ error: "لا توجد بيانات استمارة" }, { status: 400 });

    const label = FORM_LABELS[formType] ?? "استمارة إشرافية";

    const prompt = `أنت موجّه تربوي خبير في التربية البدنية. إليك بيانات استمارة "${label}" مُعبّأة (JSON):

${JSON.stringify(formData, null, 2)}

اكتب ملخصًا مهنيًا موجزًا بالعربية الفصحى بصيغة Markdown يتضمّن:

## الملخص
فقرة قصيرة (2-3 أسطر) تلخّص ما رُصد في الزيارة/الاستمارة.

## نقاط القوة
نقاط مختصرة (إن وُجدت في البيانات).

## مجالات التطوير
نقاط مختصرة بما يحتاج تحسينًا.

## التوصية
توصية مهنية واحدة عملية ومحدّدة.

قواعد: اعتمد فقط على ما ورد في البيانات ولا تختلق معلومات. إن كانت البيانات ناقصة فاذكر ذلك بإيجاز. استخدم الأرقام الغربية. كن مختصرًا.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ success: true, summary: text });
  } catch (err: any) {
    console.error("AI summarize error:", err);
    return NextResponse.json({ error: err?.message ?? "خطأ في التلخيص" }, { status: 500 });
  }
}
