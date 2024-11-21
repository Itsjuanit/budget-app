import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user); // Si hay un usuario, está autenticado
    });

    return () => unsubscribe(); // Limpia el listener
  }, []);

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
    setIsAuthenticated(false);
  };

  return <AuthContext.Provider value={{ isAuthenticated, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
