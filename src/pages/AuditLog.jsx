import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { getAuditLogs } from "../api/audit";
import { apiErrorMessage } from "../lib/apiError";
import { buildXlsxBlob, downloadBlob } from "../lib/xlsx";
import { formatDateTime, ghostBtn } from "../components/AdminUi";
import { ROLE_LABELS } from "./Users";

export const ACTION_LABELS = {
  "center.create": "إضافة مركز",
  "center.rename": "تعديل اسم مركز",
  "center.activate": "تفعيل مركز",
  "center.suspend": "إيقاف مركز",
  "center.code_enable": "تفعيل كود الانضمام",
  "center.code_disable": "تعطيل كود الانضمام",
  "center.code_regenerate": "توليد كود انضمام جديد",
  "center.delete": "حذف مركز",
  "user.create": "إنشاء مستخدم",
  "user.update": "تعديل مستخدم",
  "user.enable": "تفعيل حساب",
  "user.disable": "تعطيل حساب",
  "user.password_reset": "إعادة تعيين كلمة مرور",
  "user.delete": "حذف مستخدم",
};

const ENTITY_LABELS = { Center: "مركز", User: "مستخدم" };

const tone = (action) => {
  if (action.endsWith("delete")) return "bg-rose-50 text-rose-700";
  if (/suspend|disable|code_disable/.test(action)) return "bg-amber-50 text-amber-700";
  if (/create|activate|enable|code_enable/.test(action)) return "bg-emerald-50 text-emerald-700";
  return "bg-sky-50 text-sky-700";
};

const PAGE_SIZE = 25;

export default function AuditLog() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: "", entityType: "", search: "", from: "", to: "" });
  const [applied, setApplied] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getAuditLogs({ ...applied, page, pageSize: PAGE_SIZE }));
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "تعذّر تحميل السجل. تأكد من إنشاء جدول AuditLogs في قاعدة البيانات."));
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const change = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  };

  const reset = () => {
    const empty = { action: "", entityType: "", search: "", from: "", to: "" };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  };

  const exportExcel = async () => {
    try {
      const all = await getAuditLogs({ ...applied, page: 1, pageSize: 100 });
      const rows = [
        [{ v: "التاريخ", b: true }, { v: "المنفّذ", b: true }, { v: "الدور", b: true }, { v: "العملية", b: true },
          { v: "العنصر", b: true }, { v: "التفاصيل", b: true }],
        ...all.items.map((item) => [
          formatDateTime(item.createdAt),
          item.actorName,
          ROLE_LABELS[item.actorRole] ?? item.actorRole,
          ACTION_LABELS[item.action] ?? item.action,
          item.entityName || "",
          item.details || "",
        ]),
      ];
      downloadBlob(
        buildXlsxBlob({ sheetName: "سجل التدقيق", rows, colWidths: [20, 22, 14, 24, 24, 40] }),
        `سجل التدقيق ${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const input = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700";

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">سجل التدقيق</h1>
          <p className="mt-1 text-sm text-slate-500">من فعل ماذا ومتى في العمليات الحساسة: المراكز والحسابات.</p>
        </div>
        <button type="button" onClick={exportExcel} disabled={!data.total} className={`${ghostBtn} flex items-center gap-2 border border-slate-200`}>
          <FileSpreadsheet size={16} /> تصدير آخر 100
        </button>
      </header>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <input name="search" value={filters.search} onChange={change} placeholder="بحث بالاسم أو التفاصيل" className={`${input} w-full sm:w-64`} />
        <select name="action" value={filters.action} onChange={change} className={input}>
          <option value="">كل العمليات</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select name="entityType" value={filters.entityType} onChange={change} className={input}>
          <option value="">كل العناصر</option>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <label className="text-xs text-slate-500">
          من
          <input type="date" name="from" value={filters.from} onChange={change} className={`${input} mr-1`} />
        </label>
        <label className="text-xs text-slate-500">
          إلى
          <input type="date" name="to" value={filters.to} onChange={change} className={`${input} mr-1`} />
        </label>
        <button type="submit" className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">تطبيق</button>
        <button type="button" onClick={reset} className={ghostBtn}>مسح</button>
      </form>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">جارٍ التحميل…</p>
        ) : data.items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">لا توجد عمليات مسجّلة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">المنفّذ</th>
                  <th className="px-4 py-3 font-semibold">العملية</th>
                  <th className="px-4 py-3 font-semibold">العنصر</th>
                  <th className="px-4 py-3 font-semibold">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={item.auditLogId} className="align-top hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{item.actorName || "—"}</p>
                      <p className="text-xs text-slate-500">{ROLE_LABELS[item.actorRole] ?? item.actorRole}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(item.action)}`}>
                        {ACTION_LABELS[item.action] ?? item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.entityName || "—"}
                      <span className="mr-1 text-xs text-slate-400">({ENTITY_LABELS[item.entityType] ?? item.entityType})</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <nav className="flex items-center justify-between text-sm text-slate-600" aria-label="التنقل بين الصفحات">
        <span>{data.total} عملية</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`${ghostBtn} flex items-center gap-1`}>
            <ChevronRight size={16} /> السابق
          </button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`${ghostBtn} flex items-center gap-1`}>
            التالي <ChevronLeft size={16} />
          </button>
        </div>
      </nav>
    </main>
  );
}
