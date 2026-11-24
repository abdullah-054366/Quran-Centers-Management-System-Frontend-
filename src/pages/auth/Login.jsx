import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/axiosClient";
import { WirdMark, APP_NAME, APP_TAGLINE } from "../../components/Logo";

function getHomePath(role) {
  return role === "Student" ? "/student" : "/";
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
      const requestedLocation = location.state?.from;
      const requestedPath = requestedLocation?.pathname;
      const destination = requestedPath && requestedPath !== "/login" && requestedPath !== "/register"
        ? `${requestedPath}${requestedLocation.search ?? ""}${requestedLocation.hash ?? ""}`
        : getHomePath(user?.role);
      navigate(destination, { replace: true });
     
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F7F5EF] px-6 py-12 text-[#1B2421]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <WirdMark size={72} color="#0F5E4B" light="#C9A227" strokeWidth={3.5} />
          <p className="wird-wordmark mt-1 text-6xl leading-tight text-[#0F5E4B]">{APP_NAME}</p>
          <p className="mt-1 text-[15px] text-[#56625E]">{APP_TAGLINE}</p>
        </div>

        <h1 className="mt-10 text-2xl font-bold">تسجيل الدخول</h1>
        <p className="mt-1 text-sm text-[#56625E]">أدخل بيانات حسابك للمتابعة.</p>

        {location.state?.message && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            {location.state.message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
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
              placeholder="name@example.com"
              className="h-[52px] w-full rounded-xl border border-[#D9D4C6] bg-white px-4 outline-none focus:border-[#0F5E4B] focus:ring-2 focus:ring-[#0F5E4B]/15"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
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
              placeholder="••••••••"
              className="h-[52px] w-full rounded-xl border border-[#D9D4C6] bg-white px-4 outline-none focus:border-[#0F5E4B] focus:ring-2 focus:ring-[#0F5E4B]/15"
            />
          </div>

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
            {submitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-10 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#E3DFD3]" />
          <span className="text-sm text-[#56625E]">طالب جديد؟</span>
          <span className="h-px flex-1 bg-[#E3DFD3]" />
        </div>
        <Link
          to="/register"
          className="mt-4 flex h-[52px] w-full items-center justify-center rounded-2xl border-[1.5px] border-[#0F5E4B] font-bold text-[#0F5E4B] transition hover:bg-[#0F5E4B]/5"
        >
          التسجيل برمز المركز
        </Link>
      </div>
    </main>
  );
}
