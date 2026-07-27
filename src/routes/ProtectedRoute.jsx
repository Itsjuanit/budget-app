import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ProgressSpinner } from "primereact/progressspinner";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ProgressSpinner
          style={{ width: "48px", height: "48px" }}
          strokeWidth="4"
          animationDuration=".8s"
        />
        <p className="text-muted text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
