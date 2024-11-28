export function initializePWAInstallPrompt() {
  let deferredPrompt;

  // Escuchar el evento 'beforeinstallprompt'
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // Prevenir el comportamiento por defecto
    deferredPrompt = event; // Guardar el evento para usarlo más tarde

    const lastPromptDate = localStorage.getItem("lastPromptDate");
    const now = new Date().getTime();

    if (!lastPromptDate || now - lastPromptDate > 24 * 60 * 60 * 1000) {
      showInstallPrompt(deferredPrompt); // Mostrar el aviso personalizado
      localStorage.setItem("lastPromptDate", now);
    }
  });

  // Mostrar el aviso personalizado
  function showInstallPrompt(deferredPrompt) {
    const installPrompt = document.querySelector("#installPrompt");
    if (installPrompt) {
      installPrompt.style.display = "block";

      const installButton = document.querySelector("#installButton");
      installButton.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt(); // Mostrar el prompt nativo
          const choice = await deferredPrompt.userChoice; // Capturar la respuesta del usuario
          console.log(`El usuario eligió: ${choice.outcome}`);
          deferredPrompt = null; // Limpiar la referencia
          installPrompt.style.display = "none"; // Ocultar el aviso
        }
      });
    }
  }
}
