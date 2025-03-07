import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const toast = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
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
      await createUserWithEmailAndPassword(auth, email, password);
      toast.current.show({
        severity: "success",
        summary: "Cuenta creada",
        detail: "Cuenta creada exitosamente.",
        life: 3000,
      });
      navigate("/");
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error al crear cuenta",
        detail: error.message,
        life: 3000,
      });
    }
  };

  const handleGoogleSignup = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      toast.current.show({
        severity: "success",
        summary: "Cuenta creada",
        detail: "Cuenta creada con Google exitosamente.",
        life: 3000,
      });
      navigate("/");
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error con Google",
        detail: error.message,
        life: 3000,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-color to-accent-color p-4">
      <Toast ref={toast} />

      <div className="w-full max-w-md">
        <div className="card shadow-hover">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gradient mb-2">PAGATODOYA</h1>
            <p className="text-text-color-secondary">
              ¡Da el primer paso hacia una vida financiera en orden! Con PAGATODOYA, gestionar tus gastos y planificar tus ahorros es
              sencillo, seguro y efectivo. Únete a nuestra comunidad y transforma tu futuro hoy.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
            </div>

            <Button
              type="button"
              label="Registrarse con Google"
              icon="pi pi-google"
              className="w-full p-button-secondary"
              onClick={handleGoogleSignup}
            />
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-text-color-secondary">¿Ya tienes una cuenta? </span>
            <Link to="/login" className="text-primary-color hover:text-accent-color font-medium">
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
