export default {
  content: ["./src/**/*.{astro,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#f5f4ed",
          raised: "#ffffff",
          border: "#e8e6dc",
          muted: "#eae8e0",
        },
        accent: {
          orange: "#d97757",
          green: "#2d8659",
          red: "#c4483e",
          blue: "#4a7fb5",
        },
        charcoal: {
          DEFAULT: "#1a1a18",
          light: "#30302e",
        },
        slate: {
          DEFAULT: "#6b6b68",
          light: "#9b9b97",
        },
      },
    },
  },
};
