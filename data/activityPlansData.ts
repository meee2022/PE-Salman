// بيانات خطة الأنشطة اللاصفية المعتمدة 2025-2026
// مستخرجة من: خطة الأنشطة اللاصفية المعتمدة للمدارس للعام الأكاديمي 2025-2026.xlsx

export type ActivityPlanGender = "male" | "female" | "both";
export type ActivityPlanStage  = "primary" | "middle" | "secondary" | "all" | "model";
export type ActivityPlanType   = "department" | "school";

export interface ActivityPlanItem {
  seq:          number;
  organizer:    string;
  activityName: string;
  partnership?: string;
  dateText:     string;
  gender:       ActivityPlanGender;
  stage:        ActivityPlanStage;
  type:         ActivityPlanType;
}

export const ACTIVITY_PLANS_DATA: ActivityPlanItem[] = [
  // ── فعاليات القسم ───────────────────────────────────────────────
  {
    seq: 1,
    organizer: "اليرموك الإعدادية للبنين",
    activityName: 'مسابقة الطلاب ذوي الإعاقة "المكفوفين"',
    dateText: "10/2/2025",
    gender: "male", stage: "middle", type: "department",
  },
  {
    seq: 2,
    organizer: "مالك بن أنس النموذجية للبنين",
    activityName: "بطولة كأس العرب 2025",
    dateText: "2-5/11/2025",
    gender: "male", stage: "primary", type: "department",
  },
  {
    seq: 3,
    organizer: "قسم التربية البدنية",
    activityName: "بطولة التحدي المدرسية لألعاب القوى",
    partnership: "اسباير",
    dateText: "11/11/2025",
    gender: "female", stage: "primary", type: "department",
  },
  {
    seq: 4,
    organizer: "قسم التربية البدنية",
    activityName: "ألعاب قوى كيدز",
    partnership: "اسباير",
    dateText: "18-20/1/2026",
    gender: "male", stage: "primary", type: "department",
  },
  {
    seq: 5,
    organizer: "قسم التربية البدنية",
    activityName: "ألعاب قوى كيدز",
    partnership: "اسباير",
    dateText: "25-27/1/2026",
    gender: "female", stage: "primary", type: "department",
  },
  {
    seq: 6,
    organizer: "قسم التربية البدنية",
    activityName: "العروض الرياضية",
    dateText: "26-29/1/2026",
    gender: "both", stage: "model", type: "department",
  },
  {
    seq: 7,
    organizer: "قسم التربية البدنية",
    activityName: "اختراق الضاحية",
    dateText: "2/3/2026",
    gender: "male", stage: "middle", type: "department",
  },
  {
    seq: 8,
    organizer: "الاحنف الإعدادية للبنين",
    activityName: "كرة السلة 3×3",
    dateText: "2/5/2026",
    gender: "male", stage: "middle", type: "department",
  },
  {
    seq: 9,
    organizer: 'الهداية لذوي الاحتياجات الخاصة "الهلال"',
    activityName: "ألعاب قوى ذوي الإعاقة",
    partnership: "النادي العربي الرياضي",
    dateText: "9/2/2026",
    gender: "male", stage: "primary", type: "department",
  },
  {
    seq: 10,
    organizer: "قسم التربية البدنية",
    activityName: "اليوم الرياضي للدولة",
    dateText: "10/2/2026",
    gender: "both", stage: "all", type: "department",
  },
  {
    seq: 11,
    organizer: "قسم التربية البدنية",
    activityName: "اللياقة البدنية والصحة",
    partnership: "وزارة الشباب والرياضة",
    dateText: "15-16/2/2026",
    gender: "both", stage: "all", type: "department",
  },
  {
    seq: 12,
    organizer: "خليفة الثانوية للبنين",
    activityName: "البطولة الرمضانية لكرة القدم",
    dateText: "22-24/2/2026",
    gender: "male", stage: "secondary", type: "department",
  },
  {
    seq: 13,
    organizer: "قسم التربية البدنية",
    activityName: "معرض أبحاث التربية البدنية",
    dateText: "22/4/2026",
    gender: "both", stage: "all", type: "department",
  },
  {
    seq: 14,
    organizer: "قسم التربية البدنية",
    activityName: "ختام برنامج اللياقة البدنية والصحة",
    dateText: "30/4/2026",
    gender: "both", stage: "all", type: "department",
  },

  // ── فعاليات المدارس ─────────────────────────────────────────────
  {
    seq: 1,
    organizer: "نسيبة بنت كعب الابتدائية للبنات",
    activityName: "مسابقة الجري",
    partnership: "الاتحاد القطري للرياضة للجميع",
    dateText: "أكتوبر 2025",
    gender: "female", stage: "middle", type: "school",
  },
  {
    seq: 2,
    organizer: "روضة مدرسة حطين النموذجية للبنين",
    activityName: "بطولة حطين لكرة القدم",
    partnership: "السيلية",
    dateText: "نوفمبر 2025",
    gender: "male", stage: "primary", type: "school",
  },
  {
    seq: 3,
    organizer: "الخوارزمي الابتدائية للبنات",
    activityName: "تحدي الخوارزمي لكرة السلة 3×3 النسخة الرابعة",
    dateText: "17-19/11/2025",
    gender: "female", stage: "primary", type: "school",
  },
  {
    seq: 4,
    organizer: "عمر بن الخطاب النموذجية للبنين",
    activityName: "مهرجان التمبة",
    dateText: "24/11/2025",
    gender: "male", stage: "primary", type: "school",
  },
  {
    seq: 5,
    organizer: "قطر للعلوم المصرفية الثانوية للبنات",
    activityName: "التدريب البدني",
    partnership: "شركة سيشور، مزرعتي، اسباير، Bsporty",
    dateText: "28-29/1/2026",
    gender: "female", stage: "secondary", type: "school",
  },
  {
    seq: 6,
    organizer: "الكوثر الثانوية للبنات",
    activityName: "كروس فت",
    partnership: "مركز بيرف اب",
    dateText: "فبراير 2026",
    gender: "female", stage: "secondary", type: "school",
  },
  {
    seq: 7,
    organizer: "جاسم بن حمد الثانوية للبنين",
    activityName: "بطولة رفع الأثقال",
    partnership: "الاتحاد القطري لرفع الأثقال",
    dateText: "فبراير 2026",
    gender: "male", stage: "secondary", type: "school",
  },
  {
    seq: 8,
    organizer: "الأندلس الابتدائية للبنات",
    activityName: "مسابقة المواهب الرياضية",
    partnership: "وزارة الرياضة، الاتحادات الرياضية",
    dateText: "1-5/2/2026",
    gender: "female", stage: "primary", type: "school",
  },
  {
    seq: 9,
    organizer: "جاسم بن حمد الثانوية للبنين",
    activityName: "بطولة الرجبي",
    partnership: "الاتحاد القطري للرجبي",
    dateText: "9/2/2026",
    gender: "male", stage: "secondary", type: "school",
  },
  {
    seq: 10,
    organizer: "روضة مدرسة حطين النموذجية للبنين",
    activityName: "مسابقة حطين للألعاب الصغيرة",
    partnership: "نادي الغرافة، الريان، الأهلي",
    dateText: "أبريل 2026",
    gender: "male", stage: "primary", type: "school",
  },
];
