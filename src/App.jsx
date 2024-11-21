import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { Dashboard } from "./components/Dashboard";
import { TransactionForm } from "./components/TransactionForm";
import { MonthlyReports } from "./components/MonthlyReports";
import { Login } from "./components/Login";
import { TabView, TabPanel } from "primereact/tabview";
import { AuthProvider, useAuth } from "./auth/AuthContext";

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <PrimeReactProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-md">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-gray-800">Paga Todo</span>
                    <AuthActions />
                  </div>
                </div>
              </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                {/* Ruta de Login */}
                <Route path="/login" element={<Login />} />

                {/* Rutas protegidas */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <TabView>
                        <TabPanel header="Dashboard">
                          <div className="grid grid-cols-1 gap-8">
                            <section>
                              <h2 className="text-2xl font-semibold mb-4">Transacciones</h2>
                              <TransactionForm />
                            </section>

                            <section>
                              <Dashboard />
                            </section>
                          </div>
                        </TabPanel>

                        <TabPanel header="Reporte mensual">
                          <MonthlyReports />
                        </TabPanel>
                      </TabView>
                    </ProtectedRoute>
                  }
                />

                {/* Ruta por defecto */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </Router>
      </PrimeReactProvider>
    </AuthProvider>
  );
}

// Acciones de autenticación (Cerrar sesión)
const AuthActions = () => {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <button className="ml-4 text-sm text-red-500" onClick={logout}>
      Cerrar sesión
    </button>
  );
};

export default App;
