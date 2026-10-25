import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const reactDir = path.dirname(require.resolve("react"));
const reactDomDir = path.dirname(require.resolve("react-dom"));

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const reactEnv = isBuild ? "production.min" : "development";
  const reactDomEnv = isBuild ? "production.min" : "development";

  return {
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: /^react$/,
          replacement: path.join(reactDir, `cjs/react.${reactEnv}.js`),
        },
        {
          find: /^react\/jsx-runtime$/,
          replacement: path.join(
            reactDir,
            `cjs/react-jsx-runtime.${reactEnv}.js`
          ),
        },
        {
          find: /^react\/jsx-dev-runtime$/,
          replacement: path.join(
            reactDir,
            `cjs/react-jsx-dev-runtime.${reactEnv}.js`
          ),
        },
        {
          find: /^react-dom$/,
          replacement: path.join(
            reactDomDir,
            `cjs/react-dom.${reactDomEnv}.js`
          ),
        },
        {
          find: /^react-dom\/client$/,
          replacement: path.resolve(
            __dirname,
            "src/react-dom-client-shim.ts"
          ),
        },
        {
          find: /^borsh$/,
          replacement: path.resolve(__dirname, "src/borsh-esm.ts"),
        },
        {
          find: /^@coral-xyz\/borsh$/,
          replacement: path.resolve(__dirname, "src/coral-borsh-esm.ts"),
        },
      ],
    },
    server: {
      port: 5173,
      // 本地開發時，將 /api 請求自動轉發給 Cloudflare Worker (8787 埠號)
      proxy: {
        "/api": {
          target: "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
  };
});
