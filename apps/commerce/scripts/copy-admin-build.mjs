import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(".medusa/server/public/admin");
const destination = resolve("public/admin");

if (!existsSync(resolve(source, "index.html"))) {
  throw new Error(`Medusa admin build is missing: ${resolve(source, "index.html")}`);
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(resolve(destination, ".."), { recursive: true });
cpSync(source, destination, { recursive: true });
