import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, Pencil, Printer } from "lucide-react";
import { Link, useParams } from "react-router";
import { getSurahMeta } from "quran-meta/hafs";
import { getAttendance } from "../../api/attendance";
import { getMemorizationRecords } from "../../api/memorization";
import { DEFAULT_STUDY_DAYS, getStudyDays } from "../../api/studentRecord";
import ayahLines from "../../data/ayahLines.json";
import { aggregateRecords, createLineCalculator } from "../../lib/quranLines";
import { buildXlsxBlob, downloadBlob } from "../../lib/xlsx";
import {
  WEEKDAY_NAMES, buildMonthRows, countAttendedDays, formatAmount, mergeSessionRecords, normalizeRecord, toDateKey,
} from "../../lib/studentRecord";

const calculator = createLineCalculator(ayahLines);
const fmt = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
const stripTashkeel = (text) => text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
const surahName = (n) => stripTashkeel(getSurahMeta(n).name);
const dash = <span className="text-slate-300">—</span>;

const controlClass =
  "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";

function todayMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit" })
    .format(new Date()).slice(0, 7);
}

// نفس ألوان شارات الحالة في صفحة الحضور والغياب
const statusLabels = { 1: "حاضر", 2: "غائب", 3: "متأخر", 4: "مستأذن" };
const statusStyles = {
  1: "border-emerald-200 bg-emerald-50 text-emerald-800",
  2: "border-rose-200 bg-rose-50 text-rose-700",
  3: "border-amber-200 bg-amber-50 text-amber-800",
  4: "border-sky-200 bg-sky-50 text-sky-800",
};

function toMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// التقييم والملاحظات مخزّنان في Notes بصيغة "التقييم: X — ملاحظة".
function gradeOf(notes) {
  return String(notes || "").match(/التقييم:\s*(.*?)(?:\s+—\s+|$)/)?.[1] || "";
}

function EntryLine({ entry, tone }) {
  if (entry.error) return <p className="text-xs text-rose-600">سجل غير صالح: {entry.error}</p>;
  const same = entry.fromSurah === entry.toSurah;
  return (
    <p className="leading-6">
      <span className="text-slate-700">
        {surahName(entry.fromSurah)} {entry.fromAyah}
        {same ? `–${entry.toAyah}` : ` ← ${surahName(entry.toSurah)} ${entry.toAyah}`}
      </span>{" "}
      <span className={`font-bold ${tone}`} title={`${fmt(entry.pages)} صفحة · ${entry.ayahCount} آية`}>
        {formatAmount(entry.lines)}
      </span>
    </p>
  );
}

function SummaryItem({ label, value, tone = "text-slate-900", note }) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="text-xs text-slate-500 print:text-[10px]">{label}</span>
      <span className={`text-2xl font-extrabold print:text-sm ${tone}`}>{value}</span>
      {note && <span className="text-[11px] text-slate-400 print:hidden">{note}</span>}
    </div>
  );
}

function StatsBlock({ title, stats }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <h3 className="text-sm font-extrabold text-slate-700">{title}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-slate-400">صفحات كاملة</dt><dd className="font-extrabold text-slate-800">{fmt(stats.fullPages)}</dd></div>
        <div><dt className="text-xs text-slate-400">عدد السجلات</dt><dd className="font-extrabold text-slate-800">{fmt(stats.records ?? 0)}</dd></div>
        <div className="col-span-2"><dt className="text-xs text-slate-400">الإجمالي</dt><dd className="font-extrabold text-emerald-800" title={`${fmt(stats.decimalPages)} صفحة`}>{stats.totalLines > 0 ? formatAmount(stats.totalLines) : "0"}</dd></div>
      </dl>
    </div>
  );
}

export default function StudentRecord() {
  const [attendance, setAttendance] = useState([]);
  const [rawRecords, setRawRecords] = useState([]);
  const [studyDays, setStudyDays] = useState(DEFAULT_STUDY_DAYS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { studentId: routeStudentId } = useParams();
  const [studentId, setStudentId] = useState(routeStudentId ? Number(routeStudentId) : null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(todayMonth());
  const [showStats, setShowStats] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  // نطاق جلب سجلات الحفظ: الشهر المعروض + النطاق المخصص (إن وُجد).
  // الخادم يعيد آخر 200 سجل فقط بلا فلتر، لذلك نطلب التاريخ صراحةً.
  const [y, m] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  const fetchFrom = [monthStart, rangeFrom].filter(Boolean).sort()[0];
  const fetchTo = [monthEnd, rangeTo].filter(Boolean).sort().at(-1);

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const [att, days] = await Promise.all([getAttendance(), getStudyDays()]);
        if (!current) return;
        setAttendance(Array.isArray(att) ? att : att?.data ?? []);
        setStudyDays(days);
      } catch (e) {
        console.error("Error loading attendance:", e);
        if (current) setError("تعذّر تحميل سجل الطالب.");
      }
    })();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    (async () => {
      try {
        const rec = await getMemorizationRecords({ from: fetchFrom, to: fetchTo });
        if (!current) return;
        setRawRecords(Array.isArray(rec) ? rec : rec?.data ?? []);
        setError("");
      } catch (e) {
        console.error("Error loading memorization records:", e);
        if (current) setError("تعذّر تحميل سجل الطالب.");
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; };
  }, [fetchFrom, fetchTo]);

  // الجلسة التي تضم عدة سور تظهر سجلاً واحداً: من أول سورة وآية إلى آخر سورة وآية.
  const records = useMemo(
    () =>
      mergeSessionRecords(
        rawRecords.map(normalizeRecord).filter((r) => r.type),
        (surah) => getSurahMeta(surah).ayahCount,
      ),
    [rawRecords],
  );

  const students = useMemo(() => {
    const map = new Map();
    for (const a of attendance) if (!map.has(a.studentId)) map.set(a.studentId, a.studentName || "غير معروف");
    for (const r of records) if (!map.has(r.studentId)) map.set(r.studentId, r.studentName || "غير معروف");
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [attendance, records]);

  const selectedId = studentId ?? students[0]?.id ?? null;
  const student = students.find((s) => s.id === selectedId);
  const matches = query.trim() ? students.filter((s) => s.name.includes(query.trim())).slice(0, 6) : [];

  const studentAttendance = useMemo(() => attendance.filter((a) => a.studentId === selectedId), [attendance, selectedId]);
  const studentRecords = useMemo(() => records.filter((r) => r.studentId === selectedId), [records, selectedId]);

  const rows = useMemo(
    () => buildMonthRows({ monthKey: month, studyDays, attendance: studentAttendance, records: studentRecords, calculator }),
    [month, studyDays, studentAttendance, studentRecords],
  );

  const monthStats = useMemo(
    () => aggregateRecords(studentRecords, calculator, { from: `${month}-01`, to: `${month}-31` }),
    [studentRecords, month],
  );
  const rangeStats = useMemo(
    () => (rangeFrom || rangeTo
      ? aggregateRecords(studentRecords, calculator, { from: rangeFrom || undefined, to: rangeTo || undefined })
      : null),
    [studentRecords, rangeFrom, rangeTo],
  );

  const attendedDays = countAttendedDays(
    studentAttendance
      .filter((a) => toDateKey(a.attendanceDate).startsWith(month))
      .map((a) => ({ status: a.status })),
  );
  const monthNumber = Number(month.slice(5, 7));
  const monthName = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, 1)));
  const monthLabel = `${monthName} ${y}`;
  const dateLabel = (date) => `${Number(date.slice(8, 10))} ${monthName}`;
  const absentDays = rows.filter((row) => row.status === 2).length;
  const studyDayCount = rows.filter((row) => row.isStudyDay).length;
  const amountText = (lines) => (lines > 0 ? formatAmount(lines) : "0");
  const shiftMonth = (delta) => setMonth(toMonthKey(new Date(Date.UTC(y, m - 1 + delta, 1))));

  useEffect(() => {
    if (!isPrinting) return undefined;
    const done = () => setIsPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [isPrinting]);

  function handleExportExcel() {
    const typeText = (entry) => (entry.type === "review" ? "مراجعة" : "حفظ");
    const sheet = [
      [{ v: "سجل طالب", b: true }],
      [{ v: "اسم الطالب", b: true }, student?.name ?? ""],
      [{ v: "الشهر", b: true }, month],
      [{ v: "أيام الحضور", b: true }, attendedDays],
      [],
      ["اليوم", "التسجيل", "التاريخ", "النوع", "من", "إلى", "عدد الآيات", "المقدار", "الصفحات (رقم)"].map((v) => ({ v, b: true })),
    ];

    for (const row of rows) {
      const status = row.status ? statusLabels[row.status] ?? "غير محدد" : row.isStudyDay ? "" : "إجازة";
      if (row.entries.length === 0) {
        sheet.push([WEEKDAY_NAMES[row.weekday], status, row.date]);
        continue;
      }
      row.entries.forEach((entry, i) => {
        const first = i === 0;
        if (entry.error) {
          sheet.push([first ? WEEKDAY_NAMES[row.weekday] : "", first ? status : "", row.date, typeText(entry), `سجل غير صالح: ${entry.error}`]);
          return;
        }
        sheet.push([
          first ? WEEKDAY_NAMES[row.weekday] : "",
          first ? status : "",
          row.date,
          typeText(entry),
          `${surahName(entry.fromSurah)} - ${entry.fromAyah}`,
          `${surahName(entry.toSurah)} - ${entry.toAyah}`,
          entry.ayahCount,
          formatAmount(entry.lines),
          entry.pages,
        ]);
      });
    }

    sheet.push([]);
    sheet.push([{ v: "إجمالي الحفظ", b: true }, "", "", "", "", "", "", formatAmount(monthStats.memorization.totalLines), monthStats.memorization.decimalPages]);
    sheet.push([{ v: "إجمالي المراجعة", b: true }, "", "", "", "", "", "", formatAmount(monthStats.review.totalLines), monthStats.review.decimalPages]);

    const blob = buildXlsxBlob({
      sheetName: "سجل الطالب",
      rows: sheet,
      colWidths: [12, 12, 14, 10, 22, 22, 12, 18, 14],
    });
    const safeName = (student?.name ?? "طالب").replace(/[\\/:*?"<>|]/g, " ").trim();
    downloadBlob(blob, `سجل ${safeName} ${month}.xlsx`);
  }

  return (
    <main dir="rtl" className="print-one-page mx-auto max-w-6xl space-y-6 print:space-y-3">
      {/* الترويسة: اسم الطالب + الشهر + الأوامر */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">سجل الطالب</p>
          <h1 className="mt-1 truncate text-3xl font-extrabold text-slate-900">{student?.name ?? "—"}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="الشهر السابق" className="grid h-11 w-11 place-items-center text-slate-500 hover:text-emerald-800">
              <ChevronRight size={18} />
            </button>
            <label className="relative min-w-32 cursor-pointer text-center text-sm font-bold text-slate-800">
              {monthLabel}
              <input
                type="month"
                value={month}
                aria-label="الشهر"
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => { if (e.target.value) setMonth(e.target.value); }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="الشهر التالي" className="grid h-11 w-11 place-items-center text-slate-500 hover:text-emerald-800">
              <ChevronLeft size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsPrinting(true)}
            disabled={loading || Boolean(error) || !student}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={16} /> طباعة
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || Boolean(error) || !student}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet size={16} /> تصدير Excel
          </button>
        </div>
      </header>

      {/* البحث عن طالب + تعديل التسجيل */}
      <div className="flex flex-col gap-3 sm:flex-row print:hidden">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث عن طالب ..."
            aria-label="بحث عن طالب"
            className={`${controlClass} w-full`}
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => { setStudentId(s.id); setQuery(""); }}
                    className="w-full px-4 py-2.5 text-right text-sm hover:bg-emerald-50"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          to="/attendance"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-emerald-50"
        >
          <Pencil size={16} /> تعديل التسجيل
        </Link>
      </div>

      {/* ترويسة الطباعة فقط */}
      <div className="hidden print:block">
        <div className="flex items-end justify-between border-b-2 border-emerald-700 pb-2">
          <div>
            <p className="text-[10px] font-semibold text-emerald-700">وِرْد · إدارة الحلقات القرآنية</p>
            <h1 className="text-lg font-extrabold text-slate-900">سجل الطالب الشهري</h1>
          </div>
          <p className="text-sm font-bold text-slate-800">{monthLabel}</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <p className="rounded border border-slate-300 px-3 py-1.5"><span className="text-slate-500">الطالب: </span><strong>{student?.name ?? "—"}</strong></p>
          <p className="rounded border border-slate-300 px-3 py-1.5"><span className="text-slate-500">أيام الحضور: </span><strong>{attendedDays} من {studyDayCount}</strong></p>
        </div>
      </div>

      {/* ملخص الشهر */}
      <section className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-200 rounded-2xl border border-slate-200 bg-white lg:grid-cols-4 print:grid-cols-4 print:rounded print:border-slate-300">
        <SummaryItem label="أيام الحضور" value={<>{attendedDays} <span className="text-sm font-medium text-slate-400 print:text-[10px]">من {studyDayCount}</span></>} />
        <SummaryItem label="أيام الغياب" value={absentDays} tone={absentDays ? "text-rose-700" : "text-slate-900"} />
        <SummaryItem label="الحفظ الجديد" value={amountText(monthStats.memorization.totalLines)} tone="text-emerald-800" note={`${fmt(monthStats.memorization.records ?? 0)} سجل`} />
        <SummaryItem label="المراجعة" value={amountText(monthStats.review.totalLines)} tone="text-sky-800" note={`${fmt(monthStats.review.records ?? 0)} سجل`} />
      </section>

      {/* الجدول: كل أيام الشهر */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:rounded-none print:border-0">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">جارٍ تحميل السجل…</p>
        ) : error ? (
          <p role="alert" className="p-10 text-center text-sm text-rose-600">{error}</p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="print-compact w-full min-w-[760px] border-collapse text-sm text-slate-700 print:min-w-0 print:border print:border-slate-300">
              <thead className="bg-slate-100 print:bg-slate-100">
                <tr className="text-xs text-slate-600">
                  <th className="px-5 py-3.5 text-right font-bold print:border print:border-slate-300">التاريخ</th>
                  <th className="px-3 py-3.5 text-center font-bold print:border print:border-slate-300">الحضور</th>
                  <th className="px-3 py-3.5 text-right font-bold print:border print:border-slate-300">الحفظ الجديد</th>
                  <th className="px-3 py-3.5 text-right font-bold print:border print:border-slate-300">المراجعة</th>
                  <th className="px-5 py-3.5 text-center font-bold print:border print:border-slate-300">التقييم</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const memorization = row.entries.filter((entry) => entry.type === "memorization");
                  const review = row.entries.filter((entry) => entry.type === "review");
                  const grades = [...new Set(row.entries.map((entry) => gradeOf(entry.notes)).filter(Boolean))];
                  const holiday = !row.isStudyDay && !row.status && row.entries.length === 0;
                  const cell = "border-t border-slate-100 align-top print:border print:border-slate-300";
                  return (
                    <tr key={row.date} className={holiday ? "bg-slate-50/70 text-slate-400" : ""}>
                      <td className={`${cell} whitespace-nowrap px-5 py-3.5`}>
                        <span className={`font-bold ${holiday ? "text-slate-400" : "text-slate-900"}`}>{dateLabel(row.date)}</span>{" "}
                        <span className="text-xs text-slate-400">{WEEKDAY_NAMES[row.weekday]}</span>
                      </td>
                      <td className={`${cell} px-3 py-3.5 text-center`}>
                        {row.status ? (
                          <span className={`inline-flex min-w-16 justify-center rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[row.status] ?? ""}`}>
                            {statusLabels[row.status] ?? "غير محدد"}
                          </span>
                        ) : holiday ? (
                          <span className="text-xs">إجازة</span>
                        ) : dash}
                      </td>
                      <td className={`${cell} px-3 py-3.5`}>
                        {memorization.length ? memorization.map((entry, i) => <EntryLine key={i} entry={entry} tone="text-emerald-800" />) : dash}
                      </td>
                      <td className={`${cell} px-3 py-3.5`}>
                        {review.length ? review.map((entry, i) => <EntryLine key={i} entry={entry} tone="text-sky-800" />) : dash}
                      </td>
                      <td className={`${cell} px-5 py-3.5 text-center text-slate-600`}>{grades.length ? grades.join(" / ") : dash}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-sm text-slate-500">لا توجد أيام لعرضها في هذا الشهر.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* خانات التوقيع: الطباعة فقط */}
      <div className="mt-6 hidden grid-cols-3 gap-8 text-[11px] text-slate-600 print:grid">
        <p className="border-t border-slate-400 pt-1.5">توقيع المعلم</p>
        <p className="border-t border-slate-400 pt-1.5">توقيع ولي الأمر</p>
        <p className="border-t border-slate-400 pt-1.5">ختم الحلقة</p>
      </div>

      {/* إحصائيات الحفظ والمراجعة */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5 print:hidden">
        <button
          type="button"
          onClick={() => setShowStats((v) => !v)}
          aria-expanded={showStats}
          className="flex w-full items-center justify-between gap-3 text-right"
        >
          <span className="text-base font-extrabold text-slate-800">إحصائيات الحفظ والمراجعة</span>
          <ChevronDown size={18} className={`text-slate-400 transition ${showStats ? "rotate-180" : ""}`} />
        </button>

        {showStats && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-400">إحصائيات شهر {monthNumber}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <StatsBlock title="الحفظ" stats={monthStats.memorization} />
              <StatsBlock title="المراجعة" stats={monthStats.review} />
            </div>

            <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
              <label className="text-sm font-semibold text-slate-600">
                من تاريخ
                <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className={`${controlClass} mt-1 block`} />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                إلى تاريخ
                <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className={`${controlClass} mt-1 block`} />
              </label>
              <p className="pb-3 text-xs text-slate-400">اختر فترة مخصصة لعرض مجموعها.</p>
            </div>

            {rangeStats && (
              <div className="grid gap-4 md:grid-cols-2">
                <StatsBlock title="الحفظ في الفترة" stats={rangeStats.memorization} />
                <StatsBlock title="المراجعة في الفترة" stats={rangeStats.review} />
              </div>
            )}

            {monthStats.invalid.length > 0 && (
              <p role="alert" className="text-xs text-rose-600">{monthStats.invalid.length} سجل غير صالح لم يُحتسب.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
