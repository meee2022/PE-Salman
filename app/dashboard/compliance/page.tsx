"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldCheck, Check, X, Search, FileText, UserCheck, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { useActiveYear } from "@/hooks/useActiveYear";

export default function CompliancePage() {
  const { user, token } = useAuth();
  const ACADEMIC_YEAR = useActiveYear();
  const canViewAll = user?.role === "admin" || user?.role === "viewer";

  return (
    <div className="space-y-6">
      <PageHeader
        title="مركز الالتزام والمواثيق السنوية"
        subtitle={`متابعة واعتماد ميثاق النزاهة السلوكي وخطة التكامل الإسلامي الرمضانية — العام الدراسي ${ACADEMIC_YEAR}`}
        icon={<ShieldCheck size={26} />}
      />

      {canViewAll ? <AdminComplianceView /> : <SupervisorComplianceView />}
    </div>
  );
}

/* ───────────────────────── عرض الإدارة (Admin View) ───────────────────────── */
function AdminComplianceView() {
  const { token, user } = useAuth();
  const ACADEMIC_YEAR = useActiveYear();
  const isReadOnly = user?.role === "viewer";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "signed" | "unsigned">("all");

  const list = useQuery(api.compliance.list, token ? { academicYear: ACADEMIC_YEAR } : "skip");
  const updateCompliance = useMutation(api.compliance.upsert);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  if (!list) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  // تصفية السجلات حسب البحث والفلاتر
  const filtered = list.filter((item) => {
    const matchesSearch = item.supervisorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === "signed") {
      return matchesSearch && item.integrityPledge;
    }
    if (filterType === "unsigned") {
      return matchesSearch && !item.integrityPledge;
    }
    return matchesSearch;
  });

  const signedCount = list.filter((t) => t.integrityPledge).length;
  const ramadanCount = list.filter((t) => t.ramadanIntegration).length;

  async function handleTogglePledge(supervisorId: Id<"supervisors">, currentVal: boolean, name: string) {
    if (!list || isReadOnly) return;
    await updateCompliance({
      supervisorId,
      academicYear: ACADEMIC_YEAR,
      integrityPledge: !currentVal,
      ramadanIntegration: list.find(l => l.supervisorId === supervisorId)?.ramadanIntegration ?? false,
      userId: user?._id,
    });
    showToast(`تم تحديث حالة ميثاق النزاهة للموجه ${name}`);
  }

  async function handleToggleRamadan(supervisorId: Id<"supervisors">, currentVal: boolean, name: string) {
    if (!list || isReadOnly) return;
    await updateCompliance({
      supervisorId,
      academicYear: ACADEMIC_YEAR,
      integrityPledge: list.find(l => l.supervisorId === supervisorId)?.integrityPledge ?? false,
      ramadanIntegration: !currentVal,
      userId: user?._id,
    });
    showToast(`تم تحديث حالة التكامل الرمضاني للموجه ${name}`);
  }

  return (
    <div className="space-y-6">
      {/* بطاقات إحصائية للمركز */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-luxurious p-5 flex items-center justify-between bg-gradient-to-br from-[#5C1523]/5 to-[#4A0F1B]/0 relative">
          <span className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
          <div>
            <p className="text-xs text-[#7A6A58] font-bold">إجمالي الموجهين النشطين</p>
            <h3 className="text-2xl font-black text-primary mt-1">{list.length} <span className="text-xs font-normal text-[#7A6A58]">موجهين</span></h3>
          </div>
          <div className="icon-orb !w-11 !h-11 bg-primary/5 text-primary">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="card-luxurious p-5 flex items-center justify-between bg-gradient-to-br from-emerald-600/5 to-emerald-600/0 relative">
          <span className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-600" />
          <div>
            <p className="text-xs text-[#7A6A58] font-bold">الموقعون على ميثاق النزاهة</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{signedCount} <span className="text-xs font-normal text-emerald-600/70">من أصل {list.length}</span></h3>
          </div>
          <div className="icon-orb !w-11 !h-11 bg-emerald-600/5 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="card-luxurious p-5 flex items-center justify-between bg-gradient-to-br from-gold/5 to-gold/0 relative">
          <span className="absolute right-0 top-0 bottom-0 w-1 bg-gold" />
          <div>
            <p className="text-xs text-[#7A6A58] font-bold">المكتملون للتكامل الإسلامي</p>
            <h3 className="text-2xl font-black text-gold-dark mt-1">{ramadanCount} <span className="text-xs font-normal text-gold-dark/70">من أصل {list.length}</span></h3>
          </div>
          <div className="icon-orb !w-11 !h-11 bg-gold/10 text-gold-dark">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* البحث والفلترة */}
      <div className="glass-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* حقل البحث */}
          <div className="relative md:col-span-2">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A89A92]" size={17} />
            <input
              type="text"
              placeholder="ابحث باسم الموجه التربوي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field pr-10 w-full"
            />
          </div>

          {/* نوع الفلترة */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="field w-full"
            >
              <option value="all">جميع الحالات</option>
              <option value="signed">تم توقيع ميثاق النزاهة فقط</option>
              <option value="unsigned">بانتظار توقيع الميثاق</option>
            </select>
          </div>
        </div>
      </div>

      {/* جدول البيانات */}
      <div className="glass-card overflow-hidden animate-in">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-primary/5 border-b border-black/[0.04] text-xs font-bold text-primary">
                <th className="p-4">الموجه التربوي</th>
                <th className="p-4">المسمى الوظيفي</th>
                <th className="p-4 text-center">ميثاق سلوك ونزاهة الموظفين</th>
                <th className="p-4 text-center">تكامل رمضان مع التربية الإسلامية</th>
                <th className="p-4">آخر تحديث</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#A89A92] font-semibold">
                    لا توجد التزامات مسجلة تطابق فلترة البحث الحالية.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.supervisorId} className="hover:bg-gold/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="icon-orb !w-8 !h-8 bg-gradient-to-br from-[#FCF9F2] to-[#DFC48E]/20 text-primary border border-gold/30 font-extrabold text-xs">
                          {item.supervisorName.trim().charAt(0)}
                        </span>
                        <span className="font-extrabold text-[#2A1418]">{item.supervisorName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#7A6A58] font-medium">{item.supervisorJob}</td>
                    
                    {/* ميثاق السلوك */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => !isReadOnly && handleTogglePledge(item.supervisorId, item.integrityPledge, item.supervisorName)}
                        disabled={isReadOnly}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                          isReadOnly ? "opacity-75 cursor-not-allowed" : "hover:scale-[1.03] active:scale-95"
                        } ${
                          item.integrityPledge
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {item.integrityPledge ? (
                          <>
                            <Check size={13} /> مكتمل وموقّع
                          </>
                        ) : (
                          <>
                            <X size={13} /> غير موقّع
                          </>
                        )}
                      </button>
                    </td>

                    {/* تكامل رمضان */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => !isReadOnly && handleToggleRamadan(item.supervisorId, item.ramadanIntegration, item.supervisorName)}
                        disabled={isReadOnly}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                          isReadOnly ? "opacity-75 cursor-not-allowed" : "hover:scale-[1.03] active:scale-95"
                        } ${
                          item.ramadanIntegration
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}
                      >
                        {item.ramadanIntegration ? (
                          <>
                            <Check size={13} /> تم التفعيل
                          </>
                        ) : (
                          <>
                            <HelpCircle size={13} /> قيد المتابعة
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-4 text-xs font-mono text-[#A89A92]">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString("ar-QA", { hour12: false }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-2 animate-in">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── عرض الموجه (Supervisor View) ──────────────────────── */
function SupervisorComplianceView() {
  const { user, token } = useAuth();
  const ACADEMIC_YEAR = useActiveYear();
  const supervisorId = user?.supervisorId;

  const data = useQuery(
    api.compliance.getBySupervisor,
    token && supervisorId ? { supervisorId, academicYear: ACADEMIC_YEAR } : "skip"
  );
  
  const updateCompliance = useMutation(api.compliance.upsert);

  const [signing, setSigning] = useState(false);
  const [savingRamadan, setSavingRamadan] = useState(false);
  const [ramadanVal, setRamadanVal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  if (!supervisorId) {
    return (
      <div className="max-w-4xl mx-auto p-8 card-luxurious flex flex-col items-center justify-center text-center space-y-4 border border-red-500/10 bg-red-500/[0.01]">
        <div className="icon-orb !w-14 !h-14 bg-red-50 text-red-600 border border-red-100">
          <AlertCircle size={28} />
        </div>
        <div>
          <h4 className="font-extrabold text-[#2A1418] text-lg">لم يتم ربط حسابك بملف موجّه</h4>
          <p className="text-xs text-[#7A6A58] mt-2 max-w-md mx-auto leading-relaxed">
            عذراً، هذا الحساب غير مرتبط بملف موجه تربوي نشط في النظام. يرجى مراجعة رئيس القسم لربط حسابك برقمك الوظيفي لتتمكن من توقيع واعتماد المواثيق والالتزامات السنوية.
          </p>
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  // مزامنة حالة تكامل رمضان المستعلمة مع الحالة المحلية
  const initialRamadan = data?.ramadanIntegration ?? false;

  async function handleSignPledge() {
    if (!supervisorId) return;
    setSigning(true);
    try {
      await updateCompliance({
        supervisorId,
        academicYear: ACADEMIC_YEAR,
        integrityPledge: true,
        ramadanIntegration: initialRamadan,
        userId: user?._id,
      });
      showToast("تم اعتماد وتوقيع ميثاق النزاهة العمومي بنجاح!");
    } catch (e: any) {
      alert("حدث خطأ أثناء التوقيع");
    } finally {
      setSigning(false);
    }
  }

  async function handleUpdateRamadan(val: boolean) {
    if (!supervisorId) return;
    setSavingRamadan(true);
    try {
      await updateCompliance({
        supervisorId,
        academicYear: ACADEMIC_YEAR,
        integrityPledge: data?.integrityPledge ?? false,
        ramadanIntegration: val,
        userId: user?._id,
      });
      showToast("تم تحديث حالة خطة تفعيل التربية الإسلامية بنجاح!");
    } catch (e: any) {
      alert("حدث خطأ أثناء تحديث حالة التكامل الرمضاني");
    } finally {
      setSavingRamadan(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* مقدمة قسم التوجيه */}
      <div className="card-luxurious p-6 flex flex-col md:flex-row items-center gap-5 bg-gradient-to-l from-[#DFC48E]/10 via-transparent to-transparent border-gold/20">
        <div className="icon-orb !w-14 !h-14 bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white shadow-md shadow-gold/20">
          <ShieldCheck size={24} />
        </div>
        <div className="text-center md:text-right space-y-1">
          <h4 className="font-extrabold text-[#2A1418] text-lg">بوابة الالتزام والمواثيق الإدارية السنوية</h4>
          <p className="text-xs text-gold-dark font-semibold">
            أخي الموجه التربوي: تم إعداد هذه البوابة لتبسيط توقيع التعاميم وميثاق السلوك العمومي وتأكيد التكامل التربوي إلكترونياً والاستغناء الكامل عن الأوراق والإكسيلات.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 1. ميثاق سلوك ونزاهة الموظفين */}
        <div className="card-luxurious p-6 space-y-4 border border-gold/15 transition-all duration-300 relative overflow-hidden">
          <span className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-[#7A1E30]" />
          
          <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-gold/10">
            <div className="flex items-center gap-3">
              <span className="icon-orb !w-9 !h-9 bg-[#5C1523]/5 text-primary"><FileText size={18} /></span>
              <h4 className="font-black text-[#2A1418] text-base">ميثاق سلوك ونزاهة الموظفين العموميين</h4>
            </div>
            {data?.integrityPledge ? (
              <span className="pill px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check size={13} /> تم التوقيع والاعتماد الإلكتروني
              </span>
            ) : (
              <span className="pill px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <AlertCircle size={13} /> بانتظار الاعتماد والتوقيع
              </span>
            )}
          </div>

          {data?.integrityPledge ? (
            <div className="p-6 bg-emerald-600/[0.02] border border-emerald-600/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle2 size={44} className="text-emerald-600" />
              <div>
                <p className="font-extrabold text-[#2A1418] text-base">نشكر التزامك بميثاق سلوك ونزاهة الموظفين!</p>
                <p className="text-xs text-[#7A6A58] mt-1">
                  تم التوقيع إلكترونياً على ميثاق السلوك المهني والنزاهة العمومية المعتمد بوزارة التربية والتعليم والتعليم العالي.
                </p>
                <p className="text-[11px] text-[#A89A92] font-mono mt-2">
                  تاريخ التوقيع المسجل بالباكيند: {new Date(data.updatedAt).toLocaleString("ar-QA")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#5b4a3e] leading-relaxed">
                يرجى قراءة بنود ميثاق النزاهة والسلوك المعتمد من قبل الهيئة الوطنية لتعزيز الشفافية والنزاهة ووزارة العمل للموظفين العموميين بدولة قطر ثم تأكيد الموافقة والتوقيع بالأسفل:
              </p>
              
              <div className="bg-[#FCF9F2]/50 border border-gold/15 rounded-2xl p-4.5 max-h-48 overflow-y-auto text-xs text-[#4b3a32] space-y-3 leading-relaxed font-medium">
                <p className="font-bold text-[#5C1523] text-center border-b border-gold/10 pb-2">بنود وثيقة ميثاق سلوك ونزاهة الموظفين</p>
                <p>1. <strong>أداء الوظيفة بأمانة وإخلاص:</strong> الالتزام التام بالتعليمات والأنظمة واللوائح الوزارية المعمول بها، والسعي الجاد لتعزيز جودة العملية التعليمية للتربية البدنية بالمدارس.</p>
                <p>2. <strong>تجنب تضارب المصالح:</strong> عدم استغلال الوظيفة العامة أو التوجيه التربوي لتحقيق مكاسب شخصية أو مصالح خاصة تتعارض مع مصلحة العمل.</p>
                <p>3. <strong>الالتزام بالحياد والموضوعية:</strong> تقييم المنسقين والمعلمين بالمدارس بناءً على كفاءتهم المهنية وأدائهم الفعلي الميداني دون تحيز أو تفضيل.</p>
                <p>4. <strong>المحافظة على المال العام:</strong> صيانة واستخدام الأجهزة والموارد التابعة للوزارة وقسم التربية البدنية بالشكل القانوني السليم.</p>
                <p>5. <strong>سرية المعلومات والأرشفة:</strong> حظر إفشاء أي بيانات سرية أو خاصة بلجان المقابلات للتوظيف، أو درجات التقييم الشخصية خارج القنوات المخصصة لها.</p>
              </div>

              <button
                onClick={handleSignPledge}
                disabled={signing}
                className="btn-primary w-full py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform duration-200"
              >
                {signing ? (
                  "جارٍ تسجيل التوقيع والاعتماد..."
                ) : (
                  <>
                    <Check size={16} /> أقرّ وأوافق إلكترونياً على بنود ميثاق النزاهة والسلوك
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 2. التكامل مع التربية الإسلامية */}
        <div className="card-luxurious p-6 space-y-4 border border-gold/15 transition-all duration-300 relative overflow-hidden">
          <span className="absolute right-0 top-0 bottom-0 w-1 bg-gold" />
          
          <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-gold/10">
            <div className="flex items-center gap-3">
              <span className="icon-orb !w-9 !h-9 bg-gold/10 text-gold-dark"><ShieldCheck size={18} /></span>
              <h4 className="font-black text-[#2A1418] text-base">التكامل مع مادة التربية الإسلامية في رمضان</h4>
            </div>
            {initialRamadan ? (
              <span className="pill px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check size={13} /> تم تفعيل التكامل
              </span>
            ) : (
              <span className="pill px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                <HelpCircle size={13} /> بانتظار التحديث
              </span>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xs text-[#5b4a3e] leading-relaxed">
              تماشياً مع التعاميم الوزارية الخاصة بتعزيز الهوية والقيم الإسلامية والوطنية خلال شهر رمضان المبارك، يلتزم الموجه التربوي بمتابعة تطبيق معلمي التربية البدنية لآليات الدمج القيمي والتكامل المعرفي مع المفاهيم الإسلامية (كالصبر، القوة البدنية في الإسلام، النظافة الشخصية، والروح الرياضية الأخلاقية).
            </p>

            <div className="bg-[#FCF9F2]/50 border border-gold/10 rounded-2xl p-4.5 space-y-3.5">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={initialRamadan}
                  onChange={(e) => handleUpdateRamadan(e.target.checked)}
                  disabled={savingRamadan}
                  className="accent-primary w-5 h-5 rounded-lg border-gold/30 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs font-extrabold text-[#2A1418] leading-normal">
                    أؤكد بأنه تم توجيه المنسقين والمعلمين في جميع المدارس المسندة إليّ، ومتابعة تفعيل دمج قيم التربية الإسلامية خلال شهر رمضان المبارك بنجاح.
                  </p>
                  <p className="text-[11px] text-[#A89A92] mt-1 leading-normal">
                    بمجرد تحديد هذا الخيار، سيتم تحديث حالة التكامل الرمضاني ديناميكياً لتظهر لدى رئيس القسم في لوحة الإحصائيات الفورية.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-2 animate-in">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
