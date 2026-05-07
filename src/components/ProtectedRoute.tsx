import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"client" | "worker" | "admin">;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper spinner
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard if they are on the wrong one
    const targetPath =
      user.role === "admin"
        ? "/admin"
        : user.role === "worker"
          ? "/worker"
          : "/client";
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
