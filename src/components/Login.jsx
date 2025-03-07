import { useState, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import manos from "../assets/Manos.png";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

// Estilos para el botón primario
const primaryButtonStyles = {
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  border: "none",
  padding: "1rem",
  width: "100%",
  fontWeight: 600,
  transition: "transform 0.2s, box-shadow 0.2s",
};

// Estilos para el botón secundario (Google)
const secondaryButtonStyles = {
  background: "#fff",
  color: "#4a5568",
  border: "1px solid #cbd5e0",
  padding: "1rem",
  width: "100%",
  fontWeight: 600,
  transition: "transform 0.2s, box-shadow 0.2s",
};

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
    <div className="flex min-h-screen" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <Toast ref={toast} />

      {/* Left Side - Illustration */}
      <div
        className="hidden md:flex flex-1 items-center justify-center p-8"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
          backdropFilter: "blur(10px)",
        }}
      >
        <img
          src={manos}
          alt="Login illustration"
          className="max-w-[80%] h-auto"
          style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.15))" }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div
        className="flex-1 flex items-center justify-center bg-white md:rounded-l-[2rem]"
        style={{ boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
      >
        <div className="w-full max-w-[420px] p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <i className="pi pi-wallet text-4xl text-purple-600"></i>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenido de nuevo!</h1>
            <p className="text-gray-600">Por favor ingresa tus datos</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <InputText
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s",
                }}
                className="w-full hover:border-purple-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
            </div>

            {/* Password Field using IconField */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <Link to="/forgot-password" className="text-sm text-purple-600 hover:text-purple-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <span className="p-float-label w-full">
                <IconField iconPosition="left" className="w-full">
                  <Password
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    feedback={false} // Opcional: desactiva la barra de fuerza de contraseña
                    className="w-full"
                    inputStyle={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #e2e8f0",
                      transition: "all 0.2s",
                    }}
                  />
                </IconField>
              </span>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input type="checkbox" id="remember" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                Recordarme por 30 días
              </label>
            </div>

            {/* Botón secundario - Iniciar sesión con Google */}
            <Button
              type="button"
              label="Iniciar sesión con Google"
              icon="pi pi-google"
              onClick={handleGoogleLogin}
              style={primaryButtonStyles}
              className="hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            />

            {/* Sign Up Link */}
            <div className="text-center text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link to="/signup" className="font-medium text-purple-600 hover:text-purple-500">
                Regístrate aquí
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
