import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  resetUserPassword,
  setUserActive,
  updateUser,
} from "../api/users";
import { getCenters } from "../api/centers";
import { apiErrorMessage } from "../lib/apiError";
import { buildXlsxBlob, downloadBlob } from "../lib/xlsx";
import {
  ConfirmModal,
  ErrorNote,
  Modal,
  StatusBadge,
  fieldClass,
  formatDate,
  ghostBtn,
  primaryBtn,
} from "../components/AdminUi";

export const ROLE_LABELS = {
  PlatformAdmin: "مدير المنصة",
  Admin: "مدير النظام",
  CenterAdmin: "مدير مركز",
  Teacher: "معلم",
  Student: "طالب",
};

// الأدوار التي تُنشأ من هذه الصفحة؛ المعلم والطالب لهما صفحتاهما.
const CREATABLE_ROLES = ["CenterAdmin", "Admin", "PlatformAdmin"];

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (value) => chars[value % chars.length]).join("");
};

function UserFormModal({ editing, roles, centers, currentRole, onClose, onSave, saving, error }) {
  const lockedRole = editing && ["Teacher", "Student"].includes(editing.roleName);
  const creatable = roles.filter(
    (role) => CREATABLE_ROLES.includes(role.roleName)
      && (role.roleName !== "PlatformAdmin" || currentRole === "PlatformAdmin"),
  );
  const roleOptions = editing ? (lockedRole ? roles.filter((r) => r.roleId === editing.roleId) : creatable) : creatable;

  const [form, setForm] = useState({
    firstName: editing?.firstName ?? "",
    lastName: editing?.lastName ?? "",
    email: editing?.email ?? "",
    phoneNumber: editing?.phoneNumber ?? "",
    roleId: editing?.roleId ?? roleOptions.find((r) => r.roleName === "CenterAdmin")?.roleId ?? roleOptions[0]?.roleId ?? "",
    centerId: editing?.centerId ?? "",
    password: editing ? "" : generatePassword(),
    isActive: editing?.isActive ?? true,
  });

  const roleName = roles.find((role) => role.roleId === Number(form.roleId))?.roleName;
  const needsCenter = roleName === "CenterAdmin";
  const activeCenters = centers.filter((c) => c.isActive || c.centerId === editing?.centerId);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSave({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || null,
      roleId: Number(form.roleId),
      centerId: needsCenter ? Number(form.centerId) || null : editing && lockedRole ? editing.centerId : null,
      isActive: form.isActive,
      ...(editing ? {} : { password: form.password }),
    });
  };

  const invalid = !form.firstName.trim() || !form.lastName.trim() || !form.email.trim()
    || !form.roleId || (needsCenter && !form.centerId) || (!editing && form.password.length < 8);

  return (
    <Modal title={editing ? "تعديل مستخدم" : "إضافة مستخدم"} onClose={onClose} busy={saving} wide>
      <form onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            الاسم الأول
            <input name="firstName" value={form.firstName} onChange={change} className={fieldClass} autoFocus />
          </label>
          <label className="text-sm font-medium text-slate-700">
            الاسم الأخير
            <input name="lastName" value={form.lastName} onChange={change} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            البريد الإلكتروني
            <input name="email" type="email" dir="ltr" value={form.email} onChange={change} className={`${fieldClass} text-left`} />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            رقم الجوال (اختياري)
            <input name="phoneNumber" dir="ltr" value={form.phoneNumber} onChange={change} className={`${fieldClass} text-left`} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            الدور
            <select name="roleId" value={form.roleId} onChange={change} disabled={lockedRole} className={fieldClass}>
              {roleOptions.map((role) => (
                <option key={role.roleId} value={role.roleId}>
                  {ROLE_LABELS[role.roleName] ?? role.roleName}
                </option>
              ))}
            </select>
          </label>
          {needsCenter && (
            <label className="text-sm font-medium text-slate-700">
              المركز
              <select name="centerId" value={form.centerId} onChange={change} className={fieldClass}>
                <option value="">اختر المركز</option>
                {activeCenters.map((center) => (
                  <option key={center.centerId} value={center.centerId}>{center.centerName}</option>
                ))}
              </select>
            </label>
          )}
          {!editing && (
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                كلمة المرور المؤقتة
                <div className="mt-1.5 flex gap-2">
                  <input
                    name="password"
                    dir="ltr"
                    value={form.password}
                    onChange={change}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left font-mono text-sm outline-none focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, password: generatePassword() }))}
                    className={ghostBtn}
                  >
                    توليد
                  </button>
                </div>
              </label>
              <p className="mt-1 text-xs text-slate-500">8 أحرف على الأقل. انسخها وسلّمها للمستخدم، لن تظهر مرة أخرى.</p>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={change} className="h-4 w-4 accent-emerald-700" />
            الحساب نشط
          </label>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={ghostBtn}>إلغاء</button>
          <button type="submit" disabled={saving || invalid} className={primaryBtn}>
            {saving ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({ target, onClose, onSave, saving, error }) {
  const [password, setPassword] = useState(generatePassword);
  return (
    <Modal title={`إعادة تعيين كلمة مرور ${target.firstName} ${target.lastName}`} onClose={onClose} busy={saving}>
      <label className="text-sm font-medium text-slate-700">
        كلمة المرور الجديدة
        <div className="mt-1.5 flex gap-2">
          <input
            dir="ltr"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left font-mono text-sm outline-none focus:border-emerald-700"
          />
          <button type="button" onClick={() => setPassword(generatePassword())} className={ghostBtn}>توليد</button>
        </div>
      </label>
      <p className="mt-2 text-xs text-slate-500">
        سيُنهى تسجيل دخول المستخدم على بقية الأجهزة. انسخ الكلمة قبل الحفظ.
      </p>
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={saving} className={ghostBtn}>إلغاء</button>
        <button
          type="button"
          disabled={saving || password.length < 8}
          onClick={() => onSave(password)}
          className={primaryBtn}
        >
          {saving ? "جارٍ الحفظ…" : "تعيين الكلمة"}
        </button>
      </div>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null); // {type, user}
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, centersData] = await Promise.all([getUsers(), getRoles(), getCenters()]);
      setUsers(usersData);
      setRoles(rolesData);
      setCenters(centersData);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "تعذّر تحميل المستخدمين."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.roleName !== roleFilter) return false;
      if (centerFilter === "none" ? u.centerId : centerFilter && String(u.centerId) !== centerFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "disabled" && u.isActive) return false;
      if (!q) return true;
      return [`${u.firstName} ${u.lastName}`, u.email, u.phoneNumber, u.centerName]
        .some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [users, query, roleFilter, centerFilter, statusFilter]);

  const closeModal = () => {
    if (busy) return;
    setModal(null);
    setModalError("");
  };

  async function run(action, successMessage) {
    setBusy(true);
    setModalError("");
    try {
      await action();
      setModal(null);
      setNotice(successMessage);
      await load();
    } catch (err) {
      setModalError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const toggleActive = async (target) => {
    setError("");
    setNotice("");
    try {
      await setUserActive(target.userId, !target.isActive);
      setUsers((list) => list.map((u) => (u.userId === target.userId ? { ...u, isActive: !u.isActive } : u)));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const exportExcel = () => {
    const rows = [
      [{ v: "الاسم", b: true }, { v: "البريد", b: true }, { v: "الجوال", b: true }, { v: "الدور", b: true },
        { v: "المركز", b: true }, { v: "الحالة", b: true }, { v: "تاريخ الإنشاء", b: true }],
      ...visible.map((u) => [
        `${u.firstName} ${u.lastName}`.trim(),
        u.email,
        u.phoneNumber || "",
        ROLE_LABELS[u.roleName] ?? u.roleName ?? "",
        u.centerName || "",
        u.isActive ? "نشط" : "معطّل",
        u.createdAt ? u.createdAt.slice(0, 10) : "",
      ]),
    ];
    downloadBlob(
      buildXlsxBlob({ sheetName: "المستخدمون", rows, colWidths: [24, 30, 16, 14, 24, 10, 14] }),
      `المستخدمون ${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const selectClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700";
  const canTouch = (u) => u.roleName !== "PlatformAdmin" || me?.role === "PlatformAdmin";
  const isMe = (u) => String(u.userId) === String(me?.id);

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">المستخدمون</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة حسابات المنصة: مديرو المراكز والمشرفون والمعلمون والطلاب.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportExcel} disabled={!visible.length} className={`${ghostBtn} flex items-center gap-2 border border-slate-200`}>
            <FileSpreadsheet size={16} /> تصدير Excel
          </button>
          <button type="button" onClick={() => { setModalError(""); setModal({ type: "form", user: null }); }} className={`${primaryBtn} flex items-center gap-2`}>
            <Plus size={16} /> إضافة مستخدم
          </button>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالاسم أو البريد أو الجوال"
          className={`${selectClass} w-full sm:w-72`}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
          <option value="">كل الأدوار</option>
          {roles.map((role) => (
            <option key={role.roleId} value={role.roleName}>{ROLE_LABELS[role.roleName] ?? role.roleName}</option>
          ))}
        </select>
        <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)} className={selectClass}>
          <option value="">كل المراكز</option>
          <option value="none">بدون مركز</option>
          {centers.map((center) => (
            <option key={center.centerId} value={center.centerId}>{center.centerName}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="disabled">معطّل</option>
        </select>
        <span className="text-xs text-slate-500">{visible.length} من {users.length}</span>
      </section>

      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">جارٍ التحميل…</p>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">لا يوجد مستخدمون مطابقون.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">المستخدم</th>
                  <th className="px-4 py-3 font-semibold">الدور</th>
                  <th className="px-4 py-3 font-semibold">المركز</th>
                  <th className="px-4 py-3 font-semibold">الإنشاء</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{u.firstName} {u.lastName} {isMe(u) && <span className="text-xs font-normal text-emerald-700">(أنت)</span>}</p>
                      <p dir="ltr" className="text-right text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[u.roleName] ?? u.roleName}</td>
                    <td className="px-4 py-3 text-slate-600">{u.centerName || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge active={u.isActive} on="نشط" off="معطّل" /></td>
                    <td className="px-4 py-3">
                      {canTouch(u) ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <button type="button" title="تعديل" onClick={() => { setModalError(""); setModal({ type: "form", user: u }); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button>
                          <button type="button" title="إعادة تعيين كلمة المرور" onClick={() => { setModalError(""); setModal({ type: "password", user: u }); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><KeyRound size={15} /></button>
                          {!isMe(u) && (
                            <>
                              <button type="button" onClick={() => toggleActive(u)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                                {u.isActive ? "تعطيل" : "تفعيل"}
                              </button>
                              <button type="button" title="حذف" onClick={() => { setModalError(""); setModal({ type: "delete", user: u }); }} className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">محمي</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal?.type === "form" && (
        <UserFormModal
          editing={modal.user}
          roles={roles}
          centers={centers}
          currentRole={me?.role}
          onClose={closeModal}
          saving={busy}
          error={modalError}
          onSave={(payload) =>
            run(
              () => (modal.user ? updateUser(modal.user.userId, payload) : createUser(payload)),
              modal.user ? "تم حفظ التعديلات." : "تم إنشاء الحساب. سلّم كلمة المرور المؤقتة للمستخدم.",
            )
          }
        />
      )}

      {modal?.type === "password" && (
        <PasswordModal
          target={modal.user}
          onClose={closeModal}
          saving={busy}
          error={modalError}
          onSave={(password) => run(() => resetUserPassword(modal.user.userId, password), "تمت إعادة تعيين كلمة المرور.")}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmModal
          title="حذف المستخدم"
          danger
          confirmLabel="حذف نهائي"
          busy={busy}
          error={modalError}
          onClose={closeModal}
          onConfirm={() => run(() => deleteUser(modal.user.userId), "تم حذف المستخدم.")}
        >
          <p>
            سيُحذف حساب <strong>{modal.user.firstName} {modal.user.lastName}</strong> نهائياً.
            إن كان مرتبطاً بسجلات فسيرفض النظام الحذف، وفي الغالب الأفضل <strong>تعطيل الحساب</strong> بدلاً من حذفه.
          </p>
        </ConfirmModal>
      )}
    </main>
  );
}
