import { useEffect } from "react";

export const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600/15";

export const primaryBtn =
  "rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50";

export const ghostBtn =
  "rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50";

export const dangerBtn =
  "rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50";

export function Modal({ title, onClose, busy = false, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center"
      onClick={busy ? undefined : onClose}
    >
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6 ${
          wide ? "max-w-xl" : "max-w-md"
        }`}
      >
        <h2 className="mb-4 text-lg font-extrabold text-slate-800">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
      {children}
    </p>
  );
}

export function ConfirmModal({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  error = "",
  disabled = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <div className="space-y-3 text-sm leading-7 text-slate-600">{children}</div>
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>
          إلغاء
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || disabled}
          className={danger ? dangerBtn : primaryBtn}
        >
          {busy ? "جارٍ التنفيذ…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function StatusBadge({ active, on = "نشط", off = "موقوف" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-600" : "bg-rose-600"}`} />
      {active ? on : off}
    </span>
  );
}

export const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Riyadh",
      }).format(new Date(value.endsWith?.("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`))
    : "—";

export const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(value))
    : "—";
