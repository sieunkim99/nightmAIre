import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./", // 정적 호스팅(아티팩트/GitHub Pages)에서도 에셋 경로가 깨지지 않게
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5799",
    },
  },
});
