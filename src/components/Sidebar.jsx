import { NavLink } from "react-router";
import { useAuth } from "../context/AuthContext";
import { WirdMark, APP_NAME, APP_TAGLINE } from "./Logo";
import { getNavLinks } from "../lib/navLinks";

const ROLE_TITLES = {
  PlatformAdmin: "مدير النظام",
  Admin: "مدير النظام",
  CenterAdmin: "مسؤول المركز",
  Teacher: "معلم",
  Student: "طالب",
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const visibleLinks = getNavLinks(user?.role);

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-40 flex w-[260px] flex-col border-l border-slate-100 bg-white transition-transform lg:translate-x-0 ${
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex h-[76px] items-center justify-between border-b px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-800 text-white">
            <WirdMark size={28} color="#ffffff" />
          </div>
          <div>
            <p className="wird-wordmark text-2xl leading-tight text-emerald-800">{APP_NAME}</p>
            <p className="text-xs text-slate-400">{APP_TAGLINE}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-4 text-xs font-bold text-slate-400">
          القائمة الرئيسية
        </p>

        {visibleLinks.map(({ to, label, icon: Icon, end }) => (
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
        <p className="truncate font-bold">{user?.fullName || user?.email}</p>
        <p className="mt-1 text-xs text-slate-400">{ROLE_TITLES[user?.role] ?? ""}</p>
      </div>
    </aside>
  );
}
