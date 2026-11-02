import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

function SessionLoading() {
  return (
    <main
      dir="rtl"
      className="grid min-h-screen place-items-center bg-[#f6f8f6] text-emerald-900"
      role="status"
      aria-live="polite"
    >
      <p className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold shadow-sm">
        جارٍ التحقق من الجلسة...
      </p>
    </main>
  );
}

export default function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function GuestOnly({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SessionLoading />;
  if (user) return <Navigate to="/" replace />;

  return children;
}
