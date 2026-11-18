import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Check,
  Copy,
  Database,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  Sun,
  Monitor,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/axiosClient";
import { getCenters } from "../api/centers";
import {
  changePassword,
  getCenterSettings,
  getProfile,
  getSystemStatus,
  logoutEverywhere,
  regenerateMyCenterCode,
  setSelfRegistration,
  updateCenterSettings,
  updateProfile,
} from "../api/settings";
import { applyAppearance, loadAppearance, saveAppearance } from "../lib/appearance";
import { ErrorNote, fieldClass, ghostBtn, primaryBtn, dangerBtn, formatDateTime } from "../components/AdminUi";

const ADMINS = ["PlatformAdmin", "Admin"];
const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const ROLE_TITLES = {
  PlatformAdmin: "مدير النظام",
  Admin: "مدير النظام",
  CenterAdmin: "مسؤول المركز",
  Teacher: "معلم",
  Student: "طالب",
};

function Card({ title, hint, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-extrabold text-slate-800">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Notice({ ok, children }) {
  if (!children) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-xl p-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
    >
      {children}
    </p>
  );
}

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
        checked ? "bg-emerald-700" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "start-1" : "end-1"
        }`}
      />
    </button>
  );
}

/* ───────── الملف الشخصي ───────── */
function ProfileTab() {
  const { setDisplayName } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((data) => alive && setForm(data))
      .catch((e) => alive && setError(getErrorMessage(e)));
    return () => {
      alive = false;
    };
  }, []);

  if (!form) return error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-slate-400">جارٍ التحميل...</p>;

  const set = (name) => (event) => setForm((cur) => ({ ...cur, [name]: event.target.value }));

  async function save(event) {
    event.preventDefault();
    setError("");
    setDone("");
    setSaving(true);
    try {
      const saved = await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
      });
      setForm(saved);
      setDisplayName(`${saved.firstName} ${saved.lastName}`.trim());
      setDone("تم حفظ الملف الشخصي.");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="الملف الشخصي" hint="بياناتك كما تظهر داخل النظام.">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الأول">
            <input className={fieldClass} value={form.firstName} onChange={set("firstName")} required maxLength={50} />
          </Field>
          <Field label="اسم العائلة">
            <input className={fieldClass} value={form.lastName} onChange={set("lastName")} required maxLength={50} />
          </Field>
          <Field label="رقم الجوال">
            <input
              className={fieldClass}
              dir="ltr"
              inputMode="tel"
              value={form.phoneNumber ?? ""}
              onChange={set("phoneNumber")}
              maxLength={20}
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <input className={`${fieldClass} opacity-70`} dir="ltr" value={form.email} readOnly />
          </Field>
        </div>
        <p className="text-xs text-slate-500">
          {ROLE_TITLES[form.roleName] ?? form.roleName}
          {form.centerName ? ` · ${form.centerName}` : ""}. البريد والدور لا يُعدَّلان من هنا.
        </p>
        <Notice>{error}</Notice>
        <Notice ok>{done}</Notice>
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </form>
    </Card>
  );
}

/* ───────── الأمان ───────── */
function SecurityTab() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allBusy, setAllBusy] = useState(false);
  const [allError, setAllError] = useState("");

  const set = (name) => (event) => setForm((cur) => ({ ...cur, [name]: event.target.value }));

  async function leave() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.newPassword.length < 8) return setError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
    if (form.newPassword !== form.confirm) return setError("تأكيد كلمة المرور غير مطابق.");

    setSaving(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      // تُنهى كل الجلسات بعد التغيير، فنخرج ونطلب الدخول من جديد.
      await leave();
    } catch (e) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  }

  async function everywhere() {
    setAllError("");
    setAllBusy(true);
    try {
      await logoutEverywhere();
      await leave();
    } catch (e) {
      setAllError(getErrorMessage(e));
      setAllBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="تغيير كلمة المرور" hint="بعد التغيير تُنهى جميع الجلسات وتسجّل الدخول من جديد.">
        <form onSubmit={submit} className="max-w-md space-y-4">
          <Field label="كلمة المرور الحالية">
            <input type="password" dir="ltr" autoComplete="current-password" className={fieldClass} value={form.currentPassword} onChange={set("currentPassword")} required />
          </Field>
          <Field label="كلمة المرور الجديدة (8 أحرف على الأقل)">
            <input type="password" dir="ltr" autoComplete="new-password" minLength={8} className={fieldClass} value={form.newPassword} onChange={set("newPassword")} required />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة">
            <input type="password" dir="ltr" autoComplete="new-password" className={fieldClass} value={form.confirm} onChange={set("confirm")} required />
          </Field>
          <Notice>{error}</Notice>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
          </button>
        </form>
      </Card>

      <Card
        title="الخروج من كل الأجهزة"
        hint="يُلغي جلسات تسجيل الدخول المحفوظة على جميع أجهزتك. قد تبقى جلسة مفتوحة صالحة حتى 30 دقيقة كحدّ أقصى ثم تُطلب كلمة المرور."
      >
        <Notice>{allError}</Notice>
        <button type="button" onClick={everywhere} disabled={allBusy} className={`${dangerBtn} mt-3 inline-flex items-center gap-2`}>
          <LogOut size={16} />
          {allBusy ? "جارٍ التنفيذ..." : "خروج من كل الأجهزة"}
        </button>
      </Card>
    </div>
  );
}

/* ───────── المظهر ───────── */
function AppearanceTab() {
  const [appearance, setAppearance] = useState(loadAppearance);

  function update(patch) {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    saveAppearance(next);
    applyAppearance(next);
  }

  const themes = [
    { id: "light", label: "فاتح", icon: Sun },
    { id: "dark", label: "ليلي", icon: Moon },
    { id: "system", label: "حسب الجهاز", icon: Monitor },
  ];
  const sizes = [
    { id: "sm", label: "صغير", sample: "text-sm" },
    { id: "md", label: "متوسط", sample: "text-base" },
    { id: "lg", label: "كبير", sample: "text-xl" },
  ];

  const choice = (active) =>
    `flex flex-1 flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-bold transition ${
      active ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-5">
      <Card title="الوضع" hint="يُحفظ على هذا الجهاز فقط.">
        <div className="flex gap-3">
          {themes.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => update({ theme: id })} className={choice(appearance.theme === id)} aria-pressed={appearance.theme === id}>
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>
      </Card>
      <Card title="حجم الخط">
        <div className="flex gap-3">
          {sizes.map(({ id, label, sample }) => (
            <button key={id} type="button" onClick={() => update({ fontSize: id })} className={choice(appearance.fontSize === id)} aria-pressed={appearance.fontSize === id}>
              <span className={`${sample} font-extrabold`}>أ ب</span>
              {label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ───────── المركز ───────── */
function CenterTab({ isAdmin }) {
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(!isAdmin);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [saving, setSaving] = useState(false);
  const [regenAsk, setRegenAsk] = useState(false);
  const [busyCode, setBusyCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const target = isAdmin ? centerId : undefined;

  const load = useCallback(async () => {
    if (isAdmin && !centerId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const s = await getCenterSettings(target);
      setData(s);
      setForm({
        centerName: s.centerName,
        phone: s.phone ?? "",
        address: s.address ?? "",
        defaultDays: s.defaultDays.split(",").filter(Boolean).map(Number),
        defaultStartTime: s.defaultStartTime,
        defaultEndTime: s.defaultEndTime,
        lateAfterMinutes: s.lateAfterMinutes,
        excusedCountsAsAttended: s.excusedCountsAsAttended,
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, centerId, target]);

  useEffect(() => {
    if (!isAdmin) return;
    getCenters()
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        setCenters(rows);
        if (rows.length) setCenterId(String(rows[0].centerId));
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (name) => (event) => setForm((cur) => ({ ...cur, [name]: event.target.value }));
  const toggleDay = (day) =>
    setForm((cur) => ({
      ...cur,
      defaultDays: cur.defaultDays.includes(day) ? cur.defaultDays.filter((d) => d !== day) : [...cur.defaultDays, day].sort(),
    }));

  async function save(event) {
    event.preventDefault();
    setError("");
    setDone("");
    if (!form.defaultDays.length) return setError("اختر يوماً واحداً على الأقل للحلقات.");
    setSaving(true);
    try {
      const saved = await updateCenterSettings(
        {
          centerName: form.centerName,
          phone: form.phone,
          address: form.address,
          defaultDays: form.defaultDays.join(","),
          defaultStartTime: form.defaultStartTime,
          defaultEndTime: form.defaultEndTime,
          lateAfterMinutes: Number(form.lateAfterMinutes),
          excusedCountsAsAttended: form.excusedCountsAsAttended,
        },
        target,
      );
      setData(saved);
      setDone("تم حفظ إعدادات المركز.");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleRegistration(enabled) {
    setError("");
    setDone("");
    setBusyCode(true);
    try {
      await setSelfRegistration(enabled, target);
      setData((cur) => ({ ...cur, codeEnabled: enabled }));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyCode(false);
    }
  }

  async function regenerate() {
    setError("");
    setDone("");
    setBusyCode(true);
    try {
      const res = await regenerateMyCenterCode(target);
      setData((cur) => ({ ...cur, centerCode: res.centerCode }));
      setRegenAsk(false);
      setDone("تم توليد رمز جديد. الرمز القديم لم يعد يعمل في التسجيل.");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyCode(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data.centerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("تعذر النسخ، انسخ الرمز يدوياً.");
    }
  }

  return (
    <div className="space-y-5">
      {isAdmin && (
        <Card title="اختيار المركز" hint="كمدير للنظام تعدّل إعدادات المركز الذي تختاره.">
          <select className={fieldClass} value={centerId} onChange={(e) => setCenterId(e.target.value)}>
            {centers.map((c) => (
              <option key={c.centerId} value={c.centerId}>
                {c.centerName}
              </option>
            ))}
          </select>
        </Card>
      )}

      <Notice>{error}</Notice>
      <Notice ok>{done}</Notice>

      {loading && <p className="text-sm text-slate-400">جارٍ التحميل...</p>}

      {!loading && data && form && (
        <>
          <Card title="رمز المركز والتسجيل الذاتي" hint="يستخدم الطلاب هذا الرمز لإنشاء حساباتهم بأنفسهم.">
            <div className="flex flex-wrap items-center gap-3">
              <code dir="ltr" className="rounded-xl bg-slate-100 px-4 py-2.5 text-lg font-extrabold tracking-widest text-slate-800">
                {data.centerCode}
              </code>
              <button type="button" onClick={copyCode} className={`${ghostBtn} inline-flex items-center gap-2 border border-slate-200`}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "تم النسخ" : "نسخ"}
              </button>
              {!regenAsk ? (
                <button type="button" onClick={() => setRegenAsk(true)} className={`${ghostBtn} inline-flex items-center gap-2`}>
                  <RefreshCw size={16} />
                  رمز جديد
                </button>
              ) : (
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-rose-700">سيتوقف الرمز الحالي عن العمل. متأكد؟</span>
                  <button type="button" disabled={busyCode} onClick={regenerate} className={dangerBtn}>
                    تأكيد
                  </button>
                  <button type="button" onClick={() => setRegenAsk(false)} className={ghostBtn}>
                    إلغاء
                  </button>
                </span>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
              <div>
                <p className="font-bold text-slate-800">السماح بتسجيل الطلاب الذاتي</p>
                <p className="mt-1 text-xs text-slate-500">
                  {data.codeEnabled ? "مفعّل: يستطيع الطلاب الانضمام برمز المركز." : "موقوف: لا يمكن التسجيل برمز هذا المركز."}
                </p>
              </div>
              <Switch checked={data.codeEnabled} disabled={busyCode} onChange={toggleRegistration} label="التسجيل الذاتي" />
            </div>
          </Card>

          <form onSubmit={save} className="space-y-5">
            <Card title="بيانات المركز">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="اسم المركز">
                  <input className={fieldClass} value={form.centerName} onChange={set("centerName")} required minLength={2} maxLength={150} />
                </Field>
                <Field label="هاتف المركز">
                  <input className={fieldClass} dir="ltr" inputMode="tel" value={form.phone} onChange={set("phone")} maxLength={20} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="العنوان">
                    <input className={fieldClass} value={form.address} onChange={set("address")} maxLength={250} />
                  </Field>
                </div>
              </div>
            </Card>

            <Card title="أيام وأوقات الحلقات الافتراضية" hint="القيم الافتراضية لحلقات المركز.">
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, day) => {
                  const on = form.defaultDays.includes(day);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDay(day)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 grid max-w-md gap-4 sm:grid-cols-2">
                <Field label="من الساعة">
                  <input type="time" dir="ltr" className={fieldClass} value={form.defaultStartTime} onChange={set("defaultStartTime")} required />
                </Field>
                <Field label="إلى الساعة">
                  <input type="time" dir="ltr" className={fieldClass} value={form.defaultEndTime} onChange={set("defaultEndTime")} required />
                </Field>
              </div>
            </Card>

            <Card title="قواعد الحضور">
              <div className="grid max-w-md gap-4">
                <Field label="يُعدّ الطالب متأخراً بعد (دقيقة)">
                  <input type="number" min={0} max={120} dir="ltr" className={fieldClass} value={form.lateAfterMinutes} onChange={set("lateAfterMinutes")} required />
                </Field>
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-emerald-700"
                    checked={form.excusedCountsAsAttended}
                    onChange={(e) => setForm((cur) => ({ ...cur, excusedCountsAsAttended: e.target.checked }))}
                  />
                  احتساب «مستأذن» ضمن الحضور
                </label>
              </div>
            </Card>

            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? "جارٍ الحفظ..." : "حفظ إعدادات المركز"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/* ───────── النظام ───────── */
const formatBytes = (n) => {
  if (n == null) return "غير متاح";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ك.ب`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} م.ب`;
  return `${(n / 1024 ** 3).toFixed(2)} ج.ب`;
};

function CommandBox({ children }) {
  return (
    <code dir="ltr" className="block overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 text-left text-xs text-emerald-200">
      {children}
    </code>
  );
}

function SystemTab() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStatus(await getSystemStatus());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = status
    ? [
        ["المستخدمون", `${status.activeUsers} / ${status.users}`],
        ["المراكز", `${status.activeCenters} / ${status.centers}`],
        ["المعلمون", status.teachers],
        ["الطلاب", status.students],
        ["الحلقات", status.halaqat],
        ["سجلات الحفظ", status.memorizationRecords],
        ["سجلات الحضور", status.attendanceRecords],
        ["سجلات التدقيق", status.auditEntries],
      ]
    : [];

  return (
    <div className="space-y-5">
      <Card title="حالة النظام" hint="القيم حيّة من الخادم وقاعدة البيانات.">
        <Notice>{error}</Notice>
        {loading && <p className="text-sm text-slate-400">جارٍ التحميل...</p>}
        {status && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
              <span className={`rounded-full px-3 py-1 font-bold ${status.databaseOk ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                قاعدة البيانات: {status.databaseOk ? "متصلة" : "غير متصلة"}
              </span>
              <span className="text-slate-500">الحجم: {formatBytes(status.databaseSizeBytes)}</span>
              <span className="text-slate-500">الإصدار: {status.version}</span>
              <span className="text-slate-500">البيئة: {status.environment}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              تشغيل الخادم منذ {formatDateTime(status.startedAtUtc)}
              {status.lastAuditAt ? ` · آخر عملية مسجلة ${formatDateTime(status.lastAuditAt)}` : ""}
            </p>
          </>
        )}
        <button type="button" onClick={load} disabled={loading} className={`${ghostBtn} mt-4 inline-flex items-center gap-2 border border-slate-200`}>
          <RefreshCw size={16} />
          تحديث
        </button>
      </Card>

      <Card
        title="النسخ الاحتياطي"
        hint="النسخ يتم من جهاز الخادم نفسه، لا من المتصفح. شغّل أحد الأمرين من مجلد الـ API ثم احفظ الملف خارج الجهاز."
      >
        <div className="space-y-3">
          <CommandBox>./backup-db.sh</CommandBox>
          <CommandBox>.\backup-db.ps1</CommandBox>
          <p className="text-xs leading-6 text-slate-500">
            ينشئ ملفاً مؤرخاً داخل <b>backups/</b>. للاسترجاع:
          </p>
          <CommandBox>docker exec -i halaqa-postgres psql -U halaqa_admin -d halaqa_db &lt; backups/ملف.sql</CommandBox>
          <p className="text-xs text-slate-500">يُنصح بجدولته يومياً (Task Scheduler أو cron) وتجربة الاسترجاع مرة قبل الاعتماد عليه.</p>
        </div>
      </Card>
    </div>
  );
}

/* ───────── الصفحة ───────── */
export default function SettingsPage() {
  const { role } = useAuth();
  const isAdmin = ADMINS.includes(role);
  const hasCenter = isAdmin || role === "CenterAdmin";

  const tabs = [
    { id: "profile", label: "الملف الشخصي", icon: UserRound },
    { id: "security", label: "الأمان", icon: KeyRound },
    { id: "appearance", label: "المظهر", icon: Palette },
    ...(hasCenter ? [{ id: "center", label: "المركز", icon: Building2 }] : []),
    ...(isAdmin ? [{ id: "system", label: "النظام", icon: Database }] : []),
  ];
  const [tab, setTab] = useState("profile");

  return (
    <main dir="rtl" className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-slate-800">الإعدادات</h1>
        <p className="mt-1 text-sm text-slate-500">حسابك، والمظهر، {hasCenter ? "وإعدادات المركز." : "والأمان."}</p>
      </header>

      <nav className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm" aria-label="أقسام الإعدادات">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
              tab === id ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      {tab === "profile" && <ProfileTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "center" && hasCenter && <CenterTab isAdmin={isAdmin} />}
      {tab === "system" && isAdmin && <SystemTab />}
    </main>
  );
}
