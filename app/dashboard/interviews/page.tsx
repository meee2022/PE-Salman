"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { Modal, ModalFooter, TxtField, NumField, SelectField, useToast } from "@/components/ui/Modal";
import {
  UserSearch, Shield, Search, SlidersHorizontal, Users, User,
  UserCheck, Check, X, Plus, Edit3, Trash2, Info, Star, Award,
  Phone, Calendar, Clock, BookOpen, AlertCircle
} from "lucide-react";

export default function InterviewsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const interviews = useQuery(api.interviews.list, token ? { token } : "skip");

  const upsertInterview = useMutation(api.interviews.upsert);
  const removeInterview = useMutation(api.interviews.remove);
  const { show: showToast, node: toastNode } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const blankForm = {
    personalId: "",
    name: "",
    gender: "male" as "male" | "female",
    nationality: "قطري",
    jobTitle: "أخصائي توجيه بدني",
    phone: "",
    appointment: "",
    interviewDate: new Date().toISOString().split("T")[0],
    status: "قيد التقييم",
    notes: "",
    scorePersonal: 0,
    scoreScientific: 0,
    scorePlanning: 0,
    scoreLeadership: 0,
    committeeRecommendation: "",
  };

  const [form, setForm] = useState(blankForm);

  const scoreTotal = form.scorePersonal + form.scoreScientific + form.scorePlanning + form.scoreLeadership;

  const filteredInterviews = useMemo(() => {
    if (!interviews) return [];
    return interviews.filter((r) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        (r.jobTitle && r.jobTitle.toLowerCase().includes(query)) ||
        (r.nationality && r.nationality.toLowerCase().includes(query)) ||
        (r.personalId && r.personalId.includes(query)) ||
        (r.phone && r.phone.includes(query));

      const matchesGender = selectedGender === "all" || r.gender === selectedGender;
      const matchesStatus = selectedStatus === "all" || r.status === selectedStatus;
      return matchesSearch && matchesGender && matchesStatus;
    });
  }, [interviews, searchQuery, selectedGender, selectedStatus]);

  if (interviews === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  if (interviews === null) {
    return (
      <>
        <PageHeader title="مقابلات التوظيف" icon={<UserSearch size={26} />} />
        <div className="card-luxurious p-12 text-center text-[#A89A92] text-sm animate-in mt-6">
          هذه البيانات حساسة ومتاحة لإدارة التوجيه فقط.
        </div>
      </>
    );
  }

  const maleCount = interviews.filter((r) => r.gender === "male").length;
  const femaleCount = interviews.filter((r) => r.gender === "female").length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm(blankForm);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      personalId: item.personalId || "",
      name: item.name || "",
      gender: item.gender || "male",
      nationality: item.nationality || "",
      jobTitle: item.jobTitle || "",
      phone: item.phone || "",
      appointment: item.appointment || "",
      interviewDate: item.interviewDate || "",
      status: item.status || "قيد التقييم",
      notes: item.notes || "",
      scorePersonal: item.scorePersonal || 0,
      scoreScientific: item.scoreScientific || 0,
      scorePlanning: item.scorePlanning || 0,
      scoreLeadership: item.scoreLeadership || 0,
      committeeRecommendation: item.committeeRecommendation || "",
    });
    setFormOpen(true);
  };

  const handleOpenDetails = (item: any) => {
    setViewingItem(item);
    setDetailsOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("الرجاء إدخال اسم المتقدم");
      return;
    }
    if (!form.personalId.trim()) {
      alert("الرجاء إدخال الرقم الشخصي");
      return;
    }
    setSaving(true);
    try {
      await upsertInterview({
        token: token || "",
        ...form,
        scoreTotal,
      });
      showToast(editingItem ? "تم تحديث بيانات المقابلة بنجاح" : "تم إضافة مقابلة توظيف جديدة بنجاح");
      setFormOpen(false);
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: any, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مقابلة المتقدم: ${name}؟`)) return;
    try {
      await removeInterview({
        token: token || "",
        id,
      });
      showToast("تم حذف المقابلة بنجاح");
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء الحذف");
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    const s = status || "قيد التقييم";
    if (s === "مقبول") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "مرفوض") return "bg-rose-50 text-rose-700 border-rose-200";
    if (s === "احتياط") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-stone-50 text-stone-700 border-stone-200";
  };

  return (
    <div className="space-y-6">
      {toastNode}

      <PageHeader
        title="مقابلات التوظيف"
        subtitle={`${interviews.length} مقابلة مسجّلة للمتقدمين لوظائف التوجيه البدني`}
        icon={<UserSearch size={26} />}
        action={
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="btn-primary flex items-center gap-1.5 shadow-md shrink-0"
              >
                <Plus size={16} />
                <span>إضافة مقابلة جديدة</span>
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 text-xs bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] border border-gold/20 text-[#DFC48E] px-4 py-2.5 rounded-2xl backdrop-blur-sm shadow-md animate-in">
              <Shield size={14} className="text-gold animate-pulse" />
              <span>بيانات حساسة — صلاحية الإدارة فقط</span>
            </div>
          </div>
        }
      />

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in">
        <KpiCard
          title="إجمالي المقابلات"
          value={interviews.length}
          sub="كافة المتقدمين للتوظيف"
          icon={<Users size={20} />}
          color="primary"
          delay={50}
        />
        <KpiCard
          title="المتقدمون (ذكور)"
          value={maleCount}
          sub={`${interviews.length ? Math.round((maleCount / interviews.length) * 100) : 0}% من الإجمالي`}
          icon={<UserCheck size={20} className="text-sky-500" />}
          color="blue"
          delay={100}
        />
        <KpiCard
          title="المتقدمات (إناث)"
          value={femaleCount}
          sub={`${interviews.length ? Math.round((femaleCount / interviews.length) * 100) : 0}% من الإجمالي`}
          icon={<User size={20} className="text-rose-500" />}
          color="gold"
          delay={150}
        />
      </div>

      {/* فلتر البحث والتنقية */}
      <div className="card-luxurious p-4 animate-in">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/50 w-4 h-4" />
            <input
              type="text"
              placeholder="ابحث باسم المتقدم، الهاتف، المسمى، أو رقم الهوية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FCF9F2]/70 text-[#2A1418] border border-gold/25 focus:border-[#5C1523] focus:ring-1 focus:ring-[#5C1523] placeholder:text-stone-400 text-xs font-semibold pr-10 pl-4 py-3 rounded-2xl transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-primary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
            {/* تصفية الحالة */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#5C1523] whitespace-nowrap">الحالة:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-[#FCF9F2] text-[#2A1418] border border-gold/20 text-[11px] font-extrabold px-3 py-1.5 rounded-xl outline-none"
              >
                <option value="all">الكل</option>
                <option value="قيد التقييم">قيد التقييم</option>
                <option value="مقبول">مقبول</option>
                <option value="مرفوض">مرفوض</option>
                <option value="احتياط">احتياط</option>
              </select>
            </div>

            {/* تصفية الجنس */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#5C1523] whitespace-nowrap">الجنس:</span>
              <div className="flex bg-[#FCF9F2] p-1 rounded-xl border border-gold/15 shadow-sm">
                <button
                  onClick={() => setSelectedGender("all")}
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all duration-200 ${
                    selectedGender === "all"
                      ? "bg-[#5C1523] text-white shadow-sm"
                      : "text-[#5C1523]/70 hover:text-[#5C1523]"
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSelectedGender("male")}
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all duration-200 ${
                    selectedGender === "male"
                      ? "bg-[#5C1523] text-white shadow-sm"
                      : "text-[#5C1523]/70 hover:text-[#5C1523]"
                  }`}
                >
                  ذكور
                </button>
                <button
                  onClick={() => setSelectedGender("female")}
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all duration-200 ${
                    selectedGender === "female"
                      ? "bg-[#5C1523] text-white shadow-sm"
                      : "text-[#5C1523]/70 hover:text-[#5C1523]"
                  }`}
                >
                  إناث
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* جدول البيانات */}
      {filteredInterviews.length > 0 ? (
        <div className="glass-table-container animate-in">
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th className="text-right pr-6 py-4.5 text-xs font-extrabold text-[#5C1523]">اسم المتقدم</th>
                  <th className="text-center py-4.5 text-xs font-extrabold text-[#5C1523]">الجنس</th>
                  <th className="text-center py-4.5 text-xs font-extrabold text-[#5C1523]">الجنسية</th>
                  <th className="text-right py-4.5 text-xs font-extrabold text-[#5C1523]">المسمى الوظيفي</th>
                  <th className="text-center py-4.5 text-xs font-extrabold text-[#5C1523]">المجموع</th>
                  <th className="text-center py-4.5 text-xs font-extrabold text-[#5C1523]">الحالة</th>
                  <th className="text-center py-4.5 text-xs font-extrabold text-[#5C1523]">تاريخ المقابلة</th>
                  <th className="text-center pl-6 py-4.5 text-xs font-extrabold text-[#5C1523]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.map((r) => (
                  <tr key={r._id} className="hover:bg-gold/5 transition-colors duration-150 border-b border-gold/10 last:border-b-0">
                    <td className="font-extrabold text-[#2A1418] pr-6 py-4.5 text-xs">
                      <button
                        onClick={() => handleOpenDetails(r)}
                        className="hover:underline hover:text-primary text-right font-black"
                      >
                        {r.name}
                      </button>
                    </td>
                    <td className="text-center py-4.5">
                      <span
                        className={`inline-flex items-center justify-center font-extrabold px-3 py-1 rounded-full text-[10px] tracking-wide shadow-sm border ${
                          r.gender === "male"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {r.gender === "male" ? "ذكر" : "أنثى"}
                      </span>
                    </td>
                    <td className="text-center py-4.5 text-stone-600 font-bold text-xs">{r.nationality ?? "—"}</td>
                    <td className="text-[#5C1523] font-extrabold text-xs py-4.5 text-right">{r.jobTitle ?? "—"}</td>
                    <td className="text-center py-4.5 font-bold">
                      {r.scoreTotal !== undefined ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                          r.scoreTotal >= 85 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          r.scoreTotal >= 70 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          "bg-stone-50 text-stone-700 border border-stone-100"
                        }`}>
                          {r.scoreTotal}
                        </span>
                      ) : (
                        <span className="text-stone-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="text-center py-4.5">
                      <span className={`inline-flex items-center justify-center font-extrabold px-2.5 py-1 rounded-full text-[10px] border shadow-sm ${getStatusBadgeClass(r.status)}`}>
                        {r.status || "قيد التقييم"}
                      </span>
                    </td>
                    <td className="text-center py-4.5 text-stone-500 font-bold text-[11px]">{r.interviewDate ?? "—"}</td>
                    <td className="text-center pl-6 py-4.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDetails(r)}
                          className="p-1.5 rounded-xl hover:bg-gold/10 text-stone-600 hover:text-[#5C1523] transition-colors"
                          title="تفاصيل الدرجات والتوصيات"
                        >
                          <Info size={15} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 rounded-xl hover:bg-gold/10 text-stone-600 hover:text-emerald-700 transition-colors"
                              title="تعديل المقابلة"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(r._id, r.name)}
                              className="p-1.5 rounded-xl hover:bg-red-50 text-stone-600 hover:text-red-700 transition-colors"
                              title="حذف المقابلة"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-luxurious p-12 text-center text-stone-500 text-sm animate-in flex flex-col items-center justify-center gap-2.5">
          <UserSearch className="w-10 h-10 text-gold/60 animate-pulse" />
          <p className="font-extrabold text-[#5C1523] text-sm mt-2">لا توجد نتائج مطابقة</p>
          <p className="text-xs text-stone-400">جرّب البحث بكلمة مفتاحية أخرى أو تغيير فلترة الحالة والجنس</p>
        </div>
      )}

      {/* ───────────────────────── مودال تفاصيل المقابلة (Details Modal) ───────────────────────── */}
      {detailsOpen && viewingItem && (
        <Modal title={`بيانات المتقدم: ${viewingItem.name}`} onClose={() => setDetailsOpen(false)} wide>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* القسم الأيمن: التفاصيل الأساسية */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-[#5C1523] border-b border-gold/15 pb-1 flex items-center gap-2 text-xs">
                  <User size={14} className="text-gold" />
                  البيانات الشخصية والإجرائية
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <p className="text-[#A89A92] mb-0.5">الرقم الشخصي (الهوية)</p>
                    <p className="text-[#2A1418] font-mono">{viewingItem.personalId}</p>
                  </div>
                  <div>
                    <p className="text-[#A89A92] mb-0.5">رقم الهاتف</p>
                    <p className="text-[#2A1418] font-mono">{viewingItem.phone ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#A89A92] mb-0.5">الجنسية</p>
                    <p className="text-[#2A1418]">{viewingItem.nationality ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#A89A92] mb-0.5">الجنس</p>
                    <p className="text-[#2A1418]">{viewingItem.gender === "male" ? "ذكر" : "أنثى"}</p>
                  </div>
                  <div>
                    <p className="text-[#A89A92] mb-0.5">المسمى المستهدف</p>
                    <p className="text-primary font-bold">{viewingItem.jobTitle ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#A89A92] mb-0.5">حالة التقييم</p>
                    <span className={`inline-flex items-center justify-center font-extrabold px-2.5 py-0.5 rounded-full border text-[10px] mt-0.5 ${getStatusBadgeClass(viewingItem.status)}`}>
                      {viewingItem.status || "قيد التقييم"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#A89A92] mb-0.5">تاريخ المقابلة</p>
                    <p className="text-[#2A1418] flex items-center gap-1.5">
                      <Calendar size={12} className="text-gold-dark" />
                      {viewingItem.interviewDate ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#A89A92] mb-0.5">موعد المقابلة</p>
                    <p className="text-[#2A1418] flex items-center gap-1.5">
                      <Clock size={12} className="text-gold-dark" />
                      {viewingItem.appointment ?? "—"}
                    </p>
                  </div>
                </div>

                {viewingItem.notes && (
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-xs">
                    <p className="font-extrabold text-[#7A6A58] mb-1">ملاحظات عامة</p>
                    <p className="text-[#2A1418] leading-relaxed whitespace-pre-wrap">{viewingItem.notes}</p>
                  </div>
                )}
              </div>

              {/* القسم الأيسر: تقرير الدرجات والتقييم اللجني */}
              <div className="bg-gold/5 p-4 rounded-2xl border border-gold/15 space-y-4">
                <h4 className="font-extrabold text-[#5C1523] border-b border-gold/15 pb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Award size={14} className="text-gold" />
                    كشف درجات التقييم (من 100)
                  </span>
                  {viewingItem.scoreTotal !== undefined && (
                    <span className="bg-[#5C1523] text-[#DFC48E] px-2.5 py-0.5 rounded-lg font-mono font-black">
                      المجموع: {viewingItem.scoreTotal} / 100
                    </span>
                  )}
                </h4>

                <div className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[#2A1418]">الكفاية الشخصية والسمات (25 درجة)</span>
                      <span className="font-mono text-primary">{viewingItem.scorePersonal ?? 0}</span>
                    </div>
                    <div className="h-1.5 bg-[#2A1418]/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${((viewingItem.scorePersonal ?? 0) / 25) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[#2A1418]">الكفاية العلمية والمهنية (25 درجة)</span>
                      <span className="font-mono text-primary">{viewingItem.scoreScientific ?? 0}</span>
                    </div>
                    <div className="h-1.5 bg-[#2A1418]/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${((viewingItem.scoreScientific ?? 0) / 25) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[#2A1418]">مهارات التخطيط والتحليل (25 درجة)</span>
                      <span className="font-mono text-primary">{viewingItem.scorePlanning ?? 0}</span>
                    </div>
                    <div className="h-1.5 bg-[#2A1418]/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${((viewingItem.scorePlanning ?? 0) / 25) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[#2A1418]">المهارات القيادية والإشرافية (25 درجة)</span>
                      <span className="font-mono text-primary">{viewingItem.scoreLeadership ?? 0}</span>
                    </div>
                    <div className="h-1.5 bg-[#2A1418]/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${((viewingItem.scoreLeadership ?? 0) / 25) * 100}%` }} />
                    </div>
                  </div>
                </div>

                {viewingItem.committeeRecommendation && (
                  <div className="bg-[#5C1523]/5 p-3 rounded-xl border border-[#5C1523]/10 text-xs mt-2">
                    <p className="font-extrabold text-[#5C1523] flex items-center gap-1.5 mb-1">
                      <Star size={12} className="text-gold" />
                      توصية اللجنة النهائية
                    </p>
                    <p className="text-[#2A1418] leading-relaxed whitespace-pre-wrap">{viewingItem.committeeRecommendation}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-gold/10">
              <button onClick={() => setDetailsOpen(false)} className="btn-primary px-6">إغلاق</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────── مودال إضافة وتعديل المقابلة (Form Modal) ───────────────────────── */}
      {formOpen && (
        <Modal
          title={editingItem ? `تعديل المقابلة للمتقدم: ${editingItem.name}` : "إضافة مقابلة توظيف جديدة"}
          onClose={() => setFormOpen(false)}
          wide
        >
          <div className="p-1 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
              {/* العمود الأيمن: البيانات الأساسية للمتقدم */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-[#5C1523] border-b border-gold/15 pb-1 text-xs flex items-center gap-1.5">
                  <User size={14} className="text-gold" />
                  بيانات المتقدم الأساسية
                </h4>

                <TxtField
                  label="الاسم الكامل للمتقدم"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="الاسم الثلاثي أو الرباعي"
                  required
                />

                <TxtField
                  label="رقم الهوية الشخصية (الرقم القومي)"
                  value={form.personalId}
                  onChange={(v) => setForm({ ...form, personalId: v })}
                  placeholder="11 خانة رقمية"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="الجنس"
                    value={form.gender}
                    onChange={(v) => setForm({ ...form, gender: v })}
                    options={[
                      ["male", "ذكر"],
                      ["female", "أنثى"],
                    ] as const}
                  />
                  <TxtField
                    label="الجنسية"
                    value={form.nationality}
                    onChange={(v) => setForm({ ...form, nationality: v })}
                    placeholder="مثال: قطري"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TxtField
                    label="المسمى المستهدف"
                    value={form.jobTitle}
                    onChange={(v) => setForm({ ...form, jobTitle: v })}
                  />
                  <TxtField
                    label="رقم الهاتف للتواصل"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                    placeholder="رقم الهاتف"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TxtField
                    label="موعد المقابلة"
                    value={form.appointment}
                    onChange={(v) => setForm({ ...form, appointment: v })}
                    placeholder="مثال: 9:00 صباحاً"
                  />
                  <TxtField
                    label="تاريخ المقابلة"
                    value={form.interviewDate}
                    onChange={(v) => setForm({ ...form, interviewDate: v })}
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <SelectField
                  label="حالة الطلب"
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={[
                    ["قيد التقييم", "قيد التقييم"],
                    ["مقبول", "مقبول"],
                    ["مرفوض", "مرفوض"],
                    ["احتياط", "احتياط"],
                  ] as const}
                />
              </div>

              {/* العمود الأيسر: تقييم الدرجات اللجني والتوصيات */}
              <div className="bg-gold/5 p-4 rounded-2xl border border-gold/15 space-y-4 self-start">
                <h4 className="font-extrabold text-[#5C1523] border-b border-gold/15 pb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Award size={14} className="text-gold" />
                    رصد درجات اللجان (من 100)
                  </span>
                  <span className="bg-[#5C1523] text-[#DFC48E] px-2.5 py-0.5 rounded-lg font-mono font-black text-xs">
                    المجموع الحالي: {scoreTotal} / 100
                  </span>
                </h4>

                <div className="grid grid-cols-2 gap-3.5">
                  <NumField
                    label="الكفاية الشخصية والسمات (من 25)"
                    value={form.scorePersonal}
                    onChange={(v) => setForm({ ...form, scorePersonal: Math.min(25, Math.max(0, v)) })}
                  />
                  <NumField
                    label="الكفاية العلمية والمهنية (من 25)"
                    value={form.scoreScientific}
                    onChange={(v) => setForm({ ...form, scoreScientific: Math.min(25, Math.max(0, v)) })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <NumField
                    label="مهارات التخطيط والتحليل (من 25)"
                    value={form.scorePlanning}
                    onChange={(v) => setForm({ ...form, scorePlanning: Math.min(25, Math.max(0, v)) })}
                  />
                  <NumField
                    label="المهارات القيادية والإشرافية (من 25)"
                    value={form.scoreLeadership}
                    onChange={(v) => setForm({ ...form, scoreLeadership: Math.min(25, Math.max(0, v)) })}
                  />
                </div>

                <TxtField
                  label="توصية اللجنة النهائية المباشرة"
                  value={form.committeeRecommendation}
                  onChange={(v) => setForm({ ...form, committeeRecommendation: v })}
                  placeholder="توصيات إدارية لقرار اللجنة النهائي"
                />

                <TxtField
                  label="ملاحظات عامة"
                  value={form.notes}
                  onChange={(v) => setForm({ ...form, notes: v })}
                  placeholder="ملاحظات توثيقية إضافية"
                />

                {scoreTotal > 0 && (
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                    scoreTotal >= 85 ? "bg-emerald-50 text-emerald-700 border-emerald-150" :
                    scoreTotal >= 70 ? "bg-amber-50 text-amber-700 border-amber-150" :
                    "bg-rose-50 text-rose-700 border-rose-150"
                  }`}>
                    <AlertCircle size={15} />
                    <span>
                      {scoreTotal >= 85 ? "المرشح ممتاز ويقع في الفئة الاستثنائية للتعيين." :
                       scoreTotal >= 70 ? "المرشح جيد ويحتاج لبعض مجالات التطوير." :
                       "المرشح أقل من التوقعات المطلوبة ولا يوصى بالتعيين حالياً."}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <ModalFooter
              onClose={() => setFormOpen(false)}
              onSave={handleSave}
              saving={saving}
              disabled={!form.name.trim() || !form.personalId.trim()}
              saveLabel={editingItem ? "حفظ التعديلات" : "إضافة وحفظ"}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
