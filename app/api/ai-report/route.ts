import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { fetchSnapshot } from "@/lib/aiData";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-opus-4-8";

/* ────────────────────────────────────────────────────────────────────
   مولّد التقرير الرسمي — تقرير عربي رسمي جاهز للطباعة من بيانات القسم
   ──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { token, academicYear } = await req.json();
    if (!token) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

    const year = academicYear ?? "2025-2026";
    const snap = await fetchSnapshot(token, year);

    if (!snap.coverage.length) {
      return NextResponse.json(
        { error: "لا توجد بيانات لإنشاء التقرير أو لا تملك صلاحية الاطّلاع." },
        { status: 403 }
      );
    }

    const prompt = `أنت مسؤول إعداد التقارير الرسمية في إدارة التوجيه التربوي للتربية البدنية بوزارة التربية والتعليم في دولة قطر.
أعدّ "تقريرًا رسميًا عن أداء قسم التوجيه التربوي للتربية البدنية" للسنة الدراسية ${year} اعتمادًا على البيانات التالية (JSON):

${JSON.stringify({ coverage: snap.coverage, alerts: snap.alerts, schools: { total: snap.schoolsCount, ...snap.schoolsByGender } }, null, 2)}

اكتب التقرير بصيغة Markdown بأسلوب رسمي مؤسسي يصلح للطباعة والرفع للإدارة العليا، ويشمل:

# تقرير أداء قسم التوجيه التربوي للتربية البدنية
**السنة الدراسية:** ${year}

## أولًا: مقدمة
تمهيد رسمي موجز عن هدف التقرير ونطاقه.

## ثانيًا: نظرة عامة على القسم
عدد الموجّهين، عدد المدارس وتوزيعها، نسبة التغطية الإجمالية.

## ثالثًا: مؤشرات الأداء التفصيلية
جدول Markdown يعرض لكل موجّه: المدارس المطلوبة، المغطّاة، نسبة التغطية، عدد الاستمارات، الحالة. رتّبهم تنازليًا حسب نسبة التغطية.

## رابعًا: التحليل والملاحظات
تحليل موضوعي لأبرز نقاط القوة والتحديات.

## خامسًا: التوصيات
توصيات رسمية مرقّمة وقابلة للتنفيذ.

## سادسًا: الخاتمة
خاتمة رسمية موجزة.

قواعد صارمة: استخدم الأرقام الغربية (1،2،3). اعتمد حصريًا على البيانات المعطاة دون اختلاق أي رقم. حافظ على لغة رسمية رصينة.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ success: true, report: text });
  } catch (err: any) {
    console.error("AI report error:", err);
    return NextResponse.json({ error: err?.message ?? "خطأ في إنشاء التقرير" }, { status: 500 });
  }
}
