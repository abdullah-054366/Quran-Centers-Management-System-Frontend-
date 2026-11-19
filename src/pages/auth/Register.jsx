import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/axiosClient";

export default function Register() {
  const { register, loadCenterHalaqat } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    centerCode: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // الحلقات تُحمَّل بعد التحقق من رمز المركز، ويختار الطالب حلقته قبل إنشاء الحساب.
  const [halaqat, setHalaqat] = useState([]);
  const [halaqaId, setHalaqaId] = useState(null);
  const [checkedCode, setCheckedCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [codeNotice, setCodeNotice] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));

    if (name === "centerCode") {
      setHalaqat([]);
      setHalaqaId(null);
      setCheckedCode("");
      setCodeNotice("");
    }
  }

  async function checkCode() {
    const code = form.centerCode.trim();
    setError("");
    setCodeNotice("");
    if (!code) {
      setError("أدخل رمز المركز أولاً.");
      return;
    }

    setChecking(true);
    try {
      const list = await loadCenterHalaqat(code);
      setHalaqat(list);
      setHalaqaId(null);
      setCheckedCode(code);
      if (list.length === 0) {
        setCodeNotice("الرمز صحيح، ولا توجد حلقات في هذا المركز بعد. ستُضاف إلى حلقة لاحقاً من إدارة المركز.");
      }
    } catch (err) {
      setHalaqat([]);
      setCheckedCode("");
      setError(getErrorMessage(err) || "تعذّر التحقق من رمز المركز.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    if (form.centerCode.trim() !== checkedCode) {
      setError("اضغط «عرض الحلقات» للتحقق من رمز المركز أولاً.");
      return;
    }

    if (halaqat.length > 0 && !halaqaId) {
      setError("اختر الحلقة التي تريد الانضمام إليها.");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        centerCode: form.centerCode.trim(),
        halaqaId: halaqaId ?? null,
        password: form.password,
      });

      navigate("/login", {
        replace: true,
        state: { message: "تم إنشاء حسابك، سجّل الدخول للبدء." },
      });
    } catch (err) {
      setError(getErrorMessage(err) || "تعذر إنشاء الحساب.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main dir="rtl" className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-9">
          <h1 className="text-2xl font-extrabold text-slate-900">
            إنشاء حساب طالب
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            أدخل بياناتك ورمز المركز لإنشاء الحساب.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {[
              ["firstName", "الاسم الأول", "text"],
              ["lastName", "اسم العائلة", "text"],
              ["email", "البريد الإلكتروني", "email"],
              ["phoneNumber", "رقم الجوال", "tel"],
              ["centerCode", "رمز المركز", "text"],
              ["password", "كلمة المرور", "password"],
              ["confirmPassword", "تأكيد كلمة المرور", "password"],
            ].map(([name, label, type]) => (
              <div key={name}>
                <label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-700">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={updateField}
                  required
                  minLength={type === "password" ? 8 : undefined}
                  dir={type === "email" || type === "password" || name === "centerCode" ? "ltr" : undefined}
                  autoComplete={
                    name === "password" || name === "confirmPassword"
                      ? "new-password"
                      : undefined
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={checkCode}
              disabled={checking}
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            >
              {checking ? "جارٍ التحقق…" : checkedCode ? "تحديث الحلقات" : "عرض حلقات المركز"}
            </button>

            {codeNotice && (
              <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{codeNotice}</p>
            )}

            {halaqat.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-semibold text-slate-700">اختر حلقتك</legend>
                <p className="mb-2 text-xs text-slate-500">
                  لا يمكنك تغييرها بعد التسجيل إلا عن طريق إدارة المركز أو المعلم.
                </p>
                {halaqat.map((halaqa) => (
                  <label
                    key={halaqa.halaqaId}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                      halaqaId === halaqa.halaqaId
                        ? "border-emerald-700 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="halaqaId"
                      value={halaqa.halaqaId}
                      checked={halaqaId === halaqa.halaqaId}
                      onChange={() => setHalaqaId(halaqa.halaqaId)}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-800">{halaqa.halaqaName}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {halaqa.teacherName ? `المعلم: ${halaqa.teacherName}` : "بلا معلم بعد"}
                      </span>
                      {halaqa.description && (
                        <span className="block truncate text-xs text-slate-400">{halaqa.description}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {halaqa.studentCount} طالب
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <p className="text-xs leading-5 text-slate-500">
              التسجيل للطلاب فقط. اطلب رمز المركز من إدارة المركز أو معلمك.
            </p>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            لديك حساب؟{" "}
            <Link to="/login" className="font-bold text-emerald-700">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </section>

      <aside className="hidden items-center justify-center bg-emerald-800 p-12 text-center text-white lg:flex">
        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold leading-relaxed">
            ابدأ رحلتك في الحفظ
          </h2>
          <p className="mt-4 leading-8 text-emerald-100">
            انضم إلى مركزك وتابع خطة حفظك ومراجعتك.
          </p>
        </div>
      </aside>
    </main>
  );
}