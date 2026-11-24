import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight, ChevronDown, CircleAlert, CheckCircle2, List, Megaphone, PencilLine, Plus, Users } from "lucide-react";
import { getAttendance, getAttendanceHalaqas, getStudentsByHalaqa, saveAttendance } from "../../api/attendance";
import { getErrorMessage } from "../../api/axiosClient";

// تسجيل الحضور بنفس تصميم تطبيق الجوال: صفوف ملوّنة بحالتها، ووضع المناداة.
const STATUSES = [
  { value: 1, label: "حاضر", short: "ح" },
  { value: 2, label: "غائب", short: "غ" },
  { value: 3, label: "متأخر", short: "م" },
  { value: 4, label: "مستأذن", short: "ذ" },
];

// ألوان كل حالة: خلفية الصفّ الفاتحة وحدّه، ولون الزر المختار، ولون النص.
const TONES = {
  1: { row: "bg-emerald-50 border-emerald-200", solid: "bg-emerald-700 border-emerald-700", dot: "bg-emerald-700", text: "text-emerald-800", pill: "bg-emerald-50 text-emerald-800", big: "bg-emerald-50 border-emerald-200 text-emerald-800", bigOn: "border-emerald-700" },
  2: { row: "bg-rose-50 border-rose-200", solid: "bg-rose-600 border-rose-600", dot: "bg-rose-600", text: "text-rose-700", pill: "bg-rose-50 text-rose-700", big: "bg-rose-50 border-rose-200 text-rose-700", bigOn: "border-rose-600" },
  3: { row: "bg-amber-50 border-amber-200", solid: "bg-amber-500 border-amber-500", dot: "bg-amber-500", text: "text-amber-800", pill: "bg-amber-50 text-amber-800", big: "bg-amber-50 border-amber-200 text-amber-800", bigOn: "border-amber-500" },
  4: { row: "bg-sky-50 border-sky-200", solid: "bg-sky-700 border-sky-700", dot: "bg-sky-700", text: "text-sky-800", pill: "bg-sky-50 text-sky-800", big: "bg-sky-50 border-sky-200 text-sky-800", bigOn: "border-sky-700" },
};
const NO_TONE = { row: "bg-white border-slate-100", dot: "bg-slate-300" };

const riyadhToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
const asList = (data) => (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
const formatShortDate = (date) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
const initials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join(" ");

function Avatar({ name, size = "h-9 w-9 text-xs" }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800 ${size}`}>
      {initials(name) || <Users size={16} />}
    </span>
  );
}

/** صفّ طالب مضغوط: اسم وأربعة أزرار حالة بحرف واحد، والصفّ كلّه بلون حالته. */
function AttendanceRow({ name, status, note, noteOpen, onToggleNote, onStatus, onNote }) {
  const tone = TONES[status] ?? NO_TONE;
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${tone.row}`}>
      <div className="flex items-center gap-2">
        <Avatar name={name} />
        <span className="min-w-0 flex-1 truncate font-bold text-slate-800">{name}</span>
        <div role="radiogroup" aria-label={`حالة ${name}`} className="flex gap-1.5">
          {STATUSES.map((option) => {
            const active = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${name}: ${option.label}`}
                title={option.label}
                onClick={() => onStatus(option.value)}
                className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-extrabold transition sm:w-auto sm:px-3 ${
                  active ? `${TONES[option.value].solid} text-white` : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="sm:hidden">{option.short}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {status ? (
        <button
          type="button"
          onClick={onToggleNote}
          className="mt-2 flex w-full items-center gap-1.5 ps-11 text-right text-xs font-semibold text-emerald-800 hover:underline"
        >
          {note ? <PencilLine size={13} /> : <Plus size={13} />}
          <span className="truncate">{note || "إضافة ملاحظة"}</span>
        </button>
      ) : null}

      {noteOpen && (
        <input
          autoFocus
          value={note}
          maxLength={500}
          onChange={(event) => onNote(event.target.value)}
          placeholder="ملاحظة (اختيارية)"
          aria-label={`ملاحظة ${name}`}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        />
      )}
    </div>
  );
}

/** وضع المناداة: طالب واحد بأزرار كبيرة، والانتقال تلقائي بعد الاختيار. */
function RollCall({ students, statusBy, index, onIndex, onStatus, onClose, halaqaName, dateLabel }) {
  const student = students[index];
  const total = students.length;
  const done = students.filter((s) => statusBy[s.studentId]).length;

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div dir="rtl" role="dialog" aria-modal="true" aria-label="نداء الأسماء" className="fixed inset-0 z-50 flex flex-col bg-[#f6f8f6]">
      <header className="leaf-pattern bg-emerald-800 px-5 pb-4 pt-5 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-emerald-100">
              {halaqaName} · {dateLabel}
            </p>
            <h2 className="text-xl font-extrabold">نداء الأسماء</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/35 bg-white/15 px-4 text-sm font-bold hover:bg-white/25"
          >
            <List size={15} /> القائمة
          </button>
        </div>
        <div className="mx-auto mt-3 max-w-xl">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-bold text-emerald-100">
            {done} من {total}
          </p>
        </div>
      </header>

      {student && (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center overflow-y-auto px-5 pt-8">
          <Avatar name={student.studentName} size="h-24 w-24 text-2xl" />
          <p className="mt-4 text-center text-3xl font-extrabold text-slate-800">{student.studentName || "طالب"}</p>
          <p className="mt-1 text-sm text-slate-500">
            الطالب {index + 1} من {total}
          </p>
          <div role="radiogroup" aria-label="الحالة" className="mt-8 grid w-full grid-cols-2 gap-2.5">
            {STATUSES.map((option) => {
              const tone = TONES[option.value];
              const active = statusBy[student.studentId] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onStatus(student.studentId, option.value)}
                  className={`flex h-[68px] items-center justify-center gap-2.5 rounded-2xl border-[1.5px] text-lg font-extrabold transition ${tone.big} ${
                    active ? `${tone.bigOn} ring-2 ring-offset-1 ring-current` : ""
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {students.map((s, i) => (
              <button
                key={s.studentId}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`الانتقال إلى ${s.studentName}`}
                className={`h-2.5 rounded-full transition-all ${i === index ? "w-6" : "w-2.5"} ${
                  statusBy[s.studentId] ? TONES[statusBy[s.studentId]].dot : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-xl gap-2.5">
          <button
            type="button"
            onClick={() => onIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 font-bold text-slate-500 disabled:opacity-40"
          >
            <ChevronRight size={16} /> السابق
          </button>
          <button
            type="button"
            onClick={() => (index + 1 < total ? onIndex(index + 1) : onClose())}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 truncate rounded-xl bg-emerald-800 font-bold text-white hover:bg-emerald-900"
          >
            <span className="truncate">
              {index + 1 < total ? `التالي · ${students[index + 1].studentName?.split(" ")[0] ?? ""}` : "إنهاء المناداة"}
            </span>
            <ChevronLeft size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function AttendanceRegistration() {
  const today = riyadhToday();
  const [halaqas, setHalaqas] = useState([]);
  const [halaqaId, setHalaqaId] = useState("");
  const [date, setDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [statusBy, setStatusBy] = useState({});
  const [notesBy, setNotesBy] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);
  const [callOpen, setCallOpen] = useState(false);
  const [callIndex, setCallIndex] = useState(0);
  const [openNote, setOpenNote] = useState(null);

  useEffect(() => {
    let alive = true;
    getAttendanceHalaqas()
      .then((data) => {
        if (!alive) return;
        const list = asList(data);
        setHalaqas(list);
        setHalaqaId((cur) => (list.some((h) => String(h.halaqaId) === cur) ? cur : list[0] ? String(list[0].halaqaId) : ""));
      })
      .catch((requestError) => alive && setError(getErrorMessage(requestError) || "تعذّر تحميل الحلقات المسموح بها لحسابك."))
      .finally(() => alive && setLoadingOptions(false));
    return () => {
      alive = false;
    };
  }, []);

  // طلاب الحلقة + حضور هذا اليوم فقط.
  useEffect(() => {
    let alive = true;
    if (!halaqaId || !date) {
      setStudents([]);
      setStatusBy({});
      setNotesBy({});
      setDirty(false);
      return undefined;
    }
    setLoadingStudents(true);
    setLoadFailed(false);
    Promise.all([getStudentsByHalaqa(halaqaId), getAttendance({ halaqaId, from: date, to: date })])
      .then(([roster, attendance]) => {
        if (!alive) return;
        const existing = asList(attendance).filter(
          (r) => String(r.halaqaId) === halaqaId && String(r.attendanceDate).slice(0, 10) === date,
        );
        setStudents(asList(roster));
        setStatusBy(Object.fromEntries(existing.map((r) => [r.studentId, Number(r.status)])));
        setNotesBy(Object.fromEntries(existing.map((r) => [r.studentId, r.notes || ""])));
        setDirty(false);
      })
      .catch((requestError) => {
        if (!alive) return;
        setStudents([]);
        setStatusBy({});
        setNotesBy({});
        // لا نسمح بالحفظ بعد فشل التحميل حتى لا نكتب فوق سجلات موجودة.
        setLoadFailed(true);
        setError(`تعذّر تحميل طلاب الحلقة أو حضور هذا اليوم: ${getErrorMessage(requestError)}`);
      })
      .finally(() => alive && setLoadingStudents(false));
    return () => {
      alive = false;
    };
  }, [halaqaId, date, tick]);

  // تنبيه المتصفح عند مغادرة الصفحة بتغييرات غير محفوظة.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function guarded(action) {
    if (!dirty || window.confirm("لديك تغييرات لم تُحفظ. هل تريد تجاهلها والمتابعة؟")) action();
  }

  const changeHalaqa = (value) =>
    String(value) !== halaqaId &&
    guarded(() => {
      setError("");
      setNotice("");
      setHalaqaId(String(value));
    });
  const changeDate = (value) =>
    value &&
    value !== date &&
    guarded(() => {
      setError("");
      setNotice("");
      setDate(value);
    });

  const counts = useMemo(() => {
    const result = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
    students.forEach((s) => {
      const st = statusBy[s.studentId];
      if (result[st] !== undefined) result[st] += 1;
    });
    return result;
  }, [students, statusBy]);

  const marked = Object.values(counts).reduce((a, b) => a + b, 0);
  const allMarked = students.length > 0 && marked === students.length;
  const progress = students.length ? Math.round((marked / students.length) * 100) : 0;
  const halaqa = halaqas.find((h) => String(h.halaqaId) === halaqaId);
  const callDone = students.filter((st) => statusBy[st.studentId]).length;

  function setStatus(studentId, status) {
    setStatusBy((cur) => ({ ...cur, [studentId]: status }));
    setDirty(true);
  }

  function openRollCall() {
    const next = students.findIndex((s) => !statusBy[s.studentId]);
    setCallIndex(next === -1 ? 0 : next);
    setCallOpen(true);
  }

  // في المناداة: الاختيار ينقل تلقائياً للتالي، وآخر طالب يُنهي الوضع.
  function callStatus(studentId, status) {
    setStatus(studentId, status);
    setCallIndex((i) => {
      if (i + 1 < students.length) return i + 1;
      setCallOpen(false);
      return i;
    });
  }

  function markAllPresent() {
    setStatusBy(Object.fromEntries(students.map((s) => [s.studentId, 1])));
    setDirty(true);
  }

  async function save() {
    setError("");
    setNotice("");
    if (loadFailed) return setError("لم يكتمل تحميل بيانات الحلقة. أعد المحاولة قبل الحفظ.");
    if (!date || date > today) return setError("اختر تاريخاً صحيحاً لا يتجاوز اليوم.");
    if (!allMarked) return setError("حدّد حالة كل طالب قبل الحفظ.");
    if (!halaqa) return setError("اختر الحلقة أولاً.");

    setSaving(true);
    try {
      const payload = students.map((s) => ({
        centerId: halaqa.centerId,
        halaqaId: halaqa.halaqaId,
        studentId: s.studentId,
        attendanceDate: date,
        status: statusBy[s.studentId],
        notes: notesBy[s.studentId]?.trim() || null,
      }));
      const result = await saveAttendance(payload);
      setNotice(`تم حفظ حضور ${result?.savedCount ?? payload.length} طالباً بتاريخ ${formatShortDate(date)}.`);
      setDirty(false);
      setTick((t) => t + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-800">تسجيل الحضور</h1>
          <p className="mt-1 text-sm text-slate-500">الحلقات المسموح بها لحسابك</p>
        </div>
        <label className="relative flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-emerald-800 focus-within:border-emerald-700">
          <CalendarDays size={16} />
          <span>{date === today ? "اليوم" : formatShortDate(date)}</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(event) => changeDate(event.target.value)}
            aria-label="التاريخ"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </header>

      {/* الحلقة */}
      <label className="relative flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-700">
        <Users size={19} className="text-emerald-800" />
        <span className="min-w-0 flex-1 truncate font-bold text-slate-800">
          {halaqa?.halaqaName ?? (loadingOptions ? "جارٍ تحميل الحلقات…" : halaqas.length ? "اختر الحلقة" : "لا توجد حلقات")}
          {halaqa && students.length ? <span className="text-xs font-medium text-slate-500">  · {students.length} طالباً</span> : null}
        </span>
        <ChevronDown size={18} className="text-slate-400" />
        <select
          aria-label="الحلقة"
          value={halaqaId}
          disabled={loadingOptions || !halaqas.length}
          onChange={(event) => changeHalaqa(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {halaqas.map((h) => (
            <option key={h.halaqaId} value={h.halaqaId}>
              {h.halaqaName}
              {h.centerName ? ` — ${h.centerName}` : ""}
            </option>
          ))}
        </select>
      </label>

      {students.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={markAllPresent}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <CheckCheck size={18} /> تحديد الكل حاضر
            </button>
            <button
              type="button"
              onClick={openRollCall}
              className="inline-flex h-12 items-center justify-center gap-2 truncate rounded-xl bg-emerald-800 px-3 text-sm font-bold text-white hover:bg-emerald-900"
            >
              <Megaphone size={18} />
              <span className="truncate">
                {callDone && callDone < students.length ? `متابعة المناداة · ${callDone} من ${students.length}` : "المناداة"}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((st) => (
              <span key={st.value} className={`rounded-full px-3 py-1 text-xs font-bold ${TONES[st.value].pill}`}>
                {st.label} {counts[st.value]}
              </span>
            ))}
            {marked < students.length && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                بلا تحديد {students.length - marked}
              </span>
            )}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="flex gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          {error}
          {loadFailed && (
            <button type="button" onClick={() => setTick((t) => t + 1)} className="ms-auto font-bold underline">
              إعادة المحاولة
            </button>
          )}
        </p>
      )}
      {notice && (
        <p className="flex gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          {notice}
        </p>
      )}

      {loadingStudents ? (
        <p className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">جارٍ تحميل طلاب الحلقة…</p>
      ) : !students.length ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400">
            <Users size={26} />
          </div>
          <h2 className="mt-3 font-bold text-slate-700">لا يوجد طلاب</h2>
          <p className="mt-1 text-sm text-slate-500">اختر حلقة بها طلاب نشطون لبدء التسجيل.</p>
        </section>
      ) : (
        <div className="space-y-2">
          {students.map((st) => (
            <AttendanceRow
              key={st.studentId}
              name={st.studentName || "طالب"}
              status={statusBy[st.studentId]}
              note={notesBy[st.studentId] || ""}
              noteOpen={openNote === st.studentId}
              onToggleNote={() => setOpenNote((cur) => (cur === st.studentId ? null : st.studentId))}
              onStatus={(value) => setStatus(st.studentId, value)}
              onNote={(value) => {
                setNotesBy((cur) => ({ ...cur, [st.studentId]: value }));
                setDirty(true);
              }}
            />
          ))}
        </div>
      )}

      {/* الشريط السفلي: التقدّم وزر الحفظ */}
      <div className="sticky bottom-24 z-10 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 truncate text-xs font-bold text-slate-500">
            {students.length ? `${marked} من ${students.length}${dirty ? " · غير محفوظة" : ""}` : "لا يوجد طلاب"}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loadingStudents || loadFailed || !students.length || !allMarked}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-800 px-6 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          <Check size={17} />
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </button>
      </div>

      {callOpen && (
        <RollCall
          students={students}
          statusBy={statusBy}
          index={callIndex}
          onIndex={setCallIndex}
          onStatus={callStatus}
          onClose={() => setCallOpen(false)}
          halaqaName={halaqa?.halaqaName ?? ""}
          dateLabel={date === today ? "اليوم" : formatShortDate(date)}
        />
      )}
    </main>
  );
}
