import { NavLink } from "react-router";
import {
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Users,
  X,
} from "lucide-react";

const links = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true },
  { to: "/student", label: "ملفي وجدول الحفظ", icon: BookOpen },
  { to: "/centers", label: "المراكز", icon: Building2 },
  { to: "/groups", label: "الحلقات", icon: Users },
  { to: "/students", label: "الطلاب", icon: GraduationCap },
  { to: "/attendance", label: "الحضور والغياب", icon: CalendarCheck },
  { to: "/plans", label: "خطط الحفظ", icon: ClipboardList },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-40 flex w-[260px] flex-col border-l border-slate-100 bg-white transition-transform lg:translate-x-0 ${
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex h-[76px] items-center justify-between border-b px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-800 text-white">
            <BookOpen size={21} />
          </div>
          <div>
            <p className="text-lg font-extrabold">مِشكاة</p>
            <p className="text-xs text-slate-400">إدارة الحلقات القرآنية</p>
          </div>
        </div>

      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-4 text-xs font-bold text-slate-400">
          القائمة الرئيسية
        </p>

        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-800 text-white"
                  : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
              }`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
          
        ))}
      </nav>

      <div className="border-t p-4">
        <p className="font-bold">محمد العتيبي</p>
        <p className="mt-1 text-xs text-slate-400">مسؤول المركز</p>
      </div>
    </aside>
  );
}