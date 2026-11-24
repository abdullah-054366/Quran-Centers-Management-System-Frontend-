import { useEffect, useMemo, useRef, useState } from "react";
import { getSurahMeta } from "quran-meta/hafs";
import { CalendarDays, Check, CheckCircle2, ChevronDown, Info, PencilLine, TriangleAlert, UserRound, X } from "lucide-react";
import {
  getMemorizationDailyUsage,
  getMemorizationRecords,
  getMemorizationStudents,
  saveMemorizationRecords,
} from "../../api/memorization";
import { getErrorMessage } from "../../api/axiosClient";
import ayahLines from "../../data/ayahLines.json";
import { createLineCalculator, linesToPages } from "../../lib/quranLines";

// صفحة تسجيل الحفظ بنفس تصميم تطبيق الجوال وسلوكه.
const calculator = createLineCalculator(ayahLines);

const stripTashkeel = (text) => text.replace(/[ً-ٰٟۖ-ۭ]/g, "");
const surahs = Array.from({ length: 114 }, (_, index) => {
  const id = index + 1;
  const meta = getSurahMeta(id);
  return { id, name: stripTashkeel(meta.name), ayahs: meta.ayahCount };
});

const riyadhToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());

// الحد اليومي لكل طالب (يُفرض أيضاً في الخادم): حفظ واحد ومراجعتان.
const DAILY_LIMITS = { حفظ: 1, مراجعة: 2 };
// قيم Type في قاعدة البيانات: 1 = حفظ جديد، 2 = مراجعة.
const RECORD_TYPE = { حفظ: 1, مراجعة: 2 };
const TYPE_LABEL = { 1: "حفظ", 2: "مراجعة" };
const TYPES = [
  { value: "حفظ", label: "حفظ جديد" },
  { value: "مراجعة", label: "مراجعة" },
];
const GRADES = ["ممتاز", "جيد جداً", "جيد", "يحتاج متابعة"];

const newSessionId = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

const fmt = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
const gradeFromNotes = (notes) => String(notes || "").match(/التقييم:\s*(.*?)(?:\s+—\s+|$)/)?.[1] || "";
const noteWithoutGrade = (notes) => String(notes || "").replace(/التقييم:\s*.*?(?:\s+—\s+|$)/, "").trim();

const formatDate = (date) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));

// مقدار القراءة الفعلي بالأسطر والصفحات (15 سطراً للصفحة) من بيانات المصحف.
function getReading(startSurahId, startAyah, endSurahId, endAyah) {
  if (!startSurahId || !startAyah || !endSurahId || !endAyah) return null;
  try {
    const lines = calculator.linesBetween(Number(startSurahId), Number(startAyah), Number(endSurahId), Number(endAyah));
    return { lines, ...linesToPages(lines) };
  } catch {
    return null;
  }
}

/** الطلاب الذين سُجّل لهم في التاريخ، وأنواع ما سُجّل لكل واحد (الأحدث أولاً). */
function recordedOn(records) {
  const byStudent = new Map();
  for (const record of records) {
    const id = Number(record.studentId) || 0;
    if (!id) continue;
    const entry = byStudent.get(id) ?? { studentId: id, name: record.studentName || `طالب ${id}`, types: new Set() };
    entry.types.add(Number(record.type));
    byStudent.set(id, entry);
  }
  return [...byStudent.values()].map((entry) => ({ ...entry, types: [...entry.types].sort() }));
}

/** جلسات اليوم مجمّعة: جلسة واحدة قد تكون عدّة سجلات، سجل لكل سورة. */
function toSessions(records) {
  const groups = new Map();
  for (const record of records) {
    const key = record.sessionId ?? `single-${record.memorizationRecordId}`;
    const group = groups.get(key) ?? { key, type: Number(record.type), notes: record.notes, rows: [] };
    group.rows.push(record);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const sorted = [...group.rows].sort(
      (a, b) => Number(a.surahNumber) - Number(b.surahNumber) || Number(a.fromAyah) - Number(b.fromAyah),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      ...group,
      from: { surah: Number(first.surahNumber), ayah: Number(first.fromAyah) },
      to: { surah: Number(last.surahNumber), ayah: Number(last.toAyah) },
      reading: getReading(first.surahNumber, first.fromAyah, last.surahNumber, last.toAyah),
    };
  });
}

const initials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join(" ");

const selectClass =
  "h-12 w-full rounded-xl border-[1.5px] border-slate-200 bg-white px-3 text-base outline-none focus:border-emerald-700 disabled:bg-slate-50 disabled:text-slate-400";

function Notice({ tone = "info", children }) {
  const styles = {
    info: "bg-sky-50 text-sky-800",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-rose-50 text-rose-700",
    success: "bg-emerald-50 text-emerald-800",
  };
  const Icon = tone === "warning" || tone === "danger" ? TriangleAlert : tone === "success" ? CheckCircle2 : Info;
  return (
    <p role={tone === "danger" ? "alert" : undefined} className={`flex gap-2 rounded-2xl px-4 py-3 text-sm leading-7 ${styles[tone]}`}>
      <Icon size={18} className="mt-1 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** اختيار النوع وعرض الحدّ اليومي في صفّ واحد. */
function TypeLimits({ value, onChange, usage }) {
  return (
    <div role="radiogroup" aria-label="نوع التسجيل" className="grid grid-cols-2 gap-2">
      {TYPES.map((type) => {
        const active = type.value === value;
        const max = DAILY_LIMITS[type.value];
        const used = usage ? (type.value === "حفظ" ? usage.memorizationCount : usage.reviewCount) : null;
        const full = used !== null && used >= max;
        return (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(type.value)}
            className={`h-11 rounded-full border-[1.5px] px-3 text-sm font-bold transition ${
              full ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-800"
            } ${active ? (full ? "border-amber-600" : "border-emerald-700") : "border-transparent"}`}
          >
            {type.label}
            {used === null ? "" : `  ${used} من ${max}`}
          </button>
        );
      })}
    </div>
  );
}

function RecordedToday({ students, total, isToday, onPressStudent }) {
  if (!students.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-600">{isToday ? "سُجّل لهم اليوم" : "سُجّل لهم في هذا اليوم"}</h2>
        <span className="text-xs text-slate-500">{total ? `${students.length} من ${total}` : students.length}</span>
      </div>
      <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {students.map((student) => (
          <button
            key={student.studentId}
            type="button"
            onClick={() => onPressStudent(student)}
            aria-label={`${student.name}: عرض ما سُجّل له`}
            className="flex w-14 shrink-0 flex-col items-center gap-1 hover:opacity-70"
          >
            <span className="relative grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
              {initials(student.name)}
              <span className="absolute -bottom-0.5 -left-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#f6f8f6] bg-emerald-800 text-white">
                <Check size={11} strokeWidth={3} />
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] text-slate-500">{student.name.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StudentDayRecords({ student, records, date, onClose }) {
  if (!student) return null;
  const sessions = toSessions(records.filter((r) => Number(r.studentId) === student.studentId));
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section dir="rtl" role="dialog" aria-modal="true" aria-label={student.name} className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">{student.name}</h2>
            <p className="text-xs text-slate-500">{formatDate(date)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد سجلات لهذا الطالب في هذا اليوم.</p>
          ) : (
            sessions.map((session) => {
              const grade = gradeFromNotes(session.notes);
              const note = noteWithoutGrade(session.notes);
              const isMemo = TYPE_LABEL[session.type] === "حفظ";
              return (
                <div key={session.key} className="space-y-1.5 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isMemo ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800"}`}>
                      {isMemo ? "حفظ جديد" : "مراجعة"}
                    </span>
                    {grade && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{grade}</span>}
                  </div>
                  <p className="font-bold text-slate-800">
                    {surahs[session.from.surah - 1]?.name} {session.from.ayah} — {surahs[session.to.surah - 1]?.name} {session.to.ayah}
                  </p>
                  {session.reading && (
                    <p className="text-xs text-slate-500">
                      {fmt(session.reading.decimalPages)} صفحة · {fmt(session.reading.lines)} سطر
                    </p>
                  )}
                  {note && <p className="text-xs text-slate-500">{note}</p>}
                </div>
              );
            })
          )}
        </div>
        <button type="button" onClick={onClose} className="mt-5 h-11 w-full rounded-xl bg-emerald-800 font-bold text-white hover:bg-emerald-900">
          إغلاق
        </button>
      </section>
    </div>
  );
}

export default function MemorizationReview() {
  const today = riyadhToday();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [recordType, setRecordType] = useState("حفظ");
  const [date, setDate] = useState(today);
  const [fromSurah, setFromSurah] = useState("");
  const [fromAyah, setFromAyah] = useState("");
  const [toSurah, setToSurah] = useState("");
  const [toAyah, setToAyah] = useState("");
  const [grade, setGrade] = useState("ممتاز");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usage, setUsage] = useState(null);
  const [usageTick, setUsageTick] = useState(0);
  const [dayRecords, setDayRecords] = useState([]);
  const [viewing, setViewing] = useState(null);
  // معرّف جلسة واحد لكل محاولة حفظ: يمنع تكرار الجلسة عند إعادة المحاولة.
  const sessionIdRef = useRef(null);
  // جلسة قائمة يجري تعديلها: نرسل معرّفها نفسه فيستبدل الخادم صفوفها.
  const [editingSessionId, setEditingSessionId] = useState(null);

  useEffect(() => {
    let alive = true;
    getMemorizationStudents()
      .then((data) => {
        if (!alive) return;
        setStudents((Array.isArray(data) ? data : []).map((s) => ({ id: s.studentId, name: s.studentName, group: s.halaqaName })));
      })
      .catch((requestError) => alive && setError(getErrorMessage(requestError)))
      .finally(() => alive && setLoadingStudents(false));
    return () => {
      alive = false;
    };
  }, []);

  // من سُجّل له في التاريخ المختار: متابعة للمعلم، لا اختيار للطالب.
  useEffect(() => {
    if (!date) return undefined;
    let alive = true;
    getMemorizationRecords({ from: date, to: date })
      .then((data) => alive && setDayRecords(Array.isArray(data) ? data : data?.data ?? []))
      .catch(() => alive && setDayRecords([]));
    return () => {
      alive = false;
    };
  }, [date, usageTick]);

  useEffect(() => {
    if (!studentId || !date) {
      setUsage(null);
      return undefined;
    }
    let alive = true;
    setUsage(null);
    getMemorizationDailyUsage(Number(studentId), date)
      .then((d) => alive && setUsage(d))
      .catch(() => alive && setUsage(null)); // الخادم يتحقق من الحد عند الحفظ على أي حال
    return () => {
      alive = false;
    };
  }, [studentId, date, usageTick]);

  // تغيير الطالب أو التاريخ أو النوع يُنهي وضع التعديل: المعرّف يخصّ تسجيلاً بعينه.
  useEffect(() => {
    setEditingSessionId(null);
    sessionIdRef.current = null;
  }, [studentId, date, recordType]);

  const dailyLimit = DAILY_LIMITS[recordType];
  const usedToday = usage ? (recordType === "حفظ" ? usage.memorizationCount : usage.reviewCount) : 0;
  const limitReached = Boolean(usage) && usedToday >= dailyLimit;
  const editing = Boolean(editingSessionId);

  // تسجيل هذا الطالب في هذا اليوم وهذا النوع إن وُجد، من سجلات اليوم المحمّلة أصلاً.
  const existingSession = useMemo(() => {
    if (!studentId) return null;
    const wanted = RECORD_TYPE[recordType];
    const rows = dayRecords.filter(
      (row) => Number(row.studentId) === Number(studentId) && Number(row.type) === wanted && row.sessionId,
    );
    if (!rows.length) return null;
    const sessionId = rows[0].sessionId; // السجلات تصل الأحدث أولاً
    return { sessionId, rows: rows.filter((row) => row.sessionId === sessionId) };
  }, [dayRecords, studentId, recordType]);

  const sameSurah = fromSurah !== "" && fromSurah === toSurah;
  const reading = getReading(fromSurah, fromAyah, toSurah, toAyah);
  const rangeComplete = fromSurah && fromAyah && toSurah && toAyah;
  const backwards = rangeComplete && !reading;
  const fromMeta = surahs[Number(fromSurah) - 1];
  const selectedStudent = students.find((s) => s.id === Number(studentId));
  const recordedStudents = useMemo(() => recordedOn(dayRecords), [dayRecords]);

  function onFromSurah(value) {
    setFromSurah(value);
    setFromAyah(value ? "1" : "");
    if (!toSurah || Number(toSurah) < Number(value)) {
      setToSurah(value);
      setToAyah("");
    }
  }

  function onFromAyah(value) {
    setFromAyah(value);
    if (sameSurah && toAyah && Number(toAyah) < Number(value)) setToAyah("");
  }

  function fillWholeSurah() {
    if (!fromMeta) return;
    setFromAyah("1");
    setToSurah(String(fromMeta.id));
    setToAyah(String(fromMeta.ayahs));
  }

  // تعديل تسجيل قائم: نملأ النموذج بما سُجّل فعلاً.
  function startEdit() {
    if (!existingSession) return;
    const rows = [...existingSession.rows].sort((a, b) => a.surahNumber - b.surahNumber);
    const first = rows[0];
    const last = rows[rows.length - 1];
    setFromSurah(String(first.surahNumber));
    setFromAyah(String(first.fromAyah));
    setToSurah(String(last.surahNumber));
    setToAyah(String(last.toAyah));
    const saved = gradeFromNotes(first.notes);
    setGrade(GRADES.includes(saved) ? saved : "ممتاز");
    const rest = noteWithoutGrade(first.notes);
    setNotes(rest);
    setShowNotes(Boolean(rest));
    sessionIdRef.current = existingSession.sessionId;
    setEditingSessionId(existingSession.sessionId);
  }

  // بعد الحفظ نُبقي النوع والتاريخ ليسهل تسجيل الطالب التالي.
  function resetForm() {
    setStudentId("");
    setFromSurah("");
    setFromAyah("");
    setToSurah("");
    setToAyah("");
    setGrade("ممتاز");
    setNotes("");
    setShowNotes(false);
  }

  function cancelEdit() {
    setEditingSessionId(null);
    sessionIdRef.current = null;
    resetForm();
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    setError("");
    setSuccess("");
    if (!studentId) return setError("اختر الطالب.");
    if (limitReached && !editing) {
      return setError(
        recordType === "حفظ"
          ? "سُجّل لهذا الطالب حفظ في هذا اليوم. اضغط «تعديل تسجيل اليوم» لتصحيحه."
          : "بلغ هذا الطالب الحد الأقصى لسجلات المراجعة في هذا اليوم (سجلان). اضغط «تعديل تسجيل اليوم» لتصحيح الأخير.",
      );
    }
    if (!rangeComplete) return setError("حدد بداية القراءة ونهايتها (السورة والآية).");
    if (!reading) return setError("نهاية القراءة قبل بدايتها. تحقق من السورة والآيات.");
    if (!selectedStudent) return setError("الطالب المحدد غير موجود ضمن طلاب حلقاتك النشطة.");

    // سجل لكل سورة: الأولى من الآية المختارة، والأخيرة حتى الآية المختارة، وما بينهما كاملة.
    const firstId = Number(fromSurah);
    const lastId = Number(toSurah);
    if (!sessionIdRef.current) sessionIdRef.current = newSessionId();
    const sessionId = sessionIdRef.current;
    const records = surahs
      .filter((s) => s.id >= firstId && s.id <= lastId)
      .map((s) => ({
        studentId: selectedStudent.id,
        type: RECORD_TYPE[recordType],
        surahNumber: s.id,
        fromAyah: s.id === firstId ? Number(fromAyah) : 1,
        toAyah: s.id === lastId ? Number(toAyah) : s.ayahs,
        recordDate: date,
        sessionId,
        notes: [`التقييم: ${grade}`, notes.trim()].filter(Boolean).join(" — ") || null,
      }));

    setSaving(true);
    try {
      await saveMemorizationRecords(records);
      setSuccess(
        `${editing ? "تم تعديل" : "تم تسجيل"} ${recordType} الطالب ${selectedStudent.name}: ${fmt(reading.decimalPages)} صفحة (${fmt(reading.lines)} سطر).`,
      );
      sessionIdRef.current = null;
      setEditingSessionId(null);
      resetForm();
      setUsageTick((t) => t + 1); // يُحدّث الحدّ وشريط «سُجّل لهم اليوم»
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setUsageTick((t) => t + 1); // قد يكون الحد بلغ من جهاز آخر
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" className="mx-auto max-w-xl space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-800">تسجيل الحفظ</h1>
          <p className="mt-1 text-sm text-slate-500">اختر الطالب وما قرأه، ويُحسب المقدار تلقائياً.</p>
        </div>
        <label className="relative flex overflow-hidden h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-emerald-800 focus-within:border-emerald-700">
          <CalendarDays size={16} />
          <span>{date === today ? "اليوم" : formatDate(date)}</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            aria-label="التاريخ"
            className="absolute inset-0 h-full w-full min-w-0 cursor-pointer appearance-none opacity-0"
          />
        </label>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* بطاقة الطالب */}
        <label className="relative flex overflow-hidden min-h-[76px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm focus-within:border-emerald-700">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800">
            {selectedStudent ? initials(selectedStudent.name) : <UserRound size={22} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-bold ${selectedStudent ? "text-slate-800" : "text-slate-500"}`}>
              {selectedStudent?.name ??
                (loadingStudents ? "جارٍ تحميل الطلاب…" : students.length ? "اختر الطالب" : "لا يوجد طلاب في حلقاتك النشطة")}
            </span>
            {selectedStudent?.group && <span className="block truncate text-xs text-slate-500">{selectedStudent.group}</span>}
          </span>
          <ChevronDown size={20} className="text-slate-400" />
          <select
            aria-label="الطالب"
            value={studentId}
            disabled={loadingStudents || !students.length}
            onChange={(event) => setStudentId(event.target.value)}
            className="absolute inset-0 h-full w-full min-w-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
          >
            <option value="">اختر الطالب</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
                {student.group ? ` — ${student.group}` : ""}
              </option>
            ))}
          </select>
        </label>

        <TypeLimits value={recordType} onChange={setRecordType} usage={studentId ? usage : null} />

        {/* نطاق القراءة */}
        <section className="space-y-3 rounded-2xl border-[1.5px] border-emerald-800 bg-white p-4">
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2 text-sm font-semibold text-slate-600">
              من سورة
              <select value={fromSurah} onChange={(e) => onFromSurah(e.target.value)} className={`${selectClass} mt-1.5`}>
                <option value="">السورة</option>
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}. {s.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              الآية
              <select value={fromAyah} disabled={!fromSurah} onChange={(e) => onFromAyah(e.target.value)} className={`${selectClass} mt-1.5`}>
                <option value="">—</option>
                {fromMeta && Array.from({ length: fromMeta.ayahs }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-sm font-semibold text-slate-600">
              إلى سورة
              <select
                value={toSurah}
                onChange={(e) => {
                  setToSurah(e.target.value);
                  setToAyah("");
                }}
                className={`${selectClass} mt-1.5`}
              >
                <option value="">السورة</option>
                {surahs.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id < (Number(fromSurah) || 1)}>{s.id}. {s.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              الآية
              <select value={toAyah} disabled={!toSurah} onChange={(e) => setToAyah(e.target.value)} className={`${selectClass} mt-1.5`}>
                <option value="">—</option>
                {toSurah &&
                  Array.from({ length: surahs[Number(toSurah) - 1].ayahs }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} disabled={sameSurah && n < (Number(fromAyah) || 1)}>{n}</option>
                  ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fillWholeSurah}
              disabled={!fromMeta}
              className="text-sm font-bold text-emerald-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
            >
              السورة كاملة
            </button>
            {backwards && <span className="flex-1 truncate text-left text-sm text-rose-700">نهاية القراءة قبل بدايتها</span>}
          </div>
        </section>

        {/* التقييم والملاحظات */}
        <section className="space-y-3">
          <div role="radiogroup" aria-label="التقييم" className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
            {GRADES.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={grade === item}
                onClick={() => setGrade(item)}
                className={`rounded-xl px-1 py-2 text-xs font-bold transition sm:text-sm ${
                  grade === item ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {showNotes ? (
            <textarea
              rows={3}
              maxLength={950}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="أضف ملاحظات عن جلسة التسميع…"
              aria-label="ملاحظات"
              className="min-h-24 w-full resize-y rounded-xl border-[1.5px] border-slate-200 bg-white p-3 text-base outline-none focus:border-emerald-700"
            />
          ) : (
            <button type="button" onClick={() => setShowNotes(true)} className="text-sm font-bold text-emerald-800 hover:underline">
              + إضافة ملاحظة
            </button>
          )}
        </section>

        <RecordedToday students={recordedStudents} total={students.length} isToday={date === today} onPressStudent={setViewing} />

        {editing ? (
          <div className="space-y-2">
            <Notice>تعدّل الآن تسجيل {recordType} لهذا الطالب — الحفظ يستبدل ما سُجّل ولا يضيف سجلاً جديداً.</Notice>
            <button type="button" onClick={cancelEdit} className="text-sm font-bold text-rose-700 hover:underline">
              إلغاء التعديل
            </button>
          </div>
        ) : limitReached ? (
          <Notice tone="warning">
            {!existingSession
              ? "بلغ هذا الطالب حدّه اليومي، وتسجيله لا يحمل معرّف جلسة فلا يمكن تعديله من هنا."
              : recordType === "حفظ"
                ? "سُجّل لهذا الطالب حفظ في هذا اليوم. لتصحيحه اضغط «تعديل تسجيل اليوم»."
                : "بلغ هذا الطالب الحد الأقصى لسجلات المراجعة في هذا اليوم (سجلان). لتصحيح الأخير اضغط «تعديل تسجيل اليوم»."}
          </Notice>
        ) : null}

        {error && <Notice tone="danger">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}

        {/* الشريط السفلي: المقدار وزر الحفظ */}
        <div className="sticky bottom-24 z-10 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-[11px] text-slate-500">مقدار القراءة</p>
            <p className="truncate text-xl font-extrabold text-emerald-800">
              {reading ? `${fmt(reading.decimalPages)} صفحة` : "—"}
              {reading && <span className="text-xs font-medium text-slate-500"> · {fmt(reading.lines)} سطر</span>}
            </p>
          </div>
          {limitReached && !editing ? (
            <button
              type="button"
              onClick={startEdit}
              disabled={!existingSession}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              <PencilLine size={17} /> تعديل تسجيل اليوم
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving || loadingStudents || !students.length}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
            >
              <Check size={17} />
              {saving ? "جارٍ الحفظ…" : editing ? "حفظ التعديل" : `حفظ ${recordType}`}
            </button>
          )}
        </div>
      </form>

      <StudentDayRecords student={viewing} records={dayRecords} date={date} onClose={() => setViewing(null)} />
    </main>
  );
}
