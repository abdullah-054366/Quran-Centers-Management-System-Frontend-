import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, CirclePause, CirclePlay, PencilLine, Printer } from "lucide-react";
import { Link, useParams } from "react-router";
import { getMemorizationPlan, updateMemorizationPlanStatus } from "../../api/plans";
import { getMemorizationRecords } from "../../api/memorization";
import { getErrorMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { amountLabel, buildPlanView, WEEKDAYS } from "../../lib/planSchedule";
import { getStudents } from "../../api/students";
import PlanFormModal from "../../components/plans/PlanFormModal";
import { asList, calculator, formatDay, rangeText, riyadhToday, surahName } from "../../components/plans/planUi";

const STAFF = ["PlatformAdmin", "Admin", "CenterAdmin", "Teacher"];

function shiftMonth(key, delta) {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const formatMonth = (key) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${key}-01T00:00:00Z`));

const gradeOf = (notes) => String(notes || "").match(/التقييم:\s*(.*?)(?:\s+—\s+|$)/)?.[1] || "";

const STATUS = {
  done: { label: "تم", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  missed: { label: "فائتة", className: "border-rose-200 bg-rose-50 text-rose-700" },
  today: { label: "اليوم", className: "border-emerald-700 bg-emerald-700 text-white" },
  upcoming: { label: "قادمة", className: "border-slate-200 bg-slate-100 text-slate-500" },
};

function Stat({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xl font-extrabold sm:text-2xl ${tone}`}>{value}</span>
    </div>
  );
}

export default function PlanSchedule() {
  const { planId } = useParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => riyadhToday().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const isStaff = STAFF.includes(user?.role);
  const today = riyadhToday();

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const loaded = await getMemorizationPlan(planId);
        const loadedRecords = await getMemorizationRecords({
          studentId: loaded.studentId,
          from: String(loaded.startDate).slice(0, 10),
        });
        if (!current) return;
        setPlan(loaded);
        setRecords(Array.isArray(loadedRecords) ? loadedRecords : loadedRecords?.data ?? []);
        const startMonth = String(loaded.startDate).slice(0, 7);
        setMonth((value) => (value < startMonth ? startMonth : value));
      } catch (requestError) {
        if (current) setError(getErrorMessage(requestError));
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; };
  }, [planId]);

  // قائمة الطلاب لنموذج التعديل (الطالب لا يُغيَّر، لكن القائمة تعرض اسمه).
  useEffect(() => {
    if (!editOpen || !isStaff || students.length) return;
    getStudents().then((list) => setStudents(asList(list))).catch(() => setStudents([]));
  }, [editOpen, isStaff, students.length]);

  // إيقاف الخطة وتفعيلها هنا لا في القائمة: القائمة للمسح والتفاصيل للتصرّف.
  async function toggleStatus() {
    setBusy(true);
    setActionError("");
    try {
      const updated = await updateMemorizationPlanStatus(plan.memorizationPlanId, !plan.isActive);
      setPlan((cur) => (cur ? { ...cur, ...updated } : cur));
    } catch (requestError) {
      setActionError(getErrorMessage(requestError) || "تعذّر تغيير حالة الخطة.");
    } finally {
      setBusy(false);
    }
  }

  const view = useMemo(
    () => (plan ? buildPlanView({ plan, rawRecords: records, calculator, today, monthKey: month }) : null),
    [plan, records, today, month],
  );

  const startMonth = plan ? String(plan.startDate).slice(0, 7) : month;
  const isReview = plan?.type === 1;
  const backTo = user?.role === "Student" ? "/student" : "/plans";
  const todayRow = view?.rows.find((row) => row.kind === "today");

  if (loading) return <p className="py-16 text-center text-sm text-slate-500">جارٍ تحميل الخطة…</p>;
  if (error || !plan || !view) {
    return (
      <p role="alert" className="mx-auto max-w-xl rounded-2xl bg-rose-50 p-6 text-center text-sm text-rose-700">
        {error || "تعذّر عرض الخطة."}
      </p>
    );
  }

  const t = view.totals;

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 print:space-y-3">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Link to={backTo} className="text-sm text-slate-500 hover:text-emerald-800 print:hidden">
            ‹ {user?.role === "Student" ? "الرئيسية" : "خطط الحفظ والمراجعة"}
          </Link>
          <h1 className="truncate text-2xl font-extrabold text-slate-900 sm:text-3xl">{plan.studentName}</h1>
          <p className="text-sm text-slate-500">
            <span
              className={`me-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isReview ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {isReview ? "خطة مراجعة" : "خطة حفظ"}
            </span>
            {!plan.isActive && (
              <span className="me-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                موقوفة
              </span>
            )}
            من سورة {surahName(plan.fromSurah)} إلى سورة {surahName(plan.toSurah)} ·{" "}
            {t.derived ? amountLabel(t.perSessionLines) : plan.pagesPerSession === 1 ? "صفحة" : `${plan.pagesPerSession} صفحات`} في الجلسة
            {isReview ? ` · ${plan.targetRounds} دورات` : ""}
          </p>
          <p className="text-xs text-slate-500">
            {(plan.daysOfWeek ?? []).map((d) => WEEKDAYS[d]).join("، ")}
            {t.endDate ? ` · ${t.closedIncomplete || t.completed ? "انتهت" : "تنتهي"} ${formatDay(t.endDate)}` : ""}
          </p>
          {isStaff && (
            <div className="flex flex-wrap gap-2 pt-1 print:hidden">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <PencilLine size={16} /> تعديل
              </button>
              <button
                type="button"
                onClick={toggleStatus}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {plan.isActive ? <CirclePause size={16} /> : <CirclePlay size={16} />}
                {busy ? "جارٍ الحفظ…" : plan.isActive ? "إيقاف" : "تفعيل"}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setMonth((value) => shiftMonth(value, -1))}
              disabled={month <= startMonth}
              aria-label="الشهر السابق"
              className="grid h-11 w-11 place-items-center text-slate-500 hover:text-emerald-800 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
            <span className="min-w-28 text-center text-sm font-bold text-slate-800 sm:min-w-32">{formatMonth(month)}</span>
            <button
              type="button"
              onClick={() => setMonth((value) => shiftMonth(value, 1))}
              aria-label="الشهر التالي"
              className="grid h-11 w-11 place-items-center text-slate-500 hover:text-emerald-800"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-emerald-50"
          >
            <Printer size={16} /> طباعة
          </button>
        </div>
      </header>

      {actionError && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 print:hidden">{actionError}</p>
      )}

      {t.closedIncomplete && (
        <p className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
          <AlertTriangle size={18} className="mt-1 shrink-0" />
          انتهت مدّة الخطة ولم يكتمل النطاق — أُقفلت على {t.progress}٪، والمتبقّي {amountLabel(t.remainingLines)}. أنشئ
          خطة جديدة بالمتبقّي إن أردت متابعته.
        </p>
      )}

      {todayRow && month === today.slice(0, 7) && (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 print:hidden">
          <p className="text-xs font-semibold text-emerald-800">المطلوب اليوم · {formatDay(todayRow.date)}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{rangeText(todayRow.from, todayRow.to)}</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {amountLabel(todayRow.lines)}
            {todayRow.catchUp ? " · تشمل ما تأخر من الجلسات السابقة" : ""}
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-200 rounded-2xl border border-slate-200 bg-white lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-2.5 border-b border-slate-200 px-5 py-4 lg:col-span-1 lg:border-b-0">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">تقدم الخطة كاملة</span>
            <span className="text-xl font-extrabold text-emerald-800">{t.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${t.progress}%` }} />
          </div>
          <span className="text-xs text-slate-400">
            {amountLabel(t.doneLines)} من {t.planPages * (isReview ? plan.targetRounds : 1)} صفحة
          </span>
        </div>
        <Stat label="المطلوب هذا الشهر" value={amountLabel(t.monthPlannedLines)} />
        <Stat label="تم" value={amountLabel(t.monthDoneLines)} tone="text-emerald-800" />
        <Stat label="فائت" value={amountLabel(t.monthMissedLines)} tone={t.monthMissedLines ? "text-rose-700" : "text-slate-900"} />
        <Stat label="متبقٍ" value={amountLabel(t.monthRemainingLines)} />
      </section>

      {view.rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
          {t.completed ? "اكتملت الخطة، لا يوجد مطلوب في هذا الشهر." : "لا توجد جلسات مطلوبة في هذا الشهر."}
        </p>
      ) : (
        <>
          {/* الشاشات الكبيرة: جدول */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block print:block print:rounded-none">
            <table className="print-compact w-full border-collapse text-sm text-slate-700">
              <thead className="bg-slate-100 text-xs text-slate-600">
                <tr>
                  <th className="px-5 py-3.5 text-right font-bold">التاريخ</th>
                  <th className="px-3 py-3.5 text-right font-bold">المطلوب</th>
                  <th className="px-3 py-3.5 text-center font-bold">المقدار</th>
                  <th className="px-3 py-3.5 text-center font-bold">الحالة</th>
                  <th className="px-5 py-3.5 text-center font-bold">التقييم</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row, index) => {
                  const status = STATUS[row.kind];
                  return (
                    <tr
                      key={`${row.date}-${index}`}
                      className={`border-t border-slate-100 ${row.kind === "today" ? "bg-emerald-50/60" : ""}`}
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className="font-bold text-slate-900">{formatDay(row.date)}</span>{" "}
                        <span className="text-xs text-slate-400">{WEEKDAYS[row.weekday]}</span>
                      </td>
                      <td className="px-3 py-3">
                        {row.kind === "missed" ? <span className="text-slate-300">—</span> : rangeText(row.from, row.to)}
                        {row.catchUp && <span className="ms-2 text-xs font-semibold text-amber-700">يشمل المتأخر</span>}
                        {row.extra && <span className="ms-2 text-xs font-semibold text-slate-400">خارج أيام الخطة</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-900">{amountLabel(row.lines)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex min-w-16 justify-center rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-slate-600">{gradeOf(row.notes) || <span className="text-slate-300">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* الهاتف: بطاقات */}
          <section className="space-y-2.5 md:hidden print:hidden">
            {view.rows.map((row, index) => {
              const status = STATUS[row.kind];
              return (
                <article
                  key={`${row.date}-${index}`}
                  className={`rounded-2xl border p-4 ${
                    row.kind === "today" ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm">
                      <span className="font-bold text-slate-900">{formatDay(row.date)}</span>{" "}
                      <span className="text-xs text-slate-400">{WEEKDAYS[row.weekday]}</span>
                    </p>
                    <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">
                    {row.kind === "missed" ? "لم تُسمَّع هذه الجلسة" : rangeText(row.from, row.to)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {amountLabel(row.lines)}
                    {row.catchUp ? " · تشمل المتأخر" : ""}
                    {row.extra ? " · خارج أيام الخطة" : ""}
                    {gradeOf(row.notes) ? ` · التقييم: ${gradeOf(row.notes)}` : ""}
                  </p>
                </article>
              );
            })}
          </section>
        </>
      )}

      {editOpen && (
        <PlanFormModal
          plan={plan}
          students={students}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            setEditOpen(false);
            if (saved) setPlan((cur) => ({ ...cur, ...saved }));
          }}
        />
      )}

      <p className="text-xs text-slate-400">
        المطلوب يُحسب من آخر موضع سمّعه الطالب فعلاً؛ فإن فاتت جلسة انتقل مقدارها إلى الجلسة التالية. المقادير حسب مصحف المدينة.
      </p>
    </main>
  );
}
