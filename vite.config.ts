import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        "content/index": resolve(__dirname, "src/content/index.ts"),
        "options/options": resolve(__dirname, "src/options/options.html")
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  }
});
