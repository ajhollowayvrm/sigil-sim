/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the project site under /<repo>/. Vite needs that as the
// base so built asset URLs resolve. Dev/preview/test stay at root.
// Override with BASE_PATH if the repo is ever renamed or served elsewhere.
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === "production" ? "/sigil-sim/" : "/");

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
