import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Muestra un indicador de carga mientras Firebase verifica
  if (loading) {
    return <p>Cargando...</p>; // Aquí puedes usar un spinner o un componente de carga
  }

  // Redirige si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Renderiza los hijos si está autenticado
  return children;
};

export default ProtectedRoute;
