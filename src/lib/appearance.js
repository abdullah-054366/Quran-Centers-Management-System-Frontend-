// تفضيلات المظهر (الوضع الليلي وحجم الخط) محفوظة في المتصفح لكل جهاز.
const KEY = "mishkat.appearance";

export const FONT_SIZES = { sm: "14px", md: "16px", lg: "18px" };
export const DEFAULT_APPEARANCE = { theme: "light", fontSize: "md" };

export function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    return {
      theme: ["light", "dark", "system"].includes(saved?.theme) ? saved.theme : DEFAULT_APPEARANCE.theme,
      fontSize: saved?.fontSize in FONT_SIZES ? saved.fontSize : DEFAULT_APPEARANCE.fontSize,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(appearance) {
  try {
    localStorage.setItem(KEY, JSON.stringify(appearance));
  } catch {
    // التخزين غير متاح؛ يبقى التطبيق للجلسة الحالية فقط.
  }
}

export function applyAppearance(appearance) {
  const root = document.documentElement;
  const dark =
    appearance.theme === "dark" ||
    (appearance.theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", Boolean(dark));
  root.style.fontSize = FONT_SIZES[appearance.fontSize] ?? FONT_SIZES.md;
}
