import { Link } from "react-router";
import { CalendarCheck } from "lucide-react";
import Stats from "../../components/Stats";
import PlatformOverview from "../../components/PlatformOverview";
import { useAuth } from "../../context/AuthContext";

const adminRoles = ["PlatformAdmin", "Admin"];
const attendanceRoles = ["PlatformAdmin", "Admin", "CenterAdmin", "Teacher"];

export default function Dashboard() {
  const { user } = useAuth();
  const date = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const canRecordAttendance = attendanceRoles.includes(user?.role);

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-l from-emerald-900 via-emerald-800 to-teal-700 p-6 text-white md:flex-row md:items-center md:p-8">
        <div>
          <p className="mb-3 text-sm text-emerald-100">{date}</p>
          <h1 className="text-xl font-extrabold md:text-3xl">
            مرحباً {user?.name || "بك"} 👋
          </h1>
          <p className="mt-2 text-sm text-emerald-50/80">
            إليك ملخص النظام حسب صلاحية حسابك.
          </p>
        </div>

        <Link
          to={canRecordAttendance ? "/attendance/register" : "/attendance"}
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50"
        >
          <CalendarCheck size={18} />
          {canRecordAttendance ? "تسجيل الحضور" : "عرض سجل الحضور"}
        </Link>
      </section>

      {adminRoles.includes(user?.role) ? <PlatformOverview /> : <Stats />}
    </main>
  );
}
