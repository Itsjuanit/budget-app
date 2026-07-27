import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// Configuración de Firebase desde las variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== "measurementId" && !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(
    `Faltan variables de entorno de Firebase: ${missingKeys.join(", ")}. ` +
      "Copiá .env.example a .env y completá los valores."
  );
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Analytics no está disponible en todos los entornos (navegadores in-app, modos
// con cookies bloqueadas, etc.). Sin este chequeo getAnalytics tira una excepción
// que rompe la carga de la app.
let analytics = null;
if (firebaseConfig.measurementId) {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch((error) => console.warn("Analytics no disponible:", error));
}

// La sesión se guarda en localStorage para que no haya que loguearse en cada visita.
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error al configurar la persistencia de sesión:", error);
});

export { app, db, analytics, auth };
