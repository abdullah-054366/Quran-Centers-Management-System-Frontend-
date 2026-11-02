import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router";
import { getAttendance } from "../../api/attendance";

function getDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatDate(date) {
  if (!date) return "غير محدد";
  return new Date(`${String(date).slice(0, 10)}T00:00:00Z`).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDay(date) {
  if (!date) return "غير محدد";
  return new Date(`${String(date).slice(0, 10)}T00:00:00Z`).toLocaleDateString("ar-SA", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function makeDateKey(monthKey, day) {
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function getWeekNumber(dateKey) {
  return Math.ceil(Number(dateKey.slice(8, 10)) / 7);
}

function getWeekRange(monthKey, weekNumber) {
  const start = (weekNumber - 1) * 7 + 1;
  const end = Math.min(weekNumber * 7, getDaysInMonth(monthKey));
  return { start, end };
}

const statusLabels = {
  1: "حاضر",
  2: "غائب",
  3: "متأخر",
  4: "مستأذن",
};

const statusStyles = {
  1: "border-emerald-200 bg-emerald-50 text-emerald-800",
  2: "border-rose-200 bg-rose-50 text-rose-700",
  3: "border-amber-200 bg-amber-50 text-amber-800",
  4: "border-sky-200 bg-sky-50 text-sky-800",
};

export default function Attendance() {
  const today = getDateKey();
  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchAttendance() {
      try {
        const data = await getAttendance();
        const attendanceList = Array.isArray(data) ? data : data?.data ?? [];
        if (isCurrent) {
          setRecords(attendanceList);
          const latestDate = attendanceList
            .map((record) => String(record.attendanceDate || "").slice(0, 10))
            .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
            .sort()
            .at(-1);
          if (latestDate) {
            setSelectedMonth(latestDate.slice(0, 7));
            setSelectedWeek(getWeekNumber(latestDate));
            setSelectedDate(latestDate);
          }
        }
      } catch (requestError) {
        console.error("Error loading attendance records:", requestError);
        if (isCurrent) setError("تعذّر تحميل سجلات الحضور.");
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    fetchAttendance();
    return () => {
      isCurrent = false;
    };
  }, []);

  const visibleRecords = useMemo(
    () => records.filter(
      (record) => String(record.attendanceDate || "").slice(0, 10) === selectedDate,
    ),
    [records, selectedDate],
  );

  const weekCount = Math.ceil(getDaysInMonth(selectedMonth) / 7);
  const { start: weekStart, end: weekEnd } = getWeekRange(selectedMonth, selectedWeek);
  const latestRecordMonth = records
    .map((record) => String(record.attendanceDate || "").slice(0, 7))
    .filter((month) => /^\d{4}-\d{2}$/.test(month))
    .sort()
    .at(-1);
  const maximumMonth = latestRecordMonth && latestRecordMonth > today.slice(0, 7)
    ? latestRecordMonth
    : today.slice(0, 7);

  function changeMonth(amount) {
    const nextMonth = shiftMonth(selectedMonth, amount);
    if (amount > 0 && nextMonth > maximumMonth) return;

    const datesInMonth = records
      .map((record) => String(record.attendanceDate || "").slice(0, 10))
      .filter((date) => date.startsWith(`${nextMonth}-`))
      .sort();
    const targetDate = datesInMonth.at(-1) || makeDateKey(nextMonth, 1);
    setSelectedMonth(nextMonth);
    setSelectedDate(targetDate);
    setSelectedWeek(getWeekNumber(targetDate));
  }

  function changeWeek(weekNumber) {
    const { start, end } = getWeekRange(selectedMonth, weekNumber);
    const weekStartDate = makeDateKey(selectedMonth, start);
    const weekEndDate = makeDateKey(selectedMonth, end);
    const datesInWeek = records
      .map((record) => String(record.attendanceDate || "").slice(0, 10))
      .filter((date) => date >= weekStartDate && date <= weekEndDate)
      .sort();
    const targetDate = datesInWeek[0] || weekStartDate;
    setSelectedWeek(weekNumber);
    setSelectedDate(targetDate);
  }

  function changeDay(amount) {
    const nextDay = Number(selectedDate.slice(8, 10)) + amount;
    setSelectedDate(makeDateKey(selectedMonth, nextDay));
  }

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">سجل الحضور والغياب</h1>
          <p className="mt-1 text-sm text-slate-400">استعرض السجلات حسب الشهر والأسبوع واليوم.</p>
        </div>
        <Link to="/attendance/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900"><Plus size={17} />تسجيل حضور جديد</Link>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="الشهر السابق" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"><ChevronRight size={19} /></button>
          <div className="text-center"><p className="text-xs font-semibold text-slate-400">الشهر المحدد</p><p className="mt-1 text-lg font-extrabold text-emerald-800">{formatMonth(selectedMonth)}</p></div>
          <button type="button" onClick={() => changeMonth(1)} disabled={selectedMonth >= maximumMonth} aria-label="الشهر التالي" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={19} /></button>
        </div>
        <div className="py-4">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-slate-700">اختر الأسبوع</h2><span className="text-xs text-slate-400">{weekCount} أسابيع في هذا الشهر</span></div>
          <nav aria-label="أسابيع الشهر" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {Array.from({ length: weekCount }, (_, index) => index + 1).map((weekNumber) => {
              const { start, end } = getWeekRange(selectedMonth, weekNumber);
              const startDate = makeDateKey(selectedMonth, start);
              const endDate = makeDateKey(selectedMonth, end);
              const weekRecordCount = records.filter((record) => { const recordDate = String(record.attendanceDate || "").slice(0, 10); return recordDate >= startDate && recordDate <= endDate; }).length;
              const number = new Intl.NumberFormat("ar-SA").format(weekNumber);
              const dayRange = `${new Intl.NumberFormat("ar-SA").format(start)}–${new Intl.NumberFormat("ar-SA").format(end)}`;
              const selected = selectedWeek === weekNumber;
              return (
                <button key={weekNumber} type="button" aria-pressed={selected} onClick={() => changeWeek(weekNumber)} className={`flex min-h-[72px] flex-col items-start justify-center rounded-xl border px-3 py-2 text-right transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${selected ? "border-emerald-800 bg-emerald-800 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"}`}>
                  <span className="text-sm font-extrabold">الأسبوع {number}</span><span className={`mt-1 text-[11px] ${selected ? "text-emerald-100" : "text-slate-400"}`}>الأيام {dayRange} · {new Intl.NumberFormat("ar-SA").format(weekRecordCount)} سجل</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e3d9b3] bg-[#fffdf4] p-3 sm:px-4">
          <button type="button" onClick={() => changeDay(-1)} disabled={Number(selectedDate.slice(8, 10)) <= weekStart} aria-label="اليوم السابق" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-[#796b43] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b99b42] disabled:cursor-not-allowed disabled:opacity-35 sm:px-3"><ChevronRight size={18} /><span>السابق</span></button>
          <div className="min-w-0 text-center"><p className="text-[11px] font-semibold text-[#9b8953]">اليوم المحدد · الأسبوع {new Intl.NumberFormat("ar-SA").format(selectedWeek)}</p><p className="mt-0.5 truncate text-sm font-extrabold text-[#655a39]">{formatDay(selectedDate)}، {formatDate(selectedDate)}</p></div>
          <button type="button" onClick={() => changeDay(1)} disabled={Number(selectedDate.slice(8, 10)) >= weekEnd} aria-label="اليوم التالي" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-[#796b43] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b99b42] disabled:cursor-not-allowed disabled:opacity-35 sm:px-3"><span>التالي</span><ChevronLeft size={18} /></button>
        </div>
      </section>
      <section className="relative overflow-hidden rounded-[26px] border border-[#c8b66c] bg-[#fffdf4] p-3 shadow-[0_12px_32px_rgba(112,91,34,0.14)] sm:p-5">
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-16 text-5xl text-[#c8b66c]/15">❋</span>
        <span aria-hidden="true" className="pointer-events-none absolute bottom-4 left-4 text-6xl text-[#c8b66c]/15">❋</span>

        <div className="relative mb-4 border-b border-[#d9cd91] px-3 pb-4 pt-2 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-[#f4edcf] text-[#806d34]">
            <CalendarCheck size={20} />
          </div>
          <h2 className="text-lg font-extrabold text-[#75612b] sm:text-xl">جدول الحضور والغياب</h2>
          <p className="mt-1 text-xs text-[#9b8953]">{formatMonth(selectedMonth)} · الأسبوع {selectedWeek}</p>
          <p className="mt-2 text-xs font-semibold text-[#8b7840]">{visibleRecords.length} سجل لهذا اليوم</p>
        </div>

        {loading ? (
          <p className="relative p-10 text-center text-sm text-[#8b7840]">جارٍ تحميل سجلات الحضور…</p>
        ) : error ? (
          <p role="alert" className="relative p-10 text-center text-sm text-rose-600">{error}</p>
        ) : visibleRecords.length === 0 ? (
          <p className="relative p-10 text-center text-sm text-[#8b7840]">لا توجد سجلات لهذا اليوم.</p>
        ) : (
          <div className="relative overflow-x-auto rounded-xl border border-[#d7c88c] bg-[#fffef9]">
            <table className="w-full min-w-[620px] border-collapse text-right text-sm text-[#655a39]">
              <thead className="bg-[#f6f0d9] text-xs text-[#76642f]">
                <tr>
                  <th className="border border-[#d7c88c] px-4 py-3 font-extrabold">الطالب</th>
                  <th className="border border-[#d7c88c] px-4 py-3 font-extrabold">اليوم</th>
                  <th className="border border-[#d7c88c] px-4 py-3 font-extrabold">التاريخ</th>
                  <th className="border border-[#d7c88c] px-4 py-3 font-extrabold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record, index) => (
                  <tr key={record.attendanceId} className={index % 2 === 0 ? "bg-[#fffef9]" : "bg-[#fcfaef]"}>
                    <td className="border border-[#e1d8b4] px-4 py-3 font-bold text-[#5c512f]">{record.studentName || "غير معروف"}</td>
                    <td className="border border-[#e1d8b4] px-4 py-3 font-semibold">{formatDay(record.attendanceDate)}</td>
                    <td className="border border-[#e1d8b4] px-4 py-3">{formatDate(record.attendanceDate)}</td>
                    <td className="border border-[#e1d8b4] px-4 py-3 text-center"><span className={`inline-flex min-w-16 justify-center rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyles[record.status] || "border-[#d7c88c] bg-[#f7f1dc] text-[#76642f]"}`}>{statusLabels[record.status] || "غير محدد"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}



