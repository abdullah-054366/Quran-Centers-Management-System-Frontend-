import { useState } from "react";
import { BookOpen, ClipboardCheck, Save } from "lucide-react";
import { students } from "../../api/students";


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

function Field({ label, children }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

export default function MemorizationReview() {
  const [type, setType] = useState("حفظ");
  const [studentId, setStudentId] = useState("");
  const [surahName, setSurahName] = useState("");
  const [fromAyah, setFromAyah] = useState("");
  const [toAyah, setToAyah] = useState("");
  const [pages, setPages] = useState("");
  const [grade, setGrade] = useState("ممتاز");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSurah = surahs.find((surah) => surah.name === surahName);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const from = Number(fromAyah);
    const to = Number(toAyah);
    const pageCount = Number(pages);

    if (!selectedSurah) {
      setError("اختر السورة.");
      return;
    }

    if (from < 1 || to < from || to > selectedSurah.ayahs) {
      setError(
        `تأكد من الآيات. سورة ${surahName} تحتوي على ${selectedSurah.ayahs} آية.`
      );
      return;
    }

    if (!Number.isFinite(pageCount) || pageCount <= 0) {
      setError("أدخل عدد صفحات صحيحاً أكبر من صفر.");
      return;
    }

    const student = students.find((item) => item.id === Number(studentId));

    const record = {
      type,
      studentId: Number(studentId),
      studentName: student?.name,
      group: student?.group,
      surah: surahName,
      fromAyah: from,
      toAyah: to,
      pages: pageCount,
      grade,
      date,
      notes,
    };

    // استبدل هذا بطلب API لحفظ السجل في الباك اند.
    console.log("سجل الحفظ والمراجعة:", record);

    setMessage(`تم تسجيل ${type} الطالب ${student?.name} بنجاح.`);
    setStudentId("");
    setSurahName("");
    setFromAyah("");
    setToAyah("");
    setPages("");
    setNotes("");
  }

  return (
    <main dir="rtl" className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">
          تسجيل الحفظ والمراجعة
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          سجّل تسميع الطالب وحدد الآيات وعدد الصفحات.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "حفظ", label: "حفظ جديد", Icon: BookOpen },
            { value: "مراجعة", label: "مراجعة", Icon: ClipboardCheck },
          ].map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                type === value
                  ? "bg-emerald-800 text-white"
                  : "text-slate-500 hover:bg-emerald-50"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الطالب">
            <select
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-700"
            >
              <option value="">اختر الطالب</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} — {student.group}
                </option>
              ))}
            </select>
          </Field>

          <Field label="تاريخ التسميع">
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-700"
            />
          </Field>

          <Field label="السورة">
            <select
              required
              value={surahName}
              onChange={(event) => setSurahName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-700"
            >
              <option value="">اختر السورة</option>
              {surahs.map((surah) => (
                <option key={surah.name} value={surah.name}>
                  سورة {surah.name} ({surah.ayahs} آية)
                </option>
              ))}
            </select>
          </Field>

          <Field label="التقييم">
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-700"
            >
              <option>ممتاز</option>
              <option>جيد جداً</option>
              <option>جيد</option>
              <option>يحتاج متابعة</option>
            </select>
          </Field>

          <Field label="من آية">
            <input
              required
              type="number"
              min="1"
              max={selectedSurah?.ayahs}
              value={fromAyah}
              onChange={(event) => setFromAyah(event.target.value)}
              placeholder="مثال: ١"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-700"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-700"
            />
          </Field>

          <Field label="عدد الصفحات">
            <input
              required
              type="number"
              min="0.25"
              step="0.25"
              value={pages}
              onChange={(event) => setPages(event.target.value)}
              placeholder="مثال: ٢"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-700"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="ملاحظات المعلم">
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="ملاحظات اختيارية عن التسميع..."
                className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-emerald-700"
              />
            </Field>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        )}

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900"
        >
          <Save size={17} />
          حفظ سجل {type}
        </button>
      </form>
    </main>
  );
}