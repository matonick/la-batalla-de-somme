/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  // Safelist mínima: Tailwind ya detecta la mayoría de clases porque están escritas literalmente en App.jsx.
  // Dejamos solo las que suelen construirse dinámicamente para el mapa/efectos.
  safelist: [
    "text-lime-900",
    "text-yellow-900",
    "text-amber-800",
    "text-amber-900",
    "text-stone-300",
    "text-stone-400",
    "text-stone-500",
    "text-stone-600",
    "text-red-300",
    "text-red-400",
    "text-red-500",
    "text-orange-300",
    "text-orange-400",
    "text-slate-300",
    "text-slate-400",
    "text-cyan-300",
    "text-green-300",
    "bg-black/40",
    "bg-black/60",
    "bg-stone-950",
    "bg-stone-900",
    "bg-amber-950",
    "border-stone-700",
    "border-amber-900",
    "animate-ping",
    "drop-shadow",
    "opacity-0",
    "opacity-40",
    "opacity-60",
    "opacity-80",
    "opacity-100"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "monospace"]
      },
      colors: {
        somme: {
          ink: "#1d1a16",
          paper: "#d0bb87",
          brass: "#b89f72",
          mud: "#2b241b",
          blood: "#8c3f32",
          olive: "#5f6f4b"
        }
      }
    }
  },
  plugins: []
};
