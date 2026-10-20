import { NavLink } from "react-router";
import {
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";

const tabs = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true },
  { to: "/memorization", label: "الحفظ", icon: BookOpen },
  { to: "/attendance", label: "الحضور", icon: CalendarCheck },
  { to: "/students", label: "الطلاب", icon: GraduationCap },
  { to: "/plans", label: "الخطط", icon: ClipboardList },
];

export default function MobileBottomNav() {
  return (
    <nav
      dir="rtl"
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end overflow-visible border-t border-slate-100 bg-white px-1 pt-1 shadow-[0_-5px_20px_rgba(0,0,0,0.07)] lg:hidden"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex min-h-[58px] flex-col items-center justify-end gap-1"
        >
          {({ isActive }) => (
            <>
              <span
                className={`grid place-items-center rounded-full transition-all duration-200 ${
                  isActive
                    ? "-mt-8 h-14 w-14 border-4 border-white bg-emerald-800 text-white shadow-lg shadow-emerald-900/25"
                    : "h-8 w-12 text-slate-400"
                }`}
              >
                <Icon size={isActive ? 22 : 21} strokeWidth={isActive ? 2.5 : 1.8} />
              </span>

              <span
                className={`text-[10px] transition-colors ${
                  isActive
                    ? "font-extrabold text-emerald-800"
                    : "font-medium text-slate-400"
                }`}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}