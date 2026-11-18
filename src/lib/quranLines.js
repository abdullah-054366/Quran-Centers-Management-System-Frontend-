/**
 * حساب مقدار القراءة بالأسطر والصفحات (مصحف المدينة، 15 سطرًا).
 *
 * البيانات (ayahLines.json) تُولَّد مرة واحدة بالسكربت scripts/build-quran-lines.mjs.
 * كل آية لها موضع بداية ونهاية على "محور أسطر" متصل عبر المصحف كله،
 * وأسطر اسم السورة والبسملة غير محسوبة على هذا المحور.
 * لذلك: مقدار القراءة = نهاية آخر آية - بداية أول آية (يشمل الكسور داخل السطر).
 */

export const LINES_PER_PAGE = 15;
const SCALE = 1000; // نعمل بأعداد صحيحة (ألف جزء من السطر) لتجنب أخطاء الفاصلة العائمة

export function createLineCalculator(data) {
  const { surahOffset, pos } = data;

  function ayahIndex(surah, ayah) {
    const first = surahOffset[surah - 1];
    const next = surahOffset[surah];
    if (first === undefined || next === undefined) {
      throw new RangeError(`سورة غير صحيحة: ${surah}`);
    }
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > next - first) {
      throw new RangeError(`آية غير صحيحة: ${surah}:${ayah}`);
    }
    return first + ayah - 1;
  }

  /** موضع بداية الآية ونهايتها على محور الأسطر. */
  function getAyahSpan(surah, ayah) {
    const i = ayahIndex(surah, ayah) * 2;
    return { start: pos[i], end: pos[i + 1] };
  }

  /** عدد الأسطر بين آية بداية وآية نهاية (شاملتين)، ويقبل سورتين مختلفتين. */
  function linesBetween(fromSurah, fromAyah, toSurah, toAyah) {
    const a = getAyahSpan(fromSurah, fromAyah);
    const b = getAyahSpan(toSurah, toAyah);
    const lines = b.end - a.start;
    if (lines <= 0) {
      throw new RangeError("نهاية القراءة قبل بدايتها");
    }
    return Math.round(lines * SCALE) / SCALE;
  }

  /** عدد الآيات بين بداية ونهاية (شاملتين)، ويعمل عبر السور. */
  function countAyahsBetween(fromSurah, fromAyah, toSurah, toAyah) {
    const count = ayahIndex(toSurah, toAyah) - ayahIndex(fromSurah, fromAyah) + 1;
    if (count <= 0) throw new RangeError("نهاية القراءة قبل بدايتها");
    return count;
  }

  return { getAyahSpan, linesBetween, countAyahsBetween };
}

/** يحوّل مجموع الأسطر إلى صفحات كاملة + باقي + عشري. */
export function linesToPages(totalLines, linesPerPage = LINES_PER_PAGE) {
  const milli = Math.round(totalLines * SCALE);
  const pageMilli = linesPerPage * SCALE;
  const fullPages = Math.floor(milli / pageMilli);
  const remainderMilli = milli - fullPages * pageMilli;
  const remainderLines = remainderMilli / SCALE;
  return {
    totalLines: milli / SCALE,
    fullPages,
    remainderLines,
    remainderPage: remainderMilli / pageMilli, // كسر من الصفحة (0 ≤ x < 1)
    decimalPages: Math.round((milli / pageMilli) * 100) / 100,
  };
}

/**
 * تجميع سجلات الحفظ والمراجعة.
 * كل سجل: { type: "memorization" | "review", date: "YYYY-MM-DD",
 *           fromSurah, fromAyah, toSurah, toAyah }
 * السجل غير الصالح لا يوقف التجميع، بل يُرجَع في invalid.
 */
export function aggregateRecords(records, calculator, { from, to } = {}) {
  const totals = { memorization: 0, review: 0 };
  const counts = { memorization: 0, review: 0 };
  const invalid = [];

  for (const record of records) {
    if (from && record.date < from) continue;
    if (to && record.date > to) continue;
    if (!(record.type in totals)) continue;
    try {
      const lines = calculator.linesBetween(
        record.fromSurah, record.fromAyah, record.toSurah, record.toAyah,
      );
      totals[record.type] += lines;
      counts[record.type] += 1;
    } catch (error) {
      invalid.push({ record, reason: error.message });
    }
  }

  return {
    memorization: { ...linesToPages(totals.memorization), records: counts.memorization },
    review: { ...linesToPages(totals.review), records: counts.review },
    combined: linesToPages(totals.memorization + totals.review),
    invalid,
  };
}

/** مفاتيح التجميع: يومي / أسبوعي (حسب أسابيع الشهر كما في الواجهة) / شهري. */
export const groupKeys = {
  day: (date) => date,
  month: (date) => date.slice(0, 7),
  week: (date) => `${date.slice(0, 7)}-W${Math.ceil(Number(date.slice(8, 10)) / 7)}`,
};

export function aggregateBy(records, calculator, keyFn) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFn(record.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return new Map(
    [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => [key, aggregateRecords(list, calculator)]),
  );
}