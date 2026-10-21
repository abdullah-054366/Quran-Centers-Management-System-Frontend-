import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

const students = [
  { id: 1, name: "عبدالرحمن خالد", group: "حلقة الفجر" },
  { id: 2, name: "سلمان محمد", group: "حلقة الفجر" },
  { id: 3, name: "فيصل عبدالله", group: "حلقة الضحى" },
  { id: 4, name: "عمر صالح", group: "حلقة العصر" },
  { id: 5, name: "ياسر إبراهيم", group: "حلقة الضحى" },
];

const surahs = [
  { name: "الفاتحة", ayahs: 7 },
  { name: "البقرة", ayahs: 286 },
  { name: "آل عمران", ayahs: 200 },
  { name: "الكهف", ayahs: 110 },
  { name: "مريم", ayahs: 98 },
  { name: "يس", ayahs: 83 },
  { name: "الرحمن", ayahs: 78 },
  { name: "الملك", ayahs: 30 },
  { name: "النبأ", ayahs: 40 },
  { name: "الإخلاص", ayahs: 4 },
];

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
}).format(new Date());

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";

function createEntry() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    surah: "",
    complete: false,
    fromAyah: "",
    toAyah: "",
    pages: "",
    grade: "ممتاز",
  };
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block text-sm font-semibold text-slate-600 ${className}`}>
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

export default function MemorizationReviewPage() {
  const [studentId, setStudentId] = useState("");
  const [recordType, setRecordType] = useState("حفظ");
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState([createEntry()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalPages = entries.reduce(
    (total, entry) => total + (Number(entry.pages) || 0),
    0
  );

  function updateEntry(id, field, value) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  }

  function addEntry() {
    setEntries((current) => [...current, createEntry()]);
  }

  function removeEntry(id) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function submitSession(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!studentId) {
      setError("اختر الطالب.");
      return;
    }

    for (const entry of entries) {
      const surahInfo = surahs.find((item) => item.name === entry.surah);

      if (!surahInfo) {
        setError("اختر السورة لكل سطر.");
        return;
      }

      const from = entry.complete ? 1 : Number(entry.fromAyah);
      const to = entry.complete
        ? surahInfo.ayahs
        : Number(entry.toAyah);

      if (
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 1 ||
        to < from ||
        to > surahInfo.ayahs
      ) {
        setError(`تحقق من الآيات المحددة في سورة ${entry.surah}.`);
        return;
      }

      if (!Number.isFinite(Number(entry.pages)) || Number(entry.pages) <= 0) {
        setError(`أدخل عدد الصفحات لسورة ${entry.surah}.`);
        return;
      }
    }

    const student = students.find(
      (item) => item.id === Number(studentId)
    );

    const session = {
      studentId: student.id,
      studentName: student.name,
      group: student.group,
      type: recordType,
      date,
      notes,
      records: entries.map((entry) => {
        const surahInfo = surahs.find(
          (item) => item.name === entry.surah
        );

        return {
          surah: entry.surah,
          complete: entry.complete,
          fromAyah: entry.complete ? 1 : Number(entry.fromAyah),
          toAyah: entry.complete
            ? surahInfo.ayahs
            : Number(entry.toAyah),
          pages: Number(entry.pages),
          grade: entry.grade,
        };
      }),
    };

    // استبدل هذا بطلب API عند ربط الباك اند.
    console.log("جلسة التسميع:", session);

    setSuccess(`تم تسجيل الجلسة للطالب ${student.name}.`);
    setStudentId("");
    setNotes("");
    setEntries([createEntry()]);
  }

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">
          تسجيل الحفظ والمراجعة
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          أدخل بيانات الجلسة مرة واحدة، ثم أضف السور التي سمّعها الطالب.
        </p>
      </header>

      <form onSubmit={submitSession} className="space-y-5">
        {/* بيانات مشتركة للجلسة */}
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

        {/* السور */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-800">
                السور المسَمَّعة
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {entries.length} {entries.length === 1 ? "سورة" : "سور"} ·
                مجموع الصفحات: {totalPages}
              </p>
            </div>

            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              <Plus size={17} />
              إضافة سورة
            </button>
          </div>

          {entries.map((entry, index) => {
            const selectedSurah = surahs.find(
              (item) => item.name === entry.surah
            );

            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">
                    {index + 1}. {entry.surah ? `سورة ${entry.surah}` : "سورة جديدة"}
                  </h3>

                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      aria-label={`حذف السورة رقم ${index + 1}`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <Field label="السورة" className="lg:col-span-2">
                    <select
                      required
                      value={entry.surah}
                      onChange={(event) =>
                        updateEntry(entry.id, "surah", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">اختر السورة</option>
                      {surahs.map((surah) => (
                        <option key={surah.name} value={surah.name}>
                          سورة {surah.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="طريقة التسميع" className="lg:col-span-2">
                    <select
                      value={entry.complete ? "complete" : "range"}
                      onChange={(event) =>
                        updateEntry(
                          entry.id,
                          "complete",
                          event.target.value === "complete"
                        )
                      }
                      className={inputClass}
                    >
                      <option value="range">تحديد آيات</option>
                      <option value="complete">السورة كاملة</option>
                    </select>
                  </Field>

                  <Field label="عدد الصفحات">
                    <input
                      required
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={entry.pages}
                      onChange={(event) =>
                        updateEntry(entry.id, "pages", event.target.value)
                      }
                      placeholder="مثال: ٢"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="التقييم">
                    <select
                      value={entry.grade}
                      onChange={(event) =>
                        updateEntry(entry.id, "grade", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option>ممتاز</option>
                      <option>جيد جداً</option>
                      <option>جيد</option>
                      <option>يحتاج متابعة</option>
                    </select>
                  </Field>
                </div>

                {entry.complete ? (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    {selectedSurah
                      ? `سيتم تسجيل السورة كاملة: من الآية ١ إلى ${selectedSurah.ayahs}.`
                      : "اختر السورة لتسجيلها كاملة."}
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="من آية">
                      <input
                        required
                        type="number"
                        min="1"
                        max={selectedSurah?.ayahs}
                        value={entry.fromAyah}
                        onChange={(event) =>
                          updateEntry(entry.id, "fromAyah", event.target.value)
                        }
                        placeholder="١"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="إلى آية">
                      <input
                        required
                        type="number"
                        min={entry.fromAyah || "1"}
                        max={selectedSurah?.ayahs}
                        value={entry.toAyah}
                        onChange={(event) =>
                          updateEntry(entry.id, "toAyah", event.target.value)
                        }
                        placeholder="١٠"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {/* ملاحظات وحفظ */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <Field label="ملاحظات للمعلم (اختياري)">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="ملاحظة عن جلسة التسميع..."
              className={`${inputClass} resize-y`}
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {success}
            </p>
          )}

          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              مجموع صفحات الجلسة:{" "}
              <span className="font-extrabold text-slate-800">
                {totalPages}
              </span>
            </p>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900"
            >
              <Save size={17} />
              حفظ جلسة {recordType}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}