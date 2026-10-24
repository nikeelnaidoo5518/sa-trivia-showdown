import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const preload = fileURLToPath(
  new URL("./emulator-loopback.cjs", import.meta.url),
);
const cli = fileURLToPath(
  new URL(
    "../node_modules/firebase-tools/lib/bin/firebase.js",
    import.meta.url,
  ),
);
const child = spawn(
  process.execPath,
  [
    cli,
    "emulators:exec",
    "--project",
    "demo-sa-trivia-showdown",
    "--only",
    "auth,database",
    "node --test tests/firebase.rules.mjs && playwright test --config playwright.firebase.config.js",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(preload)}`,
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
