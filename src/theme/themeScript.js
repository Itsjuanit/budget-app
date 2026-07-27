/**
 * Resolución del tema, compartida entre el script anti-flash de index.html
 * y el ThemeProvider. Mantener los nombres en sincronía con ese script.
 */
export const THEME_STORAGE_KEY = "pagatodo:theme";
export const THEMES = ["light", "dark"];

/** Preferencia del sistema operativo, con dark como red de seguridad. */
export const getSystemTheme = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";

/** Tema guardado por el usuario, o null si nunca eligió. */
export const getStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored) ? stored : null;
  } catch {
    // localStorage puede fallar en modo privado o con cookies bloqueadas.
    return null;
  }
};

export const storeTheme = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Si no se puede persistir, el tema igual funciona durante la sesión.
  }
};

/** Tema inicial: lo que eligió el usuario, y si no, lo que prefiere el sistema. */
export const resolveInitialTheme = () => getStoredTheme() ?? getSystemTheme();
