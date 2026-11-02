import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowRight,
  CalendarDays,
  GraduationCap,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { getStudentById } from "../../api/students";

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-bold text-slate-700">
          {value || "غير متوفر"}
        </p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchStudent() {
      setLoading(true);
      setError("");

      try {
        const data = await getStudentById(id);
        if (isCurrent) setStudent(data);
      } catch (requestError) {
        console.error("Error fetching student profile:", requestError);
        if (isCurrent) setError("تعذّر تحميل ملف الطالب.");
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    fetchStudent();
    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-400">
        جارٍ تحميل ملف الطالب…
      </p>
    );
  }

  if (error || !student) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="font-bold text-slate-700">
          {error || "لم يتم العثور على الطالب."}
        </p>
        <Link
          to="/students"
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-700"
        >
          <ArrowRight size={17} /> العودة إلى قائمة الطلاب
        </Link>
      </section>
    );
  }

  const name =
    [student.firstName, student.lastName].filter(Boolean).join(" ") ||
    student.name ||
    "ملف الطالب";
  const active = student.isActive ?? student.active;
  const joinedAt = student.joinedAt
    ? new Date(student.joinedAt).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "غير متوفر";

  return (
    <main dir="rtl" className="space-y-6">
      <Link
        to="/students"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-800"
      >
        <ArrowRight size={18} /> العودة إلى الطلاب
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-2 bg-emerald-800" />
        <div className="flex flex-wrap items-center gap-4 p-6 sm:p-8">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-2xl font-extrabold text-emerald-800">
            {name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-400">ملف الطالب</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-800">
              {name}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {active ? "نشط" : "موقوف"}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <UserRound size={20} />
          </span>
          <div>
            <h2 className="font-extrabold text-slate-800">المعلومات الشخصية</h2>
            <p className="mt-1 text-xs text-slate-400">
              بيانات الطالب المسجلة في النظام
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={GraduationCap}
            label="رقم الطالب"
            value={student.studentId ?? student.id}
          />
          <DetailItem icon={Mail} label="البريد الإلكتروني" value={student.email} />
          <DetailItem
            icon={Phone}
            label="رقم الجوال"
            value={student.phoneNumber}
          />
          <DetailItem
            icon={CalendarDays}
            label="تاريخ الانضمام"
            value={joinedAt}
          />
        </div>
      </section>
    </main>
  );
}
