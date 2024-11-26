import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Card } from "primereact/card";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
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
      // Crear usuario con Firebase Authentication
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
    <div className="flex justify-content-center">
      <Toast ref={toast} /> {/* Componente Toast */}
      <Card title="Crear Cuenta" style={{ width: "25rem" }}>
        <form onSubmit={handleSubmit} className="p-fluid">
          <div className="field">
            <span className="p-float-label p-input-icon-right">
              <InputText id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label htmlFor="email">Correo Electrónico</label>
            </span>
          </div>
          <div className="field mt-4">
            <span className="p-float-label">
              <Password id="password" value={password} onChange={(e) => setPassword(e.target.value)} toggleMask />
              <label htmlFor="password">Contraseña</label>
            </span>
          </div>
          <Button type="submit" label="Crear Cuenta" className="mt-4" />
        </form>
        <Divider align="center">
          <span className="p-tag">O</span>
        </Divider>

        <div className="field mt-4">
          <Button label="Registrarse con Google" icon="pi pi-google" className="p-button-secondary mt-4" onClick={handleGoogleSignup} />
        </div>
      </Card>
    </div>
  );
};
