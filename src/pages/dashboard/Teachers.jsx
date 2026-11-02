import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Pencil, Plus, Search, Trash2, UserRound, Users, X } from "lucide-react";
import { getCenters } from "../../api/centers";
import { addTeacher, deleteTeacher, getTeachers, updateTeacher } from "../../api/teachers";
import { useAuth } from "../../context/AuthContext";

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

function TeacherAvatar({ name }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-extrabold text-emerald-800">
      {name.slice(0, 1)}
    </div>
  );
}

function StatusBadge({ isActive }) {
  const statusStyle = isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>
      {isActive ? "نشط" : "موقوف"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getTeacherList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
}

function getActionError(error) {
  const response = error?.response?.data;
  if (typeof response === "string" && response) return response;
  return response?.message || response?.detail || "تعذّر إكمال العملية. حاول مرة أخرى.";
}

function TeacherFormModal({ teacher, onClose, onSave, saving, error }) {
  const [form, setForm] = useState({
    firstName: teacher?.firstName ?? "",
    lastName: teacher?.lastName ?? "",
    email: teacher?.email ?? "",
    phoneNumber: teacher?.phoneNumber === "—" ? "" : teacher?.phoneNumber ?? "",
    password: "",
    centerId: "",
    isActive: teacher?.isActive ?? true,
  });
  const [centers, setCenters] = useState([]);
  const [centersLoading, setCentersLoading] = useState(!teacher);
  const [centersError, setCentersError] = useState("");

  useEffect(() => {
    if (teacher) return undefined;

    let isMounted = true;
    getCenters()
      .then((data) => {
        if (isMounted) setCenters(getTeacherList(data).map((center) => ({
          id: center.centerId ?? center.id,
          name: center.centerName ?? center.name ?? "بدون اسم",
        })));
      })
      .catch(() => {
        if (isMounted) setCentersError("تعذّر تحميل المراكز. أعد المحاولة لاحقًا.");
      })
      .finally(() => {
        if (isMounted) setCentersLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [teacher]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || null,
      isActive: form.isActive,
    };

    if (!teacher) {
      payload.centerId = Number(form.centerId);
      payload.password = form.password;
    }

    onSave(payload);
  };

  const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700";

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
              {teacher ? "تعديل بيانات المدرس" : "إضافة مدرس جديد"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {teacher ? "حدّث بيانات الحساب وحالته." : "سيُنشأ حساب دخول للمدرس تلقائيًا."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            الاسم الأول
            <input name="firstName" value={form.firstName} onChange={updateField} className={fieldClass} required maxLength={100} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            اسم العائلة
            <input name="lastName" value={form.lastName} onChange={updateField} className={fieldClass} required maxLength={100} />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            البريد الإلكتروني
            <input name="email" type="email" dir="ltr" value={form.email} onChange={updateField} className={fieldClass} required maxLength={255} />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            رقم الهاتف
            <input name="phoneNumber" type="tel" dir="ltr" value={form.phoneNumber} onChange={updateField} className={fieldClass} maxLength={20} />
          </label>

          {!teacher && (
            <>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                المركز
                <select name="centerId" value={form.centerId} onChange={updateField} className={fieldClass} required disabled={centersLoading || Boolean(centersError)}>
                  <option value="">{centersLoading ? "جارٍ تحميل المراكز…" : "اختر المركز"}</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
                {centersError && <span className="mt-1 block text-xs text-rose-600">{centersError}</span>}
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                كلمة المرور الأولية
                <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={updateField} className={fieldClass} required minLength={8} />
                <span className="mt-1 block text-xs font-normal text-slate-400">ثمانية أحرف على الأقل.</span>
              </label>
            </>
          )}

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 sm:col-span-2">
            <input name="isActive" type="checkbox" checked={form.isActive} onChange={updateField} className="h-4 w-4 accent-emerald-800" />
            حساب المدرس نشط
          </label>
        </div>

        {(error || (centers.length === 0 && !centersLoading && !teacher && !centersError)) && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error || "لا توجد مراكز متاحة لإضافة المدرس."}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving || (!teacher && (centersLoading || !centers.length || !form.centerId))}
            className="flex-1 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ…" : teacher ? "حفظ التعديلات" : "إضافة المدرس"}
          </button>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Teachers() {
  const { user } = useAuth();
  const canManageTeachers = ["Admin", "CenterAdmin"].includes(user?.role);
  const canCreateTeacher = user?.role === "Admin";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchTeachers = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getTeachers();
      const teacherList = getTeacherList(data);

      setTeachers(
        teacherList.map((teacher) => ({
          id: teacher.teacherId ?? teacher.id,
          userId: teacher.userId,
          firstName: teacher.firstName ?? "",
          lastName: teacher.lastName ?? "",
          name:
            [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") ||
            teacher.name ||
            "بدون اسم",
          centerId: teacher.centerId,
          centerName: teacher.centerName || "—",
          centerCode: teacher.centerCode || "—",
          email: teacher.email || "—",
          phoneNumber: teacher.phoneNumber || "—",
          isActive: Boolean(teacher.isActive),
          joinedAt: teacher.joinedAt,
        })),
      );
      setError("");
    } catch (requestError) {
      console.error("Error loading teachers:", requestError);
      setError("تعذّر تحميل بيانات المدرسين.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  function openAddForm() {
    setSelectedTeacher(null);
    setActionError("");
    setShowForm(true);
  }

  function openEditForm(teacher) {
    setSelectedTeacher(teacher);
    setActionError("");
    setShowForm(true);
  }

  async function saveTeacher(formData) {
    setSaving(true);
    setActionError("");

    try {
      if (selectedTeacher) {
        await updateTeacher(selectedTeacher.id, formData);
      } else {
        await addTeacher(formData);
      }

      setShowForm(false);
      await fetchTeachers();
    } catch (requestError) {
      setActionError(getActionError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function removeTeacher(teacher) {
    const confirmed = window.confirm(`هل تريد حذف المدرس ${teacher.name}؟`);
    if (!confirmed) return;

    setActionError("");
    try {
      await deleteTeacher(teacher.id);
      await fetchTeachers();
    } catch (requestError) {
      setActionError(getActionError(requestError));
    }
  }

  const pageSize = 8;
  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teachers;

    return teachers.filter((teacher) =>
      [teacher.name, teacher.email, teacher.phoneNumber, teacher.centerName, teacher.centerCode].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [teachers, search]);

  const pageCount = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageTeachers = filteredTeachers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const activeCount = teachers.filter((teacher) => teacher.isActive).length;
  const inactiveCount = teachers.length - activeCount;
  const tableColumnCount = canManageTeachers ? 8 : 7;

  function changeSearch(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">المدرسون</h1>
          <p className="mt-1 text-sm text-slate-400">
            عرض حسابات المدرسين ومراكزهم وحالة نشاطهم في النظام.
          </p>
        </div>
        {canCreateTeacher && (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            <Plus size={18} />
            إضافة مدرس
          </button>
        )}
      </header>

      {actionError && !showForm && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="إجمالي المدرسين"
          value={teachers.length}
          subtitle="مدرس مسجل في النظام"
          Icon={Users}
          iconStyle="bg-emerald-50 text-emerald-800"
        />
        <StatCard
          title="المدرسون النشطون"
          value={activeCount}
          subtitle="حساب نشط"
          Icon={BadgeCheck}
          iconStyle="bg-sky-50 text-sky-700"
        />
        <StatCard
          title="الحسابات الموقوفة"
          value={inactiveCount}
          subtitle="حساب غير نشط"
          Icon={UserRound}
          iconStyle="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <label className="flex min-h-11 w-full max-w-xl items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400">
            <Search size={18} />
            <input
              value={search}
              onChange={changeSearch}
              placeholder="ابحث باسم المدرس أو البريد أو المركز أو كوده"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-4 font-semibold">رقم المدرس</th>
                <th className="px-5 py-4 font-semibold">اسم المدرس</th>
                <th className="px-5 py-4 font-semibold">المركز</th>
                <th className="px-5 py-4 font-semibold">البريد الإلكتروني</th>
                <th className="px-5 py-4 font-semibold">رقم الهاتف</th>
                <th className="px-5 py-4 font-semibold">تاريخ الانضمام</th>
                <th className="px-5 py-4 font-semibold">الحالة</th>
                {canManageTeachers && <th className="px-5 py-4 font-semibold">الإجراءات</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableColumnCount} className="p-10 text-center text-sm text-slate-400">
                    جارٍ تحميل المدرسين…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={tableColumnCount} className="p-10 text-center">
                    <p className="text-sm text-rose-600">{error}</p>
                    <button
                      type="button"
                      onClick={fetchTeachers}
                      className="mt-3 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                    >
                      إعادة المحاولة
                    </button>
                  </td>
                </tr>
              ) : (
                pageTeachers.map((teacher) => (
                  <tr key={teacher.id ?? teacher.userId} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-semibold text-slate-500">
                      {teacher.id ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <TeacherAvatar name={teacher.name} />
                        <span className="font-bold text-slate-800">{teacher.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700">{teacher.centerName}</p>
                      <span
                        dir="ltr"
                        className="mt-1 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-emerald-800"
                      >
                        {teacher.centerCode}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500" dir="ltr">
                      {teacher.email}
                    </td>
                    <td className="px-5 py-4 text-slate-500" dir="ltr">
                      {teacher.phoneNumber}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {formatDate(teacher.joinedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge isActive={teacher.isActive} />
                    </td>
                    {canManageTeachers && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(teacher)}
                            aria-label={`تعديل بيانات ${teacher.name}`}
                            title="تعديل"
                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTeacher(teacher)}
                            aria-label={`حذف ${teacher.name}`}
                            title="حذف"
                            className="grid h-9 w-9 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}

              {!loading && !error && pageTeachers.length === 0 && (
                <tr>
                  <td colSpan={tableColumnCount} className="p-10 text-center text-sm text-slate-400">
                    لا يوجد مدرسون يطابقون البحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">عرض {filteredTeachers.length} مدرس</p>

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
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالية
            </button>
          </div>
        </footer>
      </section>

      {showForm && (
        <TeacherFormModal
          teacher={selectedTeacher}
          onClose={() => setShowForm(false)}
          onSave={saveTeacher}
          saving={saving}
          error={actionError}
        />
      )}
    </main>
  );
}
