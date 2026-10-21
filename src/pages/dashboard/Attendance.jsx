import { useState } from "react";
import { CalendarCheck, Check } from "lucide-react";
import { students } from "../../api/students";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
}).format(new Date());

const statuses = ["حاضر", "غائب", "متأخر"];

export default function Attendance() {
  const [date, setDate] = useState(today);
  const [group, setGroup] = useState("الكل");
  const [message, setMessage] = useState("");

  const groups = ["الكل", ...new Set(students.map((student) => student.group))];

  const visibleStudents =
    group === "الكل"
      ? students
      : students.filter((student) => student.group === group);

  const [attendance, setAttendance] = useState(() =>
    Object.fromEntries(students.map((student) => [student.id, "حاضر"]))
  );

  function updateStatus(studentId, status) {
    setAttendance((current) => ({
      ...current,
      [studentId]: status,
    }));
  }

  function saveAttendance() {
    const record = {
      date,
      group,
      students: visibleStudents.map((student) => ({
        studentId: student.id,
        name: student.name,
        status: attendance[student.id],
      })),
    };

    // استبدل هذا بطلب API لحفظ الحضور.
    console.log("سجل الحضور:", record);
    setMessage("تم تجهيز سجل الحضور. اربطه بالـ API لحفظه في النظام.");
  }

  function statusStyle(status, selected) {
    if (!selected) return "text-slate-400 hover:bg-white";

    if (status === "حاضر") return "bg-emerald-100 text-emerald-800";
    if (status === "غائب") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-800";
  }

  return (
    <main dir="rtl" className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">
          تسجيل الحضور والغياب
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          اختر الحلقة وسجّل حالة الحضور لكل طالب.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700">
          تاريخ الحضور
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-700"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          الحلقة
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-700"
          >
            {groups.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="font-extrabold">قائمة الطلاب</h2>
            <p className="mt-1 text-xs text-slate-400">
              {visibleStudents.length} طالب
            </p>
          </div>
          <CalendarCheck className="text-emerald-800" size={20} />
        </div>

        <div className="divide-y divide-slate-100">
          {visibleStudents.map((student) => (
            <div
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-bold">{student.name}</p>
                <p className="mt-1 text-xs text-slate-400">{student.group}</p>
              </div>

              <div className="flex gap-1 rounded-xl bg-slate-50 p-1">
                {statuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateStatus(student.id, status)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${statusStyle(
                      status,
                      attendance[student.id] === status
                    )}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={saveAttendance}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900"
      >
        <Check size={17} />
        حفظ الحضور
      </button>
    </main>
  );
}