import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rosewood: "#1B1712",   // near-black warm background, like a fretboard
        parchment: "#EDE6D6",  // aged sheet-music cream, primary text
        brass: "#C98A4B",      // tuning-peg copper, primary accent
        moss: "#7C8B69",       // active/highlight string
        rust: "#B5533C",       // alert / error
        slate: "#3A362C",      // borders, muted dividers
        ash: "#948C79",        // secondary text
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
