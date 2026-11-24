import { findAyahIdBySurah, findSurahAyahByAyahId, getSurahMeta } from "quran-meta/hafs";
import { LINES_PER_PAGE } from "./quranLines";
import { formatAmount, mergeSessionRecords, normalizeRecord } from "./studentRecord";

export const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const EPS = 1e-6;
const MAX_DAYS = 1500; // سقف أمان لحلقات الأيام

const dateKey = (date) => date.toISOString().slice(0, 10);
const addDays = (key, days) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKey(d);
};

/** آخر يوم في شهر "YYYY-MM". */
export function monthEndKey(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  return dateKey(new Date(Date.UTC(year, month, 0)));
}

/** آخر يوم في المدّة التي تبدأ بشهر monthKey وتستمر months شهراً. */
export function spanEndKey(monthKey, months = 1) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const span = Math.max(1, Number(months) || 1);
  return dateKey(new Date(Date.UTC(year, month - 1 + span, 0)));
}

/** عدد أيام الخطة (أيام الأسبوع المختارة) بين تاريخين بالضمّ. */
export function planDayCount(fromKey, toKey, daysOfWeek) {
  const planDays = daysOfWeek instanceof Set ? daysOfWeek : new Set((daysOfWeek ?? []).map(Number));
  if (!planDays.size || !fromKey || !toKey || fromKey > toKey) return 0;
  let count = 0;
  for (let i = 0, day = fromKey; i < MAX_DAYS && day <= toKey; i += 1, day = addDays(day, 1)) {
    if (planDays.has(new Date(`${day}T00:00:00Z`).getUTCDay())) count += 1;
  }
  return count;
}

/** "صفحة"/"صفحتان"/"5 صفحات"/"ثلث صفحة" ... لمقدار بالأسطر. */
export function amountLabel(lines) {
  if (!(lines > 0)) return "0";
  const text = formatAmount(lines);
  return /^\d+$/.test(text) ? (text === "1" ? "صفحة" : text === "2" ? "صفحتان" : `${text} صفحة`) : text;
}

export function pagesInRange(plan) {
  const first = findAyahIdBySurah(plan.fromSurah, 1);
  const last = findAyahIdBySurah(plan.toSurah, getSurahMeta(plan.toSurah).ayahCount);
  return { first, last };
}

// موضع الآية (بداية/نهاية) على محور الأسطر المتصل.
function spanOfId(calculator, id) {
  const [surah, ayah] = findSurahAyahByAyahId(id);
  return calculator.getAyahSpan(surah, ayah);
}

// أول آية في [lo, hi] تنتهي بعد الموضع pos.
function ayahContaining(calculator, pos, lo, hi) {
  let a = lo;
  let b = hi;
  while (a < b) {
    const mid = (a + b) >> 1;
    if (spanOfId(calculator, mid).end > pos + EPS) b = mid;
    else a = mid + 1;
  }
  return a;
}

// آخر آية في [lo, hi] تبدأ قبل الموضع pos.
function ayahEndingAt(calculator, pos, lo, hi) {
  let a = lo;
  let b = hi;
  while (a < b) {
    const mid = (a + b + 1) >> 1;
    if (spanOfId(calculator, mid).start < pos - EPS) a = mid;
    else b = mid - 1;
  }
  return a;
}

function refOf(id) {
  const [surah, ayah] = findSurahAyahByAyahId(id);
  return { surah, ayah };
}

/**
 * يبني عرض الخطة لشهر معيّن.
 * - الأيام الماضية: ما سُمِّع فعلاً (تم) أو فائتة.
 * - اليوم والقادم: المطلوب من آخر موضع وصل إليه الطالب فعلاً؛ فإن تأخر انتقل المتأخر إلى أول جلسة قادمة.
 * الوحدة الداخلية: أسطر على محور المصحف المتصل (15 سطراً = صفحة).
 */
export function buildPlanView({ plan, rawRecords, calculator, today, monthKey }) {
  const wantedType = plan.type === 1 || plan.type === "review" ? "review" : "memorization";
  const startDate = String(plan.startDate).slice(0, 10);
  const endDate = plan.endDate ? String(plan.endDate).slice(0, 10) : null;
  const planDays = new Set((plan.daysOfWeek ?? []).map(Number));
  const rounds = wantedType === "review" ? Math.max(1, plan.targetRounds) : 1;

  const { first: firstId, last: lastId } = pagesInRange(plan);
  const rangeStart = spanOfId(calculator, firstId).start;
  const rangeLines = spanOfId(calculator, lastId).end - rangeStart;
  const totalLines = rangeLines * rounds;

  // خطة محدّدة المدّة (شهريّة): المقدار مخرَج لا مدخل — النطاق موزّعاً على جلسات
  // المدّة، ولو جاء كسراً من صفحة. وبلا endDate تبقى الخطة مفتوحة النهاية
  // ويحكمها pagesPerSession كما كانت.
  const boundedSessions = endDate ? planDayCount(startDate, endDate, planDays) : 0;
  // deriveAmount يأتي من الخطة صريحاً: المعلّم إمّا يثبّت المدّة فيُشتقّ المقدار،
  // أو يثبّت المقدار فتكون المدّة نافذة تُقفل الخطة بانتهائها على ما أُنجز.
  const derived = plan.deriveAmount === true && boundedSessions > 0;
  const perSessionLines = derived ? totalLines / boundedSessions : Math.max(1, plan.pagesPerSession) * LINES_PER_PAGE;

  // جلسات الطالب الفعلية ضمن الخطة
  const normalized = rawRecords
    .map(normalizeRecord)
    .filter(
      (r) => r.type === wantedType && r.date >= startDate && r.fromSurah >= plan.fromSurah && r.fromSurah <= plan.toSurah,
    );
  const sessions = mergeSessionRecords(normalized, (surah) => getSurahMeta(surah).ayahCount)
    .map((record) => {
      try {
        const lines = calculator.linesBetween(record.fromSurah, record.fromAyah, record.toSurah, record.toAyah);
        const endPos = calculator.getAyahSpan(record.toSurah, record.toAyah).end;
        return { ...record, lines, endPos };
      } catch {
        return null; // سجل غير صالح لا يوقف الجدول
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  const doneLines = sessions.reduce((sum, s) => sum + s.lines, 0);
  // الحفظ: الموضع = آخر آية سمّعها؛ المراجعة: مجموع ما راجعه (دورات متتابعة).
  const position = wantedType === "memorization"
    ? Math.max(0, ...sessions.map((s) => s.endPos - rangeStart))
    : doneLines;
  const completed = position >= totalLines - EPS;

  const sessionsByDate = new Map();
  for (const s of sessions) {
    if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
    sessionsByDate.get(s.date).push(s);
  }

  // عدّاد أيام الخطة من تاريخ البداية: n(d) = ترتيب اليوم بين أيام الخطة.
  const monthStart = `${monthKey}-01`;
  const monthEnd = monthEndKey(monthKey);
  const chainEnd = monthEnd > today ? monthEnd : today;

  const rows = [];
  let plannedLines = 0;
  let missedLines = 0;
  let cursor = position; // موضع بداية المطلوب التالي (افتراضياً الموضع الحالي)
  let ordinal = 0;

  const toRow = (date, kind, extra) => ({ date, weekday: new Date(`${date}T00:00:00Z`).getUTCDay(), kind, ...extra });

  for (let i = 0, day = startDate; i < MAX_DAYS && day <= chainEnd; i += 1, day = addDays(day, 1)) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    // بعد تاريخ النهاية لا جلسات مطلوبة: لا فائتة ولا قادمة. وما سُمِّع بعدها
    // يظهر «خارج أيام الخطة» لأنّ isPlanDay صار false.
    const isPlanDay = planDays.has(weekday) && !(endDate && day > endDate);
    if (isPlanDay) ordinal += 1;
    const inMonth = day >= monthStart && day <= monthEnd;
    const daySessions = sessionsByDate.get(day) ?? [];
    const quota = isPlanDay ? Math.min(perSessionLines, Math.max(0, totalLines - perSessionLines * (ordinal - 1))) : 0;

    if (inMonth && isPlanDay) plannedLines += quota;

    // أيام ماضية، أو اليوم إن سُمِّع فيه
    if (day < today || (day === today && daySessions.length)) {
      if (!inMonth) continue;
      if (daySessions.length) {
        for (const s of daySessions) {
          rows.push(toRow(day, "done", {
            from: refOf(findAyahIdBySurah(s.fromSurah, s.fromAyah)),
            to: refOf(findAyahIdBySurah(s.toSurah, s.toAyah)),
            lines: s.lines,
            notes: s.notes,
            extra: !isPlanDay,
          }));
        }
      } else if (isPlanDay && quota > 0) {
        missedLines += quota;
        rows.push(toRow(day, "missed", { lines: quota }));
      }
      continue;
    }

    // اليوم (لم يُسمَّع بعد) والأيام القادمة: المطلوب
    if (!isPlanDay || completed || cursor >= totalLines - EPS) continue;
    const target = Math.min(totalLines, perSessionLines * ordinal);
    let end = Math.min(totalLines, Math.max(target, cursor + perSessionLines));
    const roundBase = Math.floor(cursor / rangeLines + EPS) * rangeLines;
    end = Math.min(end, roundBase + rangeLines); // لا تعبر الجلسة حدود دورة المراجعة

    const startId = ayahContaining(calculator, rangeStart + (cursor - roundBase), firstId, lastId);
    const endId = ayahEndingAt(calculator, rangeStart + (end - roundBase), startId, lastId);
    const snappedEnd = spanOfId(calculator, endId).end - rangeStart + roundBase;
    const [fs, fa] = findSurahAyahByAyahId(startId);
    const [ts, ta] = findSurahAyahByAyahId(endId);
    const lines = calculator.linesBetween(fs, fa, ts, ta);

    if (inMonth) {
      rows.push(toRow(day, day === today ? "today" : "upcoming", {
        from: { surah: fs, ayah: fa },
        to: { surah: ts, ayah: ta },
        lines,
        catchUp: lines > perSessionLines * 1.15,
        round: rounds > 1 ? Math.floor(cursor / rangeLines + EPS) + 1 : 0,
      }));
    }
    cursor = Math.max(snappedEnd, cursor + EPS);
  }

  const doneInMonthLines = sessions.filter((s) => s.date >= monthStart && s.date <= monthEnd).reduce((sum, s) => sum + s.lines, 0);
  rows.sort((a, b) => a.date.localeCompare(b.date));

  return {
    rows,
    totals: {
      planPages: Math.round((totalLines / LINES_PER_PAGE) * 10) / 10,
      doneLines,
      progress: totalLines ? Math.min(100, Math.round((doneLines / totalLines) * 100)) : 0,
      completed,
      endDate,
      sessionCount: boundedSessions || 0,
      derived,
      perSessionLines,
      remainingLines: Math.max(0, totalLines - position),
      // أُقفلت ناقصة: مضى تاريخ النهاية ولم يكتمل النطاق.
      closedIncomplete: Boolean(endDate) && endDate < today && !completed,
      monthPlannedLines: plannedLines,
      monthDoneLines: doneInMonthLines,
      monthMissedLines: missedLines,
      monthRemainingLines: Math.max(0, plannedLines - doneInMonthLines),
    },
  };
}

/**
 * تقدير خطة محدّدة المدّة قبل حفظها: عدد الجلسات ومقدار كلّ جلسة.
 * يُعيد null إن كان النطاق أو الأيام غير صالحة.
 * pagesPerSession المُعاد تقريبٌ للتخزين فقط؛ المصدر الحقيقي هو endDate.
 */
export function estimateBoundedPlan({ plan, calculator }) {
  const startDate = String(plan.startDate ?? "").slice(0, 10);
  const endDate = String(plan.endDate ?? "").slice(0, 10);
  const sessions = planDayCount(startDate, endDate, plan.daysOfWeek);
  if (!sessions) return null;
  try {
    const { first, last } = pagesInRange(plan);
    const rangeLines = spanOfId(calculator, last).end - spanOfId(calculator, first).start;
    const rounds = plan.type === 1 || plan.type === "review" ? Math.max(1, Number(plan.targetRounds) || 1) : 1;
    const totalLines = rangeLines * rounds;
    if (!(totalLines > 0)) return null; // نطاق مقلوب أو فارغ
    const linesPerSession = totalLines / sessions;
    return {
      sessions,
      totalLines,
      linesPerSession,
      totalPages: Math.round((totalLines / LINES_PER_PAGE) * 10) / 10,
      pagesPerSession: Math.min(604, Math.max(1, Math.round(linesPerSession / LINES_PER_PAGE))),
    };
  } catch {
    return null;
  }
}

/** عدد الجلسات المطلوبة لإنهاء خطة مفتوحة: ⌈أسطر النطاق ÷ أسطر الجلسة⌉ × الدورات. */
export function targetSessionCount(plan, calculator) {
  const { first, last } = pagesInRange(plan);
  const lines = spanOfId(calculator, last).end - spanOfId(calculator, first).start;
  const rounds = plan.type === 1 || plan.type === "review" ? Math.max(1, plan.targetRounds) : 1;
  return Math.max(1, Math.ceil(lines / (Math.max(1, plan.pagesPerSession) * LINES_PER_PAGE)) * rounds);
}
