import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getRoleHome } from "@/lib/role-access";

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  );
}

export default function RoleGate({ allowedRoles, children }) {
  const { currentUser, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <Spinner />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    currentUser.role !== "admin" &&
    !allowedRoles.includes(currentUser.role)
  ) {
    return <Navigate to={getRoleHome(currentUser.role)} replace />;
  }

  return children;
}
