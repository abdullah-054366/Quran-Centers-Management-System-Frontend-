/**
 * منطق صفحة "سجل طالب" (نقي وقابل للاختبار، بلا React).
 * يدمج الحضور وسجلات الحفظ/المراجعة في صفوف أيام لشهر واحد.
 */
export const WEEKDAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const pad = (n) => String(n).padStart(2, "0");
export const toDateKey = (value) => String(value ?? "").slice(0, 10);

export function getMonthDays(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    return {
      date: `${monthKey}-${pad(day)}`,
      day,
      weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(), // 0 = الأحد
    };
  });
}

/**
 * نوع السجل كما في قاعدة البيانات: 1 = حفظ، 2 = مراجعة (يقبل أيضًا النصوص).
 * يرجع "memorization" أو "review" أو null.
 */
export function normalizeType(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (["1", "memorization", "hifz", "حفظ"].includes(v)) return "memorization";
  if (["2", "review", "muraja", "murajaa", "مراجعة"].includes(v)) return "review";
  return null;
}

/**
 * يحوّل سجل الحفظ القادم من GET /Memorization/All إلى الشكل الذي يفهمه الحساب.
 * سجل نظامك سورة واحدة لكل سجل (surahNumber)، فالبداية والنهاية في السورة نفسها.
 * إن كانت أسماء الحقول في الـ GET مختلفة فعدّلها هنا فقط.
 */
export function normalizeRecord(raw) {
  const surah = Number(raw.surahNumber ?? raw.fromSurah ?? raw.surahId);
  return {
    id: raw.memorizationRecordId ?? raw.memorizationId ?? raw.recordId ?? raw.id,
    notes: raw.notes ?? "",
    teacherName: raw.teacherName ?? "",
    sessionId: raw.sessionId ?? null,
    studentId: raw.studentId,
    studentName: raw.studentName,
    type: normalizeType(raw.type ?? raw.recordType),
    date: toDateKey(raw.recordDate ?? raw.date),
    fromSurah: surah,
    fromAyah: Number(raw.fromAyah),
    toSurah: Number(raw.toSurah ?? surah),
    toAyah: Number(raw.toAyah),
  };
}

/**
 * يدمج سجلات السور المتتالية في الجلسة الواحدة في سجل واحد:
 * من (أول سورة وآية بدأ بها) إلى (آخر سورة وآية توقف عندها).
 * تُجمَّع السجلات بمعرّف الجلسة، وللسجلات القديمة بلا معرّف تُجمَّع بالطالب والتاريخ والنوع.
 * لا يُدمج إلا ما كان متصلاً فعلاً: سورة تبدأ من الآية 1 بعد سورة اكتملت حتى آخر آية.
 */
export function mergeSessionRecords(records, getAyahCount) {
  const groups = new Map();
  for (const r of records) {
    const key = r.sessionId ? `s:${r.sessionId}` : `d:${r.studentId}|${r.date}|${r.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const merged = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.fromSurah - b.fromSurah || a.fromAyah - b.fromAyah);
    let current = null;
    for (const r of list) {
      const continues =
        current &&
        r.fromSurah === current.toSurah + 1 &&
        r.fromAyah === 1 &&
        current.toAyah === getAyahCount(current.toSurah);
      if (continues) {
        current = { ...current, toSurah: r.toSurah, toAyah: r.toAyah };
      } else {
        if (current) merged.push(current);
        current = { ...r };
      }
    }
    if (current) merged.push(current);
  }
  return merged;
}

// المقدار بالصفحات وكسورها: "ربع صفحة"، "صفحتان ونصف"، "5 صفحات" (تقريب لأقرب ربع/ثلث).
const FRACTIONS = [
  { value: 0, word: "" },
  { value: 1 / 4, word: "ربع", alone: "ربع صفحة" },
  { value: 1 / 3, word: "ثلث", alone: "ثلث صفحة" },
  { value: 1 / 2, word: "نصف", alone: "نصف صفحة" },
  { value: 2 / 3, word: "ثلثان", alone: "ثلثا صفحة" },
  { value: 3 / 4, word: "ثلاثة أرباع", alone: "ثلاثة أرباع الصفحة" },
  { value: 1, word: "" },
];

function pagesWord(n) {
  if (n === 1) return "صفحة";
  if (n === 2) return "صفحتان";
  return n <= 10 ? `${n} صفحات` : `${n} صفحة`;
}

export function formatAmount(totalLines) {
  const pages = totalLines / 15;
  let whole = Math.floor(pages);
  const rest = pages - whole;
  const nearest = FRACTIONS.reduce((best, f) => (Math.abs(f.value - rest) < Math.abs(best.value - rest) ? f : best));

  if (nearest.value === 1) whole += 1;
  const fraction = nearest.value > 0 && nearest.value < 1 ? nearest : null;

  if (whole === 0) return fraction ? fraction.alone : "أقل من ربع صفحة";
  // الصفحات الكاملة تظهر رقماً فقط (1، 2، 3...)
  return fraction ? `${pagesWord(whole)} و${fraction.word}` : String(whole);
}

export function isAttended(status) {
  return status === 1 || status === 3; // حاضر أو متأخر
}

/**
 * @param studyDays أرقام أيام الأسبوع الدراسية (0 = الأحد ... 6 = السبت) من إعدادات النظام
 * تظهر كل أيام الشهر؛ واليوم غير الدراسي بلا تسجيل يُعلَّم isStudyDay = false ويُعرض إجازة.
 */
export function buildMonthRows({ monthKey, studyDays, attendance, records, calculator }) {
  const attendanceByDate = new Map(attendance.map((a) => [toDateKey(a.attendanceDate), a]));
  const recordsByDate = new Map();
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, []);
    recordsByDate.get(r.date).push(r);
  }

  const rows = [];
  for (const { date, weekday } of getMonthDays(monthKey)) {
    const att = attendanceByDate.get(date);
    const dayRecords = recordsByDate.get(date) ?? [];
    const isStudyDay = studyDays.includes(weekday);

    const entries = dayRecords.map((r) => {
      try {
        const lines = calculator.linesBetween(r.fromSurah, r.fromAyah, r.toSurah, r.toAyah);
        return {
          ...r,
          lines,
          pages: Math.round((lines / 15) * 100) / 100,
          ayahCount: calculator.countAyahsBetween(r.fromSurah, r.fromAyah, r.toSurah, r.toAyah),
        };
      } catch (error) {
        return { ...r, error: error.message };
      }
    });

    rows.push({ date, weekday, isStudyDay, status: att?.status ?? null, entries });
  }
  return rows;
}

export const countAttendedDays = (rows) => rows.filter((row) => isAttended(row.status)).length;