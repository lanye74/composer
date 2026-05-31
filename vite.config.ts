import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import "vite-react-ssg";
import { writeSeoAssets } from "./scripts/build-seo-assets";
import pkg from "./package.json";

const SITE_ORIGIN = "https://composer.boidu.dev";

const KUROMOJI_BROWSER_LOADER = resolve(__dirname, "node_modules/kuromoji/src/loader/BrowserDictionaryLoader.js");

const NODE_DICTIONARY_LOADER_PATTERN = /[\\/]loader[\\/]NodeDictionaryLoader(\.js)?$/;

const kuromojiBrowserLoaderPlugin: Plugin = {
  name: "kuromoji-force-browser-loader",
  enforce: "pre",
  config() {
    return {
      optimizeDeps: {
        esbuildOptions: {
          plugins: [
            {
              name: "kuromoji-force-browser-loader-esbuild",
              setup(build) {
                build.onResolve({ filter: NODE_DICTIONARY_LOADER_PATTERN }, () => ({
                  path: KUROMOJI_BROWSER_LOADER,
                }));
              },
            },
          ],
        },
      },
    };
  },
  resolveId(source) {
    if (NODE_DICTIONARY_LOADER_PATTERN.test(source)) {
      return KUROMOJI_BROWSER_LOADER;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [
    kuromojiBrowserLoaderPlugin,
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/kuromoji/dict/*",
          dest: "dict",
        },
      ],
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  ssgOptions: {
    formatting: "none",
    crittersOptions: false,
    async onFinished(outDir) {
      await writeSeoAssets(outDir, SITE_ORIGIN);
    },
  },
});
