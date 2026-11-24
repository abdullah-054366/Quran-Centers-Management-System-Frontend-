import { getSurahMeta } from "quran-meta/hafs";
import ayahLines from "../../data/ayahLines.json";
import { createLineCalculator } from "../../lib/quranLines";

// أدوات مشتركة بين صفحة الخطط وجدول الخطة ونموذجها (مطابقة لتطبيق الجوال).
export const calculator = createLineCalculator(ayahLines);

const stripTashkeel = (text) => text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
export const surahName = (n) => stripTashkeel(getSurahMeta(Number(n)).name);

export const SURAHS = Array.from({ length: 114 }, (_, index) => {
  const id = index + 1;
  return { id, name: surahName(id), ayahs: getSurahMeta(id).ayahCount };
});

export function riyadhToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}

export const formatDay = (date) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${String(date).slice(0, 10)}T00:00:00Z`));

export const formatDate = (date) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${String(date).slice(0, 10)}T00:00:00Z`));

export function rangeText(from, to) {
  if (!from || !to) return "—";
  return from.surah === to.surah
    ? `${surahName(from.surah)} ${from.ayah}–${to.ayah}`
    : `${surahName(from.surah)} ${from.ayah} ← ${surahName(to.surah)} ${to.ayah}`;
}

export const asList = (value) => (Array.isArray(value) ? value : value?.data ?? []);
