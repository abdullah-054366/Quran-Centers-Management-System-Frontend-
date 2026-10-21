import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Eye, GraduationCap, Search, Users } from "lucide-react";

const initialStudents = [
  { id: 1, name: "عبدالرحمن خالد", group: "حلقة الفجر", teacher: "أحمد العتيبي", memorization: "سورة الملك", level: "ممتاز", status: "نشط" },
  { id: 2, name: "سلمان محمد", group: "حلقة الفجر", teacher: "أحمد العتيبي", memorization: "سورة الرحمن", level: "متقدم", status: "نشط" },
  { id: 3, name: "فيصل عبدالله", group: "حلقة الضحى", teacher: "خالد الحربي", memorization: "سورة النبأ", level: "جيد جداً", status: "نشط" },
  { id: 4, name: "عمر صالح", group: "حلقة العصر", teacher: "عبدالله السبيعي", memorization: "سورة يس", level: "متقدم", status: "موقوف" },
  { id: 5, name: "ياسر إبراهيم", group: "حلقة الضحى", teacher: "خالد الحربي", memorization: "سورة المرسلات", level: "جيد", status: "نشط" },
  { id: 6, name: "تركي فهد", group: "حلقة الفجر", teacher: "أحمد العتيبي", memorization: "سورة النبأ", level: "جيد جداً", status: "نشط" },
  { id: 7, name: "ماجد ناصر", group: "حلقة العصر", teacher: "عبدالله السبيعي", memorization: "سورة الملك", level: "جيد", status: "نشط" },
  { id: 8, name: "زياد أحمد", group: "حلقة المغرب", teacher: "فهد القحطاني", memorization: "سورة الأعلى", level: "متقدم", status: "نشط" },
  { id: 9, name: "إبراهيم سعد", group: "حلقة الضحى", teacher: "خالد الحربي", memorization: "سورة عبس", level: "جيد جداً", status: "نشط" },
  { id: 10, name: "خالد مازن", group: "حلقة المغرب", teacher: "فهد القحطاني", memorization: "سورة النازعات", level: "جيد", status: "موقوف" },
  { id: 11, name: "سعد يوسف", group: "حلقة العصر", teacher: "عبدالله السبيعي", memorization: "سورة التكوير", level: "متقدم", status: "نشط" },
  { id: 12, name: "راكان علي", group: "حلقة الفجر", teacher: "أحمد العتيبي", memorization: "سورة القلم", level: "ممتاز", status: "نشط" },
];

function StatCard({ title, value, subtitle, Icon, iconStyle }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className={`grid h-11 w-11 place-items-center rounded-xl ${iconStyle}`}>
          <Icon size={21} />
        </div>
      </div>
    </article>
  );
}

function StudentAvatar({ name }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-extrabold text-emerald-800">
      {name.slice(0, 1)}
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "نشط"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-500";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {status}
    </span>
  );
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("الكل");
  const [page, setPage] = useState(1);

  const pageSize = 8;

  const groups = [
    "الكل",
    ...new Set(initialStudents.map((student) => student.group)),
  ];

  const filteredStudents = useMemo(() => {
    const query = search.trim();

    return initialStudents.filter((student) => {
      const matchesSearch =
        !query ||
        student.name.includes(query) ||
        student.group.includes(query) ||
        student.teacher.includes(query);

      const matchesGroup =
        group === "الكل" || student.group === group;

      return matchesSearch && matchesGroup;
    });
  }, [search, group]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredStudents.length / pageSize)
  );

  const currentPage = Math.min(page, pageCount);

  const pageStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const activeCount = initialStudents.filter(
    (student) => student.status === "نشط"
  ).length;

  const firstItem =
    filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const lastItem = Math.min(
    currentPage * pageSize,
    filteredStudents.length
  );

  function changeSearch(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function changeGroup(event) {
    setGroup(event.target.value);
    setPage(1);
  }

  return (
    <main dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">
          الطلاب المسجلون
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          عرض الطلاب المسجلين في النظام ومعلومات حلقاتهم.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="إجمالي الطلاب"
          value={initialStudents.length}
          subtitle="طالب مسجل في النظام"
          Icon={GraduationCap}
          iconStyle="bg-emerald-50 text-emerald-800"
        />

        <StatCard
          title="الطلاب النشطون"
          value={activeCount}
          subtitle="طالب في حلقات نشطة"
          Icon={Users}
          iconStyle="bg-sky-50 text-sky-700"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* البحث والتصفية */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400">
            <Search size={18} />
            <input
              value={search}
              onChange={changeSearch}
              placeholder="ابحث باسم الطالب أو الحلقة أو المعلم"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            value={group}
            onChange={changeGroup}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700"
          >
            {groups.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* جدول الطلاب */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-4 font-semibold">اسم الطالب</th>
                <th className="px-5 py-4 font-semibold">الحلقة</th>
                <th className="px-5 py-4 font-semibold">المعلم</th>
                <th className="px-5 py-4 font-semibold">آخر حفظ</th>
                <th className="px-5 py-4 font-semibold">المستوى</th>
                <th className="px-5 py-4 font-semibold">الحالة</th>
                <th className="px-5 py-4 font-semibold">الملف</th>
              </tr>
            </thead>

            <tbody>
              {pageStudents.map((student) => (
                <tr key={student.id} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={student.name} />
                      <span className="font-bold text-slate-800">
                        {student.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">{student.group}</td>

                  <td className="px-5 py-4 text-slate-500">
                    {student.teacher}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {student.memorization}
                  </td>

                  <td className="px-5 py-4">{student.level}</td>

                  <td className="px-5 py-4">
                    <StatusBadge status={student.status} />
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      to={`/students/${student.id}`}
                      aria-label={`عرض ملف ${student.name}`}
                      className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <Eye size={18} />
                    </Link>
                  </td>
                </tr>
              ))}

              {pageStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-sm text-slate-400"
                  >
                    لا يوجد طلاب يطابقون البحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* أزرار الصفحات */}
        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            عرض {filteredStudents.length} طالب
          </p>

          <div className="flex items-center justify-center gap-1">

            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              السابقة
            </button>

            <span className="min-w-16 px-2 text-center text-xs font-bold text-slate-600">
              {currentPage} / {pageCount}
            </span>

            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() =>
                setPage((value) => Math.min(pageCount, value + 1))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالية
            </button>

          </div>
        </footer>
      </section>
    </main>
  );
}