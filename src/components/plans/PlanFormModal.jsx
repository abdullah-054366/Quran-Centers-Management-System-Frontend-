import { useMemo, useState } from "react";
import { Check, Info, X } from "lucide-react";
import { addMemorizationPlan, updateMemorizationPlan } from "../../api/plans";
import { getErrorMessage } from "../../api/axiosClient";
import { amountLabel, estimateBoundedPlan, spanEndKey, WEEKDAYS } from "../../lib/planSchedule";
import { LINES_PER_PAGE } from "../../lib/quranLines";
import Segmented from "./Segmented";
import { calculator, formatDate, riyadhToday, SURAHS } from "./planUi";

const TYPES = [
  { value: "memorization", label: "خطة حفظ" },
  { value: "review", label: "خطة مراجعة" },
];

// محدّدة بشهر: المدّة مدخل. مفتوحة: المقدار مدخل والنهاية مخرَج.
const DURATION_MODES = [
  { value: "monthly", label: "محدّدة بشهر" },
  { value: "open", label: "مفتوحة بمقدار" },
];

const MONTH_SPANS = [
  { value: "1", label: "شهر" },
  { value: "2", label: "شهران" },
  { value: "3", label: "3 أشهر" },
];

// داخل المدّة: إمّا يُشتقّ المقدار منها، أو يُثبّت فتُقفل الخطة بانتهائها على ما أُنجز.
const AMOUNT_MODES = [
  { value: "derived", label: "محسوب من المدّة" },
  { value: "fixed", label: "مقدار ثابت" },
];

/** عدد الأشهر بين بداية ونهاية بالضمّ، مقصوراً على ما تعرضه الخيارات. */
const monthSpan = (start, end) => {
  const [startYear, startMonth] = String(start).split("-").map(Number);
  const [endYear, endMonth] = String(end).split("-").map(Number);
  return Math.min(3, Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1));
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600";

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-sm font-extrabold text-slate-800">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function CalcBox({ caption, sessions, title, note }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs font-semibold text-emerald-700">{caption}</span>
        <span className="text-xs font-bold text-emerald-800">{sessions} جلسة</span>
      </div>
      <p className="mt-1 text-2xl font-extrabold text-emerald-800">{title}</p>
      <p className="mt-0.5 text-xs text-slate-600">{note}</p>
    </div>
  );
}

/**
 * نموذج إنشاء خطة أو تعديلها (مطابق لشاشة «خطة جديدة» في تطبيق الجوال).
 * plan: الخطة القائمة عند التعديل. students: قائمة الطلاب، أو [{ self: true, studentId }] للطالب نفسه.
 */
export default function PlanFormModal({ plan, students = [], onClose, onSaved }) {
  const isEdit = Boolean(plan);
  const today = riyadhToday();
  const existingStart = plan ? String(plan.startDate).slice(0, 10) : null;
  const existingEnd = plan?.endDate ? String(plan.endDate).slice(0, 10) : null;
  const selfOnly = students.length === 1 && students[0].self;

  const [type, setType] = useState(plan ? (plan.type === 1 ? "review" : "memorization") : "memorization");
  const [studentId, setStudentId] = useState(
    plan ? String(plan.studentId) : selfOnly ? String(students[0].studentId) : "",
  );
  const [fromSurah, setFromSurah] = useState(plan ? String(plan.fromSurah) : "78");
  const [toSurah, setToSurah] = useState(plan ? String(plan.toSurah) : "114");
  const [pagesPerSession, setPagesPerSession] = useState(plan ? String(plan.pagesPerSession) : "1");
  const [targetRounds, setTargetRounds] = useState(plan ? String(plan.targetRounds) : "4");
  const [startDate, setStartDate] = useState(existingStart ?? today);
  const [days, setDays] = useState(plan ? [...(plan.daysOfWeek ?? [])].sort((a, b) => a - b) : [0, 2, 4]);
  const [mode, setMode] = useState(plan ? (existingEnd ? "monthly" : "open") : "monthly");
  const [months, setMonths] = useState(existingEnd ? String(monthSpan(existingStart, existingEnd)) : "1");
  const [amountMode, setAmountMode] = useState(plan ? (plan.deriveAmount ? "derived" : "fixed") : "derived");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isReview = type === "review";
  const isMonthly = mode === "monthly";
  const isDerived = isMonthly && amountMode === "derived";

  // آخر يوم في المدّة: نهاية الشهر الذي تبدأ فيه، أو الذي بعده.
  const endDate = useMemo(
    () => (isMonthly && startDate ? spanEndKey(startDate.slice(0, 7), Number(months)) : null),
    [isMonthly, startDate, months],
  );

  // عدد جلسات المدّة ومقدار كلٍّ منها لو اشتُقّ من النطاق.
  const bounded = useMemo(() => {
    if (!isMonthly || Number(fromSurah) > Number(toSurah)) return null;
    return estimateBoundedPlan({
      plan: {
        fromSurah: Number(fromSurah),
        toSurah: Number(toSurah),
        type: isReview ? 1 : 0,
        targetRounds: Number(targetRounds) || 1,
        startDate,
        endDate,
        daysOfWeek: days,
      },
      calculator,
    });
  }, [isMonthly, fromSurah, toSurah, isReview, targetRounds, startDate, endDate, days]);

  // مقدار مثبّت داخل مدّة: ما يُنجَز من النطاق قبل أن تُقفل الخطة.
  const fixedOutcome = useMemo(() => {
    if (!isMonthly || amountMode !== "fixed" || !bounded) return null;
    const pages = Number(pagesPerSession);
    if (!Number.isInteger(pages) || pages < 1) return null;
    const doneLines = Math.min(bounded.totalLines, pages * LINES_PER_PAGE * bounded.sessions);
    return {
      pages: Math.round((doneLines / LINES_PER_PAGE) * 10) / 10,
      total: bounded.totalPages,
      complete: doneLines >= bounded.totalLines - 1e-6,
    };
  }, [isMonthly, amountMode, bounded, pagesPerSession]);

  // الخطة المفتوحة: عدد الجلسات حتى اكتمال النطاق بالمقدار المختار.
  const estimate = useMemo(() => {
    const pages = Number(pagesPerSession);
    if (!Number.isInteger(pages) || pages < 1 || Number(fromSurah) > Number(toSurah)) return null;
    try {
      const lines = calculator.linesBetween(Number(fromSurah), 1, Number(toSurah), SURAHS[Number(toSurah) - 1].ayahs);
      const rounds = isReview ? Math.max(1, Number(targetRounds) || 1) : 1;
      return {
        pages: Math.round((lines / LINES_PER_PAGE) * 10) / 10,
        sessions: Math.max(1, Math.ceil(lines / (pages * LINES_PER_PAGE)) * rounds),
      };
    } catch {
      return null;
    }
  }, [fromSurah, toSurah, pagesPerSession, targetRounds, isReview]);

  function toggleDay(index) {
    setDays((cur) => (cur.includes(index) ? cur.filter((d) => d !== index) : [...cur, index].sort((a, b) => a - b)));
  }

  function changeType(value) {
    setType(value);
    const review = value === "review";
    setFromSurah(review ? "1" : "78");
    setToSurah(review ? "5" : "114");
    setPagesPerSession(review ? "5" : "1");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!studentId) return setError("اختر الطالب.");
    if (Number(fromSurah) > Number(toSurah)) return setError("سورة البداية يجب أن تسبق سورة النهاية.");
    if (days.length === 0) return setError("اختر يوماً واحداً على الأقل.");
    if (isMonthly && !bounded) return setError("لا توجد جلسة واحدة في هذه المدّة — غيّر الأيام أو مدّد المدّة.");
    // المقدار المخزَّن في الخطة المشتقّة تقريبٌ للعرض؛ الحساب الحقيقي من تاريخ النهاية.
    const pages = isDerived ? bounded.pagesPerSession : Number(pagesPerSession);
    if (!Number.isInteger(pages) || pages < 1 || pages > 604) {
      return setError("صفحات الجلسة يجب أن تكون عدداً صحيحاً من 1 إلى 604.");
    }
    if (isReview) {
      const rounds = Number(targetRounds);
      if (!Number.isInteger(rounds) || rounds < 1 || rounds > 1000) {
        return setError("عدد الدورات يجب أن يكون عدداً صحيحاً من 1 إلى 1000.");
      }
    }

    const payload = {
      studentId: Number(studentId),
      type: isReview ? 1 : 0,
      fromSurah: Number(fromSurah),
      toSurah: Number(toSurah),
      pagesPerSession: pages,
      targetRounds: isReview ? Number(targetRounds) : 1,
      startDate,
      endDate: isMonthly ? endDate : null,
      deriveAmount: isDerived,
      daysOfWeek: days,
    };

    setSaving(true);
    try {
      const saved = isEdit
        ? await updateMemorizationPlan(plan.memorizationPlanId, payload)
        : await addMemorizationPlan(payload);
      onSaved?.(saved);
    } catch (saveError) {
      setError(getErrorMessage(saveError) || (isEdit ? "تعذّر تعديل الخطة." : "تعذّر حفظ الخطة."));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-form-title"
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-slate-50 p-4 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="plan-form-title" className="text-xl font-extrabold text-slate-800">
            {isEdit ? "تعديل الخطة" : "خطة جديدة"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit ? (
            <p className="flex gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-800">
              <Info size={18} className="mt-1 shrink-0" />
              تعدّل خطة {isReview ? "مراجعة" : "حفظ"} قائمة. النوع والطالب لا يُغيّران بعد الإنشاء — فتغييرهما يجعلها
              خطة أخرى تنقطع عن سجلات الطالب.
            </p>
          ) : (
            <Segmented options={TYPES} value={type} onChange={changeType} label="نوع الخطة" />
          )}

          <Section title="الطالب والنطاق">
            {selfOnly ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">الخطة لحسابك أنت</p>
            ) : (
              <Field id="plan-student" label="الطالب">
                <select
                  id="plan-student"
                  value={studentId}
                  disabled={isEdit}
                  onChange={(event) => setStudentId(event.target.value)}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
                >
                  <option value="">اختر الطالب</option>
                  {isEdit && !students.some((s) => String(s.studentId) === studentId) && (
                    <option value={studentId}>{plan.studentName}</option>
                  )}
                  {students.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {[student.firstName, student.lastName].filter(Boolean).join(" ") || `طالب ${student.studentId}`}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field id="from-surah" label="من سورة">
                <select
                  id="from-surah"
                  value={fromSurah}
                  onChange={(event) => {
                    setFromSurah(event.target.value);
                    if (Number(toSurah) < Number(event.target.value)) setToSurah(event.target.value);
                  }}
                  className={inputClass}
                >
                  {SURAHS.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}. {s.name}</option>
                  ))}
                </select>
              </Field>
              <Field id="to-surah" label="إلى سورة">
                <select id="to-surah" value={toSurah} onChange={(event) => setToSurah(event.target.value)} className={inputClass}>
                  {SURAHS.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id < Number(fromSurah)}>{s.id}. {s.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="مدّة الخطة">
            <Segmented options={DURATION_MODES} value={mode} onChange={setMode} size="sm" label="مدّة الخطة" />

            <Field id="plan-start" label="تاريخ البداية">
              <input
                id="plan-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                className={inputClass}
              />
            </Field>

            {isMonthly && (
              <>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">طول المدّة</p>
                  <Segmented options={MONTH_SPANS} value={months} onChange={setMonths} size="sm" label="طول المدّة" />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">مقدار الجلسة</p>
                  <Segmented options={AMOUNT_MODES} value={amountMode} onChange={setAmountMode} size="sm" label="مقدار الجلسة" />
                </div>
              </>
            )}

            {(!isMonthly || amountMode === "fixed") && (
              <Field id="pages-session" label="صفحات الجلسة">
                <input
                  id="pages-session"
                  type="number"
                  min="1"
                  max="604"
                  step="1"
                  value={pagesPerSession}
                  onChange={(event) => setPagesPerSession(event.target.value)}
                  className={inputClass}
                />
              </Field>
            )}

            {isReview && (
              <Field id="target-rounds" label="عدد الدورات" hint="كم مرة يراجع الطالب هذا النطاق كاملاً">
                <input
                  id="target-rounds"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={targetRounds}
                  onChange={(event) => setTargetRounds(event.target.value)}
                  className={inputClass}
                />
              </Field>
            )}

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">أيام الخطة</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day, index) => {
                  const active = days.includes(index);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(index)}
                      aria-pressed={active}
                      className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition ${
                        active ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {isDerived && bounded && (
              <CalcBox
                caption="مقدار الجلسة المحسوب"
                sessions={bounded.sessions}
                title={amountLabel(bounded.linesPerSession)}
                note={`تنتهي ${formatDate(endDate)} · النطاق ${bounded.totalPages} صفحة`}
              />
            )}

            {fixedOutcome && (
              <CalcBox
                caption="بهذا المقدار في المدّة"
                sessions={bounded.sessions}
                title={fixedOutcome.complete ? "يكتمل النطاق" : `${fixedOutcome.pages} من ${fixedOutcome.total} صفحة`}
                note={fixedOutcome.complete ? `قبل ${formatDate(endDate)}` : `وتُقفل الخطة ناقصة في ${formatDate(endDate)}`}
              />
            )}
          </Section>

          {(isDerived || isMonthly || estimate) && (
            <p className="flex gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-800">
              <Info size={18} className="mt-1 shrink-0" />
              {isDerived
                ? "المقدار يُشتقّ من النطاق وعدد أيام الخطة في المدّة. وإن فاتت جلسة انتقل مقدارها إلى التالية دون تمديد المدّة؛ وبانتهاء المدّة تُقفل الخطة بما أُنجز."
                : isMonthly
                  ? "المقدار ثابت والمدّة نافذة: ما لم يُنجَز قبل نهايتها تُقفل الخطة عليه ناقصة، ولا تُمدّ تلقائياً."
                  : `النطاق ${estimate.pages} صفحة تقريباً · تحتاج نحو ${estimate.sessions} جلسة لإكمال الخطة.`}
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
          >
            <Check size={18} />
            {saving ? "جارٍ الحفظ…" : isEdit ? "حفظ التعديل" : "حفظ الخطة"}
          </button>
        </form>
      </section>
    </div>
  );
}
