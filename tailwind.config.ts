import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f6f4f1",
        taupe: "#957f67",
        sand: "#cfbda9",
        ink: "#3d342b",
      },
      fontFamily: {
        display: ["'La Luxes Serif'", "Georgia", "serif"],
        body: ["'Recoleta'", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
