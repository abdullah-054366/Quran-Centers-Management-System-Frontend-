import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  CirclePause,
  CirclePlay,
  Plus,
  RotateCcw,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";
import { findPage, getSurahMeta } from "quran-meta/hafs";

const students = ["عبدالله محمد", "خالد أحمد", "عمر سعيد", "يوسف علي"];

const weekDays = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const surahs = Array.from({ length: 114 }, (_, index) => {
  const id = index + 1;
  const info = getSurahMeta(id);

  return { id, name: info.name, ayahCount: info.ayahCount };
});

function getPageCount(fromSurah, toSurah) {
  const from = Number(fromSurah);
  const to = Number(toSurah);

  if (!from || !to || from > to) return 0;

  const firstPage = findPage(from, 1);
  const lastSurah = getSurahMeta(to);
  const lastPage = findPage(to, lastSurah.ayahCount);

  return lastPage - firstPage + 1;
}

function getTodayDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const initialPlans = [
  {
    id: 1,
    type: "memorization",
    student: "عبدالله محمد",
    fromSurah: 78,
    toSurah: 114,
    pagesPerSession: 1,
    completedPages: 8,
    completedRounds: 0,
    targetRounds: 1,
    startDate: "2026-10-01",
    days: ["الأحد", "الثلاثاء", "الخميس"],
    active: true,
  },
  {
    id: 2,
    type: "review",
    student: "خالد أحمد",
    fromSurah: 1,
    toSurah: 5,
    pagesPerSession: 5,
    completedPages: 0,
    completedRounds: 2,
    targetRounds: 4,
    startDate: "2026-10-05",
    days: ["الأحد", "الإثنين", "الأربعاء"],
    active: true,
  },
];

function StatCard({ title, value, note, icon: Icon, color }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}>
          <Icon size={21} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-400">{note}</p>
    </article>
  );
}

function PlanCard({ plan, onToggle }) {
  const totalPages = getPageCount(plan.fromSurah, plan.toSurah);
  const isReview = plan.type === "review";

  const progressValue = isReview ? plan.completedRounds : plan.completedPages;
  const progressTotal = isReview ? plan.targetRounds : totalPages;
  const percentage = progressTotal
    ? Math.min(Math.round((progressValue / progressTotal) * 100), 100)
    : 0;

  const fromName = getSurahMeta(Number(plan.fromSurah)).name;
  const toName = getSurahMeta(Number(plan.toSurah)).name;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
              isReview
                ? "bg-sky-50 text-sky-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isReview ? <RotateCcw size={21} /> : <BookOpenCheck size={21} />}
          </span>

          <div>
            <h2 className="font-bold text-slate-800">{plan.student}</h2>
            <p className="mt-1 text-sm text-slate-500">
              من سورة {fromName} إلى سورة {toName}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            plan.active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {plan.active ? "نشطة" : "متوقفة"}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">
            {isReview ? "دورات المراجعة" : "إنجاز الحفظ"}
          </span>
          <span className="text-slate-500">{percentage}%</span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              isReview ? "bg-sky-600" : "bg-emerald-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {isReview
            ? `${plan.completedRounds} من ${plan.targetRounds} دورات مراجعة`
            : `${plan.completedPages} من ${totalPages} صفحة`}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Target size={16} />
            <span className="text-xs">
              {isReview ? "صفحات الجلسة" : "هدف الحفظ"}
            </span>
          </div>
          <p className="mt-2 font-bold text-slate-800">
            {plan.pagesPerSession} صفحة
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays size={16} />
            <span className="text-xs">أيام الخطة</span>
          </div>
          <p className="mt-2 truncate font-bold text-slate-800">
            {plan.days.join("، ")}
          </p>
        </div>
      </div>

      {isReview && (
        <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-800">
          نطاق المراجعة: {totalPages} صفحة تقريباً — الهدف {plan.targetRounds} دورات
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-400">
          تاريخ البداية: {plan.startDate}
        </span>

        <button
          type="button"
          onClick={() => onToggle(plan.id)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
            plan.active
              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {plan.active ? <CirclePause size={17} /> : <CirclePlay size={17} />}
          {plan.active ? "إيقاف الخطة" : "تفعيل الخطة"}
        </button>
      </div>
    </article>
  );
}

function AddPlanModal({ type, onClose, onSave }) {
  const isReview = type === "review";

  const [student, setStudent] = useState(students[0]);
  const [fromSurah, setFromSurah] = useState(isReview ? "1" : "78");
  const [toSurah, setToSurah] = useState(isReview ? "5" : "114");
  const [pagesPerSession, setPagesPerSession] = useState(isReview ? "5" : "1");
  const [targetRounds, setTargetRounds] = useState("4");
  const [startDate, setStartDate] = useState(getTodayDate());
  const [days, setDays] = useState(["الأحد", "الثلاثاء", "الخميس"]);
  const [error, setError] = useState("");

  const totalPages = getPageCount(fromSurah, toSurah);

  function toggleDay(day) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (Number(fromSurah) > Number(toSurah)) {
      setError("سورة البداية يجب أن تسبق سورة النهاية.");
      return;
    }

    if (days.length === 0) {
      setError("اختر يوماً واحداً على الأقل.");
      return;
    }

    onSave({
      id: Date.now(),
      type,
      student,
      fromSurah: Number(fromSurah),
      toSurah: Number(toSurah),
      pagesPerSession: Number(pagesPerSession),
      completedPages: 0,
      completedRounds: 0,
      targetRounds: isReview ? Number(targetRounds) : 1,
      startDate,
      days,
      active: true,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-xl font-extrabold text-slate-800">
              {isReview ? "إنشاء خطة مراجعة" : "إنشاء خطة حفظ"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isReview
                ? "حدد المحفوظ المطلوب مراجعته وجدول المراجعة."
                : "حدد نطاق الحفظ الجديد والهدف اليومي."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="student" className="mb-2 block text-sm font-semibold text-slate-700">
              الطالب
            </label>
            <select
              id="student"
              value={student}
              onChange={(event) => setStudent(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              {students.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="from-surah" className="mb-2 block text-sm font-semibold text-slate-700">
                من سورة
              </label>
              <select
                id="from-surah"
                value={fromSurah}
                onChange={(event) => setFromSurah(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
              >
                {surahs.map((surah) => (
                  <option key={surah.id} value={surah.id}>
                    {surah.id}. {surah.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="to-surah" className="mb-2 block text-sm font-semibold text-slate-700">
                إلى سورة
              </label>
              <select
                id="to-surah"
                value={toSurah}
                onChange={(event) => setToSurah(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
              >
                {surahs.map((surah) => (
                  <option key={surah.id} value={surah.id}>
                    {surah.id}. {surah.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            نطاق الخطة يساوي <strong>{totalPages}</strong> صفحة تقريباً.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pages-session" className="mb-2 block text-sm font-semibold text-slate-700">
                {isReview ? "الصفحات في جلسة المراجعة" : "صفحات الحفظ في اليوم"}
              </label>
              <input
                id="pages-session"
                type="number"
                min="1"
                value={pagesPerSession}
                onChange={(event) => setPagesPerSession(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            {isReview ? (
              <div>
                <label htmlFor="target-rounds" className="mb-2 block text-sm font-semibold text-slate-700">
                  عدد دورات المراجعة المستهدفة
                </label>
                <input
                  id="target-rounds"
                  type="number"
                  min="1"
                  value={targetRounds}
                  onChange={(event) => setTargetRounds(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-600"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="start-date" className="mb-2 block text-sm font-semibold text-slate-700">
                  تاريخ بداية الخطة
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            )}
          </div>

          {isReview && (
            <div>
              <label htmlFor="review-start-date" className="mb-2 block text-sm font-semibold text-slate-700">
                تاريخ بداية الخطة
              </label>
              <input
                id="review-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-600"
              />
            </div>
          )}

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-slate-700">
              أيام {isReview ? "المراجعة" : "الحفظ"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => {
                const selected = days.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={selected}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${
                      selected
                        ? isReview
                          ? "border-sky-700 bg-sky-700 text-white"
                          : "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`rounded-xl px-5 py-3 text-sm font-bold text-white ${
                isReview
                  ? "bg-sky-700 hover:bg-sky-800"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              حفظ الخطة
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Plans() {
  const [plans, setPlans] = useState(initialPlans);
  const [activeType, setActiveType] = useState("memorization");
  const [filter, setFilter] = useState("الكل");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const typePlans = plans.filter((plan) => plan.type === activeType);

  const visiblePlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesType = plan.type === activeType;
      const matchesQuery = plan.student.includes(query.trim());
      const matchesStatus =
        filter === "الكل" ||
        (filter === "نشطة" && plan.active) ||
        (filter === "متوقفة" && !plan.active);

      return matchesType && matchesQuery && matchesStatus;
    });
  }, [plans, activeType, query, filter]);

  const activeCount = typePlans.filter((plan) => plan.active).length;
  const studentCount = new Set(typePlans.map((plan) => plan.student)).size;
  const completedCount = typePlans.filter((plan) =>
    plan.type === "review"
      ? plan.completedRounds >= plan.targetRounds
      : plan.completedPages >= getPageCount(plan.fromSurah, plan.toSurah)
  ).length;

  function addPlan(plan) {
    setPlans((current) => [plan, ...current]);
    setModalOpen(false);
  }

  function togglePlan(id) {
    setPlans((current) =>
      current.map((plan) =>
        plan.id === id ? { ...plan, active: !plan.active } : plan
      )
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 pb-24 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold text-emerald-700">
              متابعة الطلاب
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              خطط الحفظ والمراجعة
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              أنشئ لكل طالب خطة تناسب مساره في الحفظ والمراجعة.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-white ${
              activeType === "review"
                ? "bg-sky-700 hover:bg-sky-800"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            <Plus size={19} />
            {activeType === "review" ? "إنشاء خطة مراجعة" : "إنشاء خطة حفظ"}
          </button>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setActiveType("memorization");
              setFilter("الكل");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              activeType === "memorization"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <BookOpenCheck size={19} />
            خطة الحفظ
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {plans.filter((plan) => plan.type === "memorization").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveType("review");
              setFilter("الكل");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              activeType === "review"
                ? "bg-sky-700 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <RotateCcw size={19} />
            خطة المراجعة
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {plans.filter((plan) => plan.type === "review").length}
            </span>
          </button>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title={activeType === "review" ? "خطط المراجعة النشطة" : "خطط الحفظ النشطة"}
            value={activeCount}
            note="الخطط المفعّلة حالياً"
            icon={activeType === "review" ? RotateCcw : BookOpenCheck}
            color={activeType === "review" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}
          />
          <StatCard
            title="الطلاب"
            value={studentCount}
            note="طلاب لديهم هذا النوع من الخطط"
            icon={Users}
            color="bg-violet-50 text-violet-700"
          />
          <StatCard
            title="خطط مكتملة"
            value={completedCount}
            note="اكتمل هدفها المحدد"
            icon={Target}
            color="bg-amber-50 text-amber-700"
          />
        </section>

        <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الطالب..."
              className="w-full rounded-xl border border-slate-200 py-3 pe-10 ps-4 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <div className="flex gap-2">
            {["الكل", "نشطة", "متوقفة"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  filter === item
                    ? activeType === "review"
                      ? "bg-sky-700 text-white"
                      : "bg-emerald-700 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {visiblePlans.length ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {visiblePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onToggle={togglePlan} />
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400">
              {activeType === "review" ? <RotateCcw size={27} /> : <BookOpenCheck size={27} />}
            </div>
            <h2 className="mt-4 font-bold text-slate-700">
              لا توجد {activeType === "review" ? "خطط مراجعة" : "خطط حفظ"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              أنشئ خطة جديدة لتظهر هنا.
            </p>
          </section>
        )}
      </div>

      {modalOpen && (
        <AddPlanModal
          type={activeType}
          onClose={() => setModalOpen(false)}
          onSave={addPlan}
        />
      )}
    </main>
  );
}