import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MobileBottomNav from "../components/MobileBottomNav";

export default function MainLayout() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f8f6] text-slate-800">
      {/* القائمة الجانبية تظهر على الشاشات الكبيرة فقط */}
      <div className="hidden lg:block print:hidden">
        <Sidebar />
      </div>

      <div className="min-h-screen pb-20 lg:mr-[260px] lg:pb-0 print:m-0 print:p-0">
        <Header />

        <main className="mx-auto max-w-7xl p-4 md:p-8 print:max-w-none print:p-0">
          <Outlet />
        </main>
      </div>

      {/* شريط تنقل التطبيقات يظهر على الجوال */}
      <div className="print:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}