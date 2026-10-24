import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/firebase-e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 5174",
    env: { ...process.env, VITE_FIREBASE_EMULATORS: "true" },
    url: "http://127.0.0.1:5174",
    timeout: 30000,
  },
  reporter: "list",
});
