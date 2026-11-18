import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Building2, CalendarCheck, GraduationCap, Layers, UserRound, Users } from "lucide-react";
import { getPlatformOverview } from "../api/centers";
import { apiErrorMessage } from "../lib/apiError";
import { formatDate } from "./AdminUi";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const monthLabel = (key) => MONTHS[Number(key.split("-")[1]) - 1] ?? key;

function Kpi({ icon: Icon, label, value, note, tone }) {
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

function GrowthChart({ points }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.centers, p.students]));
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-slate-800">نمو المنصة (تراكمي)</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-700" /> طلاب</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> مراكز</span>
        </div>
      </div>
      <div className="grid h-44 grid-cols-6 items-end gap-2" role="img" aria-label="رسم بياني لنمو الطلاب والمراكز آخر 6 أشهر">
        {points.map((point) => (
          <div key={point.month} className="flex h-full flex-col justify-end">
            <div className="flex flex-1 items-end justify-center gap-1">
              <div className="relative w-1/2 max-w-[22px] rounded-t bg-emerald-700" style={{ height: `${(point.students / max) * 100}%`, minHeight: point.students ? 3 : 0 }} title={`${point.students} طالب`}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600">{point.students}</span>
              </div>
              <div className="relative w-1/2 max-w-[22px] rounded-t bg-sky-500" style={{ height: `${(point.centers / max) * 100}%`, minHeight: point.centers ? 3 : 0 }} title={`${point.centers} مركز`}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600">{point.centers}</span>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">{monthLabel(point.month)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PlatformOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getPlatformOverview()
      .then((result) => alive && setData(result))
      .catch((err) => alive && setError(apiErrorMessage(err, "تعذّر تحميل إحصاءات المنصة.")));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="py-10 text-center text-sm text-slate-500">جارٍ تحميل الإحصاءات…</p>;

  const rate = data.monthAttendanceRecords
    ? Math.round((data.monthAttendedRecords / data.monthAttendanceRecords) * 100)
    : null;
  const maxActivity = Math.max(1, ...data.topCenters.map((c) => c.monthActivity));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi icon={Building2} label="المراكز النشطة" value={data.activeCenters} note={`من أصل ${data.totalCenters} مركز`} tone="bg-emerald-50 text-emerald-800" />
        <Kpi icon={GraduationCap} label="الطلاب النشطون" value={data.activeStudents} note={`من أصل ${data.totalStudents} طالب`} tone="bg-sky-50 text-sky-700" />
        <Kpi icon={UserRound} label="المعلمون" value={data.totalTeachers} tone="bg-violet-50 text-violet-700" />
        <Kpi icon={Layers} label="الحلقات" value={data.totalHalaqat} tone="bg-amber-50 text-amber-700" />
        <Kpi icon={Users} label="إجمالي المستخدمين" value={data.totalUsers} tone="bg-slate-100 text-slate-600" />
        <Kpi
          icon={CalendarCheck}
          label="نسبة الحضور هذا الشهر"
          value={rate === null ? "—" : `${rate}%`}
          note={`${data.monthAttendedRecords} من ${data.monthAttendanceRecords} تسجيل`}
          tone="bg-rose-50 text-rose-700"
        />
      </section>

      <GrowthChart points={data.growth} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold text-slate-800">أكثر المراكز نشاطاً هذا الشهر</h2>
          {data.topCenters.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">لا نشاط مسجّل هذا الشهر بعد.</p>
          ) : (
            <ul className="space-y-3">
              {data.topCenters.map((center) => (
                <li key={center.centerId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Link to={`/centers/${center.centerId}`} className="font-semibold text-slate-800 hover:text-emerald-700">{center.centerName}</Link>
                    <span className="text-xs text-slate-500">{center.monthActivity} عملية · {center.activeStudents} طالب</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${(center.monthActivity / maxActivity) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-extrabold text-slate-800">مراكز بلا نشاط</h2>
          <p className="mb-4 text-xs text-slate-400">مراكز نشطة لم تسجّل حضوراً أو حفظاً منذ 14 يوماً أو أكثر.</p>
          {data.idleCenters.length === 0 ? (
            <p className="py-6 text-center text-sm text-emerald-700">كل المراكز النشطة تعمل بانتظام.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.idleCenters.map((center) => (
                <li key={center.centerId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link to={`/centers/${center.centerId}`} className="truncate font-semibold text-slate-800 hover:text-emerald-700">{center.centerName}</Link>
                  <span className="shrink-0 text-xs text-amber-700">
                    {center.lastActivityDate ? `آخر نشاط ${formatDate(center.lastActivityDate)}` : "لم يبدأ بعد"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
