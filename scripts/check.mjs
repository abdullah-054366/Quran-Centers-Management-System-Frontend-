import { readFileSync } from "node:fs";
import { createLineCalculator } from "../src/lib/quranLines.js";

const data = JSON.parse(readFileSync("src/data/ayahLines.json", "utf8"));
const calc = createLineCalculator(data);

console.log("الفاتحة كاملة:", calc.linesBetween(1, 1, 1, 7), "سطر");
console.log("البقرة 1 إلى 10:", calc.linesBetween(2, 1, 2, 10), "سطر");
console.log("البقرة كاملة:", calc.linesBetween(2, 1, 2, 286), "سطر");