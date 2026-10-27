import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/axiosClient";

function getHomePath(role) {
  switch (role) {
    case "PlatformAdmin":
      return "/platform";
    case "CenterAdmin":
      return "/center";
    case "Teacher":
      return "/teacher";
    case "Student":
      return "/student";
    default:
      return "/";
  }
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login({ email, password });
      navigate(getHomePath(user?.role), { replace: true });
     
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <main dir="rtl" className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-9">
          <h1 className="text-2xl font-extrabold text-slate-900">
            تسجيل الدخول
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            أدخل بيانات حسابك للمتابعة.
          </p>

          {location.state?.message && (
            <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {location.state.message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? "جارٍ تسجيل الدخول..." : "دخول"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            طالب جديد؟{" "}
            <Link to="/register" className="font-bold text-emerald-700">
              إنشاء حساب
            </Link>
          </p>
        </div>
      </section>

      <aside className="hidden items-center justify-center bg-emerald-800 p-12 text-center text-white lg:flex">
        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold leading-relaxed">
            حلقات القرآن
          </h2>
          <p className="mt-4 leading-8 text-emerald-100">
            تابع الحفظ والمراجعة والحضور من مكان واحد.
          </p>
        </div>
      </aside>
    </main>
  );
}
