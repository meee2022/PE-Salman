"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/AuthProvider";
import {
  Settings, KeyRound, Users, ShieldCheck, RefreshCw, Check,
  UserPlus, X, History, FileText, CalendarCog, Database, UserCircle,
} from "lucide-react";
import Link from "next/link";

const ROLES = [
  { value: "superadmin", label: "⭐ سوبر أدمن (صلاحيات كاملة)" },
  { value: "admin",      label: "مدير (رئيس التوجيه)" },
  { value: "supervisor", label: "موجه" },
  { value: "viewer",     label: "مشاهد (قراءة فقط)" },
] as const;
type RoleValue = (typeof ROLES)[number]["value"];

// ── تعريف التبويبات ──────────────────────────────────────────────
type TabId = "account" | "year" | "reports" | "users" | "audit" | "import";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly: boolean;
}

const TABS: TabDef[] = [
  { id: "account", label: "حسابي",           icon: <UserCircle size={16} />,  adminOnly: false },
  { id: "year",    label: "السنة الدراسية",   icon: <CalendarCog size={16} />, adminOnly: true  },
  { id: "reports", label: "التقارير المطبوعة",icon: <FileText size={16} />,    adminOnly: true  },
  { id: "users",   label: "المستخدمون",       icon: <Users size={16} />,       adminOnly: true  },
  { id: "audit",   label: "سجل العمليات",     icon: <History size={16} />,     adminOnly: true  },
  { id: "import",  label: "استيراد البيانات", icon: <Database size={16} />,    adminOnly: true  },
];

// ── الصفحة الرئيسية ──────────────────────────────────────────────
export default function SettingsPage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [toast, setToast] = useState<string | null>(null);
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  if (!user || !token) return null;

  const isAdmin = ["admin", "superadmin"].includes(user.role);
  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="الإعدادات"
        subtitle="إدارة الحساب والصلاحيات والتقارير"
        icon={<Settings size={24} />}
      />

      {/* ── تحذير تغيير كلمة المرور ─────────────────────────────── */}
      {user.mustChangePassword && (
        <div className="card-luxurious p-4 bg-amber-500/[0.03] border-amber-500/20 flex items-center gap-3.5">
          <span className="icon-orb !w-9 !h-9 bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
            <ShieldCheck size={18} className="animate-pulse" />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-800">حماية الحساب مطلوبة</p>
            <p className="text-xs font-semibold text-amber-700/80">يُنصح بتغيير كلمة المرور الافتراضية الآن.</p>
          </div>
          <button onClick={() => setActiveTab("account")}
            className="mr-auto text-xs font-bold text-amber-700 underline whitespace-nowrap">
            تغيير الآن
          </button>
        </div>
      )}

      {/* ── شريط التبويبات ──────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap bg-white/60 border border-black/[0.06] rounded-2xl p-1.5 shadow-sm">
        {visibleTabs.map(tab => {
          const isLink = tab.id === "import";
          const active = activeTab === tab.id;

          if (isLink) {
            return (
              <Link key={tab.id} href="/dashboard/settings/import"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 text-[#6b5a52] hover:bg-black/[0.04] hover:text-primary whitespace-nowrap">
                <span className="opacity-70">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          }

          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap
                ${active
                  ? "bg-gradient-to-l from-primary to-[#7A1E30] text-white shadow-md"
                  : "text-[#6b5a52] hover:bg-black/[0.04] hover:text-primary"
                }`}>
              <span className={active ? "text-gold" : "opacity-70"}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── محتوى التبويب ───────────────────────────────────────── */}
      <div className="animate-in">
        {activeTab === "account" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChangePasswordCard token={token} onDone={show} />
            <AccountCard />
          </div>
        )}
        {activeTab === "year"    && isAdmin && <ActiveYearCard token={token} onToast={show} />}
        {activeTab === "reports" && isAdmin && <OrgSettings token={token} onToast={show} />}
        {activeTab === "users"   && isAdmin && <UsersAdmin token={token} onToast={show} currentUserId={user._id} />}
        {activeTab === "audit"   && isAdmin && <AuditLog token={token} />}
      </div>

      {/* ── Toast ────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-500/30">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

// ══════════════════ مكونات التبويبات ══════════════════════════════

function AccountCard() {
  const { user } = useAuth();
  if (!user) return null;
  const roleLabel =
    user.role === "superadmin" ? "⭐ سوبر أدمن — صلاحيات كاملة" :
    user.role === "admin"      ? "رئيس التوجيه (مدير)" :
    user.role === "supervisor" ? "موجه" : "مستخدم";
  return (
    <div className="card-luxurious p-6 space-y-5 relative overflow-hidden">
      <span className="absolute right-0 top-0 bottom-0 w-1 bg-gold" />
      <div className="flex items-center gap-4 border-b border-gold/15 pb-4">
        <span className="icon-orb !w-12 !h-12 bg-gradient-to-br from-[#DFC48E] to-[#A8853A] text-white shadow-md shadow-gold/20 font-extrabold text-base">
          {user.name?.trim().charAt(0) ?? "U"}
        </span>
        <div>
          <h2 className="font-extrabold text-[#2A1418] text-lg">معلومات الحساب</h2>
          <p className="text-xs text-gold-dark font-semibold mt-0.5">{roleLabel}</p>
        </div>
      </div>
      <div className="space-y-3.5">
        <Row label="الاسم الكامل" value={user.name} />
        <Row label="اسم المستخدم" value={user.username} ltr />
        <Row label="البريد الإلكتروني" value={user.email || "—"} ltr />
      </div>
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-black/[0.03] pb-3 last:border-0 last:pb-0">
      <span className="text-[#8A7A72] font-bold">{label}</span>
      <span className="font-extrabold text-[#2A1418]" dir={ltr ? "ltr" : undefined}>{value}</span>
    </div>
  );
}

function ChangePasswordCard({ token, onDone }: { token: string; onDone: (m: string) => void }) {
  const changePassword = useMutation(api.auth.changePassword);
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (newP !== confirm) { setErr("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    try {
      const res = await changePassword({ token, oldPassword: oldP, newPassword: newP });
      if (res.ok) { onDone("تم تغيير كلمة المرور بنجاح"); setOldP(""); setNewP(""); setConfirm(""); }
      else setErr(res.error ?? "تعذّر التغيير");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card-luxurious p-6 space-y-4 relative overflow-hidden">
      <span className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-[#7A1E30]" />
      <div className="flex items-center gap-3 border-b border-gold/15 pb-4">
        <span className="icon-orb !w-9 !h-9 bg-[#5C1523]/5 text-[#5C1523] border border-gold/30">
          <KeyRound size={16} />
        </span>
        <h2 className="font-extrabold text-[#2A1418] text-lg">تغيير كلمة المرور</h2>
      </div>
      {err && <div className="bg-red-500/5 text-red-700 text-xs font-bold rounded-xl px-4 py-2.5 border border-red-500/10">{err}</div>}
      <div className="space-y-3">
        <input type="password" value={oldP} onChange={e => setOldP(e.target.value)} className="field font-semibold" placeholder="كلمة المرور الحالية" dir="ltr" />
        <input type="password" value={newP} onChange={e => setNewP(e.target.value)} className="field font-semibold" placeholder="كلمة المرور الجديدة" dir="ltr" />
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="field font-semibold" placeholder="تأكيد كلمة المرور" dir="ltr" />
      </div>
      <button type="submit" disabled={busy || !oldP || !newP} className="btn-primary w-full justify-center text-xs font-bold !py-3">
        {busy ? "جارٍ الحفظ..." : "تحديث كلمة المرور"}
      </button>
    </form>
  );
}

function ActiveYearCard({ token, onToast }: { token: string; onToast: (m: string) => void }) {
  const currentYear = useQuery(api.settings.activeYear);
  const setActiveYear = useMutation(api.settings.setActiveYear);
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  const yearOptions: string[] = [];
  for (let y = 2023; y <= 2030; y++) yearOptions.push(`${y}-${y + 1}`);

  async function save() {
    if (!year) return;
    setSaving(true);
    try {
      await setActiveYear({ year, token });
      onToast(`✅ تم تغيير السنة الدراسية النشطة إلى ${year}`);
      setYear("");
    } catch (e: any) { onToast(`❌ ${e.message}`); }
    finally { setSaving(false); }
  }

  return (
    <div className="card-luxurious p-6 space-y-5 relative overflow-hidden max-w-xl">
      <span className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-500 to-blue-600" />
      <div className="flex items-center gap-3 border-b border-gold/15 pb-4">
        <span className="icon-orb !w-9 !h-9 bg-gradient-to-br from-sky-500 to-blue-600 text-white border border-sky-400/30 shadow-md shadow-sky-500/20">
          <CalendarCog size={16} />
        </span>
        <div>
          <h2 className="font-extrabold text-[#2A1418] text-lg">السنة الدراسية النشطة</h2>
          <p className="text-xs text-[#8A7A72] font-semibold mt-0.5">
            السنة الحالية: <span className="font-black text-primary" dir="ltr">{currentYear ?? "..."}</span>
          </p>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-bold text-[#2A1418] mb-1.5">اختر السنة الجديدة</label>
          <select value={year} onChange={e => setYear(e.target.value)} className="field bg-white font-semibold">
            <option value="">— اختر السنة —</option>
            {yearOptions.map(y => (
              <option key={y} value={y} disabled={y === currentYear}>
                {y} {y === currentYear ? "(النشطة حالياً)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button onClick={save} disabled={saving || !year || year === currentYear}
          className="btn-primary !py-2.5 !px-6 text-xs font-bold whitespace-nowrap disabled:opacity-40">
          {saving ? "جارٍ الحفظ..." : "تطبيق السنة"}
        </button>
      </div>
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-2.5 font-semibold">
        ⚠️ بعد التغيير ستنعكس السنة الجديدة فوراً على جميع صفحات النظام.
      </p>
    </div>
  );
}

function OrgSettings({ token, onToast }: { token: string; onToast: (m: string) => void }) {
  const org = useQuery(api.settings.org, { token });
  const setOrg = useMutation(api.settings.setOrg);
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);

  const data = form ?? (org ? {
    ministry: org["org.ministry"] ?? "", department: org["org.department"] ?? "",
    section: org["org.section"] ?? "", headName: org["org.headName"] ?? "",
    managerName: org["org.managerName"] ?? "",
  } : null);

  if (!data) return (
    <div className="py-12 flex justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
    </div>
  );

  const set = (k: string, v: string) => setForm({ ...data, [k]: v });

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      await setOrg({ ministry: data.ministry, department: data.department,
        section: data.section, headName: data.headName, managerName: data.managerName, token });
      onToast("تم حفظ بيانات التقارير");
    } finally { setSaving(false); }
  }

  return (
    <div className="card-luxurious p-6 space-y-5 relative overflow-hidden max-w-2xl">
      <span className="absolute right-0 top-0 bottom-0 w-1 bg-gold" />
      <div className="flex items-center gap-3 border-b border-gold/15 pb-4">
        <span className="icon-orb !w-9 !h-9 bg-gradient-to-br from-[#5C1523] to-[#4A0F1B] text-gold border border-gold/25 shadow-md shadow-primary/10">
          <FileText size={16} />
        </span>
        <div>
          <h2 className="font-extrabold text-[#2A1418] text-lg">بيانات التقارير المطبوعة</h2>
          <p className="text-xs text-[#8A7A72] font-semibold mt-0.5">تظهر في ترويسة وتذييل ملفات PDF الرسمية.</p>
        </div>
      </div>
      <div className="space-y-4">
        <Field label="الوزارة / الجهة" value={data.ministry} onChange={v => set("ministry", v)} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="الإدارة" value={data.department} onChange={v => set("department", v)} />
          <Field label="القسم" value={data.section} onChange={v => set("section", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم رئيس القسم (للتوقيع)" value={data.headName} onChange={v => set("headName", v)} />
          <Field label="اسم مدير الإدارة (للتوقيع)" value={data.managerName} onChange={v => set("managerName", v)} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary !py-2.5 !px-6 text-xs font-bold">
        {saving ? "جارٍ الحفظ..." : "حفظ بيانات التقارير"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#2A1418] mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="field font-semibold" />
    </div>
  );
}

function AuditLog({ token }: { token: string }) {
  const logs = useQuery(api.audit.list, { token, limit: 60 });
  const actionLabel: Record<string, string> = { create: "إضافة", update: "تعديل", delete: "حذف" };
  const actionCls: Record<string, string> = {
    create: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    update: "bg-sky-50 text-sky-700 border border-sky-200/50",
    delete: "bg-red-50 text-red-700 border border-red-200/50",
  };

  return (
    <div className="card-luxurious overflow-hidden">
      <div className="px-6 py-4 border-b border-gold/15 bg-[#FCF9F2]/30 flex items-center gap-3">
        <span className="icon-orb !w-10 !h-10 bg-gradient-to-br from-primary to-[#7A1E30] text-gold border border-gold/25 shadow-md shadow-primary/10">
          <History size={18} />
        </span>
        <div>
          <h2 className="font-extrabold text-[#2A1418] text-lg">سجل العمليات والرقابة</h2>
          <p className="text-xs text-[#8A7A72] font-semibold mt-0.5">تتبع التعديلات الأخيرة على النظام.</p>
        </div>
      </div>
      {logs === undefined ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
        </div>
      ) : !logs?.length ? (
        <div className="py-12 text-center text-[#A89A92] text-sm font-semibold">لا توجد تعديلات مسجّلة بعد.</div>
      ) : (
        <div className="divide-y divide-gold/10 bg-white/40">
          {logs.map(l => (
            <div key={l._id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gold/5 transition-colors">
              <span className={`pill px-3 py-1 text-[11px] font-bold ${actionCls[l.action] ?? "bg-gray-100 text-gray-600"}`}>
                {actionLabel[l.action] ?? l.action}
              </span>
              <p className="flex-1 text-xs text-[#2A1418] font-bold min-w-0 leading-relaxed">{l.summary}</p>
              <div className="text-left shrink-0">
                <p className="text-xs font-bold text-gold-dark">{l.userName ?? "—"}</p>
                <p className="text-[10px] text-[#A89A92] font-bold mt-0.5" dir="ltr">
                  {new Date(l.timestamp).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateUserModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: (m: string) => void }) {
  const createUser = useMutation(api.auth.adminCreateUser);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleValue>("supervisor");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await createUser({ token, name, username, password, role });
      if (res.ok) { onDone(`تم إنشاء حساب "${name || username}" بنجاح`); onClose(); }
      else setErr(res.error ?? "تعذّر الإنشاء");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-[#2A1418]/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gold/20">
        <div className="relative px-6 py-5 bg-gradient-to-l from-[#5C1523] to-[#4A0F1B] overflow-hidden border-b border-gold/25">
          <div className="pattern-arabesque absolute inset-0 opacity-40" />
          <button type="button" onClick={onClose} className="absolute left-4 top-4.5 text-white/70 hover:text-white"><X size={18} /></button>
          <h3 className="relative font-extrabold text-white flex items-center gap-2 text-base">
            <UserPlus size={18} className="text-gold" /> إضافة مستخدم جديد
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="bg-red-500/5 text-red-700 text-xs font-bold rounded-xl px-4 py-2.5 border border-red-500/10">{err}</div>}
          <div>
            <label className="block text-xs font-bold text-[#2A1418] mb-1.5">الاسم الكامل</label>
            <input value={name} onChange={e => setName(e.target.value)} className="field font-semibold" placeholder="الاسم ثلاثي أو رباعي" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#2A1418] mb-1.5">اسم المستخدم</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="field font-semibold" placeholder="username" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#2A1418] mb-1.5">كلمة المرور المؤقتة</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="field font-semibold" placeholder="٦ أحرف على الأقل" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#2A1418] mb-1.5">الدور والصلاحية</label>
            <select value={role} onChange={e => setRole(e.target.value as RoleValue)} className="field bg-white font-semibold">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-ghost text-xs font-bold !py-2.5 !px-5">إلغاء</button>
          <button type="submit" disabled={busy || !username || !password} className="btn-primary text-xs font-bold !py-2.5 !px-5">
            {busy ? "جارٍ الإنشاء..." : <><Check size={14} /> إنشاء الحساب</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersAdmin({ token, onToast, currentUserId }: { token: string; onToast: (m: string) => void; currentUserId: Id<"users"> }) {
  const users = useQuery(api.auth.listUsers, { token });
  const seedUsers = useMutation(api.auth.seedUsers);
  const setActive = useMutation(api.auth.adminSetActive);
  const resetPassword = useMutation(api.auth.adminResetPassword);
  const setRole = useMutation(api.auth.adminSetRole);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function handleSeed() {
    setBusy(true);
    try { const r = await seedUsers({}); onToast(`تم إنشاء ${r.created} حساب جديد`); }
    finally { setBusy(false); }
  }
  async function handleReset(userId: Id<"users">) {
    const r = await resetPassword({ token, userId });
    onToast(`تمت إعادة التعيين — كلمة المرور: ${r.defaultPassword}`);
  }

  return (
    <div className="card-luxurious overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between border-b border-gold/15 flex-wrap gap-3 bg-[#FCF9F2]/30">
        <div className="flex items-center gap-3">
          <span className="icon-orb !w-10 !h-10 bg-gradient-to-br from-primary to-[#7A1E30] text-gold border border-gold/25 shadow-md shadow-primary/10">
            <Users size={18} />
          </span>
          <h2 className="font-extrabold text-[#2A1418] text-lg">إدارة مستخدمي النظام</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 !py-2 !px-4 text-xs">
            <UserPlus size={15} /> إضافة مستخدم
          </button>
          <button onClick={handleSeed} disabled={busy}
            className="btn-ghost flex items-center gap-2 !py-2 !px-4 text-xs">
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            {busy ? "جارٍ..." : "مزامنة الموجهين"}
          </button>
        </div>
      </div>

      {showCreate && <CreateUserModal token={token} onClose={() => setShowCreate(false)} onDone={onToast} />}

      {users === undefined ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
        </div>
      ) : !users ? (
        <div className="py-12 text-center text-[#A89A92] text-sm font-semibold">غير مصرّح بالوصول.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th className="text-right">الاسم</th>
                <th className="text-right">اسم المستخدم</th>
                <th className="text-center">الدور</th>
                <th className="text-center">الحالة</th>
                <th className="text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="group">
                  <td className="font-extrabold text-[#2A1418] flex items-center gap-2.5">
                    <span className="icon-orb !w-8 !h-8 bg-gradient-to-br from-[#FCF9F2] to-[#DFC48E]/20 text-[#5C1523] border border-gold/30 font-extrabold text-xs">
                      {u.name?.trim().charAt(0) ?? "U"}
                    </span>
                    {u.name}
                  </td>
                  <td className="text-[#6b5a52] font-semibold text-xs" dir="ltr">{u.username}</td>
                  <td className="text-center">
                    {u._id === currentUserId ? (
                      <span className={`pill font-bold border ${u.role === "superadmin" ? "bg-amber-50 text-amber-700 border-amber-300/50" : "bg-primary/10 text-primary border-primary/15"}`}>
                        {u.role === "superadmin" ? "⭐ سوبر أدمن (أنت)" : "مدير (أنت)"}
                      </span>
                    ) : u.role === "superadmin" ? (
                      <span className="pill bg-amber-50 text-amber-700 border border-amber-300/50 font-bold">⭐ سوبر أدمن</span>
                    ) : (
                      <select value={u.role}
                        onChange={e => setRole({ token, userId: u._id, role: e.target.value as RoleValue })}
                        className="field !w-auto !py-1.5 !px-2.5 text-xs font-bold bg-[#FCF9F2]/50 border-gold/25">
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="text-center">
                    <span className={`pill px-3 py-1 font-bold text-xs ${u.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                      {u.isActive ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleReset(u._id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-gold-dark hover:bg-gold/10 border border-transparent hover:border-gold/25 transition-all flex items-center gap-1.5">
                        <RefreshCw size={12} /> إعادة كلمة المرور
                      </button>
                      {u.role !== "admin" && u.role !== "superadmin" && (
                        <button onClick={() => setActive({ token, userId: u._id, isActive: !u.isActive })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-transparent
                            ${u.isActive ? "text-red-600 hover:bg-red-50 hover:border-red-200/55" : "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200/55"}`}>
                          {u.isActive ? "إيقاف" : "تفعيل"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
