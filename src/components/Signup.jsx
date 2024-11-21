import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Divider } from "primereact/divider";
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMessage("Por favor, complete todos los campos.");
      return;
    }

    const auth = getAuth();

    try {
      // Crear usuario con Firebase Authentication
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccessMessage("Cuenta creada exitosamente.");
      setErrorMessage("");
      navigate("/");
    } catch (error) {
      setErrorMessage(error.message);
      setSuccessMessage("");
    }
  };

  const handleGoogleSignup = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      setSuccessMessage("Cuenta creada con Google exitosamente.");
      setErrorMessage("");
      navigate("/");
    } catch (error) {
      setErrorMessage(error.message);
      setSuccessMessage("");
    }
  };

  return (
    <div className="flex justify-content-center">
      <Card title="Crear Cuenta" style={{ width: "25rem" }}>
        <form onSubmit={handleSubmit} className="p-fluid">
          <div className="field">
            <span className="p-float-label p-input-icon-right">
              <i className="pi pi-envelope" />
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
          {errorMessage && <Message severity="error" text={errorMessage} className="mb-3" />}
          {successMessage && <Message severity="success" text={successMessage} className="mb-3" />}
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
