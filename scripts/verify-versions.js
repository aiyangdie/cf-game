/**
 * 发版前检查：package.json / config / index.html 版本是否一致
 * 用法: node scripts/verify-versions.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

const pkg = JSON.parse(read("package.json"));
const version = pkg.version;

const configs = ["config.js", "config.example.js"];
const errors = [];

configs.forEach((file) => {
  const m = read(file).match(/version:\s*"([^"]+)"/);
  if (!m || m[1] !== version) {
    errors.push(`${file} version "${m ? m[1] : "?"}" !== package.json ${version}`);
  }
});

const html = read("index.html");
const cacheMatch = html.match(/game\.js\?v=(\d+)/);
if (!cacheMatch) {
  errors.push("index.html missing game.js?v= cache bust");
}

const changelog = read("CHANGELOG.md");
if (!changelog.includes(`## [${version}]`)) {
  errors.push(`CHANGELOG.md missing section ## [${version}]`);
}

if (errors.length) {
  console.error("Version check FAILED:\n");
  errors.forEach((e) => console.error("  -", e));
  process.exit(1);
}

console.log(`OK  v${version}  cache=v${cacheMatch[1]}`);
console.log("  package.json, config.js, config.example.js, CHANGELOG aligned");
