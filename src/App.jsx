import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { TabView, TabPanel } from "primereact/tabview";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dashboard } from "./components/Dashboard";
import { TransactionForm } from "./components/TransactionForm";
import { MonthlyReports } from "./components/MonthlyReports";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { TransactionsProvider } from "./context/TransactionsProvider";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { configurePrimeReactLocale } from "./utils/primeReactLocale";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ThemeToggle } from "./theme/ThemeToggle";

// Las estadísticas sólo se descargan al abrir esa pestaña.
const StatsDashboard = lazy(() =>
  import("./components/StatsDashboard").then((m) => ({ default: m.StatsDashboard }))
);

configurePrimeReactLocale();

const TabFallback = () => (
  <div className="flex items-center justify-center py-20">
    <ProgressSpinner style={{ width: "40px", height: "40px" }} strokeWidth="4" />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PrimeReactProvider>
          <Router>
            <div className="min-h-screen bg-bg">
              <nav className="bg-nav border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-3">
                      <i className="pi pi-wallet text-3xl text-brand"></i>
                      <span className="text-xl font-bold text-strong tracking-wide">PAGATODO</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThemeToggle />
                      <AuthActions />
                    </div>
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
                                  <h2 className="text-2xl font-semibold mb-4 text-strong">
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
                            <TabPanel header="Estadísticas">
                              <div className="flex flex-col gap-6">
                                <h2 className="text-2xl font-semibold text-strong">Estadísticas</h2>
                                <Suspense fallback={<TabFallback />}>
                                  <StatsDashboard />
                                </Suspense>
                              </div>
                            </TabPanel>
                          </TabView>
                        </TransactionsProvider>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </Router>
        </PrimeReactProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const AuthActions = () => {
  const { isAuthenticated, logout } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <button
      className="btn-plain ml-2 text-sm text-expense hover:opacity-80 transition-opacity duration-200"
      onClick={logout}
    >
      <i className="pi pi-sign-out mr-2"></i>
      Cerrar sesión
    </button>
  );
};

export default App;
