import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/axiosClient";

export default function Register() {
  const { register } = useAuth();
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

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
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