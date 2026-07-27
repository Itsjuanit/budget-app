/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", "system-ui", "sans-serif"],
      },
      // Los colores apuntan a las variables CSS definidas en index.css, así que
      // `bg-surface` o `text-muted` cambian solos al cambiar de tema. Nunca
      // usar hex sueltos en los componentes: no sabrían adaptarse.
      colors: {
        bg: "var(--bg)",
        nav: "var(--bg-nav)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        "surface-hover": "var(--surface-hover)",

        border: "var(--border)",
        "border-strong": "var(--border-strong)",

        strong: "var(--text-strong)",
        body: "var(--text)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        subtle: "var(--text-subtle)",

        brand: "var(--primary)",
        "brand-hover": "var(--primary-hover)",
        "brand-deep": "var(--primary-deep)",
        accent: "var(--accent)",

        income: "var(--income)",
        expense: "var(--expense)",
        savings: "var(--savings)",
        warning: "var(--warning)",
      },
      backgroundColor: {
        "tint-income": "var(--tint-income)",
        "tint-expense": "var(--tint-expense)",
        "tint-savings": "var(--tint-savings)",
        "tint-primary": "var(--tint-primary)",
      },
      borderColor: {
        "ring-income": "var(--ring-income)",
        "ring-expense": "var(--ring-expense)",
        "ring-savings": "var(--ring-savings)",
        "ring-primary": "var(--ring-primary)",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};
