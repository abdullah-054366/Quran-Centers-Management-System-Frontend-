import Stats from "../../components/Stats";
import {
  ArrowUpLeft,
  BookOpen,
  Building2,
  CalendarCheck,
  GraduationCap,
  Users,
} from "lucide-react";

const activities = [
  {
    title: "تسميع جديد",
    detail: "عبدالرحمن خالد · سورة الملك",
    time: "قبل ١٥ دقيقة",
    icon: BookOpen,
    color: "bg-emerald-50 text-emerald-800",
  },
  {
    title: "تسجيل حضور",
    detail: "حلقة الفجر · ١٢ طالباً",
    time: "قبل ساعة",
    icon: CalendarCheck,
    color: "bg-sky-50 text-sky-700",
  },
  {
    title: "انضمام طالب",
    detail: "ياسر إبراهيم · حلقة الضحى",
    time: "قبل ساعتين",
    icon: Users,
    color: "bg-amber-50 text-amber-700",
  },
];

const students = [
  { name: "عبدالرحمن خالد", progress: 96 },
  { name: "سلمان محمد", progress: 89 },
  { name: "فيصل عبدالله", progress: 82 },
  { name: "عمر صالح", progress: 75 },
];



function WeeklyChart() {
  const days = [
    { day: "الأحد", value: 42 },
    { day: "الإثنين", value: 58 },
    { day: "الثلاثاء", value: 48 },
    { day: "الأربعاء", value: 72 },
    { day: "الخميس", value: 63 },
    { day: "الجمعة", value: 88 },
    { day: "السبت", value: 76 },
  ];

  return (
    <div className="flex h-56 items-end justify-between gap-3 border-b border-slate-100 px-2">
      {days.map((item) => (
        <div
          key={item.day}
          className="flex h-full flex-1 flex-col items-center justify-end gap-2"
        >
          <div
            className={`w-full max-w-10 rounded-t-lg ${
              item.day === "الجمعة" ? "bg-emerald-800" : "bg-emerald-100"
            }`}
            style={{ height: `${item.value}%` }}
            title={`${item.value}%`}
          />
          <span className="text-[10px] text-slate-400">{item.day}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityList() {
  return (
    <div className="space-y-5">
      {activities.map((activity) => {
        const Icon = activity.icon;

        return (
          <div key={activity.title} className="flex gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${activity.color}`}
            >
              <Icon size={18} />
            </div>

            <div>
              <p className="text-sm font-bold">{activity.title}</p>
              <p className="mt-1 text-xs text-slate-500">{activity.detail}</p>
              <p className="mt-1 text-[11px] text-slate-400">{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const date = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* الترحيب */}

      <section className="flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-l from-emerald-900 via-emerald-800 to-teal-700 p-6 text-white md:flex-row md:items-center md:p-8">
        <div>
          <p className="mb-3 text-sm text-emerald-100">{date}</p>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            السلام عليكم، مدير المنصة 👋
          </h1>
          <p className="mt-2 text-sm text-emerald-50/80">
            إليك نظرة عامة على أداء المراكز القرآنية.
          </p>
        </div>

        <button className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50">
          <CalendarCheck size={18} />
          تسجيل الحضور
        </button>
      </section>

      {/* ملخص الأرقام */}
      <Stats />

      {/* الرسم والأنشطة */}
      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-6">
            <h2 className="font-extrabold">نظرة عامة على الحفظ</h2>
            <p className="mt-1 text-sm text-slate-400">
              معدل إنجاز الطلاب خلال هذا الأسبوع
            </p>
          </div>
          <WeeklyChart />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold">آخر الأنشطة</h2>
              <p className="mt-1 text-sm text-slate-400">
                تحديثات الحلقات اليوم
              </p>
            </div>
            <button
              type="button"
              aria-label="عرض جميع الأنشطة"
              className="text-emerald-800"
            >
              <ArrowUpLeft size={19} />
            </button>
          </div>
          <ActivityList />
        </div>
      </section>

      {/* تقدم الطلاب */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="font-extrabold">أفضل الطلاب إنجازاً</h2>
          <p className="mt-1 text-sm text-slate-400">حسب التقدم في خطة الحفظ</p>
        </div>

        <div className="space-y-5">
          {students.map((student) => (
            <div key={student.name} className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 font-bold text-emerald-800">
                {student.name[0]}
              </div>

              <div className="flex-1">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-bold">{student.name}</span>
                  <span className="font-bold text-emerald-800">
                    {student.progress}٪
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-700"
                    style={{ width: `${student.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
