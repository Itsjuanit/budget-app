import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { Dashboard } from "./components/Dashboard";
import { TransactionForm } from "./components/TransactionForm";
import { MonthlyReports } from "./components/MonthlyReports";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { TabView, TabPanel } from "primereact/tabview";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { TransactionsProvider } from "./context/TransactionsProvider";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { configurePrimeReactLocale } from "./utils/primeReactLocale";
import { initializePWAInstallPrompt } from "./swHandler";

configurePrimeReactLocale();

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log("Service Worker registrado con éxito:", registration);
        } catch (error) {
          console.error("Error al registrar el Service Worker:", error);
        }
      });
    }
    initializePWAInstallPrompt();
  }, []);

  return (
    <AuthProvider>
      <PrimeReactProvider>
        <Router>
          <div className="min-h-screen bg-[#1a1a2e]">
            <nav className="bg-[#16162a] border-b border-[#2a2a4a]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <div className="flex items-center gap-3">
                    <i className="pi pi-wallet text-3xl text-purple-400"></i>
                    <span className="text-xl font-bold text-white tracking-wide">
                      PAGATODO
                    </span>
                  </div>
                  <AuthActions />
                </div>
              </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <TransactionsProvider>
                        <TabView>
                          <TabPanel header="Dashboard">
                            <div className="grid grid-cols-1 gap-8">
                              <section>
                                <h2 className="text-2xl font-semibold mb-4 text-white">
                                  Transacciones
                                </h2>
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
                      </TransactionsProvider>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </Router>
      </PrimeReactProvider>
    </AuthProvider>
  );
}

const AuthActions = () => {
  const { isAuthenticated, logout } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <button
      className="ml-4 text-sm text-red-400 hover:text-red-300 transition-colors duration-200"
      onClick={logout}
    >
      <i className="pi pi-sign-out mr-2"></i>
      Cerrar sesión
    </button>
  );
};

export default App;