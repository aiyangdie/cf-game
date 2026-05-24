/**
 * 打包可部署的静态站点 zip，供 GitHub Releases 下载
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = pkg.version;
const distDir = path.join(ROOT, "dist");
const outName = `cf-game-v${version}`;
const stageDir = path.join(distDir, outName);

const INCLUDE = [
  "index.html",
  "game.js",
  "audio.js",
  "style.css",
  "favicon.svg",
  "gate.js",
  "config.js",
  "config.example.js",
  "LICENSE",
  "README.md",
  "CHANGELOG.md",
];

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

rmrf(distDir);
fs.mkdirSync(stageDir, { recursive: true });

INCLUDE.forEach((file) => {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(stageDir, file));
});

const zipPath = path.join(distDir, `${outName}.zip`);
if (process.platform === "win32") {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: "inherit" }
  );
} else {
  execSync(`cd "${stageDir}" && zip -r "../${outName}.zip" .`, { stdio: "inherit" });
}

console.log("\n✓ Release package:", zipPath);
console.log("  Deploy: unzip and upload to any static host, or use folder as GitHub Pages root.\n");
