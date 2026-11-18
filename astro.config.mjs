// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import preact from "@astrojs/preact";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  site: "https://shlongee.github.io",
  integrations: [mdx(), sitemap(), preact()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Kejter",
      cssVariable: "--kejter",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/kejter.woff"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],
  vite: {
    build: {
      chunkSizeWarningLimit: 750,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "three",
                test: /node_modules[\\/]three/,
              },
            ],
          },
        },
      },
    },
  },
});