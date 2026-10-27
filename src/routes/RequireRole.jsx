import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function RequireRole({ allowedRoles, children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="p-6 text-center">جارٍ التحقق من الحساب...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}