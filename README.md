# 💰 PAGATODO

Aplicación web de gestión de finanzas personales. Registrá tus ingresos, gastos y ahorros, controlá tu presupuesto mensual y visualizá tus estadísticas financieras.

> **PWA** — Instalable en celular desde Chrome para acceso rápido.

---

## ✨ Features

### Gestión de transacciones
- Registro de **ingresos**, **gastos** y **ahorros** como tipos separados
- Categorías predefinidas + categorías personalizadas por usuario
- Conversión **USD → ARS** en tiempo real (Dólar Cripto, Blue, MEP, Tarjeta) consumiendo [DolarAPI](https://dolarapi.com)
- Edición y eliminación de transacciones del mes actual
- Búsqueda y filtros por tipo y descripción

### Presupuesto mensual
- Configuración de límites de gasto por categoría
- Barras de progreso con indicadores visuales (verde → amarillo → rojo)
- **Alertas automáticas** al abrir la app si estás cerca o excediste un límite

### Proyección de fin de mes
- Estimación de gasto al cierre basada en el ritmo diario
- Presupuesto diario seguro (cuánto podés gastar por día sin pasarte)
- Indicadores visuales del estado financiero del mes

### Reportes mensuales
- Selector de todos los meses desde la primera transacción hasta el actual
- Tabla detallada con paginación y ordenamiento
- **Generación de PDF** con diseño dark mode profesional (multi-página)
- Summary cards: ingresos, gastos, ahorros y disponible

### Estadísticas
- **Evolución mensual** — Gráfico de líneas (ingresos, gastos, ahorros) últimos 12 meses
- **Barras comparativas** — Ingresos vs gastos mes a mes
- **Distribución** — Doughnut con proporción ingreso/gasto/ahorro
- **Top 5 categorías** — Barras horizontales de las categorías con más gasto
- **Gasto actual vs promedio** — Indicador circular comparando el mes actual con el promedio histórico

### Ahorro
- Tipo de transacción dedicado (`savings`) separado de gastos
- Sección de detalle con barra de progreso y desglose por categoría
- Integración en todos los reportes, gráficos y PDFs

---

## 🛠 Tech Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 · React Router 6 |
| **UI** | PrimeReact (Lara Dark Purple) · Tailwind CSS 3 · Lucide Icons |
| **Gráficos** | Chart.js (line, bar, doughnut) |
| **Backend** | Firebase (Auth + Firestore) |
| **PDF** | jsPDF + jspdf-autotable |
| **Build** | Vite 5 · PWA (vite-plugin-pwa) |
| **Linting** | ESLint 9 · Prettier |
| **API externa** | [DolarAPI.com](https://dolarapi.com) (cotización del dólar) |

---

## 📁 Estructura del proyecto

```
src/
├── auth/
│   └── AuthContext.jsx          # Proveedor de autenticación (Firebase Auth)
├── components/
│   ├── dashboard/               # Piezas del panel (proyección, tarjetas, gráfico, tabla)
│   ├── projects/                # Proyectos de gasto (viajes, mudanzas)
│   ├── recurring/               # Gastos fijos que se repiten cada mes
│   ├── BudgetConfig.jsx         # Dialog de configuración de presupuesto
│   ├── BudgetProgress.jsx       # Barras de progreso del presupuesto
│   ├── ConfirmDialog.jsx        # Dialog de confirmación reutilizable
│   ├── Dashboard.jsx            # Panel principal del mes actual
│   ├── EditTransactionForm.jsx  # Formulario de edición de transacción
│   ├── Login.jsx                # Pantalla de login (Google Auth)
│   ├── TelegramLink.jsx         # Código de un solo uso para vincular el bot
│   ├── MonthlyReports.jsx       # Reportes por mes + generación PDF
│   ├── Signup.jsx               # Pantalla de registro (Google Auth)
│   ├── StatsDashboard.jsx       # Dashboard de estadísticas (4 gráficos)
│   └── TransactionForm.jsx      # Formulario de nueva transacción
├── context/
│   └── TransactionsProvider.jsx # Contexto de transacciones (Firestore)
├── routes/
│   └── ProtectedRoute.jsx       # Ruta protegida con verificación de auth
├── utils/
│   ├── categories.js            # Categorías por tipo (income/savings/expense)
│   ├── colors.js                # Paleta de colores fija para gráficos
│   ├── dolarService.js          # Servicio de cotización del dólar (DolarAPI)
│   ├── format.js                # Formateo de moneda (ARS)
│   ├── pdfGenerator.js          # Generador de reportes PDF
│   └── primeReactLocale.js      # Configuración de locale español
├── App.jsx                      # Layout principal + routing + tabs
├── firebaseConfig.js            # Configuración de Firebase
├── index.css                    # Tema dark mode + overrides PrimeReact
├── main.jsx                     # Entry point
```

---

## 🚀 Instalación

### Requisitos previos
- Node.js 18+
- Cuenta de Firebase con proyecto configurado

### Setup

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/budget-app.git
cd budget-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

Completar el archivo `.env` con las credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Reglas de Firestore

Configurar en la consola de Firebase → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transactions/{transactionId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /customCategories/{categoryId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /budgets/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Lint
npm run lint
npm run lint:fix

# Formatear código
npm run format

# Build para producción
npm run build
npm run preview
```

---

## 🎨 Paleta de colores

| Variable | Color | Uso |
|----------|-------|-----|
| `#1a1a2e` | ![#1a1a2e](https://via.placeholder.com/12/1a1a2e/1a1a2e.png) | Fondo principal |
| `#1e1e3a` | ![#1e1e3a](https://via.placeholder.com/12/1e1e3a/1e1e3a.png) | Superficies / cards |
| `#2a2a4a` | ![#2a2a4a](https://via.placeholder.com/12/2a2a4a/2a2a4a.png) | Bordes |
| `#a78bfa` | ![#a78bfa](https://via.placeholder.com/12/a78bfa/a78bfa.png) | Primary (purple) |
| `#34d399` | ![#34d399](https://via.placeholder.com/12/34d399/34d399.png) | Ingresos / positivo |
| `#f87171` | ![#f87171](https://via.placeholder.com/12/f87171/f87171.png) | Gastos / negativo |
| `#60a5fa` | ![#60a5fa](https://via.placeholder.com/12/60a5fa/60a5fa.png) | Ahorros |
| `#fbbf24` | ![#fbbf24](https://via.placeholder.com/12/fbbf24/fbbf24.png) | Advertencias |

---

## 📱 PWA

La app es instalable como PWA desde Chrome:

1. Abrí la app en Chrome mobile
2. Menú ⋮ → "Instalar aplicación" / "Agregar a pantalla de inicio"
3. La app se instala con ícono propio

---

## 📄 Licencia

Este proyecto es de uso personal.

---

*Desarrollado por Juan Ignacio Tejada — San Juan, Argentina*
