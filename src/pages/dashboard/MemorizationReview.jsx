import { useEffect, useRef, useState } from "react";
import { getSurahMeta } from "quran-meta/hafs";
import { Save } from "lucide-react";
import {
  getMemorizationDailyUsage,
  getMemorizationStudents,
  saveMemorizationRecords,
} from "../../api/memorization";
import { getErrorMessage } from "../../api/axiosClient";
import ayahLines from "../../data/ayahLines.json";
import { createLineCalculator, linesToPages } from "../../lib/quranLines";

const calculator = createLineCalculator(ayahLines);

// بيانات السور الـ١١٤ من رواية حفص ومصحف المدينة.
const surahs = Array.from({ length: 114 }, (_, index) => {
  const id = index + 1;
  const metadata = getSurahMeta(id);
  return { id, name: metadata.name, ayahs: metadata.ayahCount };
});

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
}).format(new Date());

// الحد اليومي لكل طالب (يُفرض أيضاً في الخادم): حفظ واحد ومراجعتان.
const DAILY_LIMITS = { حفظ: 1, مراجعة: 2 };

// قيم Type في قاعدة البيانات: 1 = حفظ جديد، 2 = مراجعة (قيد CHECK يقبل 1 و2 فقط).
const RECORD_TYPE = { حفظ: 1, مراجعة: 2 };

const newSessionId = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

const grades = ["ممتاز", "جيد جداً", "جيد", "يحتاج متابعة"];

const fmt = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);

// حجم الخط 16 يمنع تكبير الصفحة تلقائياً عند الضغط على الحقل في الجوال.
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10 disabled:bg-slate-50 disabled:text-slate-400";

const chipClass = (active) =>
  `rounded-xl border px-4 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${
    active
      ? "border-emerald-800 bg-emerald-800 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:bg-emerald-50"
  }`;

function Field({ label, required, children }) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-600">
      <span className="block">
        {label}
        {required && <span className="mr-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function StepCard({ number, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="mb-4 flex items-center gap-3 font-extrabold text-slate-800">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-800 text-xs text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SurahSelect({ value, onChange, minId = 1 }) {
  return (
    <select required value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">اختر السورة</option>
      {surahs.map((surah) => (
        <option key={surah.id} value={surah.id} disabled={surah.id < minId}>
          {surah.id}. {surah.name}
        </option>
      ))}
    </select>
  );
}

function AyahSelect({ surahId, value, onChange, minAyah = 1 }) {
  const surah = surahs.find((item) => item.id === Number(surahId));
  return (
    <select
      required
      disabled={!surah}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      <option value="">الآية</option>
      {surah &&
        Array.from({ length: surah.ayahs }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n} disabled={n < minAyah}>
            {n}
          </option>
        ))}
    </select>
  );
}

// مقدار القراءة الفعلي بالأسطر والصفحات (15 سطرًا للصفحة) من بيانات المصحف.
// يراعي الآيات التي تبدأ أو تنتهي في منتصف الصفحة، ولا يحتسب سطر اسم السورة ولا البسملة.
function getReading(startSurahId, startAyah, endSurahId, endAyah) {
  if (!startSurahId || !startAyah || !endSurahId || !endAyah) return null;

  try {
    const lines = calculator.linesBetween(
      Number(startSurahId),
      Number(startAyah),
      Number(endSurahId),
      Number(endAyah),
    );
    return { lines, ...linesToPages(lines) };
  } catch {
    return null;
  }
}

export default function MemorizationReview() {
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [recordType, setRecordType] = useState("حفظ");
  const [date, setDate] = useState(today);

  // نطاق القراءة: من (سورة + آية) إلى (سورة + آية)
  const [fromSurahId, setFromSurahId] = useState("");
  const [fromAyah, setFromAyah] = useState("");
  const [toSurahId, setToSurahId] = useState("");
  const [toAyah, setToAyah] = useState("");

  const [grade, setGrade] = useState("ممتاز");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // سجلات الطالب في اليوم المختار (من الخادم) لإظهار المتبقي ومنع تجاوز الحد.
  const [usage, setUsage] = useState(null);
  const [usageTick, setUsageTick] = useState(0);
  // معرّف جلسة واحد لكل محاولة حفظ: يمنع تكرار الجلسة عند إعادة المحاولة أو النقر المزدوج.
  const sessionIdRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    getMemorizationStudents()
      .then((data) => {
        if (!isMounted) return;
        setStudents(
          (Array.isArray(data) ? data : []).map((student) => ({
            id: student.studentId,
            name: student.studentName,
            group: student.halaqaName,
          })),
        );
      })
      .catch((requestError) => {
        if (isMounted) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isMounted) setIsLoadingStudents(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!studentId || !date) {
      setUsage(null);
      return undefined;
    }

    let isMounted = true;
    getMemorizationDailyUsage(Number(studentId), date)
      .then((data) => {
        if (isMounted) setUsage(data);
      })
      .catch(() => {
        // الخادم يتحقق من الحد عند الحفظ على أي حال.
        if (isMounted) setUsage(null);
      });

    return () => {
      isMounted = false;
    };
  }, [studentId, date, usageTick]);

  const dailyLimit = DAILY_LIMITS[recordType];
  const usedToday = usage
    ? recordType === "حفظ"
      ? usage.memorizationCount
      : usage.reviewCount
    : 0;
  const limitReached = Boolean(usage) && usedToday >= dailyLimit;

  const fromSurah = surahs.find((surah) => surah.id === Number(fromSurahId));
  const toSurah = surahs.find((surah) => surah.id === Number(toSurahId));
  const sameSurah = fromSurahId !== "" && fromSurahId === toSurahId;

  const reading = getReading(fromSurahId, fromAyah, toSurahId, toAyah);
  const rangeIsComplete = fromSurahId && fromAyah && toSurahId && toAyah;
  const rangeIsBackwards = rangeIsComplete && !reading;

  function handleFromSurah(value) {
    setFromSurahId(value);
    setFromAyah(value ? "1" : "");
    // نجعل سورة النهاية هي نفسها افتراضياً لتسهيل الاختيار.
    if (!toSurahId || Number(toSurahId) < Number(value)) {
      setToSurahId(value);
      setToAyah("");
    }
  }

  function handleFromAyah(value) {
    setFromAyah(value);
    if (sameSurah && toAyah && Number(toAyah) < Number(value)) setToAyah("");
  }

  function handleToSurah(value) {
    setToSurahId(value);
    setToAyah("");
  }

  function fillCompleteSurah() {
    if (!fromSurah) return;
    setFromAyah("1");
    setToSurahId(String(fromSurah.id));
    setToAyah(String(fromSurah.ayahs));
  }

  // بعد الحفظ نُبقي النوع والتاريخ ليسهل تسجيل الطالب التالي.
  function resetForm() {
    setStudentId("");
    setFromSurahId("");
    setFromAyah("");
    setToSurahId("");
    setToAyah("");
    setGrade("ممتاز");
    setNotes("");
    setShowNotes(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!studentId) {
      setError("اختر الطالب.");
      return;
    }

    if (limitReached) {
      setError(
        recordType === "حفظ"
          ? "تم تسجيل حفظ جديد لهذا الطالب في هذا اليوم، ولا يُسمح بأكثر من سجل حفظ واحد يومياً."
          : "بلغ هذا الطالب الحد الأقصى لسجلات المراجعة في هذا اليوم (سجلان).",
      );
      return;
    }

    if (!rangeIsComplete) {
      setError("حدد بداية القراءة ونهايتها (السورة والآية).");
      return;
    }

    if (!reading) {
      setError("نهاية القراءة قبل بدايتها. تحقق من السورة والآيات.");
      return;
    }

    const student = students.find((item) => item.id === Number(studentId));
    if (!student) {
      setError("الطالب المحدد غير موجود ضمن طلاب حلقاتك النشطة.");
      return;
    }

    // سجل لكل سورة: أول سورة من الآية المختارة، وآخر سورة حتى الآية المختارة،
    // والسور التي بينهما كاملة.
    const firstId = Number(fromSurahId);
    const lastId = Number(toSurahId);
    const records = surahs
      .filter((surah) => surah.id >= firstId && surah.id <= lastId)
      .map((surah) => ({
        surahId: surah.id,
        fromAyah: surah.id === firstId ? Number(fromAyah) : 1,
        toAyah: surah.id === lastId ? Number(toAyah) : surah.ayahs,
      }));

    if (!sessionIdRef.current) sessionIdRef.current = newSessionId();
    const sessionId = sessionIdRef.current;

    const memorizationRecords = records.map((record) => ({
      studentId: student.id,
      type: RECORD_TYPE[recordType],
      surahNumber: record.surahId,
      fromAyah: record.fromAyah,
      toAyah: record.toAyah,
      recordDate: date,
      sessionId,
      notes:
        [`التقييم: ${grade}`, notes.trim()].filter(Boolean).join(" — ") || null,
    }));

    setIsSaving(true);
    try {
      await saveMemorizationRecords(memorizationRecords);
      setSuccess(
        `تم تسجيل ${recordType} الطالب ${student.name}: ${fmt(reading.decimalPages)} صفحة (${fmt(reading.lines)} سطر).`,
      );
      sessionIdRef.current = null;
      resetForm();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      // نحدّث العدّاد: قد يكون الحد بلغ من جهاز آخر أو حُفظت الجلسة فعلاً.
      setUsageTick((tick) => tick + 1);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main dir="rtl" className="mx-auto max-w-xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">
          تسجيل الحفظ والمراجعة
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          اختر الطالب وما قرأه، وسيُحسب المقدار تلقائياً.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ١ الطالب */}
        <StepCard number="١" title="الطالب">
          <div className="grid grid-cols-2 gap-2">
            {["حفظ", "مراجعة"].map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={recordType === type}
                onClick={() => setRecordType(type)}
                className={`${chipClass(recordType === type)} text-base`}
              >
                {type === "حفظ" ? "حفظ جديد" : "مراجعة"}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <Field label="الطالب" required>
              <select
                required
                disabled={isLoadingStudents || students.length === 0}
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className={inputClass}
              >
                <option value="">
                  {isLoadingStudents
                    ? "جارٍ تحميل الطلاب..."
                    : students.length === 0
                      ? "لا يوجد طلاب في حلقاتك النشطة"
                      : "اختر الطالب"}
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} — {student.group}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="التاريخ" required>
              <input
                required
                type="date"
                max={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </StepCard>

        {/* ٢ ماذا قرأ */}
        <StepCard number="٢" title="ماذا قرأ؟">
          <div className="grid grid-cols-2 gap-3">
            <Field label="من سورة" required>
              <SurahSelect value={fromSurahId} onChange={handleFromSurah} />
            </Field>
            <Field label="الآية" required>
              <AyahSelect surahId={fromSurahId} value={fromAyah} onChange={handleFromAyah} />
            </Field>

            <Field label="إلى سورة" required>
              <SurahSelect
                value={toSurahId}
                onChange={handleToSurah}
                minId={Number(fromSurahId) || 1}
              />
            </Field>
            <Field label="الآية" required>
              <AyahSelect
                surahId={toSurahId}
                value={toAyah}
                onChange={setToAyah}
                minAyah={sameSurah ? Number(fromAyah) || 1 : 1}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={fillCompleteSurah}
            disabled={!fromSurah}
            className="mt-3 text-sm font-bold text-emerald-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
          >
            السورة كاملة
          </button>

          {/* مقدار القراءة */}
          <div
            aria-live="polite"
            className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
          >
            <p className="text-xs font-semibold text-emerald-800">مقدار القراءة</p>
            {reading ? (
              <>
                <p className="mt-1 text-3xl font-extrabold text-emerald-900">
                  {fmt(reading.decimalPages)}{" "}
                  <span className="text-base font-bold">صفحة</span>
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  {fmt(reading.lines)} سطر
                  {reading.fullPages > 0 &&
                    ` · ${reading.fullPages} صفحة كاملة و${fmt(reading.remainderLines)} سطر`}
                </p>
              </>
            ) : rangeIsBackwards ? (
              <p className="mt-1 text-sm text-rose-700">
                نهاية القراءة قبل بدايتها. صحّح السورة أو الآية.
              </p>
            ) : (
              <p className="mt-1 text-sm text-emerald-800">
                يُحسب تلقائياً بعد تحديد البداية والنهاية.
              </p>
            )}
          </div>
        </StepCard>

        {/* ٣ التقييم */}
        <StepCard number="٣" title="التقييم">
          <div className="grid grid-cols-2 gap-2">
            {grades.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={grade === item}
                onClick={() => setGrade(item)}
                className={chipClass(grade === item)}
              >
                {item}
              </button>
            ))}
          </div>

          {showNotes ? (
            <div className="mt-4">
              <Field label="ملاحظات للمعلم (اختياري)">
                <textarea
                  rows={3}
                  maxLength={950}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="أضف ملاحظات عن جلسة التسميع..."
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="mt-4 text-sm font-bold text-emerald-800 hover:underline"
            >
              + إضافة ملاحظة
            </button>
          )}
        </StepCard>

        {studentId && (
          <div
            aria-live="polite"
            className={`rounded-xl border p-3 text-sm ${
              limitReached
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-100 bg-white text-slate-600"
            }`}
          >
            {usage ? (
              <>
                <p className="font-bold">
                  {recordType === "حفظ" ? "الحفظ الجديد" : "المراجعة"} في هذا اليوم: {usedToday} من{" "}
                  {dailyLimit}
                </p>
                <p className="mt-1">
                  {limitReached
                    ? recordType === "حفظ"
                      ? "تم تسجيل الحفظ الجديد لهذا الطالب اليوم، ولا يُسمح بأكثر من سجل حفظ واحد."
                      : "اكتمل الحد الأقصى لسجلات المراجعة اليوم (سجلان)."
                    : `المتبقي: ${dailyLimit - usedToday}`}
                </p>
              </>
            ) : (
              <p>جارٍ التحقق من سجلات الطالب في هذا اليوم...</p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving || isLoadingStudents || students.length === 0 || limitReached}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-4 text-base font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {isSaving ? "جارٍ الحفظ..." : `حفظ جلسة ${recordType}`}
        </button>
      </form>
    </main>
  );
}