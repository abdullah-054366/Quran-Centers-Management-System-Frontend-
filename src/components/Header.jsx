import { Menu, Bell } from "lucide-react";
import { useLocation } from "react-router";

const titles = {
  "/": "الرئيسية",
  "/student": "ملفي وجدول الحفظ",
  "/centers": "المراكز",
  "/groups": "الحلقات",
  "/students": "الطلاب",
  "/attendance": "الحضور والغياب",
  "/plans": "خطط الحفظ",
};

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "منصة مِشكاة";

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-extrabold">{title}</h1>
      </div>

      <button
        aria-label="الإشعارات"
        className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
      >
        <Bell size={19} />
      </button>
    </header>
  );
}