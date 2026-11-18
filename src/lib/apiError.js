// يستخرج رسالة مفهومة من خطأ axios (الباك يرجع نصاً عادياً أو ProblemDetails).
export function apiErrorMessage(error, fallback = "تعذّر إكمال العملية. حاول مرة أخرى.") {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).flat()[0];
    if (first) return String(first);
  }
  return fallback;
}
