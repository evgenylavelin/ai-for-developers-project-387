import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT ?? 4173);
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? 3001);
const baseURL = `http://127.0.0.1:${frontendPort}`;
const canReuseFrontendServer = !process.env.CI && backendPort === 3001;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: `PORT=${backendPort} npm --prefix apps/backend run dev`,
      port: backendPort,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `VITE_API_PROXY_TARGET=http://127.0.0.1:${backendPort} npm --prefix apps/frontend run dev -- --host 0.0.0.0 --port ${frontendPort}`,
      port: frontendPort,
      reuseExistingServer: canReuseFrontendServer,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});