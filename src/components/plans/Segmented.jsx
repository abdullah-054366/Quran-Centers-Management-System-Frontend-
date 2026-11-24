// أزرار اختيار متجاورة (مثل Chips في تطبيق الجوال).
export default function Segmented({ options, value, onChange, columns, size = "md", label }) {
  const cols = columns ?? options.length;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-2xl bg-slate-100 p-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-xl font-bold transition ${size === "sm" ? "px-2 py-2 text-xs sm:text-sm" : "px-3 py-2.5 text-sm"} ${
              active ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
