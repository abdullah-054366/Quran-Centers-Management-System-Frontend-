import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { getCenters } from "../api/centers";
import { addGroup, deleteGroup, getGroups, updateGroup } from "../api/groups";
import { getTeachers } from "../api/teachers";
import { useAuth } from "../context/AuthContext";

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
}

function getActionError(error) {
  const response = error?.response?.data;
  if (typeof response === "string" && response) return response;
  return response?.message || response?.detail || "تعذّرت إكمال العملية. حاول مرة أخرى.";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

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

function StatusBadge({ isActive }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
    }`}>
      {isActive ? "نشطة" : "موقوفة"}
    </span>
  );
}

function GroupFormModal({ group, isAdmin, centerId, onClose, onSave, saving, error }) {
  const [form, setForm] = useState({
    halaqaName: group?.halaqaName ?? "",
    description: group?.description ?? "",
    centerId: group?.centerId ?? (isAdmin ? "" : centerId ?? ""),
    teacherId: group?.teacherId ?? "",
    isActive: group?.isActive ?? true,
  });
  const [centers, setCenters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      const [teacherResult, centerResult] = await Promise.allSettled([
        getTeachers(),
        isAdmin ? getCenters() : Promise.resolve([]),
      ]);

      if (!isMounted) return;

      if (teacherResult.status === "fulfilled") {
        setTeachers(getList(teacherResult.value));
      } else {
        setOptionsError("تعذّر تحميل المدرسين. يمكنك إنشاء الحلقة دون تعيين مدرس.");
      }

      if (isAdmin && centerResult.status === "fulfilled") {
        setCenters(getList(centerResult.value).filter((center) =>
          center.isActive || Number(center.centerId) === Number(group?.centerId),
        ));
      } else if (isAdmin && centerResult.status === "rejected") {
        setOptionsError("تعذّر تحميل المراكز.");
      }

      setOptionsLoading(false);
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, group?.centerId]);

  const availableTeachers = teachers.filter((teacher) =>
    Number(teacher.centerId) === Number(form.centerId)
    && (teacher.isActive || Number(teacher.teacherId) === Number(form.teacherId)),
  );

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "centerId" ? { teacherId: "" } : {}),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSave({
      centerId: Number(form.centerId) || null,
      teacherId: Number(form.teacherId) || null,
      halaqaName: form.halaqaName.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
    });
  };

  const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700";
  const noCenters = isAdmin && !optionsLoading && centers.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center"
      onClick={saving ? undefined : onClose}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">
              {group ? "تعديل بيانات الحلقة" : "إضافة حلقة جديدة"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              اربط الحلقة بمركزها ومدرسها، ويمكن ترك المدرس دون تعيين.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            اسم الحلقة
            <input
              name="halaqaName"
              value={form.halaqaName}
              onChange={updateField}
              className={fieldClass}
              required
              maxLength={150}
              placeholder="مثال: حلقة الفجر"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            الوصف
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              className={`${fieldClass} min-h-24 resize-y`}
              maxLength={500}
              placeholder="وصف مختصر للحلقة (اختياري)"
            />
          </label>

          {isAdmin ? (
            <label className="block text-sm font-semibold text-slate-700">
              المركز
              <select
                name="centerId"
                value={form.centerId}
                onChange={updateField}
                className={fieldClass}
                required
                disabled={optionsLoading || noCenters}
              >
                <option value="">{optionsLoading ? "جارٍ تحميل المراكز…" : "اختر المركز"}</option>
                {centers.map((center) => (
                  <option key={center.centerId} value={center.centerId}>
                    {center.centerName}{center.isActive ? "" : " (موقوف)"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              سيتم ربط الحلقة بمركزك تلقائيًا.
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-700">
            المدرس
            <select
              name="teacherId"
              value={form.teacherId}
              onChange={updateField}
              className={fieldClass}
              disabled={optionsLoading || !form.centerId}
            >
              <option value="">دون تعيين مدرس</option>
              {availableTeachers.map((teacher) => (
                <option key={teacher.teacherId} value={teacher.teacherId}>
                  {[teacher.firstName, teacher.lastName].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            <input
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={updateField}
              className="h-4 w-4 accent-emerald-800"
            />
            الحلقة نشطة
          </label>
        </div>

        {(error || optionsError || noCenters) && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error || optionsError || "لا توجد مراكز متاحة لإضافة الحلقة."}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving || optionsLoading || (isAdmin && (!form.centerId || noCenters))}
            className="flex-1 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ…" : group ? "حفظ التعديلات" : "إضافة الحلقة"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Groups() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const canManageGroups = isAdmin || user?.role === "CenterAdmin";
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGroups();
      setGroups(getList(data).map((group) => ({
        id: group.halaqaId,
        centerId: group.centerId,
        centerName: group.centerName || "—",
        teacherId: group.teacherId,
        teacherName: group.teacherName || "غير معيّن",
        halaqaName: group.halaqaName || "بدون اسم",
        description: group.description || "",
        studentCount: Number(group.studentCount) || 0,
        isActive: Boolean(group.isActive),
        createdAt: group.createdAt,
      })));
      setError("");
    } catch (requestError) {
      console.error("Error loading groups:", requestError);
      setError("تعذّر تحميل بيانات الحلقات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const counts = useMemo(() => ({
    all: groups.length,
    active: groups.filter((group) => group.isActive).length,
    inactive: groups.filter((group) => !group.isActive).length,
    students: groups.reduce((total, group) => total + group.studentCount, 0),
  }), [groups]);

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (filter === "active" && !group.isActive) return false;
      if (filter === "inactive" && group.isActive) return false;
      if (!query) return true;
      return [group.halaqaName, group.centerName, group.teacherName, group.description]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [groups, search, filter]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(visibleGroups.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageGroups = visibleGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const tableColumnCount = 6 + (isAdmin ? 1 : 0) + (canManageGroups ? 1 : 0);

  function openAddForm() {
    setSelectedGroup(null);
    setActionError("");
    setShowForm(true);
  }

  function openEditForm(group) {
    setSelectedGroup(group);
    setActionError("");
    setShowForm(true);
  }

  async function saveGroup(formData) {
    setSaving(true);
    setActionError("");
    try {
      if (selectedGroup) {
        await updateGroup(selectedGroup.id, formData);
      } else {
        await addGroup(formData);
      }
      setShowForm(false);
      await fetchGroups();
    } catch (requestError) {
      setActionError(getActionError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup(group) {
    if (!window.confirm(`هل تريد حذف ${group.halaqaName}؟`)) return;
    setActionError("");
    try {
      await deleteGroup(group.id);
      await fetchGroups();
    } catch (requestError) {
      setActionError(getActionError(requestError));
    }
  }

  function changeSearch(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  const tabs = [
    { key: "all", label: "كل الحلقات" },
    { key: "active", label: "نشطة" },
    { key: "inactive", label: "موقوفة" },
  ];

  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">الحلقات</h1>
          <p className="mt-1 text-sm text-slate-400">تنظيم الحلقات وربطها بالمراكز والمدرسين والطلاب.</p>
        </div>
        {canManageGroups && (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            <Plus size={18} />
            إضافة حلقة
          </button>
        )}
      </header>

      {actionError && !showForm && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="إجمالي الحلقات" value={counts.all} subtitle="حلقة مسجلة" Icon={BookOpen} iconStyle="bg-emerald-50 text-emerald-800" />
        <StatCard title="الحلقات النشطة" value={counts.active} subtitle="حلقة تستقبل الطلاب" Icon={CheckCircle2} iconStyle="bg-sky-50 text-sky-700" />
        <StatCard title="الطلاب في الحلقات" value={counts.students} subtitle="عضوية نشطة في الحلقات" Icon={Users} iconStyle="bg-amber-50 text-amber-700" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="تصفية الحلقات">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={filter === tab.key}
                onClick={() => { setFilter(tab.key); setPage(1); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === tab.key ? "bg-emerald-800 text-white" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                {tab.label} <span className="opacity-70">{counts[tab.key]}</span>
              </button>
            ))}
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 lg:max-w-sm">
            <Search size={18} />
            <input
              value={search}
              onChange={changeSearch}
              placeholder="ابحث باسم الحلقة أو المركز أو المدرس"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-4 font-semibold">رقم الحلقة</th>
                <th className="px-5 py-4 font-semibold">الحلقة</th>
                {isAdmin && <th className="px-5 py-4 font-semibold">المركز</th>}
                <th className="px-5 py-4 font-semibold">المدرس</th>
                <th className="px-5 py-4 font-semibold">عدد الطلاب</th>
                <th className="px-5 py-4 font-semibold">تاريخ الإنشاء</th>
                <th className="px-5 py-4 font-semibold">الحالة</th>
                {canManageGroups && <th className="px-5 py-4 font-semibold">الإجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={tableColumnCount} className="p-10 text-center text-sm text-slate-400">جارٍ تحميل الحلقات…</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={tableColumnCount} className="p-10 text-center">
                    <p className="text-sm text-rose-600">{error}</p>
                    <button type="button" onClick={fetchGroups} className="mt-3 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900">إعادة المحاولة</button>
                  </td>
                </tr>
              ) : pageGroups.map((group) => (
                <tr key={group.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-semibold text-slate-500">{group.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800">{group.halaqaName}</p>
                    {group.description && <p className="mt-1 max-w-xs truncate text-xs text-slate-400">{group.description}</p>}
                  </td>
                  {isAdmin && <td className="px-5 py-4 text-slate-500">{group.centerName}</td>}
                  <td className="px-5 py-4 text-slate-500">{group.teacherName}</td>
                  <td className="px-5 py-4 text-slate-500">{group.studentCount}</td>
                  <td className="px-5 py-4 text-slate-500">{formatDate(group.createdAt)}</td>
                  <td className="px-5 py-4"><StatusBadge isActive={group.isActive} /></td>
                  {canManageGroups && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEditForm(group)} aria-label={`تعديل ${group.halaqaName}`} title="تعديل" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"><Pencil size={17} /></button>
                        <button type="button" onClick={() => removeGroup(group)} aria-label={`حذف ${group.halaqaName}`} title="حذف" className="grid h-9 w-9 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50"><Trash2 size={17} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && !error && pageGroups.length === 0 && (
                <tr><td colSpan={tableColumnCount} className="p-10 text-center text-sm text-slate-400">لا توجد حلقات تطابق البحث أو التصنيف.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">عرض {visibleGroups.length} حلقة</p>
          <div className="flex items-center justify-center gap-1">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">السابقة</button>
            <span className="min-w-16 px-2 text-center text-xs font-bold text-slate-600">{currentPage} / {pageCount}</span>
            <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">التالية</button>
          </div>
        </footer>
      </section>

      {showForm && (
        <GroupFormModal
          group={selectedGroup}
          isAdmin={isAdmin}
          centerId={user?.centerId}
          onClose={() => setShowForm(false)}
          onSave={saveGroup}
          saving={saving}
          error={actionError}
        />
      )}
    </main>
  );
}
