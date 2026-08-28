/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["SF Mono", "ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        canvas: {
          bg: "#F1F0ED",
          surface: "#FBFBFA",
          paper: "#FFFFFF",
          ink: "#18181B",
          sub: "#6B6B6B",
          faint: "#9A9A9A",
          line: "#E4E2DE",
          line2: "#EDEBE7",
          accent: "#3D5AFE",
          accentSoft: "#EEF0FF",
          ok: "#1B7F4B",
          warn: "#B25C00",
          err: "#C0392B",
        },
      },
      fontSize: {
        meta: "11px",
        ctrl: "13px",
        body: "15px",
        panel: "18px",
      },
      transitionDuration: {
        fast: "120ms",
        base: "160ms",
      },
    },
  },
  plugins: [],
};
