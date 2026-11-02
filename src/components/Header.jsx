import { Bell, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

const titles = {
  "/": "الرئيسية",
  "/student": "ملفي وجدول الحفظ",
  "/centers": "المراكز",
  "/groups": "الحلقات",
  "/students": "الطلاب",
  "/teachers": "المدرسون",
  "/attendance": "الحضور والغياب",
  "/plans": "خطط الحفظ",
};

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const title = titles[pathname] ?? "منصة مِشكاة";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-extrabold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="الإشعارات"
          className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
        >
          <Bell size={19} />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="تسجيل الخروج"
          title="تسجيل الخروج"
          className="flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">تسجيل الخروج</span>
        </button>
      </div>
    </header>
  );
}
