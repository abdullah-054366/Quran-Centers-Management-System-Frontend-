import {
  BookOpen,
  Building2,
  CalendarCheck,
  GraduationCap,
 
} from "lucide-react";
 const stats = [
    {
      label: "المراكز النشطة",
      value: "٣",
      note: "من أصل ٤ مراكز",
      icon: Building2,
      color: "bg-emerald-50 text-emerald-800",
    },
    {
      label: "إجمالي الطلاب",
      value: "٤١٠",
      note: "في جميع الحلقات",
      icon: GraduationCap,
      color: "bg-sky-50 text-sky-700",
    },
    {
      label: "نسبة الحضور اليوم",
      value: "٩٤٪",
      note: "من إجمالي الطلاب",
      icon: CalendarCheck,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "إنجاز الحفظ",
      value: "٧٨٪",
      note: "من الخطة الشهرية",
      icon: BookOpen,
      color: "bg-rose-50 text-rose-700",
    },
  ];


function StatCard({ item }) {
  const Icon = item.icon;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-400">{item.label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">
            {item.value}
          </p>
        </div>

        <div
          className={`grid h-11 w-11 place-items-center rounded-xl ${item.color}`}
        >
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">{item.note}</p>
    </article>
  );
}

function Stats() {
  return (
    <section
      className="
        -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3
        scrollbar-hide
        sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0
        xl:grid-cols-4
      "
    >
      {stats.map((item) => (
        <div
          key={item.label}
          className="w-[100%] shrink-0 snap-start sm:w-auto sm:shrink"
        >
          <StatCard item={item} />
        </div>
      ))}
    </section>
  );
}

export default Stats;
