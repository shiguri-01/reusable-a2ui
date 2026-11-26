import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { voidReact } from "@void/react/plugin";
import { voidPlugin } from "void";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    plugins: ["unicorn", "typescript", "oxc", "react"],
    ignorePatterns: ["src/components/ui/**", "src/hooks/use-mobile.ts"],
    categories: {
      correctness: "error",
    },
    rules: {
      "react/rules-of-hooks": "error",
      "react/no-deriving-state-in-effects": "error",
      "react/jsx-no-constructed-context-values": "error",
      "react/no-unstable-nested-components": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  plugins: [
    tailwindcss(),
    voidPlugin(),
    voidReact({
      react: { compiler: true },
      prefetch: { defaultStrategy: "hover" },
    }),
  ],
});
