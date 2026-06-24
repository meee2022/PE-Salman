import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { fetchSnapshot } from "@/lib/aiData";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-opus-4-8";

/* ────────────────────────────────────────────────────────────────────
   تحليل ذكي لأداء القسم — ملخص تنفيذي + توصيات لكل موجّه
   ──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { token, academicYear } = await req.json();
    if (!token) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

    const year = academicYear ?? "2025-2026";
    const snap = await fetchSnapshot(token, year);

    if (!snap.coverage.length) {
      return NextResponse.json(
        { error: "لا توجد بيانات تغطية لهذه السنة أو لا تملك صلاحية الاطّلاع." },
        { status: 403 }
      );
    }

    const prompt = `أنت مستشار تربوي خبير في الإشراف على التربية البدنية بوزارة التربية والتعليم في قطر.
حلّل بيانات أداء قسم التوجيه التربوي للسنة الدراسية ${year} التالية (بصيغة JSON):

${JSON.stringify({ coverage: snap.coverage, alerts: snap.alerts, schools: { total: snap.schoolsCount, ...snap.schoolsByGender } }, null, 2)}

أنشئ تقريرًا تحليليًا احترافيًا بالعربية الفصحى بصيغة Markdown يتضمّن:

## ملخص تنفيذي
فقرة موجزة عن الحالة العامة للأداء (نسبة التغطية المتوسطة، عدد المتميزين، عدد المتأخرين).

## أبرز المؤشرات
نقاط مختصرة بأهم الأرقام.

## الموجّهون المتميّزون
أعلى 3 موجّهين أداءً مع سبب التميّز.

## يحتاجون متابعة
الموجّهون ذوو التغطية المنخفضة، مع توصية عملية محدّدة لكل واحد.

## توصيات عامة للقسم
3-5 توصيات قابلة للتنفيذ.

قواعد: استخدم الأرقام الغربية (1،2،3). اعتمد فقط على البيانات المعطاة ولا تختلق أرقامًا. كن دقيقًا وعمليًا ومختصرًا.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ success: true, report: text });
  } catch (err: any) {
    console.error("AI analysis error:", err);
    return NextResponse.json({ error: err?.message ?? "خطأ في التحليل" }, { status: 500 });
  }
}
