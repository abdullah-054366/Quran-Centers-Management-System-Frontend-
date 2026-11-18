/**
 * يولّد src/data/ayahLines.json من بيانات QUL (تخطيط المصحف + الكلمات).
 *
 * الاستخدام:
 *   npm i -D better-sqlite3
 *   node scripts/build-quran-lines.mjs <layout.db> <words.db> [out.json]
 *
 * layout.db : تخطيط "مصحف المدينة 15 سطرًا" من https://qul.tarteel.ai/resources/mushaf-layout
 *             (جدول pages: page_number, line_number, line_type, first_word_id, last_word_id)
 * words.db  : حزمة النص (Quran script) المطابقة لنفس التخطيط (جدول words)
 *
 * ملاحظة: لم أستطع اختبار السكربت على ملفات QUL الحقيقية (لا يوجد اتصال بالشبكة عندي)،
 * لذلك يطبع أعمدة الجداول ويتحقق من النتيجة، ويتوقف برسالة واضحة إن اختلف الشكل.
 */
import Database from "better-sqlite3";
import { writeFileSync } from "node:fs";

const [layoutPath, wordsPath, outPath = "src/data/ayahLines.json"] = process.argv.slice(2);
if (!layoutPath || !wordsPath) {
  console.error("usage: node build-quran-lines.mjs <layout.db> <words.db> [out.json]");
  process.exit(1);
}

const layoutDb = new Database(layoutPath, { readonly: true });
const wordsDb = new Database(wordsPath, { readonly: true });

const columns = (db, table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
const pageCols = columns(layoutDb, "pages");
const wordCols = columns(wordsDb, "words");
console.log("pages columns:", pageCols.join(", "));
console.log("words columns:", wordCols.join(", "));

for (const c of ["page_number", "line_number", "line_type", "first_word_id", "last_word_id"]) {
  if (!pageCols.includes(c)) throw new Error(`عمود مفقود في pages: ${c}`);
}

// 1) خريطة الكلمة -> (سورة، آية)
const wordToAyah = new Map();
const hasSA = wordCols.includes("surah") && wordCols.includes("ayah");
const locCol = ["location", "word_key"].find((c) => wordCols.includes(c));
if (!hasSA && !locCol) throw new Error("لا يوجد surah/ayah ولا location في words");
for (const row of wordsDb.prepare("SELECT * FROM words").all()) {
  let surah, ayah;
  if (hasSA) ({ surah, ayah } = row);
  else [surah, ayah] = String(row[locCol]).split(":").map(Number);
  wordToAyah.set(row.id, [Number(surah), Number(ayah)]);
}

// 2) نمشي على الأسطر بالترتيب. نحسب أسطر نص الآيات فقط (line_type = 'ayah')
//    فتُستبعد أسطر اسم السورة والبسملة.
const lines = layoutDb
  .prepare("SELECT * FROM pages ORDER BY page_number, line_number")
  .all();

const spans = new Map(); // "s:a" -> {start, end}
let lineIndex = 0;
const types = new Set();
for (const line of lines) {
  types.add(line.line_type);
  if (line.line_type !== "ayah") continue;

  const ids = [];
  for (let id = line.first_word_id; id <= line.last_word_id; id++) ids.push(id);
  const n = ids.length;
  ids.forEach((id, i) => {
    const key = wordToAyah.get(id);
    if (!key) throw new Error(`كلمة بلا آية: ${id} (صفحة ${line.page_number})`);
    const k = key.join(":");
    const start = lineIndex + i / n; // الكسر داخل السطر بنسبة عدد الكلمات (تقريبي)
    const end = lineIndex + (i + 1) / n;
    const cur = spans.get(k);
    if (!cur) spans.set(k, { start, end });
    else cur.end = Math.max(cur.end, end);
  });
  lineIndex += 1;
}
console.log("line types:", [...types].join(", "), "| ayah lines:", lineIndex);

// 3) ترتيب الآيات وبناء المصفوفات
const keys = [...spans.keys()]
  .map((k) => k.split(":").map(Number))
  .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

const surahOffset = [0];
const pos = [];
let expectedSurah = 1;
let prevAyah = 0;
for (const [s, a] of keys) {
  if (s !== expectedSurah) {
    if (s !== expectedSurah + 1 || a !== 1) throw new Error(`فجوة عند ${s}:${a}`);
    surahOffset.push(pos.length / 2);
    expectedSurah = s;
    prevAyah = 0;
  }
  if (a !== prevAyah + 1) throw new Error(`فجوة في آيات السورة ${s} عند ${a}`);
  prevAyah = a;
  const span = spans.get(`${s}:${a}`);
  pos.push(+span.start.toFixed(4), +span.end.toFixed(4));
}
surahOffset.push(pos.length / 2);

// 4) فحوصات سلامة
const totalAyahs = pos.length / 2;
if (totalAyahs !== 6236) throw new Error(`عدد الآيات ${totalAyahs} بدل 6236`);
if (surahOffset.length !== 115) throw new Error(`عدد السور ${surahOffset.length - 1} بدل 114`);
for (let i = 2; i < pos.length; i += 2) {
  if (pos[i] < pos[i - 1] - 1e-3) throw new Error(`تداخل غير متوقع عند الآية رقم ${i / 2}`);
}

writeFileSync(
  outPath,
  JSON.stringify({ layout: "madinah-15-lines", linesPerPage: 15, totalLines: lineIndex, surahOffset, pos }),
);
console.log(`تم: ${outPath} — ${totalAyahs} آية، ${lineIndex} سطر نصي (≈ ${(lineIndex / 15).toFixed(1)} صفحة)`);
