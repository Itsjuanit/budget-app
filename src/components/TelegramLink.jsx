import { useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Message } from "primereact/message";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/auth/AuthContext";

/** Minutos que vive el código antes de vencer. Debe coincidir con el bot. */
const CODE_TTL_MINUTES = 10;

/** Código de 6 dígitos con aleatoriedad criptográfica, no Math.random. */
const generateCode = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(buffer[0] % 1000000).padStart(6, "0");
};

const formatCountdown = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/**
 * Genera el código de un solo uso para vincular el bot de Telegram.
 *
 * Reemplaza al método anterior, que pedía pegar el UID de Firebase en el chat.
 * Ese UID no es secreto, así que cualquiera que lo supiera podía vincularse a
 * la cuenta ajena y leer o borrar sus movimientos.
 */
export const TelegramLink = ({ visible, onHide }) => {
  const { user } = useAuth();
  const [code, setCode] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [generating, setGenerating] = useState(false);
  const toast = useRef(null);

  // Cuenta regresiva; al llegar a cero el código deja de mostrarse.
  useEffect(() => {
    if (!code || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [code, secondsLeft]);

  // Al cerrar el diálogo se descarta el código de la pantalla.
  useEffect(() => {
    if (!visible) {
      setCode(null);
      setSecondsLeft(0);
    }
  }, [visible]);

  const handleGenerate = async () => {
    if (!user || generating) return;

    setGenerating(true);
    try {
      const newCode = generateCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

      await setDoc(
        doc(db, "userSettings", user.uid),
        { userId: user.uid, telegramLinkCode: newCode, telegramLinkCodeExpiresAt: expiresAt },
        { merge: true }
      );

      setCode(newCode);
      setSecondsLeft(CODE_TTL_MINUTES * 60);
    } catch (error) {
      console.error("Error generando el código de vinculación:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo generar el código. Intentá de nuevo.",
        life: 3000,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`/vincular ${code}`);
      toast.current?.show({
        severity: "success",
        summary: "Copiado",
        detail: "Pegalo en el chat del bot.",
        life: 2500,
      });
    } catch {
      // Sin permiso de portapapeles el código igual se ve en pantalla.
      toast.current?.show({
        severity: "warn",
        summary: "No se pudo copiar",
        detail: "Escribilo a mano en el chat del bot.",
        life: 3000,
      });
    }
  };

  const expired = code && secondsLeft === 0;

  return (
    <>
      <Toast ref={toast} />

      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-send text-brand"></i>
            <span>Conectar Telegram</span>
          </div>
        }
        visible={visible}
        onHide={onHide}
        style={{ width: "92vw", maxWidth: "440px" }}
        footer={
          <Button
            label="Cerrar"
            icon="pi pi-times"
            className="p-button-outlined p-button-sm"
            severity="secondary"
            onClick={onHide}
          />
        }
      >
        <div className="flex flex-col gap-4 pt-2">
          <ol className="flex flex-col gap-2 text-sm text-muted list-decimal list-inside">
            <li>Generá un código acá abajo</li>
            <li>Abrí el chat del bot en Telegram</li>
            <li>
              Mandale <code className="text-brand">/vincular</code> con el código
            </li>
          </ol>

          {code && !expired && (
            <div className="rounded-xl border border-ring-primary bg-tint-primary p-5 text-center">
              <p className="text-3xl font-bold tracking-[0.3em] text-strong tabular-nums">{code}</p>
              <p className="text-xs text-muted mt-2">
                Vence en{" "}
                <span className="tabular-nums font-medium">{formatCountdown(secondsLeft)}</span>
              </p>
              <Button
                label="Copiar comando"
                icon="pi pi-copy"
                className="p-button-sm p-button-text mt-2"
                onClick={handleCopy}
              />
            </div>
          )}

          {expired && (
            <Message
              severity="warn"
              text="El código venció. Generá uno nuevo."
              className="w-full"
            />
          )}

          <Button
            label={code ? "Generar otro código" : "Generar código"}
            icon="pi pi-refresh"
            className="p-button-sm"
            severity={code && !expired ? "secondary" : "success"}
            outlined={Boolean(code) && !expired}
            onClick={handleGenerate}
            loading={generating}
          />

          <p className="text-xs text-subtle">
            El código sirve una sola vez y vence a los {CODE_TTL_MINUTES} minutos. No lo compartas:
            quien lo tenga puede conectar su Telegram a tu cuenta.
          </p>
        </div>
      </Dialog>
    </>
  );
};
