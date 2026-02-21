import { useState, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import manos from "../assets/Manos.png";
import { IconField } from "primereact/iconfield";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const toast = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Por favor, complete todos los campos.");
      toast.current.show({
        severity: "warn",
        summary: "Campos incompletos",
        detail: "Por favor, complete todos los campos.",
        life: 3000,
      });
      return;
    }

    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setErrorMessage("");
      toast.current.show({
        severity: "success",
        summary: "Inicio exitoso",
        detail: "Bienvenido de nuevo.",
        life: 3000,
      });
      navigate("/");
    } catch (error) {
      setErrorMessage("Credenciales incorrectas. Inténtalo nuevamente.");
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Credenciales incorrectas.",
        life: 3000,
      });
    }
  };

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al iniciar sesión con Google.",
        life: 3000,
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#1a1a2e]">
      <Toast ref={toast} />

      {/* Left Side - Illustration */}
      <div className="hidden md:flex flex-1 items-center justify-center p-8">
        <div className="rounded-2xl bg-[#1e1e3a]/50 border border-[#2a2a4a] p-12 backdrop-blur-sm">
          <img
            src={manos}
            alt="Login illustration"
            className="max-w-[80%] h-auto mx-auto"
            style={{ filter: "drop-shadow(0 10px 30px rgba(139, 92, 246, 0.2))" }}
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] rounded-2xl border border-[#2a2a4a] bg-[#1e1e3a] p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <i className="pi pi-wallet text-4xl text-purple-400"></i>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              ¡Bienvenido de nuevo!
            </h1>
            <p className="text-[#94a3b8]">Por favor ingresa tus datos</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-[#94a3b8]">
                Correo Electrónico
              </label>
              <InputText
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="tu@email.com"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-[#94a3b8]">
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
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

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded border-[#2a2a4a] bg-[#16162a] text-purple-500 focus:ring-purple-500/30"
              />
              <label htmlFor="remember" className="text-sm text-[#94a3b8]">
                Recordarme por 30 días
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              label="Iniciar sesión"
              icon="pi pi-sign-in"
              className="w-full"
              disabled={!email || !password}
            />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#2a2a4a]"></div>
              <span className="text-xs text-[#64748b]">o continuar con</span>
              <div className="flex-1 h-px bg-[#2a2a4a]"></div>
            </div>

            {/* Google */}
            <Button
              type="button"
              label="Google"
              icon="pi pi-google"
              onClick={handleGoogleLogin}
              className="p-button-outlined w-full"
              severity="secondary"
            />

            {/* Sign Up Link */}
            <div className="text-center text-sm text-[#94a3b8]">
              ¿No tienes una cuenta?{" "}
              <Link
                to="/signup"
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
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