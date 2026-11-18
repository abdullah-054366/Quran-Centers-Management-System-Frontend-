import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarCheck, CalendarDays, ClipboardList, GraduationCap } from "lucide-react";
import { Link } from "react-router";
import { getSurahMeta } from "quran-meta/hafs";
import { getAttendance } from "../../api/attendance";
import { getMemorizationRecords } from "../../api/memorization";
import { getMemorizationPlans } from "../../api/plans";
import { getStudentById } from "../../api/students";
import { getErrorMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import ayahLines from "../../data/ayahLines.json";
import { createLineCalculator } from "../../lib/quranLines";
import { formatAmount, mergeSessionRecords, normalizeRecord } from "../../lib/studentRecord";

const calculator = createLineCalculator(ayahLines);

const attendanceStatuses = [
  { id: 1, label: "حضور", color: "bg-emerald-50 text-emerald-800" },
  { id: 2, label: "غياب", color: "bg-rose-50 text-rose-700" },
  { id: 3, label: "تأخر", color: "bg-amber-50 text-amber-700" },
  { id: 4, label: "استئذان", color: "bg-sky-50 text-sky-700" },
];

function formatDate(value) {
  if (!value) return "غير متوفر";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function surahTitle(number) {
  try {
    return getSurahMeta(Number(number)).name;
  } catch {
    return `السورة ${number}`; // نعرض رقم السورة إذا لم تتوفر بياناتها الوصفية.
  }
}

// الجلسة التي تضم عدة سور تُعرض سجلاً واحداً: من أول سورة وآية إلى آخر سورة وآية.
function getRecordDetails(record) {
  const notes = record.notes || "";
  const grade = notes.match(/التقييم:\s*(.*?)(?:\s+—\s+|$)/)?.[1] || "";
  const teacherNotes = notes.replace(/التقييم:\s*.*?(?:\s+—\s+|$)/, "").trim();
  const sameSurah = record.fromSurah === record.toSurah;

  let amount = "";
  try {
    const text = formatAmount(
      calculator.linesBetween(record.fromSurah, record.fromAyah, record.toSurah, record.toAyah),
    );
    amount = /^\d+$/.test(text) ? `${text} صفحة` : text;
  } catch {
    // لا نعرض المقدار إذا كان نطاق الآيات غير صالح.
  }

  return {
    title: sameSurah
      ? `سورة ${surahTitle(record.fromSurah)}`
      : `من سورة ${surahTitle(record.fromSurah)} إلى سورة ${surahTitle(record.toSurah)}`,
    range: sameSurah
      ? `الآيات ${record.fromAyah}–${record.toAyah}`
      : `من الآية ${record.fromAyah} إلى الآية ${record.toAyah}`,
    amount,
    grade,
    teacherNotes,
    typeName: record.type === "memorization" ? "حفظ جديد" : "مراجعة",
  };
}

function SummaryCard({ label, value, Icon, color }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
        <Icon size={19} />
      </span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 font-bold text-slate-800">{value}</p>
      </div>
    </article>
  );
}

export default function StudentHome() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [records, setRecords] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStudentData() {
      if (!user?.studentId) {
        setError("لا يوجد ملف طالب مرتبط بهذا الحساب.");
        setLoading(false);
        return;
      }

      try {
        const [studentData, attendanceData, memorizationData, planData] = await Promise.all([
          getStudentById(user.studentId),
          getAttendance(),
          getMemorizationRecords(),
          getMemorizationPlans().catch(() => []), // الخطط اختيارية: فشلها لا يمنع عرض الصفحة
        ]);

        if (!isMounted) return;
        setStudent(studentData);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        setRecords(Array.isArray(memorizationData) ? memorizationData : []);
        setPlans(Array.isArray(planData) ? planData.filter((plan) => plan.isActive) : []);
      } catch (requestError) {
        if (isMounted) setError(getErrorMessage(requestError));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStudentData();
    return () => {
      isMounted = false;
    };
  }, [user?.studentId]);

  const attendanceCounts = useMemo(() => {
    return attendance.reduce((counts, record) => {
      counts[record.status] = (counts[record.status] || 0) + 1;
      return counts;
    }, {});
  }, [attendance]);

  const lastAbsence = useMemo(
    () =>
      attendance
        .filter((record) => record.status === 2)
        .sort((left, right) => right.attendanceDate.localeCompare(left.attendanceDate))[0],
    [attendance],
  );

  // أحدث 6 سجلات بعد دمج سور الجلسة الواحدة في سجل واحد.
  const latestRecords = useMemo(
    () =>
      mergeSessionRecords(
        records.map(normalizeRecord).filter((record) => record.type),
        (surah) => getSurahMeta(surah).ayahCount,
      )
        .sort((left, right) => right.date.localeCompare(left.date))
        .slice(0, 6),
    [records],
  );

  if (loading) {
    return <p className="py-16 text-center text-sm text-slate-400">جارٍ تحميل ملفك…</p>;
  }

  if (error || !student) {
    return (
      <p role="alert" className="rounded-2xl bg-rose-50 p-5 text-center text-sm text-rose-700">
        {error || "لم يتم العثور على ملف الطالب."}
      </p>
    );
  }

  const studentName = [student.firstName, student.lastName].filter(Boolean).join(" ");

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 text-slate-800 md:p-8">
      <section className="rounded-3xl bg-gradient-to-l from-emerald-900 to-teal-700 p-6 text-white">
        <p className="text-sm text-emerald-100">ملفك التعليمي</p>
        <h1 className="mt-2 text-2xl font-extrabold">
          أهلاً {studentName || "بك"} 🌟
        </h1>
        <p className="mt-2 text-sm text-emerald-50/80">
          هنا تجد سجلات الحفظ والمراجعة والحضور المسجلة في النظام.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {attendanceStatuses.map((status) => (
          <SummaryCard
            key={status.id}
            label={status.label}
            value={attendanceCounts[status.id] || 0}
            Icon={CalendarCheck}
            color={status.color}
          />
        ))}
      </section>

      {plans.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={19} className="text-emerald-800" />
            <h2 className="font-extrabold">خططي</h2>
            <Link to="/plans" className="ms-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800">
              + إنشاء خطة
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => (
              <Link
                key={plan.memorizationPlanId}
                to={`/plans/${plan.memorizationPlanId}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-emerald-50"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">{plan.type === 1 ? "خطة مراجعة" : "خطة حفظ"}</p>
                  <p className="mt-1 truncate font-bold text-slate-800">
                    {surahTitle(plan.fromSurah)} ← {surahTitle(plan.toSurah)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-800">عرض المطلوب ‹</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <BookOpen size={19} className="text-emerald-800" />
            <div>
              <h2 className="font-extrabold">سجل الحفظ والمراجعة</h2>
              <p className="mt-1 text-xs text-slate-400">أحدث السجلات المسجلة</p>
            </div>
          </div>

          {latestRecords.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              لا توجد سجلات حفظ أو مراجعة حتى الآن.
            </p>
          ) : (
            <div className="space-y-4">
              {latestRecords.map((record, index) => {
                const details = getRecordDetails(record);
                return (
                  <article
                    key={`${record.id ?? "record"}-${index}`}
                    className="border-r-2 border-emerald-200 pr-3"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-xs">
                      <span className="font-bold text-emerald-800">{details.typeName}</span>
                      <span className="text-slate-400">{formatDate(record.date)}</span>
                    </div>
                    <p className="mt-1 font-bold">{details.title}</p>
                    <p className="text-xs text-slate-500">
                      {details.range}
                      {details.amount ? ` · المقدار: ${details.amount}` : ""}
                      {details.grade ? ` · التقييم: ${details.grade}` : ""}
                    </p>
                    {details.teacherNotes && (
                      <p className="mt-1 text-xs text-slate-500">{details.teacherNotes}</p>
                    )}
                    {record.teacherName && (
                      <p className="mt-1 text-xs text-slate-400">المعلم: {record.teacherName}</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-extrabold">
            <CalendarDays size={19} className="text-emerald-800" />
            ملخص الحضور
          </h2>
          <div className="mt-5 space-y-3">
            {attendanceStatuses.map((status) => (
              <div key={status.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-sm text-slate-600">{status.label}</span>
                <span className="font-extrabold">{attendanceCounts[status.id] || 0}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
            <GraduationCap size={17} className="mt-0.5 shrink-0" />
            آخر غياب: {lastAbsence ? formatDate(lastAbsence.attendanceDate) : "لا يوجد غياب مسجل"}
          </p>
        </div>
      </section>
    </main>
  );
}
