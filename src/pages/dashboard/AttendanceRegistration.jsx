import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Check, CheckCheck, CircleAlert, Users } from "lucide-react";
import { getCenters } from "../../api/centers";
import { getAttendance, getAttendanceHalaqas, getStudentsByHalaqa, saveAttendance } from "../../api/attendance";
import { useAuth } from "../../context/AuthContext";

const statuses = [
  { id: 1, name: "حاضر", color: "border-emerald-700 bg-emerald-700 text-white", idle: "text-emerald-800 hover:bg-emerald-50" },
  { id: 2, name: "غائب", color: "border-rose-600 bg-rose-600 text-white", idle: "text-rose-700 hover:bg-rose-50" },
  { id: 3, name: "متأخر", color: "border-amber-500 bg-amber-500 text-white", idle: "text-amber-800 hover:bg-amber-50" },
  { id: 4, name: "مستأذن", color: "border-sky-700 bg-sky-700 text-white", idle: "text-sky-800 hover:bg-sky-50" },
];

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function asList(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
}

export default function AttendanceRegistration() {
  const { user } = useAuth();
  const recorderId = Number(user?.id);
  const roleLabel = { platformadmin: "مسؤول المنصة", centeradmin: "مسؤول المركز", admin: "مسؤول المنصة", manager: "مسؤول المركز", teacher: "المعلم", student: "الطالب" }[String(user?.role || "").toLowerCase()] || user?.role || "غير معروف";
  const [centers, setCenters] = useState([]);
  const [halaqas, setHalaqas] = useState([]);
  const [students, setStudents] = useState([]);
  const [centerId] = useState("");
  const [halaqaId, setHalaqaId] = useState("");
  const [date, setDate] = useState(todayKey);
  const [statusByStudent, setStatusByStudent] = useState({});
  const [notesByStudent, setNotesByStudent] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getCenters(), getAttendanceHalaqas()])
      .then(([centerData, halaqaData]) => {
        if (!active) return;
        const list = asList(centerData).filter((item) => item.isActive !== false);
        setCenters(list);
        setHalaqas(asList(halaqaData));
      })
      .catch((requestError) => {
        console.error("Error loading attendance options:", requestError);
        if (active) setError("تعذّر تحميل المراكز والحلقات.");
      })
      .finally(() => { if (active) setLoadingOptions(false); });
    return () => { active = false; };
  }, []);

  const availableHalaqas = useMemo(
    () => halaqas.filter((item) => String(item.centerId) === centerId),
    [halaqas, centerId],
  );

  useEffect(() => {
    if (!availableHalaqas.some((item) => String(item.halaqaId) === halaqaId)) {
      setHalaqaId(availableHalaqas.length ? String(availableHalaqas[0].halaqaId) : "");
    }
  }, [availableHalaqas, halaqaId]);

  useEffect(() => {
    let active = true;
    if (!halaqaId) {
      setStudents([]);
      setStatusByStudent({});
      setNotesByStudent({});
      return undefined;
    }

    setLoadingStudents(true);
    setError("");
    setNotice("");
    Promise.all([getStudentsByHalaqa(halaqaId), getAttendance().catch(() => [])])
      .then(([rosterData, attendanceData]) => {
        if (!active) return;
        const roster = asList(rosterData);
        const existing = asList(attendanceData).filter((record) =>
          String(record.halaqaId) === halaqaId && String(record.attendanceDate).slice(0, 10) === date,
        );
        setStudents(roster);
        setStatusByStudent(Object.fromEntries(existing.map((record) => [record.studentId, Number(record.status)])));
        setNotesByStudent(Object.fromEntries(existing.map((record) => [record.studentId, record.notes || ""])));
      })
      .catch((requestError) => {
        console.error("Error loading halaqa students:", requestError);
        if (active) { setStudents([]); setError("تعذّر تحميل قائمة طلاب الحلقة."); }
      })
      .finally(() => { if (active) setLoadingStudents(false); });
    return () => { active = false; };
  }, [halaqaId, date]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(statuses.map((item) => [item.id, 0]));
    students.forEach((student) => {
      const status = statusByStudent[student.studentId];
      if (result[status] !== undefined) result[status] += 1;
    });
    return result;
  }, [students, statusByStudent]);

  const markedCount = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const allMarked = students.length > 0 && markedCount === students.length;

  function markAllPresent() {
    setStatusByStudent(Object.fromEntries(students.map((student) => [student.studentId, 1])));
  }

  async function handleSave() {
    setError("");
    setNotice("");
    if (!Number.isInteger(recorderId) || recorderId <= 0) {
      setError("تعذّر تحديد حساب المستخدم المسجل. سجّل الدخول من جديد.");
      return;
    }
    if (!allMarked) {
      setError("حدّد حالة كل طالب قبل الحفظ.");
      return;
    }
    const halaqa = availableHalaqas.find((item) => String(item.halaqaId) === halaqaId);
    if (!halaqa) {
      setError("اختر الحلقة أولاً.");
      return;
    }

    setSaving(true);
    try {
      const payload = students.map((student) => ({
        centerId: halaqa.centerId,
        halaqaId: halaqa.halaqaId,
        studentId: student.studentId,
        attendanceDate: date,
        status: statusByStudent[student.studentId],
        notes: notesByStudent[student.studentId]?.trim() || null,
        recordedByUserId: recorderId,
      }));
      const result = await saveAttendance(payload);
      setNotice(`تم حفظ حضور ${result?.savedCount ?? payload.length} طالباً.`);
    } catch (requestError) {
      console.error("Error saving attendance:", requestError);
      setError("تعذّر حفظ الحضور. تحقّق من البيانات ثم حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-6 pb-28">
      <header>
        <Link to="/attendance" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-emerald-800"><ArrowRight size={15} />سجل الحضور</Link>
        <h1 className="text-2xl font-extrabold text-slate-800">تسجيل الحضور</h1>
        <p className="mt-1 text-sm text-slate-400">سيتم تحديد الحلقة المرتبطة بحسابك حسب نوع تسجيل الدخول.</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
        <div className="rounded-xl bg-emerald-50/70 p-4">
          <p className="text-xs font-bold text-slate-400">نوع الحساب</p>
          <p className="mt-1 font-extrabold text-emerald-900">{roleLabel}</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">سيتم تحديد المركز والحلقة تلقائياً حسب نوع تسجيل الدخول.</p>
          {!loadingOptions && <p className="mt-1 text-[11px] text-amber-700">ربط نطاق الحساب بالمركز والحلقة لم يُفعّل بعد.</p>}
        </div>
        <label className="text-sm font-bold text-slate-700">تاريخ التسجيل
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700" />
        </label>
      </section>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"><CircleAlert size={18} className="mt-0.5 shrink-0" />{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Users size={19} /></span><div><h2 className="font-extrabold text-slate-800">قائمة الطلاب</h2><p className="mt-1 text-xs text-slate-400">{students.length} طالباً · {date}</p></div></div>
          <button type="button" onClick={markAllPresent} disabled={!students.length || loadingStudents} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={16} />تحديد الكل حاضر</button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          {statuses.map((item) => <span key={item.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{item.name} <b className="text-slate-800">{counts[item.id]}</b></span>)}
          <span className="mr-auto rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500">غير محدد <b className="text-slate-700">{students.length - markedCount}</b></span>
        </div>

        {loadingStudents ? <p className="p-10 text-center text-sm text-slate-400">جارٍ تحميل طلاب الحلقة…</p> : !students.length ? <p className="p-10 text-center text-sm text-slate-400">سيظهر طلاب الحلقة بعد ربط نطاق الحساب بالمركز والحلقة.</p> : (
          <div className="divide-y divide-slate-100">
            {students.map((student) => (
              <article key={student.studentId} className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(160px,1fr)_auto_minmax(180px,0.8fr)] lg:items-center">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 font-extrabold text-emerald-800">{student.studentName?.slice(0, 1) || "ط"}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{student.studentName || "طالب"}</p><p className="mt-1 text-xs text-slate-400">رقم الطالب: {student.studentId}</p></div></div>
                <div role="group" aria-label={`حالة حضور ${student.studentName}`} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1 sm:grid-cols-4">
                  {statuses.map((item) => { const selected = statusByStudent[student.studentId] === item.id; return <button key={item.id} type="button" aria-pressed={selected} onClick={() => setStatusByStudent((current) => ({ ...current, [student.studentId]: item.id }))} className={`min-h-10 rounded-lg border border-transparent px-3 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 ${selected ? item.color : item.idle}`}>{item.name}</button>; })}
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400"><span className="shrink-0">ملاحظة</span><input value={notesByStudent[student.studentId] || ""} onChange={(event) => setNotesByStudent((current) => ({ ...current, [student.studentId]: event.target.value }))} placeholder="اختيارية" className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none placeholder:text-slate-300 focus:border-emerald-700" /></label>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-20 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">{students.length ? `${markedCount} من ${students.length} حالة محددة` : "لا يوجد طلاب"}</p><button type="button" onClick={handleSave} disabled={saving || loadingStudents || !students.length || !allMarked} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"><Check size={17} />{saving ? "جارٍ الحفظ…" : "حفظ الحضور"}</button></div>
      </div>
    </main>
  );
}




