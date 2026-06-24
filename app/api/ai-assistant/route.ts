import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-opus-4-8";

/* ────────────────────────────────────────────────────────────────────
   المساعد الذكي — يجيب عن أسئلة المستخدم بالاعتماد على بيانات النظام
   الحقيقية عبر Convex، مع احترام صلاحيات المستخدم (التوكن يُمرَّر لكل
   استعلام، فالموجّه لا يرى إلا بياناته والأدمن يرى الجميع).
   ──────────────────────────────────────────────────────────────────── */

type ToolName =
  | "get_coverage_kpis"
  | "get_alerts"
  | "list_supervisors"
  | "get_supervisor_detail"
  | "get_field_visits"
  | "list_schools"
  | "list_teachers";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_coverage_kpis",
    description:
      "يُرجِع مؤشرات التغطية لكل الموجّهين في سنة دراسية: المدارس المطلوبة، المغطّاة، نسبة التغطية، عدد الاستمارات، نسبة الاستمارات، والحالة. استخدمه لأسئلة عن الأداء والترتيب والمقارنات والتغطية.",
    input_schema: {
      type: "object",
      properties: {
        academicYear: { type: "string", description: "السنة الدراسية مثل 2025-2026" },
      },
      required: ["academicYear"],
    },
  },
  {
    name: "get_alerts",
    description:
      "يُرجِع التنبيهات النشطة: الموجّهون ذوو التغطية المنخفضة أو بدون استمارات. استخدمه لأسئلة مثل: مين محتاج متابعة؟ مين متأخّر؟",
    input_schema: {
      type: "object",
      properties: { academicYear: { type: "string" } },
      required: ["academicYear"],
    },
  },
  {
    name: "list_supervisors",
    description: "قائمة كل الموجّهين النشطين بأسمائهم ومعرّفاتهم (id) وبياناتهم العامة.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_supervisor_detail",
    description:
      "تفاصيل موجّه واحد: التغطية، النشاط، الاستمارات، المدارس. يحتاج معرّف الموجّه (id) — احصل عليه أولاً من list_supervisors.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "معرّف الموجّه" },
        academicYear: { type: "string" },
      },
      required: ["id", "academicYear"],
    },
  },
  {
    name: "get_field_visits",
    description:
      "قائمة الزيارات الميدانية (كل الاستمارات) في سنة دراسية، اختيارياً مفلترة بموجّه. استخدمه لعدّ الزيارات وأنواع الاستمارات والتواريخ.",
    input_schema: {
      type: "object",
      properties: {
        academicYear: { type: "string" },
        supervisorId: { type: "string", description: "اختياري — لتصفية زيارات موجّه واحد" },
      },
      required: ["academicYear"],
    },
  },
  {
    name: "list_schools",
    description: "قائمة المدارس النشطة مع الجنس والمرحلة وأعداد المعلمين والمنسقين.",
    input_schema: {
      type: "object",
      properties: {
        gender: { type: "string", enum: ["male", "female"], description: "اختياري" },
      },
    },
  },
  {
    name: "list_teachers",
    description: "قائمة معلمي التربية البدنية، اختيارياً مفلترة باسم الموجّه أو التصنيف أو المرحلة أو البحث.",
    input_schema: {
      type: "object",
      properties: {
        supervisorName: { type: "string" },
        classification: { type: "string" },
        level: { type: "string" },
        searchQuery: { type: "string" },
      },
    },
  },
];

async function runTool(
  convex: ConvexHttpClient,
  token: string,
  year: string,
  name: ToolName,
  input: any
): Promise<unknown> {
  switch (name) {
    case "get_coverage_kpis":
      return convex.query(api.coverage.listByYear, {
        academicYear: input.academicYear ?? year,
        token,
      });
    case "get_alerts":
      return convex.query(api.alerts.list, {
        academicYear: input.academicYear ?? year,
        token,
      });
    case "list_supervisors":
      return convex.query(api.supervisors.list, { token });
    case "get_supervisor_detail":
      return convex.query(api.supervisors.detail, {
        id: input.id,
        academicYear: input.academicYear ?? year,
        token,
      });
    case "get_field_visits":
      return convex.query(api.reports.fieldVisits, {
        academicYear: input.academicYear ?? year,
        supervisorId: input.supervisorId || undefined,
        token,
      });
    case "list_schools":
      return convex.query(api.schools.list, {
        gender: input.gender || undefined,
        token,
      });
    case "list_teachers":
      return convex.query(api.teachers.list, {
        supervisorName: input.supervisorName || undefined,
        classification: input.classification || undefined,
        level: input.level || undefined,
        searchQuery: input.searchQuery || undefined,
        token,
      });
    default:
      return { error: "أداة غير معروفة" };
  }
}

function systemPrompt(year: string, userName: string, role: string) {
  return `أنت "المساعد الذكي" لنظام إدارة التوجيه التربوي للتربية البدنية بوزارة التربية والتعليم في قطر.
المستخدم الحالي: ${userName} (الدور: ${role}). السنة الدراسية النشطة: ${year}.

مهمتك: الإجابة عن أسئلة المستخدم حول الموجّهين والمدارس والمعلمين والزيارات والتغطية والمؤشرات، بالاعتماد الكامل على البيانات الحقيقية التي تحصل عليها عبر الأدوات.

قواعد صارمة:
- استخدم الأدوات دائماً لجلب البيانات قبل الإجابة عن أي سؤال رقمي أو إحصائي. لا تخمّن ولا تختلق أرقاماً إطلاقاً.
- إن لم تُرجع الأداة بيانات (قائمة فارغة)، فقد لا تكون لدى المستخدم صلاحية الاطّلاع، أو لا توجد بيانات لتلك السنة — وضّح ذلك بلطف.
- أجب بالعربية الفصحى المختصرة والمهنية. استخدم الأرقام الغربية (1،2،3).
- نسّق الإجابات بقوائم أو جداول Markdown عند المقارنة بين عدة عناصر.
- إذا طُلب ترتيب الموجّهين، رتّبهم تنازلياً حسب المؤشر المطلوب (نسبة التغطية افتراضياً).
- كن موجزاً: أعطِ الخلاصة أولاً ثم التفاصيل عند الحاجة.
- إذا كان السؤال خارج نطاق النظام، اعتذر بلطف ووضّح نطاق مساعدتك.`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, token, academicYear, userName, role } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "غير مصرّح — سجّل الدخول أولاً" }, { status: 401 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "لا توجد رسالة" }, { status: 400 });
    }

    const year = academicYear ?? "2025-2026";
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "إعداد Convex غير متوفر" }, { status: 500 });
    }
    const convex = new ConvexHttpClient(convexUrl);

    // بناء سجل المحادثة لـ Claude
    const convo: Anthropic.MessageParam[] = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m: any) => ({ role: m.role, content: String(m.content) }));

    const system = systemPrompt(year, userName ?? "مستخدم", role ?? "viewer");

    // حلقة tool-use (حد أقصى للأمان)
    let guard = 0;
    while (guard++ < 6) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system,
        tools: TOOLS,
        messages: convo,
      });

      if (response.stop_reason === "tool_use") {
        convo.push({ role: "assistant", content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            let result: unknown;
            try {
              result = await runTool(convex, token, year, block.name as ToolName, block.input);
            } catch (e: any) {
              result = { error: e?.message ?? "فشل تنفيذ الأداة" };
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result ?? null).slice(0, 60000),
            });
          }
        }
        convo.push({ role: "user", content: toolResults });
        continue;
      }

      // إجابة نهائية
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return NextResponse.json({ success: true, reply: text || "لم أتمكّن من توليد إجابة." });
    }

    return NextResponse.json(
      { success: true, reply: "تعذّر إكمال الطلب بعد عدة محاولات. حاول إعادة صياغة سؤالك." },
    );
  } catch (err: any) {
    console.error("AI assistant error:", err);
    return NextResponse.json(
      { error: err?.message ?? "خطأ في معالجة الطلب" },
      { status: 500 }
    );
  }
}
