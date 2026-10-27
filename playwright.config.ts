import { defineConfig, devices } from "@playwright/test";

// T10: kiểm trên trình duyệt thật (bố cục, số khớp, đồng hồ, tiếp cận). Kịch bản: docs/autodev/CRITICS.md.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173/thue-cho-thue/",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "yarn -s build && yarn -s vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/thue-cho-thue/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
