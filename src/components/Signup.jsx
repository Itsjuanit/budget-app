import { useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export const Signup = () => {
  const toast = useRef(null);
  const navigate = useNavigate();

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
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Toast ref={toast} />

      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-surface p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <i className="pi pi-wallet text-4xl text-brand"></i>
            </div>
            <h1 className="text-3xl font-bold text-strong mb-3">PAGATODO</h1>
            <p className="text-muted text-sm leading-relaxed">
              Da el primer paso hacia una vida financiera en orden. Gestioná tus gastos y planificá
              tus ahorros de forma sencilla, segura y efectiva.
            </p>
          </div>

          {/* Google signup */}
          <Button
            type="button"
            label="Registrarse con Google"
            icon="pi pi-google"
            className="w-full p-button-outlined"
            severity="secondary"
            onClick={handleGoogleSignup}
          />

          {/* Link a login */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted">¿Ya tenés una cuenta? </span>
            <Link
              to="/login"
              className="text-brand hover:text-brand-hover font-medium transition-colors duration-200"
            >
              Iniciá sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
