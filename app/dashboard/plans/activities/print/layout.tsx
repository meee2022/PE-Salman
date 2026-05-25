// صفحة الطباعة تعمل بدون AppShell
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
