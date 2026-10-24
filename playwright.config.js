import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    env: {
      ...process.env,
      VITE_FIREBASE_DATABASE_URL: "",
      VITE_FIREBASE_EMULATORS: "false",
      VITE_LOCAL_RELAY_URL: "",
      PORT: "3001",
    },
    timeout: 30000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
