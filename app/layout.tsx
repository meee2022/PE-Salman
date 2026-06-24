import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

// رابط الموقع للروابط المطلقة (صورة المعاينة). اضبط NEXT_PUBLIC_SITE_URL على الدومين الحقيقي.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3100");

const TITLE = "نظام إدارة التوجيه التربوي - التربية البدنية";
const DESCRIPTION = "إدارة التوجيه التربوي لقسم التربية البدنية - وزارة التربية والتعليم - قطر";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.json",
  // صورة المعاينة تُولّد تلقائياً من app/opengraph-image.tsx و app/twitter-image.tsx
  openGraph: {
    type: "website",
    locale: "ar_QA",
    siteName: "التوجيه التربوي للتربية البدنية",
    title: TITLE,
    description: DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "توجيه التربية البدنية",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5C1523",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
