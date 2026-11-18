import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FileSpreadsheet } from 'lucide-react'
import {
  addCenter as addCenterApi,
  deleteCenter,
  getCenterDeletionSummary,
  getCenters,
  regenerateCenterCode,
  renameCenter,
  updateCenter,
} from '../api/centers'
import { apiErrorMessage } from '../lib/apiError'
import { buildXlsxBlob, downloadBlob } from '../lib/xlsx'
import { ConfirmModal, ErrorNote, Modal, fieldClass, ghostBtn, primaryBtn } from '../components/AdminUi'



const makeCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
        checked ? 'bg-emerald-600' : 'bg-[#B9C2BF]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'right-0.5' : 'right-[22px]'
        }`}
      />
    </button>
  )
}

function CodeChip({ code, enabled }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      onClick={copy}
      title="انسخ كود الانضمام"
      dir="ltr"
      className={`rounded-md border border-dashed px-2.5 py-1 text-sm tracking-widest hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${
        enabled
          ? 'border-emerald-800/30 text-emerald-800'
          : 'border-slate-200 text-emerald-800/40 line-through'
      }`}
    >
      {copied ? 'تم النسخ' : code}
    </button>
  )
}

function AddCenterModal({ onClose, onSave, saving }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ centerName: name.trim(), centerCode: (code.trim() || makeCode()).toUpperCase() })
  }

  const field =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-emerald-800 placeholder:text-emerald-800/40 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-emerald-800/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="mk-head mb-5 text-lg font-bold text-emerald-800">إضافة مركز جديد</h2>

        <label className="mb-4 block text-sm font-medium text-emerald-800">
          اسم المركز
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1.5`} placeholder="مثال: مركز النور لتحفيظ القرآن" />
        </label>

        <label className="mb-6 block text-sm font-medium text-emerald-800">
          كود الانضمام
          <input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" className={`${field} mt-1.5 text-left uppercase tracking-widest`} placeholder="يُولَّد تلقائياً إن تركته فارغاً" />
          <span className="mt-1.5 block text-xs font-normal text-emerald-800/60">يدخله الطالب عند التسجيل للانضمام إلى هذا المركز.</span>
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 rounded-lg bg-emerald-800 py-2.5 text-sm font-semibold text-white hover:bg-[#0f766e] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {saving ? 'جارٍ الحفظ…' : 'إضافة المركز'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-800/10">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}

function RenameModal({ center, onClose, onSave, saving, error }) {
  const [name, setName] = useState(center.centerName)
  const submit = (e) => {
    e.preventDefault()
    if (name.trim()) onSave(name.trim())
  }
  return (
    <Modal title="تعديل اسم المركز" onClose={onClose} busy={saving}>
      <form onSubmit={submit}>
        <label className="text-sm font-medium text-slate-700">
          اسم المركز
          <input autoFocus value={name} maxLength={150} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={ghostBtn}>إلغاء</button>
          <button type="submit" disabled={saving || !name.trim() || name.trim() === center.centerName} className={primaryBtn}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteCenterModal({ center, onClose, onDeleted, onSuspend }) {
  const [summary, setSummary] = useState(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getCenterDeletionSummary(center.centerId)
      .then((data) => alive && setSummary(data))
      .catch((err) => alive && setError(apiErrorMessage(err, 'تعذّر جلب بيانات المركز.')))
    return () => {
      alive = false
    }
  }, [center.centerId])

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await deleteCenter(center.centerId)
      onDeleted(center)
    } catch (err) {
      setError(apiErrorMessage(err))
      setBusy(false)
    }
  }

  const rows = summary
    ? [
        ['الطلاب', summary.students],
        ['المعلمون', summary.teachers],
        ['الحلقات', summary.halaqat],
        ['الحسابات', summary.users],
        ['سجلات الحضور', summary.attendanceRecords],
        ['سجلات الحفظ', summary.memorizationRecords],
        ['الخطط', summary.plans],
      ]
    : []

  return (
    <ConfirmModal
      title={`حذف ${center.centerName}`}
      danger
      confirmLabel="حذف نهائي"
      busy={busy}
      error={error}
      disabled={!summary || !summary.canDelete || typed.trim() !== center.centerName}
      onClose={() => !busy && onClose()}
      onConfirm={confirm}
    >
      {!summary ? (
        <p>جارٍ فحص بيانات المركز…</p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2">
            {rows.map(([label, value]) => (
              <li key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{label}</span>
                <strong className={value ? 'text-rose-700' : 'text-slate-400'}>{value}</strong>
              </li>
            ))}
          </ul>
          {summary.canDelete ? (
            <label className="block text-sm font-medium text-slate-700">
              اكتب اسم المركز للتأكيد
              <input value={typed} onChange={(e) => setTyped(e.target.value)} className={fieldClass} placeholder={center.centerName} />
            </label>
          ) : (
            <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-amber-800">
              <p>لا يمكن حذف مركز يحتوي بيانات. الحل الآمن هو <strong>إيقاف المركز</strong>: يبقى كل شيء محفوظاً ولا يستطيع أحد استخدامه.</p>
              {center.isActive && (
                <button type="button" onClick={() => onSuspend(center)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                  إيقاف المركز الآن
                </button>
              )}
            </div>
          )}
        </>
      )}
    </ConfirmModal>
  )
}

function Centers() {
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // all | active | suspended
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rename, setRename] = useState(null)
  const [renameError, setRenameError] = useState('')
  const [codeTarget, setCodeTarget] = useState(null)
  const [codeError, setCodeError] = useState('')
  const [deleting, setDeleting] = useState(null)


  async function fetchCenters() {
    try {
   
     const data = await getCenters()
     setCenters(data)
     setError('')

    }catch (error) {
      console.error("Error fetching centers:", error)
      setCenters([])
      setError('تعذّر تحميل المراكز. تحقق من اتصال الخادم ثم أعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {

   fetchCenters();
  }, [])




  const counts = useMemo(
    () => ({
      all: centers.length,
      active: centers.filter((c) => c.isActive).length,
      suspended: centers.filter((c) => !c.isActive).length,
    }),
    [centers]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return centers.filter((c) => {
      if (filter === 'active' && !c.isActive) return false
      if (filter === 'suspended' && c.isActive) return false
      if (!q) return true
      return [c.centerName, c.centerCode].some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [centers, query, filter])

  // تغيير حقل منطقي (isActive / codeEnabled) مع تراجع تلقائي عند الفشل
  const toggle = async (center, field) => {
    const next = !center[field]
    setError('')
    const patch = (value) =>
      setCenters((list) => list.map((c) => (c.centerId === center.centerId ? { ...c, [field]: value } : c)))
    patch(next)
    try {
      await updateCenter(center.centerId, field, next)
    } catch {
      patch(!next)
      setError('تعذّر حفظ التغيير. حاول مرة أخرى.')
    }
  }

  const replaceCenter = (updated) =>
    setCenters((list) => list.map((c) => (c.centerId === updated.centerId ? { ...c, ...updated } : c)))

  const saveRename = async (name) => {
    setSaving(true)
    setRenameError('')
    try {
      replaceCenter(await renameCenter(rename.centerId, name))
      setRename(null)
      setNotice('تم تعديل اسم المركز.')
    } catch (err) {
      setRenameError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmRegenerate = async () => {
    setSaving(true)
    setCodeError('')
    try {
      replaceCenter(await regenerateCenterCode(codeTarget.centerId))
      setCodeTarget(null)
      setNotice('تم توليد كود انضمام جديد. الكود القديم لم يعد يعمل.')
    } catch (err) {
      setCodeError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const suspendFromDelete = async (center) => {
    setDeleting(null)
    await toggle(center, 'isActive')
  }

  const exportExcel = () => {
    const rows = [
      [{ v: 'المركز', b: true }, { v: 'الكود', b: true }, { v: 'الكود مفعّل', b: true }, { v: 'الحالة', b: true }, { v: 'تاريخ التسجيل', b: true }],
      ...visible.map((c) => [
        c.centerName,
        c.centerCode,
        c.codeEnabled ? 'نعم' : 'لا',
        c.isActive ? 'نشط' : 'موقوف',
        c.createdAt ? String(c.createdAt).slice(0, 10) : '',
      ]),
    ]
    downloadBlob(
      buildXlsxBlob({ sheetName: 'المراكز', rows, colWidths: [30, 12, 12, 10, 14] }),
      `المراكز ${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
  }

  const addCenter = async (payload) => {
    setSaving(true)
    setError('')
    try {
      const created = await addCenterApi(payload)
      setCenters((list) => [created, ...list])
      setShowAdd(false)
    } catch {
      setError('تعذّرت إضافة المركز. تأكد من أن الكود غير مستخدم.')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { key: 'all', label: 'كل المراكز' },
    { key: 'active', label: 'نشطة' },
    { key: 'suspended', label: 'موقوفة' },
  ]

  return (
    <div dir="rtl" className="mk-body min-h-screen bg-[#f6f8f6] text-emerald-800">
      

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-9">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h1 className="mk-head text-2xl font-bold sm:text-3xl">المراكز</h1>
            <p className="mt-2 text-sm text-emerald-800/70">
              تابع المراكز المسجّلة في مشكاة، وفعّل أو أوقف أي مركز يدوياً.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              disabled={!visible.length}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileSpreadsheet size={16} /> تصدير Excel
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f766e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              إضافة مركز
            </button>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex gap-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={filter === t.key}
                onClick={() => setFilter(t.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === t.key ? 'bg-emerald-800 text-white' : 'text-emerald-800/75 hover:bg-emerald-800/10'
                }`}
              >
                {t.label} <span className="opacity-70">{counts[t.key]}</span>
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الكود"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-emerald-800/40 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 sm:w-72"
          />
        </div>

        {notice && (
          <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-[#A4452C]/10 px-4 py-2.5 text-sm text-[#A4452C]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-emerald-800/60">جارٍ تحميل المراكز…</p>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mk-head text-base font-bold">
              {centers.length === 0 ? 'لا توجد مراكز بعد' : 'لا نتائج مطابقة'}
            </p>
            <p className="mt-2 text-sm text-emerald-800/65">
              {centers.length === 0 ? 'أضف أول مركز ليبدأ بتسجيل طلابه ومعلميه.' : 'جرّب كلمة بحث أخرى أو غيّر التصنيف.'}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {visible.map((c) => (
              <li key={c.centerId} className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
                <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${c.isActive ? 'bg-emerald-600' : 'bg-[#A4452C]'}`}
                  />
                  <div className="min-w-0">
                    <h3 className="mk-head truncate text-base font-bold">
                      <Link to={`/centers/${c.centerId}`} className="hover:text-emerald-600 hover:underline">{c.centerName}</Link>
                    </h3>
                    <p className="mt-1 text-sm text-emerald-800/65">سُجّل في {fmtDate(c.createdAt)}</p>
                  </div>
                </div>

                {/* كود الانضمام + تفعيله */}
                <div className="flex items-center gap-3">
                  <CodeChip code={c.centerCode} enabled={c.codeEnabled} />
                  <Switch
                    checked={c.codeEnabled}
                    onChange={() => toggle(c, 'codeEnabled')}
                    label={`${c.codeEnabled ? 'تعطيل' : 'تفعيل'} كود انضمام ${c.centerName}`}
                  />
                  <span className="w-14 text-xs text-emerald-800/65">
                    {c.codeEnabled ? 'الكود يعمل' : 'الكود معطّل'}
                  </span>
                </div>

                {/* حالة المركز */}
                <div className="flex items-center gap-2.5">
                  <Switch
                    checked={c.isActive}
                    onChange={() => toggle(c, 'isActive')}
                    label={`${c.isActive ? 'إيقاف' : 'تفعيل'} ${c.centerName}`}
                  />
                  <span className={`w-12 text-sm font-medium ${c.isActive ? 'text-emerald-700' : 'text-[#A4452C]'}`}>
                    {c.isActive ? 'نشط' : 'موقوف'}
                  </span>
                </div>

                {/* إجراءات */}
                <div className="flex flex-wrap items-center gap-1 text-xs font-semibold">
                  <Link to={`/centers/${c.centerId}`} className="rounded-lg px-2.5 py-1.5 text-emerald-800 hover:bg-emerald-50">التفاصيل</Link>
                  <button type="button" onClick={() => { setRenameError(''); setRename(c) }} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100">تعديل الاسم</button>
                  <button type="button" onClick={() => { setCodeError(''); setCodeTarget(c) }} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100">كود جديد</button>
                  <button type="button" onClick={() => setDeleting(c)} className="rounded-lg px-2.5 py-1.5 text-rose-600 hover:bg-rose-50">حذف</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rename && (
        <RenameModal center={rename} onClose={() => !saving && setRename(null)} onSave={saveRename} saving={saving} error={renameError} />
      )}

      {codeTarget && (
        <ConfirmModal
          title="توليد كود انضمام جديد"
          confirmLabel="توليد كود جديد"
          busy={saving}
          error={codeError}
          onClose={() => !saving && setCodeTarget(null)}
          onConfirm={confirmRegenerate}
        >
          <p>
            سيُستبدل كود <strong dir="ltr">{codeTarget.centerCode}</strong> الخاص بـ <strong>{codeTarget.centerName}</strong> بكود جديد عشوائي.
            الطلاب المسجّلون لا يتأثرون، لكن الكود القديم سيتوقف عن العمل فوراً.
          </p>
        </ConfirmModal>
      )}

      {deleting && (
        <DeleteCenterModal
          center={deleting}
          onClose={() => setDeleting(null)}
          onSuspend={suspendFromDelete}
          onDeleted={(center) => {
            setCenters((list) => list.filter((c) => c.centerId !== center.centerId))
            setDeleting(null)
            setNotice('تم حذف المركز.')
          }}
        />
      )}

      {showAdd && <AddCenterModal onClose={() => setShowAdd(false)} onSave={addCenter} saving={saving} />}
    </div>
  )
}

export default Centers







