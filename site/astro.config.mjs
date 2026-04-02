import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [preact(), tailwind()],
  vite: {
    resolve: {
      alias: {
        "@content": new URL("../content", import.meta.url).pathname,
      },
    },
  },
});
