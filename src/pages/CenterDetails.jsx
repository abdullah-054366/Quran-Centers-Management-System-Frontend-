import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowRight, BookOpen, CalendarCheck, GraduationCap, Layers, UserRound } from "lucide-react";
import { getCenterOverview } from "../api/centers";
import { apiErrorMessage } from "../lib/apiError";
import { StatusBadge, formatDate } from "../components/AdminUi";

function Kpi({ icon: Icon, label, value, note, tone = "bg-emerald-50 text-emerald-800" }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
          <Icon size={21} />
        </div>
      </div>
      {note && <p className="mt-3 text-xs text-slate-400">{note}</p>}
    </article>
  );
}

export function daysSince(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const riyadhToday = new Date(now.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const diff = (Date.parse(riyadhToday) - Date.parse(dateString)) / 86400000;
  return Math.max(0, Math.round(diff));
}

export default function CenterDetails() {
  const { centerId } = useParams();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCenterOverview(centerId)
      .then((data) => alive && (setOverview(data), setError("")))
      .catch((err) => alive && setError(apiErrorMessage(err, "تعذّر تحميل بيانات المركز.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [centerId]);

  if (loading) return <p dir="rtl" className="p-10 text-center text-sm text-slate-500">جارٍ التحميل…</p>;

  if (error || !overview) {
    return (
      <main dir="rtl" className="mx-auto max-w-3xl space-y-4 p-6">
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error || "المركز غير موجود."}</p>
        <Link to="/centers" className="text-sm font-semibold text-emerald-800">العودة إلى المراكز</Link>
      </main>
    );
  }

  const { center } = overview;
  const rate = overview.monthAttendanceRecords
    ? Math.round((overview.monthAttendedRecords / overview.monthAttendanceRecords) * 100)
    : null;
  const idleDays = daysSince(overview.lastActivityDate);
  const idle = center.isActive && (idleDays === null || idleDays >= 14);

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <Link to="/centers" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline">
        <ArrowRight size={16} /> كل المراكز
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-800">{center.centerName}</h1>
            <StatusBadge active={center.isActive} />
          </div>
          <p className="mt-2 text-sm text-slate-500">سُجّل في {formatDate(center.createdAt)}</p>
        </div>
        <div className="text-left">
          <p className="text-xs text-slate-400">كود الانضمام</p>
          <p dir="ltr" className={`font-mono text-lg font-bold tracking-widest ${center.codeEnabled ? "text-emerald-800" : "text-slate-400 line-through"}`}>
            {center.centerCode}
          </p>
          <p className="text-xs text-slate-400">{center.codeEnabled ? "الكود يعمل" : "الكود معطّل"}</p>
        </div>
      </header>

      {idle && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {idleDays === null
            ? "هذا المركز لم يسجّل أي حضور أو حفظ حتى الآن."
            : `لا نشاط في هذا المركز منذ ${idleDays} يوماً.`}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi icon={GraduationCap} label="الطلاب النشطون" value={overview.activeStudents} note={`من أصل ${overview.totalStudents} طالب`} />
        <Kpi icon={UserRound} label="المعلمون النشطون" value={overview.activeTeachers} tone="bg-sky-50 text-sky-700" />
        <Kpi icon={Layers} label="الحلقات النشطة" value={overview.activeHalaqat} tone="bg-violet-50 text-violet-700" />
        <Kpi
          icon={CalendarCheck}
          label="نسبة الحضور هذا الشهر"
          value={rate === null ? "—" : `${rate}%`}
          note={`${overview.monthAttendedRecords} حاضر/متأخر من ${overview.monthAttendanceRecords} تسجيل`}
          tone="bg-amber-50 text-amber-700"
        />
        <Kpi icon={BookOpen} label="سجلات الحفظ والمراجعة هذا الشهر" value={overview.monthMemorizationRecords} tone="bg-rose-50 text-rose-700" />
        <Kpi
          icon={CalendarCheck}
          label="آخر نشاط"
          value={overview.lastActivityDate ? formatDate(overview.lastActivityDate) : "—"}
          note={idleDays === null ? undefined : idleDays === 0 ? "اليوم" : `قبل ${idleDays} يوماً`}
          tone="bg-slate-100 text-slate-600"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-2">
          <h2 className="border-b border-slate-100 px-5 py-4 text-base font-extrabold text-slate-800">الحلقات</h2>
          {overview.halaqat.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">لا توجد حلقات في هذا المركز.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">الحلقة</th>
                    <th className="px-5 py-3 font-semibold">المعلم</th>
                    <th className="px-5 py-3 font-semibold">الطلاب</th>
                    <th className="px-5 py-3 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.halaqat.map((halaqa) => (
                    <tr key={halaqa.halaqaId}>
                      <td className="px-5 py-3 font-semibold text-slate-800">{halaqa.halaqaName}</td>
                      <td className="px-5 py-3 text-slate-600">{halaqa.teacherName || "بدون معلم"}</td>
                      <td className="px-5 py-3 text-slate-600">{halaqa.studentCount}</td>
                      <td className="px-5 py-3"><StatusBadge active={halaqa.isActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 px-5 py-4 text-base font-extrabold text-slate-800">مديرو المركز</h2>
          {overview.admins.length === 0 ? (
            <div className="space-y-2 p-5 text-sm text-slate-500">
              <p>لا يوجد مدير لهذا المركز.</p>
              <Link to="/users" className="font-semibold text-emerald-800 hover:underline">إضافة مدير من صفحة المستخدمين</Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overview.admins.map((admin) => (
                <li key={admin.userId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{admin.fullName}</p>
                    <p dir="ltr" className="truncate text-right text-xs text-slate-500">{admin.email}</p>
                  </div>
                  <StatusBadge active={admin.isActive} on="نشط" off="معطّل" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
