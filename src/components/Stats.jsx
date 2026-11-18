import { useEffect, useState } from "react";
import { getCenterCount, getActiveCentersCount } from "../api/centers";
import { getUsersCount } from "../api/users";
import { getStudents } from "../api/students";
import { getAttendance } from "../api/attendance";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  CalendarCheck,
  GraduationCap,
  Users,
} from "lucide-react";

const centerRoles = ["PlatformAdmin", "Admin", "CenterAdmin", "Teacher"];

function StatCard({ item }) {
  const Icon = item.icon;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-400">{item.label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">
            {item.value}
          </p>
        </div>

        <div className={`grid h-11 w-11 place-items-center rounded-xl ${item.color}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">{item.note}</p>
    </article>
  );
}

export default function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isPlatformAdmin = user?.role === "PlatformAdmin";
  const canViewCenterStats = centerRoles.includes(user?.role);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      if (!user?.role || !canViewCenterStats) {
        setStats([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        if (isPlatformAdmin) {
          const [activeCount, totalCount, usersCount] = await Promise.all([
            getActiveCentersCount(),
            getCenterCount(),
            getUsersCount(),
          ]);

          if (!isMounted) return;

          const totalUsers = usersCount?.count ?? usersCount?.Count ?? usersCount ?? 0;
          setStats([
            {
              label: "المراكز النشطة",
              value: activeCount,
              note: `من أصل ${totalCount} مركز`,
              icon: Building2,
              color: "bg-emerald-50 text-emerald-800",
            },
            {
              label: "إجمالي المستخدمين",
              value: totalUsers,
              note: "في جميع المراكز",
              icon: Users,
              color: "bg-sky-50 text-sky-700",
            },
          ]);
          return;
        }

        const [students, attendance] = await Promise.all([
          getStudents(),
          getAttendance(),
        ]);

        if (!isMounted) return;

        const activeStudents = students.filter((student) => student.isActive);
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Riyadh",
        }).format(new Date());
        const activeStudentIds = new Set(
          activeStudents.map((student) => student.studentId),
        );
        const presentStudentIds = new Set(
          attendance
            .filter(
              (record) =>
                record.attendanceDate?.slice(0, 10) === today &&
                record.status === 1 &&
                activeStudentIds.has(record.studentId),
            )
            .map((record) => record.studentId),
        );
        const attendanceRate = activeStudents.length
          ? Math.min(
              100,
              Math.round((presentStudentIds.size / activeStudents.length) * 100),
            )
          : 0;

        setStats([
          {
            label: "الطلاب النشطون",
            value: activeStudents.length,
            note: "في نطاق حسابك",
            icon: GraduationCap,
            color: "bg-sky-50 text-sky-700",
          },
          {
            label: "نسبة الحضور اليوم",
            value: `${attendanceRate}٪`,
            note: `${presentStudentIds.size} حاضر من أصل ${activeStudents.length} طالب نشط`,
            icon: CalendarCheck,
            color: "bg-amber-50 text-amber-700",
          },
        ]);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        if (isMounted) setStats([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [canViewCenterStats, isPlatformAdmin, user?.role]);

  if (!canViewCenterStats) return null;

  return (
    <section
      className="
        -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3
        scrollbar-hide
        sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0
        xl:grid-cols-4
      "
    >
      {isLoading
        ? [1, 2].map((item) => (
            <div
              key={item}
              className="h-32 w-full shrink-0 animate-pulse rounded-2xl border border-slate-100 bg-slate-100 sm:w-auto"
            />
          ))
        : stats.map((item) => (
            <div key={item.label} className="w-full shrink-0 snap-start sm:w-auto sm:shrink">
              <StatCard item={item} />
            </div>
          ))}
    </section>
  );
}
