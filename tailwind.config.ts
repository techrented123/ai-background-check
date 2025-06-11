import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ringColor: { DEFAULT: "#293074" },
        primary: {
          DEFAULT: "var(--primary-color)",
        },
      },
      fontWeight: {
        "font-medium": "var(--tw-font-weight)",
      },
    },
  },
  plugins: [],
};
export default config;
