import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { ProgressSpinner } from "primereact/progressspinner";
import { Skeleton } from "primereact/skeleton";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, logout }}>
      {!loading ? (
        children
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8">
          <ProgressSpinner
            style={{ width: "50px", height: "50px", marginBottom: "1rem" }}
            strokeWidth="8"
            fill="var(--surface-ground)"
            animationDuration=".5s"
          />

          <div className="w-full max-w-3xl space-y-4">
            <Skeleton className="mb-2 h-6" />
            <Skeleton width="60%" className="mb-2 h-6" />
            <Skeleton width="40%" className="mb-2 h-6" />
            <Skeleton className="mb-4 h-10" />

            <Skeleton className="rounded-md" width="100%" height="150px sm:height-180px md:height-200px lg:height-250px" />
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
