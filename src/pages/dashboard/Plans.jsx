import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ClipboardList, Plus, Search } from "lucide-react";
import { getMemorizationPlans } from "../../api/plans";
import { getMemorizationRecords } from "../../api/memorization";
import { getStudents } from "../../api/students";
import { getErrorMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { amountLabel, buildPlanView, WEEKDAYS } from "../../lib/planSchedule";
import PlanFormModal from "../../components/plans/PlanFormModal";
import Segmented from "../../components/plans/Segmented";
import { asList, calculator, formatDay, rangeText, riyadhToday } from "../../components/plans/planUi";

const STAFF = ["PlatformAdmin", "Admin", "CenterAdmin", "Teacher"];

const TYPE_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "memorization", label: "حفظ" },
  { value: "review", label: "مراجعة" },
];

// حالة الخطة: تحدّد اللون والعبارة في البطاقة والصفّ معاً (مطابقة للجوال).
const STATES = {
  closed: { label: "أُقفلت ناقصة", text: "text-rose-700", bg: "bg-rose-50", ring: "border-rose-600", dot: "bg-rose-600", bar: "bg-rose-600" },
  late: { label: "متأخّرة", text: "text-amber-700", bg: "bg-amber-50", ring: "border-amber-600", dot: "bg-amber-500", bar: "bg-emerald-700" },
  today: { label: "مطلوب اليوم", text: "text-emerald-800", bg: "bg-emerald-50", ring: "border-emerald-700", dot: "bg-emerald-600", bar: "bg-emerald-700" },
  done: { label: "اكتملت", text: "text-emerald-800", bg: "bg-emerald-50", ring: "border-emerald-700", dot: "bg-emerald-600", bar: "bg-emerald-700" },
  paused: { label: "موقوفة", text: "text-slate-500", bg: "bg-slate-100", ring: "border-slate-400", dot: "bg-slate-400", bar: "bg-slate-400" },
  upcoming: { label: "منتظمة", text: "text-sky-700", bg: "bg-sky-50", ring: "border-sky-600", dot: "bg-sky-600", bar: "bg-emerald-700" },
};

/** حالة واحدة لكل خطة من مخرجات المحرّك، تُحسب مرّة وتُستعمل في كل مكان. */
function planState({ plan, view }) {
  const t = view?.totals;
  const todayRow = view?.rows.find((row) => row.kind === "today");
  const missed = view?.rows.filter((row) => row.kind === "missed").length ?? 0;
  const next = view?.rows.find((row) => row.kind === "upcoming");

  const closed = Boolean(t?.closedIncomplete);
  // المتأخّر: جلسة فائتة هذا الشهر، أو جلسة اليوم تحمل مقدار ما تأخّر.
  const late = !closed && (missed > 0 || Boolean(todayRow?.catchUp));
  const key = closed ? "closed" : late ? "late" : t?.completed ? "done" : !plan.isActive ? "paused" : todayRow ? "today" : "upcoming";

  return { plan, totals: t, todayRow, next, missed, closed, late, key, needsFollowUp: closed || late };
}

function StatCell({ label, value }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 px-2">
      <span className="text-lg font-extrabold text-white sm:text-xl">{value}</span>
      <span className="truncate text-xs text-emerald-100">{label}</span>
    </div>
  );
}

function SectionLabel({ text, count, danger }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-bold ${danger ? "text-rose-700" : "text-slate-800"}`}>{text}</span>
      <span className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs ${danger ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
        {count}
      </span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

/** بطاقة المتابعة: النسبة والحالة والمطلوب الآن — ما يلزم المعلّم ليتحرّك. */
function FollowUpCard({ item, onOpen }) {
  const { plan, totals, todayRow, closed, key } = item;
  const state = STATES[key];
  const headline = closed
    ? amountLabel(totals.remainingLines)
    : todayRow
      ? rangeText(todayRow.from, todayRow.to)
      : amountLabel(totals.perSessionLines);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`عرض خطة ${plan.studentName}`}
      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${state.bg} ${state.ring} ${state.text}`}>
          {totals.progress}٪
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-slate-800">{plan.studentName}</span>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${state.bg} ${state.text}`}>
            {item.missed > 0 && !closed ? `متأخّر ${item.missed} جلسة` : state.label}
          </span>
        </span>
      </div>

      <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${state.bar}`} style={{ width: `${totals.progress}%` }} />
      </span>

      <span className="border-t border-slate-100 pt-3">
        <span className="block text-xs text-slate-500">{closed ? "المتبقّي من النطاق" : "المطلوب الآن"}</span>
        <span className="mt-0.5 block truncate font-bold text-slate-800">{headline}</span>
        <span className="block truncate text-xs text-slate-500">
          {closed
            ? `انتهت ${formatDay(totals.endDate)}`
            : todayRow
              ? `${amountLabel(todayRow.lines)}${todayRow.catchUp ? " · يشمل المتأخّر" : ""}`
              : `القادمة ${WEEKDAYS[item.next?.weekday] ?? "—"}`}
        </span>
      </span>
    </button>
  );
}

/** صفّ مضغوط لبقيّة الخطط: اسم وحالة ونسبة، بلا زحام. */
function PlanRow({ item, onOpen }) {
  const { plan, totals, todayRow, closed, key } = item;
  const state = STATES[key];
  const detail = closed
    ? `انتهت ${formatDay(totals.endDate)}`
    : todayRow
      ? `اليوم: ${rangeText(todayRow.from, todayRow.to)}`
      : key === "done"
        ? "اكتمل النطاق"
        : key === "paused"
          ? "موقوفة"
          : `القادمة ${WEEKDAYS[item.next?.weekday] ?? "—"}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`عرض خطة ${plan.studentName}`}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-right transition hover:bg-emerald-50/50"
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${state.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-slate-800">{plan.studentName}</span>
        <span className="block truncate text-xs text-slate-500">
          {plan.type === 1 ? "مراجعة" : "حفظ"} · {detail}
        </span>
      </span>
      <span className={`text-sm font-bold ${state.text}`}>{totals.progress}٪</span>
    </button>
  );
}

export default function Plans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === "Student";
  const isStaff = STAFF.includes(user?.role);

  const [data, setData] = useState({ plans: [], records: [] });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const today = riyadhToday();
  const monthKey = today.slice(0, 7);

  // الخطط وسجلات الطلاب في طلبين لا طلب لكل خطة: نجلب سجلات الجميع مرّة ونوزّعها محلياً.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const plans = asList(await getMemorizationPlans());
      const from = plans.reduce((min, plan) => {
        const start = String(plan.startDate).slice(0, 10);
        return !min || start < min ? start : min;
      }, "");
      const records = plans.length ? asList(await getMemorizationRecords(from ? { from } : {})) : [];
      setData({ plans, records });
    } catch (requestError) {
      setError(getErrorMessage(requestError) || "تعذّر تحميل الخطط.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // الطالب لا يملك قائمة الطلاب؛ يُنشئ الخطة لنفسه فقط.
  useEffect(() => {
    if (isStudent) {
      setStudents(user?.studentId ? [{ studentId: user.studentId, self: true }] : []);
      return;
    }
    if (!isStaff) return;
    getStudents()
      .then((list) => setStudents(asList(list).filter((student) => student.isActive !== false)))
      .catch(() => setStudents([]));
  }, [isStudent, isStaff, user?.studentId]);

  const items = useMemo(() => {
    const byStudent = new Map();
    for (const record of data.records) {
      const key = Number(record.studentId);
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key).push(record);
    }
    return data.plans
      .map((plan) => {
        try {
          const view = buildPlanView({
            plan,
            rawRecords: byStudent.get(Number(plan.studentId)) ?? [],
            calculator,
            today,
            monthKey,
          });
          return planState({ plan, view });
        } catch {
          return null; // خطة ببيانات غير صالحة لا تُسقط الصفحة
        }
      })
      .filter((item) => item?.totals);
  }, [data, today, monthKey]);

  const shown = useMemo(() => {
    const query = search.trim();
    return items.filter((item) => {
      const isReview = item.plan.type === 1;
      const matchType = type === "all" || (type === "review" ? isReview : !isReview);
      const matchSearch = !query || String(item.plan.studentName ?? "").includes(query);
      return matchType && matchSearch;
    });
  }, [items, type, search]);

  const followUp = useMemo(() => shown.filter((item) => item.needsFollowUp).sort((a, b) => b.missed - a.missed), [shown]);
  const rest = useMemo(() => shown.filter((item) => !item.needsFollowUp), [shown]);

  const summary = useMemo(() => {
    const studentsCount = new Set(items.map((item) => item.plan.studentId)).size;
    const dueToday = items.filter((item) => item.todayRow).length;
    const average = items.length ? Math.round(items.reduce((sum, item) => sum + item.totals.progress, 0) / items.length) : 0;
    return { plans: items.length, students: studentsCount, dueToday, average, followUp: items.filter((i) => i.needsFollowUp).length };
  }, [items]);

  const canCreate = students.length > 0;
  const open = (item) => navigate(`/plans/${item.plan.memorizationPlanId}`);

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-5">
      <section className="leaf-pattern rounded-3xl bg-emerald-800 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{isStudent ? "خططي للحفظ والمراجعة" : "خطط الحفظ والمراجعة"}</h1>
            <p className="mt-1 text-sm text-emerald-100">
              {summary.plans} خطة لـ {summary.students} {summary.students === 1 ? "طالب" : "طالباً"}
            </p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/35 bg-white/15 px-4 text-sm font-bold text-white hover:bg-white/25"
            >
              <Plus size={17} /> خطة
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center rounded-2xl bg-white/15 py-3">
          <StatCell label="تحتاج متابعة" value={summary.followUp} />
          <span className="h-7 w-px bg-white/30" />
          <StatCell label="مطلوب اليوم" value={summary.dueToday} />
          <span className="h-7 w-px bg-white/30" />
          <StatCell label="متوسّط الإنجاز" value={`${summary.average}٪`} />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-80">
          <Segmented options={TYPE_FILTERS} value={type} onChange={setType} label="نوع الخطة" />
        </div>
        {isStaff && (
          <label className="relative block flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الطالب"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pe-10 ps-4 text-sm outline-none focus:border-emerald-600"
            />
          </label>
        )}
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-500">جارٍ تحميل الخطط…</p>
      ) : error ? (
        <div role="alert" className="rounded-2xl bg-rose-50 p-6 text-center text-sm text-rose-700">
          {error}
          <button type="button" onClick={load} className="ms-3 font-bold underline">
            إعادة المحاولة
          </button>
        </div>
      ) : shown.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400">
            <ClipboardList size={27} />
          </div>
          <h2 className="mt-4 font-bold text-slate-700">{items.length ? "لا نتائج" : "لا توجد خطط"}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {items.length
              ? "غيّر المرشّح أو كلمة البحث."
              : isStaff
                ? "أنشئ خطة لأحد طلابك لتظهر هنا."
                : "لم تُسجَّل لك خطة بعد."}
          </p>
          {canCreate && !items.length && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900"
            >
              <Plus size={17} /> إنشاء خطة
            </button>
          )}
        </section>
      ) : (
        <>
          {followUp.length > 0 && (
            <section className="space-y-3">
              <SectionLabel text="تحتاج متابعة" count={followUp.length} danger />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {followUp.map((item) => (
                  <FollowUpCard key={item.plan.memorizationPlanId} item={item} onOpen={() => open(item)} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="space-y-2">
              <SectionLabel text={followUp.length ? "بقيّة الخطط" : "الخطط"} count={rest.length} />
              <div className="grid gap-2 lg:grid-cols-2">
                {rest.map((item) => (
                  <PlanRow key={item.plan.memorizationPlanId} item={item} onOpen={() => open(item)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {formOpen && (
        <PlanFormModal
          students={students}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </main>
  );
}
