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
    {
      provider: fontProviders.local(),
      name: "MorningBreeze",
      cssVariable: "--morning-breeze",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/morningbreeze-light.woff"],
            weight: 300,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/morningbreeze-regular.woff"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/morningbreeze-italic.woff"],
            weight: 400,
            style: "italic",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/morningbreeze-bold.woff"],
            weight: 700,
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