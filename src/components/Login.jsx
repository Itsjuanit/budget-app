import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useAuth } from "../auth/AuthContext";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMessage("Por favor, complete todos los campos.");
      return;
    }

    const auth = getAuth();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      //console.log("Usuario autenticado:", email);
      setErrorMessage("");
      navigate("/"); // Redirigir al Dashboard
    } catch (error) {
      //console.error("Error iniciando sesión:", error.message);
      setErrorMessage("Credenciales incorrectas. Inténtalo nuevamente.");
    }
  };

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      //console.log("Usuario autenticado con Google");
      setErrorMessage("");
      navigate("/"); // Redirigir al Dashboard
    } catch (error) {
      //console.error("Error iniciando sesión con Google:", error.message);
      setErrorMessage("Error al iniciar sesión con Google. Inténtalo nuevamente.");
    }
  };

  return (
    <div className="flex justify-content-center">
      <Card title="Iniciar Sesión" style={{ width: "25rem" }}>
        <form onSubmit={handleSubmit} className="p-fluid">
          <div className="field">
            <span className="p-float-label p-input-icon-right">
              <InputText id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label htmlFor="email">Correo Electrónico</label>
            </span>
          </div>
          <div className="field mt-4">
            <span className="p-float-label">
              <Password id="password" value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} toggleMask />
              <label htmlFor="password">Contraseña</label>
            </span>
          </div>
          {errorMessage && <Message severity="error" text={errorMessage} className="mb-3" />}
          <Button type="submit" label="Iniciar Sesión" className="mt-4" />
        </form>

        <div className="mt-4 text-center">
          <p>
            ¿No tienes una cuenta? <Link to="/signup">Regístrate aquí</Link>
          </p>
        </div>

        <div className="mt-4">
          <Button label="Iniciar sesión con Google" icon="pi pi-google" className="p-button-secondary w-full" onClick={handleGoogleLogin} />
        </div>
      </Card>
    </div>
  );
};
