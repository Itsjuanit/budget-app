import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Ajusta la ruta según dónde tengas el contexto de autenticación.

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirige al login si no está autenticado.
    return <Navigate to="/login" />;
  }

  return children; // Renderiza el contenido si está autenticado.
};

export default ProtectedRoute;
