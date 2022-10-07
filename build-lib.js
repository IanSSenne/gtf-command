const esbuild = require("esbuild");
const fs = require("fs");
function getLicenceText() {
  const licence = fs.readFileSync("LICENSE", "utf8");
  return `/*!
${licence}

original source: https://github.com/IanSSenne/gtf/blob/master/src/lib/command.ts
author: Ian Senne
*/`;
}
esbuild.build({
  entryPoints: ["./src/command.ts"],
  bundle: true,
  external: ["mojang-minecraft", "mojang-gametest", "mojang-minecraft-ui"],
  outfile: "dist/command.js",
  format: "esm",
  platform: "node",
  minify: false,
  allowOverwrite: true,
  footer: {
    js: getLicenceText(),
  },
});
esbuild.build({
  entryPoints: ["./src/command.ts"],
  bundle: true,
  external: ["mojang-minecraft", "mojang-gametest", "mojang-minecraft-ui"],
  outfile: "dist/command.min.js",
  format: "esm",
  platform: "node",
  minify: true,
  allowOverwrite: true,
  footer: {
    js: getLicenceText(),
  },
});
