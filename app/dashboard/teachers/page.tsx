"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, TxtField, SelectField, useToast } from "@/components/ui/Modal";
import {
  Search, Plus, Pencil, Trash2, Users, Download, ArrowUpDown, ChevronDown,
  LayoutGrid, List, Upload, Phone, Mail, MessageCircle, AlertCircle, Info, FileSpreadsheet, Check, X
} from "lucide-react";

type TeacherForm = {
  id?: Id<"teachers">;
  schoolCode: string;
  schoolName: string;
  level: string;
  supervisorName: string;
  name: string;
  jobTitle: string;
  classification: string;
  personalId: string;
  employeeId: string;
  joinDate: string;
  gender: "male" | "female";
  nationality: string;
  mobile: string;
  email: string;
};

const emptyTeacher: TeacherForm = {
  schoolCode: "",
  schoolName: "",
  level: "ابتدائي بنات",
  supervisorName: "",
  name: "",
  jobTitle: "معلم تربية رياضية",
  classification: "عام",
  personalId: "",
  employeeId: "",
  joinDate: "",
  gender: "female",
  nationality: "قطري",
  mobile: "",
  email: "",
};

const CLASSIFICATIONS = [
  ["عام", "عام"],
  ["مكثف", "مكثف"],
  ["تطوير ذاتي", "تطوير ذاتي"],
] as const;

const GENDERS = [
  ["female", "أنثى (بنات)"],
  ["male", "ذكر (بنين)"],
] as const;

const LEVELS = [
  ["ابتدائي بنات", "ابتدائي بنات"],
  ["ابتدائي بنين", "ابتدائي بنين"],
  ["نموذجي", "نموذجي"],
  ["اعدادي بنات", "اعدادي بنات"],
  ["اعدادي بنين", "اعدادي بنين"],
  ["ثانوي بنات", "ثانوي بنات"],
  ["ثانوي بنين", "ثانوي بنين"],
  ["مشتركة", "مشتركة"],
] as const;

export default function TeachersPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isSupervisor = user?.role === "supervisor";
  const canManage = isAdmin || isSupervisor; // تم إلغاء القفل للقراءة فقط للموجهين كما طلب المستخدم

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // الفلاتر
  const [search, setSearch] = useState("");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  // استعلام المعلمين
  const teachers = useQuery(
    api.teachers.list,
    token
      ? {
          supervisorName: supervisorFilter !== "all" ? supervisorFilter : undefined,
          classification: classFilter !== "all" ? classFilter : undefined,
          level: levelFilter !== "all" ? levelFilter : undefined,
          gender: genderFilter !== "all" ? genderFilter : undefined,
          searchQuery: search || undefined,
        }
      : "skip"
  );

  // استعلام الموجهين للخيارات
  const supervisors = useQuery(api.supervisors.list, token ? { token } : "skip");

  // العمليات
  const createTeacher = useMutation(api.teachers.create);
  const updateTeacher = useMutation(api.teachers.update);
  const removeTeacher = useMutation(api.teachers.remove);
  const bulkImportMutation = useMutation(api.teachers.bulkImport);

  const { show: showToast, node: toastNode } = useToast();

  // إدارة النوافذ المنبثقة
  const [form, setForm] = useState<TeacherForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState(30);

  // نافذة الاستيراد الجماعي
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supervisorOptions = useMemo(() => {
    if (!supervisors) return [["", "اختر الموجه المسؤول"] as const];
    return [
      ["", "اختر الموجه المسؤول"] as const,
      ...supervisors.map((s) => [s.name, s.name] as const),
    ];
  }, [supervisors]);

  const supervisorFilterOptions = useMemo(() => {
    if (!supervisors) return [["all", "كل الموجهين"] as const];
    return [
      ["all", "كل الموجهين"] as const,
      ...supervisors.map((s) => [s.name, s.name] as const),
    ];
  }, [supervisors]);

  // حفظ المعلم
  async function handleSave() {
    if (!form) return;
    if (!form.name.trim() || !form.personalId.trim() || !form.employeeId.trim()) {
      alert("يرجى ملء جميع الحقول المطلوبة (الاسم الكامل، الرقم الشخصي، الرقم الوظيفي)");
      return;
    }

    setSaving(true);
    try {
      const data = {
        schoolCode: form.schoolCode || "غير محدد",
        schoolName: form.schoolName || "غير محدد",
        level: form.level,
        supervisorName: form.supervisorName || "غير محدد",
        name: form.name,
        jobTitle: form.jobTitle || "معلم تربية رياضية",
        classification: form.classification,
        personalId: form.personalId,
        employeeId: form.employeeId,
        joinDate: form.joinDate || undefined,
        gender: form.gender,
        nationality: form.nationality || "قطري",
        mobile: form.mobile || "",
        email: form.email || "",
      };

      if (form.id) {
        await updateTeacher({
          id: form.id,
          ...data,
          isActive: true,
        });
        showToast("تم تحديث بيانات المعلم بنجاح");
      } else {
        await createTeacher(data);
        showToast("تمت إضافة المعلم بنجاح");
      }
      setForm(null);
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء حفظ المعلم");
    } finally {
      setSaving(false);
    }
  }

  // حذف المعلم
  async function handleDelete(id: Id<"teachers">, name: string) {
    if (!confirm(`هل أنت متأكد من حذف المعلم "${name}" نهائياً من النظام؟`)) return;
    try {
      await removeTeacher({ id });
      showToast("تم حذف المعلم بنجاح");
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء الحذف");
    }
  }

  // تصدير المعلمين الحاليين كـ CSV
  function handleExport() {
    if (!teachers || teachers.length === 0) return;
    const headers = [
      "اسم المعلم",
      "الرقم الشخصي",
      "الرقم الوظيفي",
      "المسمى الوظيفي",
      "التصنيف",
      "المدرسة",
      "كود المدرسة",
      "المرحلة",
      "الموجه المسؤول",
      "الجنس",
      "الجنسية",
      "رقم الجوال",
      "البريد الإلكتروني",
      "تاريخ التعيين",
    ];

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...teachers.map((t) =>
          [
            `"${t.name}"`,
            `"${t.personalId}"`,
            `"${t.employeeId}"`,
            `"${t.jobTitle}"`,
            `"${t.classification}"`,
            `"${t.schoolName}"`,
            `"${t.schoolCode}"`,
            `"${t.level}"`,
            `"${t.supervisorName}"`,
            `"${t.gender === "female" ? "أنثى" : "ذكر"}"`,
            `"${t.nationality}"`,
            `"${t.mobile}"`,
            `"${t.email}"`,
            `"${t.joinDate || ""}"`,
          ].join(",")
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `معلمو_التربية_البدنية_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // معالجة ملف الاستيراد
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const records = parseAndMapCSV(text);
        if (records.length === 0) {
          setImportError("الملف فارغ أو لا يحتوي على أعمدة متوافقة.");
        } else {
          setParsedRecords(records);
        }
      } catch (err: any) {
        setImportError("حدث خطأ أثناء معالجة الملف. تأكد من أنه ملف CSV صالح مرمز بـ UTF-8.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  // تحليل ملف CSV ورسم البيانات إلكترونياً بدقة
  function parseAndMapCSV(text: string) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    // تنظيف الهيدرز وإزالة علامات الاقتباس
    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    
    // القاموس الذكي للمطابقة العربية والإنجليزية
    const keyMap: Record<string, string[]> = {
      name: ["اسم المعلم", "اسم المنسق", "الاسم الكامل", "الاسم", "name", "full name", "teacher name"],
      personalId: ["الرقم الشخصي", "الهوية", "الرقم القومي", "الهوية المدنية", "personalid", "personal id", "national id", "personal_id"],
      employeeId: ["الرقم الوظيفي", "رقم الموظف", "employeeid", "employee id", "employee_id"],
      jobTitle: ["المسمى الوظيفي", "الوظيفة", "job title", "jobtitle", "job_title", "job"],
      classification: ["التصنيف", "تصنيف المعلم", "تصنيف", "classification", "class"],
      schoolName: ["المدرسة", "اسم المدرسة", "school name", "schoolname", "school_name", "school"],
      schoolCode: ["كود المدرسة", "رمز المدرسة", "كود", "school code", "schoolcode", "school_code", "code"],
      level: ["المرحلة", "مرحلة المدرسة", "المرحلة الدراسية", "level", "stage", "grade"],
      supervisorName: ["الموجه المسؤول", "الموجه", "الموجه التربوي", "supervisor", "supervisor name", "supervisor_name"],
      gender: ["الجنس", "النوع", "الفئة", "gender", "sex"],
      nationality: ["الجنسية", "البلد", "nationality"],
      mobile: ["رقم الجوال", "الجوال", "الهاتف", "رقم الهاتف", "mobile", "phone", "mobile number"],
      email: ["البريد الإلكتروني", "البريد", "البريد الالكتروني", "email", "mail"],
      joinDate: ["تاريخ التعيين", "تاريخ التوظيف", "تاريخ الالتحاق", "join date", "joindate", "join_date"],
    };

    // إيجاد الفهرس المطابق لكل حقل
    const mappedIndexes: Record<string, number> = {};
    Object.keys(keyMap).forEach((fieldKey) => {
      const matchTerms = keyMap[fieldKey];
      const index = headers.findIndex(h => 
        matchTerms.some(term => h.toLowerCase() === term.toLowerCase() || h.includes(term))
      );
      if (index !== -1) {
        mappedIndexes[fieldKey] = index;
      }
    });

    const parsed: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // تقسيم الأسطر مع مراعاة علامات الاقتباس لتجنب انقسام النصوص المحتوية على فواصل
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ""));

      // بناء المعلم الفردي
      const getVal = (field: string) => {
        const index = mappedIndexes[field];
        return index !== undefined && values[index] ? values[index] : "";
      };

      const name = getVal("name");
      const personalId = getVal("personalId");
      const employeeId = getVal("employeeId");

      // الحقول الأساسية يجب أن تتوفر لحفظ السجل
      if (!name || !personalId || !employeeId) continue;

      const rawGender = getVal("gender").toLowerCase();
      const rawLevel = getVal("level");
      
      // التخمين الذكي للجنس والمستوى
      let gender: "male" | "female" = "female";
      if (rawGender.includes("ذكر") || rawGender.includes("بنين") || rawGender.includes("male")) {
        gender = "male";
      } else if (rawLevel.includes("بنين") || rawLevel.includes("نموذجي")) {
        gender = "male";
      }

      parsed.push({
        schoolCode: getVal("schoolCode") || "غير محدد",
        schoolName: getVal("schoolName") || "غير محدد",
        level: rawLevel || "ابتدائي بنات",
        supervisorName: getVal("supervisorName") || "غير محدد",
        name,
        jobTitle: getVal("jobTitle") || "معلم تربية رياضية",
        classification: getVal("classification") || "عام",
        personalId,
        employeeId,
        joinDate: getVal("joinDate") || undefined,
        gender,
        nationality: getVal("nationality") || "قطري",
        mobile: getVal("mobile") || "",
        email: getVal("email") || "",
      });
    }

    return parsed;
  }

  // إرسال البيانات المجمعة للباكيند
  async function executeBulkImport() {
    if (parsedRecords.length === 0) return;
    setImporting(true);
    try {
      const count = await bulkImportMutation({ teachers: parsedRecords });
      showToast(`تم استيراد وتحديث عدد ${count} معلم بنجاح!`);
      setShowImportModal(false);
      setParsedRecords([]);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء رفع المعلمين للباكيند.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="دليل معلمي التربية البدنية"
        subtitle="رقمنة وإدارة شاملة لبيانات 929 معلماً ومنسقاً في مدارس دولة قطر والاستغناء التام عن ملفات الإكسيل"
        icon={<Users size={26} />}
        action={
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-xs" title="تصدير كـ CSV">
              <Download size={14} /> تصدير البيانات
            </button>
            {canManage && (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="btn-secondary !bg-gold/15 !border-gold/30 hover:!bg-gold/25 text-gold-dark flex items-center gap-1.5 text-xs font-bold"
                  title="استيراد المعلمين من ملف إكسيل"
                >
                  <Upload size={14} /> استيراد جماعي (CSV)
                </button>
                <button onClick={() => setForm(emptyTeacher)} className="btn-primary flex items-center gap-1.5 text-xs font-bold">
                  <Plus size={14} /> إضافة معلم جديد
                </button>
              </>
            )}
          </div>
        }
      />

      {/* شريط البحث والفلاتر الفورية */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-gold/10 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-xs font-extrabold text-primary">محرك البحث الذكي والتصفية</p>
          </div>
          {/* تبديل العرض المبتكر */}
          <div className="flex gap-1 bg-[#FCF9F2]/60 rounded-xl p-1 border border-gold/20 no-print">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#7A6A58] hover:bg-gold/10"
              }`}
              title="عرض كروت شبكية"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#7A6A58] hover:bg-gold/10"
              }`}
              title="عرض جدول شفاف"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* البحث بالاسم أو الرقم */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A89A92]" size={15} />
            <input
              type="text"
              placeholder="ابحث بالاسم، الرقم الشخصي أو المدرسة..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(30);
              }}
              className="field pr-10 w-full text-xs font-semibold"
            />
          </div>

          {/* فلتر الموجهين */}
          <div>
            <select
              value={supervisorFilter}
              onChange={(e) => {
                setSupervisorFilter(e.target.value);
                setLimit(30);
              }}
              className="field w-full text-xs font-bold bg-white"
            >
              {supervisorFilterOptions.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر التصنيف */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setLimit(30);
              }}
              className="field w-full text-xs font-bold bg-white"
            >
              <option value="all">كل التصنيفات</option>
              <option value="عام">عام</option>
              <option value="مكثف">مكثف</option>
              <option value="تطوير ذاتي">تطوير ذاتي</option>
            </select>
          </div>

          {/* فلتر المراحل */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setLimit(30);
              }}
              className="field w-full text-xs font-bold bg-white"
            >
              <option value="all">كل المراحل</option>
              {LEVELS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر الجنس */}
          <div>
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setLimit(30);
              }}
              className="field w-full text-xs font-bold bg-white"
            >
              <option value="all">جميع الفئات</option>
              <option value="female">إناث (مدارس البنات)</option>
              <option value="male">ذكور (مدارس البنين)</option>
            </select>
          </div>
        </div>
      </div>

      {/* الحالة الخاصة بالتحميل والبحث */}
      {!teachers ? (
        <div className="card-luxurious p-12 text-center text-[#A89A92]">
          <div className="w-9 h-9 rounded-full border-3 border-gold/30 border-t-gold animate-spin mx-auto mb-3" />
          <p className="font-extrabold text-sm text-[#2A1418]">جاري جلب وتحديث قاعدة بيانات المعلمين الفورية...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="card-luxurious p-12 text-center text-[#A89A92] space-y-2 border border-dashed border-gold/20">
          <AlertCircle className="mx-auto text-gold/60" size={32} />
          <p className="font-extrabold text-sm text-[#2A1418]">لم يتم العثور على معلمين يطابقون خيارات البحث المحددة.</p>
          <p className="text-xs text-[#7A6A58]">جرب تغيير فلاتر البحث أو إضافة معلم جديد لتنشيط النظام.</p>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            /* 1. العرض الشبكي (Grid View) - كروت ملكية فاخرة */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in">
              {teachers.slice(0, limit).map((t) => (
                <div key={t._id} className="card-luxurious relative overflow-hidden p-5 flex flex-col justify-between hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group border border-gold/10 hover:border-gold/30">
                  <span className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-[#7A1E30]" />
                  
                  {/* ترويسة الكارت */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="icon-orb !w-11 !h-11 bg-gradient-to-br from-[#FCF9F2] to-[#DFC48E]/20 text-[#5C1523] border border-gold/25 font-black text-sm shadow-inner shrink-0">
                        {t.name.trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-[#2A1418] text-sm group-hover:text-primary transition-colors leading-snug truncate max-w-[170px]" title={t.name}>
                          {t.name}
                        </p>
                        <p className="text-[10px] font-bold text-[#7A6A58] mt-0.5">{t.jobTitle}</p>
                      </div>
                    </div>

                    {/* أزرار التحكم السريعة للمخولين */}
                    {canManage && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                        <button
                          onClick={() =>
                            setForm({
                              id: t._id,
                              schoolCode: t.schoolCode,
                              schoolName: t.schoolName,
                              level: t.level,
                              supervisorName: t.supervisorName,
                              name: t.name,
                              jobTitle: t.jobTitle,
                              classification: t.classification,
                              personalId: t.personalId,
                              employeeId: t.employeeId,
                              joinDate: t.joinDate || "",
                              gender: t.gender,
                              nationality: t.nationality,
                              mobile: t.mobile,
                              email: t.email,
                            })
                          }
                          className="p-1.5 text-[#7A6A58] hover:text-white hover:bg-gold-dark/20 rounded-lg transition-colors border border-transparent hover:border-gold/30"
                          title="تعديل البيانات"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(t._id, t.name)}
                          className="p-1.5 text-red-500 hover:text-white hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف نهائي"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* تفاصيل المعلم والمدرسة */}
                  <div className="mt-4 space-y-2.5">
                    <div className="bg-[#FCF9F2]/40 rounded-xl p-3 border border-gold/10 space-y-1.5">
                      <p className="text-xs font-extrabold text-primary flex items-center gap-1.5 leading-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                        {t.schoolName}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#A89A92] font-semibold">
                        <span>كود: <strong className="text-[#5C1523] font-mono">{t.schoolCode}</strong></span>
                        <span>{t.level}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 text-[10px]">
                      {/* الموجه المسؤول */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-gold/10 text-gold-dark border border-gold/20">
                        الموجه: {t.supervisorName}
                      </span>

                      {/* تصنيف المعلم الفاخر */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold ${
                          t.classification === "عام"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : t.classification === "مكثف"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {t.classification}
                      </span>
                    </div>

                    {/* الأرقام التعريفية */}
                    <div className="text-[10px] text-[#7A6A58] font-bold flex justify-between items-center border-t border-dashed border-gold/15 pt-2 font-mono">
                      <span>شخصي: {t.personalId}</span>
                      <span>وظيفي: {t.employeeId}</span>
                    </div>
                  </div>

                  {/* أزرار الاتصال السريع الميدانية */}
                  <div className="mt-4 pt-3 border-t border-gold/15 flex items-center justify-between gap-2 no-print">
                    <div className="flex gap-2">
                      {t.mobile && (
                        <>
                          <a
                            href={`tel:${t.mobile}`}
                            className="p-2 text-xs font-bold text-[#5C1523] bg-[#5C1523]/5 hover:bg-[#5C1523] hover:text-white rounded-xl border border-primary/10 transition-all flex items-center gap-1"
                            title="اتصال هاتفي مباشر"
                          >
                            <Phone size={12} />
                          </a>
                          <a
                            href={`https://wa.me/${t.mobile.replace("+", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-200/50 transition-all flex items-center gap-1"
                            title="مراسلة عبر واتساب"
                          >
                            <MessageCircle size={12} />
                          </a>
                        </>
                      )}
                      {t.email && (
                        <a
                          href={`mailto:${t.email}`}
                          className="p-2 text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-600 hover:text-white rounded-xl border border-sky-200/50 transition-all flex items-center gap-1"
                          title="إرسال بريد رسمي"
                        >
                          <Mail size={12} />
                        </a>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-[#A89A92]">{t.nationality}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 2. عرض الجدول الشفاف والفاخر (Table View) */
            <div className="glass-card overflow-hidden animate-in">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-primary/5 border-b border-black/[0.04] text-xs font-bold text-primary">
                      <th className="p-4">المعلم / المنسق</th>
                      <th className="p-4">المدرسة الحالية</th>
                      <th className="p-4">الموجه المسؤول</th>
                      <th className="p-4">التصنيف التربوي</th>
                      <th className="p-4">الجنسية</th>
                      <th className="p-4">تفاصيل الاتصال</th>
                      {canManage && <th className="p-4 text-center">التحكم المباشر</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.03] text-xs">
                    {teachers.slice(0, limit).map((t) => (
                      <tr key={t._id} className="hover:bg-gold/5 transition-colors group">
                        <td className="p-4">
                          <div>
                            <p className="font-extrabold text-[#2A1418] text-sm">{t.name}</p>
                            <p className="text-[10px] text-[#7A6A58] mt-0.5 font-semibold">
                              {t.jobTitle} • شخصي: <span className="font-mono">{t.personalId}</span> • وظيفي:{" "}
                              <span className="font-mono">{t.employeeId}</span>
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-extrabold text-primary">{t.schoolName}</p>
                            <p className="text-[10px] text-[#A89A92] mt-0.5 font-bold">
                              كود: {t.schoolCode} • {t.level}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold/10 text-gold-dark border border-gold/10">
                            {t.supervisorName}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold ${
                              t.classification === "عام"
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : t.classification === "مكثف"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {t.classification}
                          </span>
                        </td>
                        <td className="p-4 text-[#7A6A58] font-bold">{t.nationality}</td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-[#2A1418] font-mono">{t.mobile}</p>
                            <p className="text-primary/70 font-semibold">{t.email}</p>
                          </div>
                        </td>
                        {canManage && (
                          <td className="p-4">
                            <div className="flex gap-2 justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  setForm({
                                    id: t._id,
                                    schoolCode: t.schoolCode,
                                    schoolName: t.schoolName,
                                    level: t.level,
                                    supervisorName: t.supervisorName,
                                    name: t.name,
                                    jobTitle: t.jobTitle,
                                    classification: t.classification,
                                    personalId: t.personalId,
                                    employeeId: t.employeeId,
                                    joinDate: t.joinDate || "",
                                    gender: t.gender,
                                    nationality: t.nationality,
                                    mobile: t.mobile,
                                    email: t.email,
                                  })
                                }
                                className="p-1 text-[#7A6A58] hover:text-[#DFC48E]"
                                title="تعديل البيانات"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(t._id, t.name)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="حذف نهائي"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* زر تحميل المزيد للحفاظ على سرعة الصفحة */}
          {teachers.length > limit && (
            <div className="p-4 text-center no-print">
              <button onClick={() => setLimit((l) => l + 50)} className="btn-secondary inline-flex items-center gap-1.5 text-xs font-bold shadow-sm">
                تحميل المزيد من المعلمين <ChevronDown size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* نافذة الإضافة والتعديل الفردي */}
      {form && (
        <Modal title={form.id ? "تعديل بيانات معلم" : "إضافة معلم جديد للتربية البدنية"} onClose={() => setForm(null)} wide>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TxtField
                label="الاسم الكامل للمعلم *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="ادخل الاسم الرباعي للمعلم"
                required
              />
              <SelectField
                label="النوع / الجنس *"
                value={form.gender}
                onChange={(v) => setForm({ ...form, gender: v as "male" | "female" })}
                options={GENDERS}
              />
              <TxtField
                label="الرقم الشخصي (الهوية المدنية) *"
                value={form.personalId}
                onChange={(v) => setForm({ ...form, personalId: v })}
                placeholder="الرقم الشخصي المكون من 11 خانة"
                ltr
                required
              />
              <TxtField
                label="الرقم الوظيفي *"
                value={form.employeeId}
                onChange={(v) => setForm({ ...form, employeeId: v })}
                placeholder="الرقم الوظيفي الخاص بوزارة التعليم"
                ltr
                required
              />
              <TxtField
                label="المسمى الوظيفي"
                value={form.jobTitle}
                onChange={(v) => setForm({ ...form, jobTitle: v })}
                placeholder="مثال: معلم تربية رياضية، منسق تربية بدنية"
              />
              <SelectField
                label="تصنيف المعلم"
                value={form.classification}
                onChange={(v) => setForm({ ...form, classification: v })}
                options={CLASSIFICATIONS}
              />
              <TxtField
                label="اسم المدرسة"
                value={form.schoolName}
                onChange={(v) => setForm({ ...form, schoolName: v })}
                placeholder="المدرسة الحالية المنتسب إليها"
              />
              <TxtField
                label="كود المدرسة"
                value={form.schoolCode}
                onChange={(v) => setForm({ ...form, schoolCode: v })}
                placeholder="كود المدرسة التعريفي"
                ltr
              />
              <SelectField
                label="مرحلة المدرسة"
                value={form.level}
                onChange={(v) => setForm({ ...form, level: v })}
                options={LEVELS}
              />
              <SelectField
                label="الموجه المسؤول"
                value={form.supervisorName}
                onChange={(v) => setForm({ ...form, supervisorName: v })}
                options={supervisorOptions}
              />
              <TxtField
                label="الجنسية"
                value={form.nationality}
                onChange={(v) => setForm({ ...form, nationality: v })}
                placeholder="الجنسية"
              />
              <TxtField
                label="رقم الهاتف الجوال"
                value={form.mobile}
                onChange={(v) => setForm({ ...form, mobile: v })}
                placeholder="مثال: 97455000000"
                ltr
              />
              <TxtField
                label="البريد الإلكتروني"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="البريد التعليمي الرسمي للموظف"
                ltr
              />
              <TxtField
                label="تاريخ التعيين"
                value={form.joinDate}
                onChange={(v) => setForm({ ...form, joinDate: v })}
                placeholder="YYYY-MM-DD"
                ltr
              />
            </div>
          </div>
          <ModalFooter onClose={() => setForm(null)} onSave={handleSave} saving={saving} />
        </Modal>
      )}

      {/* نافذة الاستيراد الجماعي (Bulk Import Modal) */}
      {showImportModal && (
        <Modal title="استيراد جماعي لمعلمي التربية البدنية من Excel" onClose={() => setShowImportModal(false)} wide>
          <div className="p-6 space-y-5">
            {/* إرشادات التنسيق */}
            <div className="p-4 bg-gold/10 border border-gold/25 rounded-2xl space-y-2">
              <p className="text-xs font-extrabold text-gold-dark flex items-center gap-1.5">
                <Info size={15} /> إرشادات استيراد ملف Excel أو CSV
              </p>
              <p className="text-[11px] text-[#7A6A58] leading-relaxed">
                لتحديث قاعدة البيانات بنجاح، قم بتصدير شيت المعلمين في ملف Excel الخاص بك كصيغة **CSV UTF-8 (Comma delimited)**. 
                المنصة ذكية بما يكفي للتعرف التلقائي على الأعمدة العربية والإنجليزية مثل: 
                <strong className="text-primary"> الاسم الكامل، الرقم الشخصي، الرقم الوظيفي، المدرسة، كود المدرسة، الموجه المسؤول، التصنيف</strong>.
              </p>
            </div>

            {/* منطقة سحب وإلقاء الملف */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gold/30 hover:border-primary/50 bg-[#FCF9F2]/30 hover:bg-[#FCF9F2]/60 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-2 group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".csv" 
                className="hidden" 
              />
              <FileSpreadsheet className="mx-auto text-gold group-hover:text-primary group-hover:scale-110 transition-transform duration-350" size={44} />
              <p className="text-xs font-extrabold text-[#2A1418]">انقر هنا لتحديد ملف CSV الخاص بالمعلمين</p>
              <p className="text-[10px] text-[#A89A92] font-semibold">الملف يجب أن يحتوي على صف العناوين الأول</p>
            </div>

            {importError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-600 font-semibold flex items-center gap-2">
                <AlertCircle size={15} /> {importError}
              </div>
            )}

            {/* معاينة السجلات المحللة */}
            {parsedRecords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#2A1418] flex items-center gap-1">
                    <Check size={14} className="text-emerald-600" /> تم تحليل عدد <strong className="text-primary font-sans text-sm">{parsedRecords.length}</strong> معلم بنجاح
                  </span>
                  <button 
                    onClick={() => { setParsedRecords([]); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-0.5"
                  >
                    <X size={12} /> مسح الملف الحالي
                  </button>
                </div>

                <div className="border border-gold/15 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-right text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-[#FCF9F2] text-[#5C1523] border-b border-gold/10 font-bold sticky top-0">
                        <th className="p-2">الاسم الكامل</th>
                        <th className="p-2">الرقم الشخصي</th>
                        <th className="p-2">المدرسة</th>
                        <th className="p-2">الموجه المسؤول</th>
                        <th className="p-2">التصنيف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.02]">
                      {parsedRecords.slice(0, 5).map((r, idx) => (
                        <tr key={idx} className="hover:bg-gold/5 font-semibold text-[#7A6A58]">
                          <td className="p-2 text-[#2A1418] font-extrabold">{r.name}</td>
                          <td className="p-2 font-mono">{r.personalId}</td>
                          <td className="p-2">{r.schoolName}</td>
                          <td className="p-2 text-gold-dark">{r.supervisorName}</td>
                          <td className="p-2">{r.classification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRecords.length > 5 && (
                    <p className="text-[9px] text-[#A89A92] text-center p-2 bg-slate-50 border-t border-slate-100 font-semibold italic">
                      ... وعدد {parsedRecords.length - 5} معلمين آخرين مضافين للملف
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="px-6 pb-6 flex gap-3 justify-end border-t border-gold/10 pt-4">
            <button 
              onClick={() => { setShowImportModal(false); setParsedRecords([]); }} 
              disabled={importing} 
              className="btn-ghost text-xs font-bold !py-2.5 !px-5 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button 
              onClick={executeBulkImport} 
              disabled={importing || parsedRecords.length === 0} 
              className="btn-primary text-xs font-bold !py-2.5 !px-5 flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-primary/10"
            >
              {importing ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {importing ? "جاري استيراد المعلمين..." : `بدء استيراد ${parsedRecords.length} معلم`}
            </button>
          </div>
        </Modal>
      )}

      {toastNode}
    </div>
  );
}
