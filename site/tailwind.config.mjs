export default {
  content: ["./src/**/*.{astro,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f1117",
          raised: "#1a1c25",
          border: "#2a2d3a",
        },
        accent: {
          orange: "#f97316",
          green: "#22c55e",
          red: "#ef4444",
          blue: "#3b82f6",
        },
      },
    },
  },
};
