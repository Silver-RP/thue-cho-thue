import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/thue-cho-thue/",
  // Polyfill modulepreload của Vite chứa fetch(; trình duyệt hiện đại không cần.
  build: { modulePreload: { polyfill: false } },
  test: { globals: true, include: ["tests/**/*.test.ts"] },
});
