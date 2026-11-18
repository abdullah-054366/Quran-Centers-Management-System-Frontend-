/** أيام افتراضية (0 = الأحد ... 6 = السبت): السبت إلى الخميس. */
export const DEFAULT_STUDY_DAYS = [6, 0, 1, 2, 3, 4];

/**
 * لا يوجد endpoint لإعدادات أيام الدراسة في الباكند حالياً، فنُرجع الأيام الافتراضية
 * بدل طلب يفشل بـ 404 في كل مرة. عند إضافة الـ endpoint استبدل الجسم بطلب فعلي.
 */
export async function getStudyDays() {
  return DEFAULT_STUDY_DAYS;
}
