// Builds aegis-core into a single IIFE bundle for the Chrome extension.
// Output: dist/aegis-core.browser.js
// The extension loads this as a content script before content.js.
// All exports are attached to the global `AegisCore` object.

const esbuild = require("esbuild");
const path    = require("path");

esbuild.build({
  entryPoints: [path.join(__dirname, "../src/index.ts")],
  bundle:      true,
  format:      "iife",
  globalName:  "AegisCore",
  outfile:     path.join(__dirname, "../dist/aegis-core.browser.js"),
  target:      ["chrome100"],
  minify:      false, // keep readable for debugging during buildathon
  sourcemap:   false,
}).then(() => {
  console.log("✅ aegis-core browser bundle → dist/aegis-core.browser.js");
}).catch((err) => {
  console.error("❌ Bundle failed:", err);
  process.exit(1);
});
