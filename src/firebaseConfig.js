import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Firestore
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth"; // Firebase Auth

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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore
const db = getFirestore(app);

// Inicializa Analytics (opcional)
const analytics = getAnalytics(app);

// Inicializa Firebase Auth y configura la persistencia
const auth = getAuth(app);

// Configuración de persistencia de sesión
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    //console.log("Persistencia configurada en 'localStorage'.");
  })
  .catch((error) => {
    //console.error("Error al configurar la persistencia:", error);
  });

export { app, db, analytics, auth };
