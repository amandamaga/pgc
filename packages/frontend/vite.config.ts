import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

// Stub for figma:asset/* virtual modules — returns a grey placeholder data URI
function figmaAssetStub(): Plugin {
  const placeholder = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#C8BFB0"/><text x="50%" y="50%" font-family="sans-serif" font-size="18" fill="#8A7A62" text-anchor="middle" dy=".35em">photo</text></svg>')}`;
  return {
    name: "figma-asset-stub",
    resolveId(id) {
      if (id.startsWith("figma:asset/")) return "\0figma-asset:" + id;
    },
    load(id) {
      if (id.startsWith("\0figma-asset:")) return `export default ${JSON.stringify(placeholder)}`;
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetStub(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],
});