import {
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const ADMINS = ["PlatformAdmin", "Admin"];
const CENTER_STAFF = [...ADMINS, "CenterAdmin"];
const STAFF = [...CENTER_STAFF, "Teacher"];

// المصدر الوحيد لروابط التنقل (الشريط الجانبي وشريط الجوال).
export const NAV_LINKS = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard, end: true },
  { to: "/student", label: "ملفي وجدول الحفظ", short: "ملفي", icon: BookOpen, roles: ["Student"] },
  { to: "/centers", label: "المراكز", icon: Building2, roles: ADMINS },
  { to: "/users", label: "المستخدمون", icon: ShieldCheck, roles: ADMINS },
  { to: "/groups", label: "الحلقات", icon: Users, roles: STAFF },
  { to: "/teachers", label: "المدرسون", icon: UserRound, roles: CENTER_STAFF },
  { to: "/students", label: "الطلاب", icon: GraduationCap, roles: STAFF },
  { to: "/memorization", label: "تسجيل الحفظ", short: "الحفظ", icon: BookOpen, roles: ["Teacher"] },
  { to: "/attendance", label: "الحضور والغياب", short: "الحضور", icon: CalendarCheck },
  { to: "/plans", label: "خطط الحفظ", short: "الخطط", icon: ClipboardList, roles: [...STAFF, "Student"] },
  { to: "/student-record", label: "سجل الطالب", short: "السجل", icon: FileText },
  { to: "/audit", label: "سجل التدقيق", short: "التدقيق", icon: History, roles: ADMINS },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

// الروابط التي تظهر مباشرة في شريط الجوال لكل دور؛ الباقي داخل «المزيد».
const MOBILE_PRIMARY = {
  Student: ["/", "/student", "/plans", "/attendance"],
  Teacher: ["/", "/memorization", "/attendance", "/students"],
  CenterAdmin: ["/", "/groups", "/teachers", "/students"],
  Admin: ["/", "/centers", "/users", "/groups"],
  PlatformAdmin: ["/", "/centers", "/users", "/groups"],
};

export function getNavLinks(role) {
  return NAV_LINKS.filter((link) => !link.roles || link.roles.includes(role));
}

export function getMobileNav(role) {
  const all = getNavLinks(role);
  const primaryPaths = MOBILE_PRIMARY[role] ?? ["/"];
  const primary = primaryPaths.map((to) => all.find((link) => link.to === to)).filter(Boolean);
  const more = all.filter((link) => !primaryPaths.includes(link.to));
  return { primary, more };
}
