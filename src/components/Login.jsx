import { useRef, useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import manos from "../assets/Manos.png";
import { IconField } from "primereact/iconfield";

/** Traduce los códigos de Firebase Auth a mensajes que sirvan al usuario. */
const authErrorMessage = (code) => {
  switch (code) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.";
    case "auth/network-request-failed":
      return "No hay conexión. Revisá tu internet e intentá de nuevo.";
    case "auth/popup-closed-by-user":
      return "Cerraste la ventana de Google antes de terminar.";
    default:
      return "Credenciales incorrectas. Inténtalo nuevamente.";
  }
};

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage("");
    try {
      await signInWithEmailAndPassword(getAuth(), email, password);
      navigate("/", { replace: true });
    } catch (error) {
      const message = authErrorMessage(error.code);
      setErrorMessage(message);
      toast.current?.show({ severity: "error", summary: "Error", detail: message, life: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    try {
      await signInWithPopup(getAuth(), new GoogleAuthProvider());
      navigate("/", { replace: true });
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: authErrorMessage(error.code),
        life: 3000,
      });
    }
  };

  // Antes esto era un link a /forgot-password, una ruta que no existía y que
  // terminaba rebotando de vuelta al login.
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Falta el correo",
        detail: "Escribí tu correo electrónico y volvé a tocar el enlace.",
        life: 4000,
      });
      return;
    }

    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
      toast.current?.show({
        severity: "success",
        summary: "Correo enviado",
        detail: "Si la cuenta existe, vas a recibir un enlace para restablecer tu contraseña.",
        life: 5000,
      });
    } catch (error) {
      console.error("Error enviando el correo de recuperación:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: authErrorMessage(error.code),
        life: 4000,
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Toast ref={toast} />

      {/* Left Side - Illustration */}
      <div className="hidden md:flex flex-1 items-center justify-center p-8">
        <div className="rounded-2xl bg-surface-raised border border-border p-12 backdrop-blur-sm">
          <img
            src={manos}
            alt=""
            className="max-w-[80%] h-auto mx-auto"
            style={{ filter: "drop-shadow(0 10px 30px rgba(139, 92, 246, 0.2))" }}
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8">
          <div className="text-center mb-6">
            <i className="pi pi-wallet text-4xl text-brand"></i>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-strong mb-2">¡Bienvenido de nuevo!</h1>
            <p className="text-muted">Por favor ingresa tus datos</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-muted">
                Correo Electrónico
              </label>
              <InputText
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="tu@email.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-muted">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-brand hover:text-brand-hover transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <IconField iconPosition="left" className="w-full">
                <Password
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  feedback={false}
                  className="w-full"
                  toggleMask
                />
              </IconField>
            </div>

            {errorMessage && <Message severity="error" text={errorMessage} />}

            <Button
              type="submit"
              label="Iniciar sesión"
              icon="pi pi-sign-in"
              className="w-full"
              loading={submitting}
              disabled={!email || !password}
            />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-subtle">o continuar con</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <Button
              type="button"
              label="Google"
              icon="pi pi-google"
              onClick={handleGoogleLogin}
              className="p-button-outlined w-full"
              severity="secondary"
            />

            <div className="text-center text-sm text-muted">
              ¿No tienes una cuenta?{" "}
              <Link
                to="/signup"
                className="font-medium text-brand hover:text-brand-hover transition-colors"
              >
                Regístrate aquí
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
