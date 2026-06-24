import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { fetchSnapshot } from "@/lib/aiData";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-opus-4-8";

/* ────────────────────────────────────────────────────────────────────
   كشف الشذوذ — يحلّل بيانات التغطية والنشاط ويرصد الحالات غير الطبيعية:
   تغطية منخفضة شاذة، تباين كبير، بيانات غير متّسقة (مغطّى > مطلوب)،
   استمارات صفرية مع تغطية مرتفعة… إلخ.
   ──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { token, academicYear } = await req.json();
    if (!token) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

    const year = academicYear ?? "2025-2026";
    const snap = await fetchSnapshot(token, year);

    if (!snap.coverage.length) {
      return NextResponse.json(
        { error: "لا توجد بيانات كافية لكشف الشذوذ أو لا تملك صلاحية الاطّلاع." },
        { status: 403 }
      );
    }

    // إحصاءات مساعدة لتأطير التحليل
    const rates = snap.coverage.map((c) => c.coverageRate).filter((n) => typeof n === "number");
    const avg = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10 : 0;

    const prompt = `أنت محلّل بيانات خبير في الرقابة على أداء التوجيه التربوي للتربية البدنية.
مهمتك: رصد "الحالات الشاذة" (anomalies) في بيانات الموجّهين للسنة الدراسية ${year}.

متوسط نسبة التغطية للقسم = ${avg}%.
بيانات الموجّهين (JSON):
${JSON.stringify(snap.coverage, null, 2)}

التنبيهات الحالية في النظام (JSON):
${JSON.stringify(snap.alerts, null, 2)}

ارصد كل ما يستحق انتباه المسؤول، مع التركيز على:
1. تغطية منخفضة بشكل شاذ مقارنةً بالمتوسط.
2. تناقضات منطقية في البيانات (مثل: المغطّى أكبر من المطلوب، أو نسبة تغطية 100% مع عدد استمارات صفر، أو عدد استمارات مرتفع جدًا مع تغطية منخفضة).
3. تباين كبير غير معتاد بين الموجّهين.
4. أي قيمة تبدو خطأ إدخال محتمل.

أعد النتيجة بصيغة Markdown:

## ملخص الفحص
سطر أو سطران عن الحالة العامة وعدد الحالات المرصودة.

## الحالات الشاذة
لكل حالة: **اسم الموجّه** — نوع الشذوذ، والقيم المعنية، ودرجة الخطورة (🔴 عالية / 🟠 متوسطة / 🟡 منخفضة)، وتفسير موجز.

## إجراءات مقترحة
نقاط عملية لمعالجة كل نوع.

إن لم توجد حالات شاذة فاذكر ذلك بوضوح. اعتمد فقط على البيانات. استخدم الأرقام الغربية. كن دقيقًا ومختصرًا.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ success: true, report: text });
  } catch (err: any) {
    console.error("AI anomalies error:", err);
    return NextResponse.json({ error: err?.message ?? "خطأ في كشف الشذوذ" }, { status: 500 });
  }
}
