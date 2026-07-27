import { Button } from "primereact/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/** Botón de la barra superior para alternar entre tema claro y oscuro. */
export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <Button
      onClick={toggleTheme}
      className="p-button-rounded p-button-text p-button-sm text-muted hover:text-strong"
      tooltip={label}
      tooltipOptions={{ position: "bottom" }}
      aria-label={label}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
};
