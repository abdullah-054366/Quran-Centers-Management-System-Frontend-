import { useState } from "react";
import { findPage, getSurahMeta } from "quran-meta/hafs";
import { Save } from "lucide-react";

const students = [
  { id: 1, name: "عبدالرحمن خالد", group: "حلقة الفجر" },
  { id: 2, name: "سلمان محمد", group: "حلقة الفجر" },
  { id: 3, name: "فيصل عبدالله", group: "حلقة الضحى" },
  { id: 4, name: "عمر صالح", group: "حلقة العصر" },
  { id: 5, name: "ياسر إبراهيم", group: "حلقة الضحى" },
];

// بيانات السور الـ١١٤ من رواية حفص ومصحف المدينة.
const surahs = Array.from({ length: 114 }, (_, index) => {
  const id = index + 1;
  const metadata = getSurahMeta(id);
  const ayahs = metadata.ayahCount;
  const firstPage = findPage(id, 1);
  const lastPage = findPage(id, ayahs);

  return {
    id,
    name: metadata.name,
    ayahs,
    firstPage,
    lastPage,
    pages: lastPage - firstPage + 1,
  };
});

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
}).format(new Date());

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-600">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

// يحسب الصفحات التي يغطيها النطاق من أول صفحة إلى آخر صفحة، دون تكرار
// الصفحة إذا كانت تحتوي على نهاية سورة وبداية السورة التالية.
function getPageCount(startSurahId, startAyah, endSurahId, endAyah) {
  if (!startSurahId || !startAyah || !endSurahId || !endAyah) return "";

  const firstPage = findPage(Number(startSurahId), Number(startAyah));
  const lastPage = findPage(Number(endSurahId), Number(endAyah));

  if (!firstPage || !lastPage || lastPage < firstPage) return "";

  return lastPage - firstPage + 1;
}

export default function MemorizationReview() {
  const [studentId, setStudentId] = useState("");
  const [recordType, setRecordType] = useState("حفظ");
  const [date, setDate] = useState(today);
  const [multipleSurahs, setMultipleSurahs] = useState(false);

  // وضع سورة واحدة
  const [surahId, setSurahId] = useState("");
  const [completeSurah, setCompleteSurah] = useState(true);
  const [fromAyah, setFromAyah] = useState("");
  const [toAyah, setToAyah] = useState("");

  // وضع أكثر من سورة
  const [fromSurahId, setFromSurahId] = useState("");
  const [toSurahId, setToSurahId] = useState("");

  const [grade, setGrade] = useState("ممتاز");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedSurah = surahs.find((surah) => surah.id === Number(surahId));

  const firstSurah = surahs.find((surah) => surah.id === Number(fromSurahId));

  const lastSurah = surahs.find((surah) => surah.id === Number(toSurahId));

  const pageCount = multipleSurahs
    ? getPageCount(fromSurahId, 1, toSurahId, lastSurah?.ayahs)
    : selectedSurah
      ? completeSurah
        ? selectedSurah.pages
        : getPageCount(surahId, fromAyah, surahId, toAyah)
      : "";

  function resetForm() {
    setStudentId("");
    setRecordType("حفظ");
    setDate(today);
    setMultipleSurahs(false);
    setSurahId("");
    setCompleteSurah(true);
    setFromAyah("");
    setToAyah("");
    setFromSurahId("");
    setToSurahId("");
    setGrade("ممتاز");
    setNotes("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!studentId) {
      setError("اختر الطالب.");
      return;
    }

    if (multipleSurahs) {
      if (!firstSurah || !lastSurah) {
        setError("اختر بداية ونهاية نطاق السور.");
        return;
      }

      if (lastSurah.id < firstSurah.id) {
        setError("يجب أن تكون سورة النهاية بعد سورة البداية.");
        return;
      }
    } else {
      if (!selectedSurah) {
        setError("اختر السورة.");
        return;
      }

      if (!completeSurah) {
        const from = Number(fromAyah);
        const to = Number(toAyah);

        if (
          !Number.isInteger(from) ||
          !Number.isInteger(to) ||
          from < 1 ||
          to < from ||
          to > selectedSurah.ayahs
        ) {
          setError(`تحقق من نطاق الآيات في سورة ${selectedSurah.name}.`);
          return;
        }
      }
    }

    if (!pageCount) {
      setError("تعذر حساب الصفحات. تحقق من السورة والآيات المحددة.");
      return;
    }

    const student = students.find((item) => item.id === Number(studentId));

    let records;

    if (multipleSurahs) {
      // نرسل سجلاً لكل سورة ضمن الجلسة نفسها.
      records = surahs
        .filter(
          (surah) => surah.id >= firstSurah.id && surah.id <= lastSurah.id,
        )
        .map((surah) => ({
          surahId: surah.id,
          surah: surah.name,
          complete: true,
          fromAyah: 1,
          toAyah: surah.ayahs,
          pages: surah.pages,
          grade,
        }));
    } else {
      records = [
        {
          surahId: selectedSurah.id,
          surah: selectedSurah.name,
          complete: completeSurah,
          fromAyah: completeSurah ? 1 : Number(fromAyah),
          toAyah: completeSurah ? selectedSurah.ayahs : Number(toAyah),
          pages: Number(pageCount),
          grade,
        },
      ];
    }

    const session = {
      studentId: student.id,
      studentName: student.name,
      group: student.group,
      type: recordType,
      date,
      notes,
      multipleSurahs,
      totalPages: Number(pageCount),
      records,
    };

    // استبدل هذا بطلب API لحفظ الجلسة في الباك اند.
    console.log("جلسة التسميع:", session);

    setSuccess(
      `تم تسجيل ${recordType} الطالب ${student.name}، بإجمالي ${pageCount} صفحة.`,
    );

    resetForm();
  }

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">
          تسجيل الحفظ والمراجعة
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          سجّل جلسة الطالب، وسيُحسب عدد الصفحات تلقائياً.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* بيانات الجلسة */}
        <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-3 md:p-5">
          <Field label="الطالب">
            <select
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className={inputClass}
            >
              <option value="">اختر الطالب</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} — {student.group}
                </option>
              ))}
            </select>
          </Field>

          <Field label="التاريخ">
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="نوع التسميع">
            <select
              value={recordType}
              onChange={(event) => setRecordType(event.target.value)}
              className={inputClass}
            >
              <option value="حفظ">حفظ جديد</option>
              <option value="مراجعة">مراجعة</option>
            </select>
          </Field>
        </section>

        {/* خيار أكثر من سورة */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <input
            type="checkbox"
            checked={multipleSurahs}
            onChange={(event) => {
              setMultipleSurahs(event.target.checked);
              setError("");
            }}
            className="mt-1 h-4 w-4 accent-emerald-800"
          />

          <span>
            <span className="block text-sm font-extrabold text-slate-800">
              أكثر من سورة
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              فعّل هذا الخيار إذا قرأ الطالب سوراً متتابعة.
            </span>
          </span>
        </label>

        {/* اختيار سورة واحدة أو نطاق سور */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
          {multipleSurahs ? (
            <>
              <h2 className="mb-4 font-extrabold text-slate-800">نطاق السور</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="من سورة">
                  <select
                    required
                    value={fromSurahId}
                    onChange={(event) => setFromSurahId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">اختر سورة البداية</option>
                    {surahs.map((surah) => (
                      <option key={surah.id} value={surah.id}>
                        {surah.id}. سورة {surah.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="إلى سورة">
                  <select
                    required
                    value={toSurahId}
                    onChange={(event) => setToSurahId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">اختر سورة النهاية</option>
                    {surahs.map((surah) => (
                      <option
                        key={surah.id}
                        value={surah.id}
                        disabled={firstSurah && surah.id < firstSurah.id}
                      >
                        {surah.id}. سورة {surah.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {firstSurah && lastSurah && lastSurah.id >= firstSurah.id && (
                <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  من سورة {firstSurah.name} إلى سورة {lastSurah.name} · عدد
                  الصفحات المحسوب: {pageCount || "—"}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="mb-4 font-extrabold text-slate-800">
                بيانات السورة
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="السورة">
                  <select
                    required
                    value={surahId}
                    onChange={(event) => {
                      setSurahId(event.target.value);
                      setFromAyah("");
                      setToAyah("");
                    }}
                    className={inputClass}
                  >
                    <option value="">اختر السورة</option>
                    {surahs.map((surah) => (
                      <option
                        key={surah.id}
                        value={surah.id}
                        disabled={firstSurah && surah.id < firstSurah.id}
                      >
                        {surah.id}. سورة {surah.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="نطاق التسميع">
                  <select
                    value={completeSurah ? "complete" : "range"}
                    onChange={(event) => {
                      const isComplete = event.target.value === "complete";
                      setCompleteSurah(isComplete);
                      setFromAyah("");
                      setToAyah("");
                    }}
                    className={inputClass}
                  >
                    <option value="complete">السورة كاملة</option>
                    <option value="range">تحديد آيات</option>
                  </select>
                </Field>
              </div>

              {!completeSurah && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="من آية">
                    <input
                      required
                      type="number"
                      min="1"
                      max={selectedSurah?.ayahs}
                      value={fromAyah}
                      onChange={(event) => setFromAyah(event.target.value)}
                      placeholder="مثال: ١"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="إلى آية">
                    <input
                      required
                      type="number"
                      min={fromAyah || "1"}
                      max={selectedSurah?.ayahs}
                      value={toAyah}
                      onChange={(event) => setToAyah(event.target.value)}
                      placeholder="مثال: ١٠"
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              {selectedSurah && completeSurah && (
                <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  سورة {selectedSurah.name} كاملة · {selectedSurah.pages} صفحة
                </p>
              )}
            </>
          )}
        </section>

        {/* الصفحات والتقييم */}
        <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 md:p-5">
          <Field label="عدد الصفحات المحسوب">
            <input
              type="number"
              value={pageCount}
              readOnly
              placeholder="يُحسب تلقائياً بعد اختيار السورة"
              className={`${inputClass} bg-emerald-50 font-bold text-emerald-900`}
            />
          </Field>

          <Field label="التقييم">
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className={inputClass}
            >
              <option>ممتاز</option>
              <option>جيد جداً</option>
              <option>جيد</option>
              <option>يحتاج متابعة</option>
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="ملاحظات للمعلم (اختياري)">
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="أضف ملاحظات عن جلسة التسميع..."
                className={`${inputClass} resize-y`}
              />
            </Field>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
          >
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-900 sm:w-auto"
        >
          <Save size={17} />
          حفظ جلسة {recordType}
        </button>
      </form>
    </main>
  );
}
