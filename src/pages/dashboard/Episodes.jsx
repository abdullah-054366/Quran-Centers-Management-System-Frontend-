import React from 'react'

function Episodes() {

     const groups = [
    {
      name: "حلقة الفجر",
      teacher: "أحمد العتيبي",
      time: "بعد صلاة الفجر · ٥:٣٠ ص",
      students: students.filter((s) => s.group === "حلقة الفجر").length,
      color: "bg-emerald-50 text-forest",
    },
    {
      name: "حلقة الضحى",
      teacher: "خالد الحربي",
      time: "بعد صلاة الضحى · ٨:٠٠ ص",
      students: students.filter((s) => s.group === "حلقة الضحى").length,
      color: "bg-amber-50 text-amber-700",
    },
    {
      name: "حلقة العصر",
      teacher: "عبدالله السبيعي",
      time: "بعد صلاة العصر · ٤:٠٠ م",
      students: 18,
      color: "bg-sky-50 text-sky-700",
    },
    {
      name: "حلقة المغرب",
      teacher: "فهد القحطاني",
      time: "بعد صلاة المغرب · ٦:٣٠ م",
      students: 22,
      color: "bg-violet-50 text-violet-700",
    },
  ];
  
  return (
    <>
    
          {/* <SectionHead
        title="الحلقات"
        sub="تنظيم الحلقات وتوزيع الطلاب والمعلمين"
        action={onAdd}
        actionLabel="إضافة حلقة"
      /> */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g, i) => (
          <div
            key={g.name}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"
          >
            <div className="flex items-start justify-between">
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl ${g.color}`}
              >
                <BookOpen size={22} />
              </div>
              <button className="text-slate-300">
                <MoreHorizontal />
              </button>
            </div>
            <h3 className="mt-4 text-lg font-extrabold">{g.name}</h3>
            <p className="mt-1 text-sm text-slate-400">المعلم: {g.teacher}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="flex items-center gap-2 text-slate-500">
                <Clock3 size={16} />
                {g.time}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f6f8f6] px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-500">
                عدد الطلاب
              </span>
              <span className="font-extrabold">{g.students} طالب</span>
            </div>
          </div>
        ))}
      </div>
    
    </>
  )
}

export default Episodes