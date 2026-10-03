import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const mode = process.argv[2];
if (mode !== "server" && mode !== "worker") {
  throw new Error("Usage: node scripts/start-medusa.mjs <server|worker>");
}

const defaultPort = mode === "server" ? "9000" : "9100";
const port = process.env.PORT ?? defaultPort;
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const medusaCli = resolve("node_modules/@medusajs/cli/cli.js");
if (!existsSync(medusaCli)) {
  throw new Error(`Medusa CLI was not found at ${medusaCli}`);
}

console.info(`Starting Medusa in ${mode} mode on port ${port}.`);
const child = spawn(process.execPath, [medusaCli, "start", "--port", port], {
  env: { ...process.env, MEDUSA_WORKER_MODE: mode },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error("Failed to start Medusa CLI.", error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
