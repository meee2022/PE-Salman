import { PageHeader } from "./PageHeader";
import { Hammer } from "lucide-react";

export function ComingSoon({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="card p-16 flex flex-col items-center justify-center text-center animate-in">
        <div className="icon-orb !w-16 !h-16 bg-gold/10 text-gold-dark mb-4"><Hammer size={28} /></div>
        <p className="font-bold text-[#2A1418]">قيد الإنشاء</p>
        <p className="text-sm text-[#A89A92] mt-1">سيتم بناء هذه الصفحة في المرحلة التالية.</p>
      </div>
    </>
  );
}
