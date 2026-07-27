import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import darkThemeUrl from "primereact/resources/themes/lara-dark-purple/theme.css?url";
import lightThemeUrl from "primereact/resources/themes/lara-light-purple/theme.css?url";
import { getStoredTheme, resolveInitialTheme, storeTheme } from "./themeScript";

const THEME_LINK_ID = "primereact-theme";
const THEME_URLS = { dark: darkThemeUrl, light: lightThemeUrl };

const ThemeContext = createContext(null);

/**
 * Intercambia la hoja de estilos de PrimeReact.
 *
 * PrimeReact publica un CSS por tema, así que no alcanza con variables: hay que
 * cambiar el archivo. Se importan ambos con `?url` para que Vite los emita como
 * assets y sólo se cargue el que está en uso.
 *
 * El swap crea un <link> nuevo y recién elimina el anterior cuando el nuevo
 * terminó de cargar: si se reapuntara el href directamente, quedaría un instante
 * sin ninguna hoja aplicada y los componentes aparecerían sin estilo.
 */
const applyPrimeReactTheme = (theme) => {
  const href = THEME_URLS[theme];
  const current = document.getElementById(THEME_LINK_ID);
  if (current?.getAttribute("href") === href) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;

  const removeOld = () => {
    if (current?.parentNode) current.remove();
    link.id = THEME_LINK_ID;
  };

  link.addEventListener("load", removeOld, { once: true });
  // Si el CSS no carga, igual se saca el viejo para no dejar dos hojas activas.
  link.addEventListener("error", removeOld, { once: true });

  // Va primero en el <head> para que los overrides de index.css sigan ganando.
  document.head.insertBefore(link, document.head.firstChild);
};

// Se aplica en tiempo de módulo, antes de que React monte, para que no haya un
// primer pintado con los componentes de PrimeReact sin estilos.
applyPrimeReactTheme(resolveInitialTheme());

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    applyPrimeReactTheme(theme);

    // Tiñe la barra del navegador en mobile y la splash screen de la PWA.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#1a1a2e" : "#f1f5f9");
  }, [theme]);

  // Si el usuario nunca eligió tema a mano, se sigue el cambio del sistema en vivo.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (event) => {
      if (getStoredTheme() === null) setThemeState(event.matches ? "light" : "dark");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    storeTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      storeTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return context;
};
