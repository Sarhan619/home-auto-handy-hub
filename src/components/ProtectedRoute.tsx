import { Navigate, useLocation } from "react-router-dom";
import { AppRole, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    // Send user to their first available dashboard
    const fallback =
      roles.includes("admin") ? "/admin" :
      roles.includes("vendor") ? "/vendor" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
