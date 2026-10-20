import { useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  GraduationCap,
  LockKeyhole,
  Pencil,
  Users,
} from "lucide-react";

const schedule = [
  { day: "الأحد", task: "حفظ سورة القلم", verses: "الآيات ١–١٦", done: true },
  {
    day: "الإثنين",
    task: "مراجعة سورة الملك",
    verses: "الآيات ١–٣٠",
    today: true,
  },
  { day: "الثلاثاء", task: "حفظ سورة القلم", verses: "الآيات ١٧–٣٢" },
  { day: "الأربعاء", task: "مراجعة سورة الرحمن", verses: "الآيات ١–٢٥" },
  { day: "الخميس", task: "تسميع ومراجعة أسبوعية", verses: "سورة القلم والملك" },
];

const records = [
  {
    type: "حفظ جديد",
    surah: "سورة الملك",
    verses: "الآيات ١–١٠",
    date: "اليوم",
    grade: "ممتاز",
  },
  {
    type: "مراجعة",
    surah: "سورة الرحمن",
    verses: "الآيات ١–٢٥",
    date: "أمس",
    grade: "ممتاز",
  },
  {
    type: "حفظ جديد",
    surah: "سورة النبأ",
    verses: "الآيات ١–٢٠",
    date: "الأحد",
    grade: "جيد جداً",
  },
];

function InfoCard({ label, value, Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
        <Icon size={19} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function StudentHome() {
  const [type, setType] = useState("حفظ جديد");
  const [surah, setSurah] = useState("سورة القلم");
  const [verses, setVerses] = useState("");
  const [note, setNote] = useState("");

  function submit(event) {
    event.preventDefault();
    onSave?.({ type, surah, verses, note });
    setVerses("");
    setNote("");
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-6xl space-y-6 p-4 text-slate-800 md:p-8"
    >
      <section className="rounded-3xl bg-gradient-to-l from-emerald-900 to-teal-700 p-6 text-white">
        <p className="text-sm text-emerald-100">ملفك التعليمي · حلقة الفجر</p>
        <h2 className="mt-2 text-2xl font-extrabold">أحسنت يا عبدالرحمن 🌟</h2>
        <p className="mt-2 text-sm text-emerald-50/80">
          واصل اجتهادك، أنت تقترب من تحقيق هدفك لهذا الشهر.
        </p>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <span className="text-4xl font-extrabold">٧٨٪</span>
            <p className="mt-1 text-xs text-emerald-100">إنجاز الخطة الشهرية</p>
          </div>
          <div className="h-2 w-1/2 rounded-full bg-white/20">
            <div className="h-full w-[78%] rounded-full bg-white" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-extrabold">جدول الحفظ والمراجعة</h2>
          <p className="mb-5 mt-1 text-sm text-slate-400">الخطة الأسبوعية</p>

          <div className="space-y-3">
            {schedule.map((item) => (
              <div
                key={item.day}
                className={`flex items-center gap-3 rounded-xl border p-4 ${
                  item.today
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-100"
                }`}
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                  {item.done ? <Check size={19} /> : <BookOpen size={19} />}
                </div>
                <div className="flex-1">
                  <p className="font-bold">
                    {item.day}{" "}
                    {item.today && (
                      <span className="text-emerald-700">· اليوم</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.task} · {item.verses}
                  </p>
                </div>
                {item.done && (
                  <span className="text-xs font-bold text-emerald-700">
                    مكتمل
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold">سجل الحفظ والمراجعة</h2>
          <div className="mt-5 space-y-4">
            {records.map((record) => (
              <div
                key={`${record.surah}-${record.date}`}
                className="border-r-2 border-emerald-200 pr-3"
              >
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-emerald-800">
                    {record.type}
                  </span>
                  <span className="text-slate-400">{record.date}</span>
                </div>
                <p className="mt-1 font-bold">{record.surah}</p>
                <p className="text-xs text-slate-500">
                  {record.verses} · التقييم: {record.grade}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-extrabold">
            <CalendarCheck size={19} className="text-emerald-800" />
            الحضور والغياب
          </h2>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 p-3">
              <b>١٨</b>
              <p className="text-xs">حضور</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <b>٢</b>
              <p className="text-xs">غياب</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <b>١</b>
              <p className="text-xs">تأخر</p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays size={16} /> آخر غياب: الأحد ١٢ أكتوبر
          </p>
        </div>

        {/* <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-extrabold">
            <Pencil size={18} className="text-emerald-800" />
            تحديث الحفظ والمراجعة
          </h2>

          {allowEdit ? (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border p-3"
              >
                <option>حفظ جديد</option>
                <option>مراجعة</option>
              </select>

              <select
                value={surah}
                onChange={(e) => setSurah(e.target.value)}
                className="w-full rounded-xl border p-3"
              >
                <option>سورة القلم</option>
                <option>سورة الملك</option>
                <option>سورة الرحمن</option>
                <option>سورة النبأ</option>
              </select>

              <input
                required
                value={verses}
                onChange={(e) => setVerses(e.target.value)}
                placeholder="الآيات: مثال ١–١٠"
                className="w-full rounded-xl border p-3"
              />

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة للمعلم (اختياري)"
                className="w-full rounded-xl border p-3"
              />

              <button className="w-full rounded-xl bg-emerald-800 p-3 font-bold text-white">
                إرسال التحديث
              </button>
            </form>
          ) : (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              <LockKeyhole size={16} />
              التعديل متوقف من إدارة المركز.
            </p>
          )}
        </div> */}
      </section>
    </main>
  );
}
