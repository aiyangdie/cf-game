/**
 * 发版前检查：各文件版本号、cache、CHANGELOG、versions.json、git tag
 * 用法: node scripts/verify-versions.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

const pkg = JSON.parse(read("package.json"));
const version = pkg.version;
const errors = [];
const warnings = [];

["config.js", "config.example.js"].forEach((file) => {
  const m = read(file).match(/version:\s*"([^"]+)"/);
  if (!m || m[1] !== version) {
    errors.push(`${file} version "${m ? m[1] : "?"}" !== package.json ${version}`);
  }
});

const html = read("index.html");
const jsCache = html.match(/game\.js\?v=(\d+)/);
const cssCache = html.match(/style\.css\?v=(\d+)/);
if (!jsCache || !cssCache) {
  errors.push("index.html missing game.js?v= or style.css?v=");
} else if (jsCache[1] !== cssCache[1]) {
  errors.push(`index.html cache mismatch: game.js?v=${jsCache[1]} vs style.css?v=${cssCache[1]}`);
}

const changelog = read("CHANGELOG.md");
if (!changelog.includes(`## [${version}]`)) {
  errors.push(`CHANGELOG.md missing section ## [${version}]`);
}

const versionsPath = path.join(ROOT, "docs/versions.json");
if (fs.existsSync(versionsPath)) {
  const registry = JSON.parse(read("docs/versions.json"));
  if (registry.current !== version) {
    errors.push(`docs/versions.json current "${registry.current}" !== ${version}`);
  }
  const entry = registry.releases.find((r) => r.version === version);
  if (!entry) {
    errors.push(`docs/versions.json missing release entry for ${version}`);
  } else if (jsCache && String(entry.cache) !== jsCache[1]) {
    warnings.push(`versions.json cache ${entry.cache} vs index.html v=${jsCache[1]}`);
  }
}

try {
  const tags = execSync("git tag -l", { cwd: ROOT, encoding: "utf8" });
  if (!tags.split("\n").includes(`v${version}`)) {
    warnings.push(`git tag v${version} not found locally (发版后需打 tag)`);
  }
} catch {
  warnings.push("Could not read git tags");
}

if (warnings.length) {
  console.warn("Warnings:");
  warnings.forEach((w) => console.warn("  -", w));
  console.warn("");
}

if (errors.length) {
  console.error("Version check FAILED:\n");
  errors.forEach((e) => console.error("  -", e));
  process.exit(1);
}

console.log(`OK  v${version}  cache=v${jsCache[1]}`);
console.log("  package.json, config, CHANGELOG, versions.json aligned");
