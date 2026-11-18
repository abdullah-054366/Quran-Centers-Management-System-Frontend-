import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Ellipsis, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMobileNav } from "../lib/navLinks";

const isPathActive = (pathname, link) =>
  link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`);

export default function MobileBottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { primary, more } = getMobileNav(user?.role);

  // يُغلق «المزيد» عند أي انتقال أو ضغط Escape.
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const moreActive = more.some((link) => isPathActive(pathname, link));
  const columns = primary.length + (more.length ? 1 : 0);
  const columnsClass = columns >= 5 ? "grid-cols-5" : columns === 4 ? "grid-cols-4" : "grid-cols-3";

  const bubble = (active, Icon) => (
    <span
      className={`grid place-items-center rounded-full transition-all duration-200 ${
        active
          ? "-mt-7 h-12 w-12 border-4 border-white bg-emerald-800 text-white shadow-lg shadow-emerald-900/25"
          : "h-8 w-12 text-slate-400"
      }`}
    >
      <Icon size={active ? 22 : 21} strokeWidth={active ? 2.5 : 1.8} />
    </span>
  );

  const labelClass = (active) =>
    `max-w-full truncate px-0.5 text-[10px] transition-colors ${
      active ? "font-extrabold text-emerald-800" : "font-medium text-slate-400"
    }`;

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="المزيد من الصفحات"
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-2xl"
            style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom), 8px) + 84px)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-800">المزيد</h2>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setMoreOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {more.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs font-semibold ${
                      isActive ? "bg-emerald-800 text-white" : "bg-slate-50 text-slate-600 hover:bg-emerald-50"
                    }`
                  }
                >
                  <Icon size={22} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        dir="rtl"
        aria-label="التنقل الرئيسي"
        className={`fixed inset-x-0 bottom-0 z-50 grid ${columnsClass} items-end overflow-visible border-t border-slate-100 bg-white px-1 pt-1 shadow-[0_-5px_20px_rgba(0,0,0,0.07)] lg:hidden`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      >
        {primary.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className="flex min-h-[58px] min-w-0 flex-col items-center justify-end gap-1"
          >
            {({ isActive }) => (
              <>
                {bubble(isActive, link.icon)}
                <span className={labelClass(isActive)}>{link.short ?? link.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {more.length > 0 && (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className="flex min-h-[58px] min-w-0 flex-col items-center justify-end gap-1"
          >
            {bubble(moreActive || moreOpen, Ellipsis)}
            <span className={labelClass(moreActive || moreOpen)}>المزيد</span>
          </button>
        )}
      </nav>
    </>
  );
}
