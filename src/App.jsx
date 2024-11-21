import React from "react";
import { PrimeReactProvider } from "primereact/api";
import { TabView, TabPanel } from "primereact/tabview";
import { Dashboard } from "./components/Dashboard";
import { TransactionForm } from "./components/TransactionForm";
import { MonthlyReports } from "./components/MonthlyReports";

function App() {
  return (
    <PrimeReactProvider>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-800">Paga todo</span>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        </main>
      </div>
    </PrimeReactProvider>
  );
}

export default App;
