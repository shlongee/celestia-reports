// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
    site: 'https://shlongee.github.io',
    integrations: [mdx(), sitemap(), preact()],
    fonts: [
        {
            provider: fontProviders.local(),
            name: 'Zyzol',
            cssVariable: '--zyzol',
            fallbacks: ['sans-serif'],
            options: {
                variants: [
                    {
                        src: ['./src/assets/fonts/zyzol-regular.woff'],
                        weight: 400,
                        style: 'normal',
                        display: 'swap',
                    },
                    {
                        src: ['./src/assets/fonts/zyzol-bold.woff'],
                        weight: 700,
                        style: 'normal',
                        display: 'swap',
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