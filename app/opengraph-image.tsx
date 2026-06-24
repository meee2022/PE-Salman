import { ImageResponse } from "next/og";

// صورة المعاينة (Open Graph) — تظهر عند مشاركة رابط الموقع
export const runtime = "nodejs";
export const alt = "نظام إدارة التوجيه التربوي — التربية البدنية";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // تحميل خط Cairo لإظهار العربية بشكل صحيح داخل الصورة (مع تجاهل الفشل بأمان)
  let cairo: ArrayBuffer | undefined;
  try {
    cairo = await fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/cairo@5.0.13/files/cairo-arabic-700-normal.woff"
    ).then((r) => (r.ok ? r.arrayBuffer() : undefined));
  } catch {
    cairo = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: "#4A0F1B",
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(201,169,110,0.22) 0%, transparent 45%), linear-gradient(135deg, #4A0F1B 0%, #5C1523 55%, #3B0A14 100%)",
          fontFamily: "Cairo",
          color: "#fff",
        }}
      >
        {/* إطار ذهبي */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            border: "2px solid rgba(201,169,110,0.5)",
            borderRadius: 28,
            display: "flex",
          }}
        />

        {/* شعار رمزي */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 32,
            background: "linear-gradient(135deg, #7A1E30, #4A0F1B)",
            border: "2px solid rgba(201,169,110,0.6)",
            marginBottom: 34,
            fontSize: 60,
            color: "#C9A96E",
          }}
        >
          ◆
        </div>

        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#fff", textAlign: "center" }}>
          التوجيه التربوي للتربية البدنية
        </div>

        <div style={{ display: "flex", marginTop: 18, fontSize: 30, color: "#DFC48E", fontWeight: 700 }}>
          نظام إدارة الإشراف · الزيارات · التقارير
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 40,
            padding: "10px 26px",
            borderRadius: 999,
            background: "rgba(201,169,110,0.14)",
            border: "1px solid rgba(201,169,110,0.4)",
            fontSize: 24,
            color: "#EBD9B4",
            fontWeight: 700,
          }}
        >
          وزارة التربية والتعليم · دولة قطر
        </div>
      </div>
    ),
    {
      ...size,
      fonts: cairo
        ? [{ name: "Cairo", data: cairo, weight: 700 as const, style: "normal" as const }]
        : [],
    }
  );
}
