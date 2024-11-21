import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMessage("Por favor, complete todos los campos.");
      return;
    }

    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      login(); // Autenticar al usuario
      navigate("/"); // Redirigir al Dashboard
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setErrorMessage("Credenciales incorrectas. Intente nuevamente.");
    }
  };

  return (
    <div className="flex justify-content-center">
      <Card title="Iniciar Sesión" style={{ width: "25rem" }}>
        <form onSubmit={handleSubmit} className="p-fluid">
          <div className="field">
            <span className="p-float-label p-input-icon-right">
              <i className="pi pi-envelope" />
              <InputText id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo Electrónico" />
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
      </Card>
    </div>
  );
};
