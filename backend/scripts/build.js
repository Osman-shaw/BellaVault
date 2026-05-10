/**
 * Backend build verifier.
 *
 * A plain Node.js + Express app has no compilation step, so "build" here means
 * proving the codebase is deploy-ready:
 *   1. Every .js file under src/ parses with `node --check` (catches syntax errors).
 *   2. The entire module graph resolves (catches typos in require(), missing files,
 *      circular import problems, broken npm deps).
 *   3. createApp() runs without throwing (catches wiring errors in routes,
 *      middleware, validators, model registration, etc.).
 *
 * Runs no DB connection and starts no HTTP listener — safe for CI and pre-deploy.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

function* walkJsFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJsFiles(full);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      yield full;
    }
  }
}

function step(label, fn) {
  const startedAt = Date.now();
  process.stdout.write(`> ${label} ... `);
  try {
    const result = fn();
    const ms = Date.now() - startedAt;
    console.log(`ok (${ms}ms)${result ? ` — ${result}` : ""}`);
  } catch (error) {
    console.log("FAILED");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}

console.log("Backend build verification");
console.log("--------------------------");

step("Syntax-check every JS file in src/", () => {
  let count = 0;
  for (const file of walkJsFiles(srcRoot)) {
    execSync(`node --check "${file}"`, { stdio: "pipe" });
    count += 1;
  }
  return `${count} files validated`;
});

step("Resolve the full module graph and build Express app", () => {
  const { createApp } = require(path.join(srcRoot, "server", "app.js"));
  const app = createApp();
  if (!app || typeof app.use !== "function") {
    throw new Error("createApp() did not return an Express application");
  }
  return "module graph resolves, app instantiated";
});

console.log("\nBackend build OK.");
