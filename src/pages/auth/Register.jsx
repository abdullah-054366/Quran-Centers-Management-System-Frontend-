import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/axiosClient";
import { WirdMark, APP_NAME, APP_TAGLINE } from "../../components/Logo";

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
    <main dir="rtl" className="flex min-h-screen justify-center bg-[#F7F5EF] px-6 py-12 text-[#1B2421]">
      <section className="w-full max-w-md">
        <div className="w-full">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <WirdMark size={48} color="#0F5E4B" light="#C9A227" strokeWidth={3.5} />
              <p className="wird-wordmark text-5xl leading-tight text-[#0F5E4B]">{APP_NAME}</p>
            </div>
            <p className="mt-1 text-[15px] text-[#56625E]">{APP_TAGLINE}</p>
          </div>
          <h1 className="mt-9 text-2xl font-bold">
            إنشاء حساب طالب
          </h1>
          <p className="mt-1 text-sm text-[#56625E]">
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
                <label htmlFor={name} className="mb-2 block text-sm font-medium">
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
                  className="h-[52px] w-full rounded-xl border border-[#D9D4C6] bg-white px-4 outline-none focus:border-[#0F5E4B] focus:ring-2 focus:ring-[#0F5E4B]/15"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={checkCode}
              disabled={checking}
              className="h-12 w-full rounded-xl border-[1.5px] border-[#0F5E4B] text-sm font-bold text-[#0F5E4B] transition hover:bg-[#0F5E4B]/5 disabled:opacity-60"
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
                        ? "border-[#0F5E4B] bg-white ring-1 ring-[#0F5E4B]"
                        : "border-[#E3DFD3] bg-white hover:border-[#0F5E4B]/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="halaqaId"
                      value={halaqa.halaqaId}
                      checked={halaqaId === halaqa.halaqaId}
                      onChange={() => setHalaqaId(halaqa.halaqaId)}
                      className="h-4 w-4 accent-[#0F5E4B]"
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
              className="h-[54px] w-full rounded-2xl bg-[#0F5E4B] text-[17px] font-bold text-white transition hover:bg-[#0A4537] disabled:opacity-60"
            >
              {submitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
            </button>
          </form>

          <div className="mt-10 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#E3DFD3]" />
            <span className="text-sm text-[#56625E]">لديك حساب؟</span>
            <span className="h-px flex-1 bg-[#E3DFD3]" />
          </div>
          <Link
            to="/login"
            className="mt-4 flex h-[52px] w-full items-center justify-center rounded-2xl border-[1.5px] border-[#0F5E4B] font-bold text-[#0F5E4B] transition hover:bg-[#0F5E4B]/5"
          >
            تسجيل الدخول
          </Link>
        </div>
      </section>

    </main>
  );
}