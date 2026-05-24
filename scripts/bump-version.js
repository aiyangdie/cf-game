/**
 * 一键升版本：同步 package.json、config、index.html cache、versions.json、CHANGELOG 模板
 *
 * 用法:
 *   node scripts/bump-version.js patch
 *   node scripts/bump-version.js 1.0.7
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function write(file, content) {
  fs.writeFileSync(path.join(ROOT, file), content, "utf8");
}

function parseSemver(v) {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bump(current, kind) {
  const s = parseSemver(current);
  if (kind === "major") {
    s.major += 1;
    s.minor = 0;
    s.patch = 0;
  } else if (kind === "minor") {
    s.minor += 1;
    s.patch = 0;
  } else if (kind === "patch") {
    s.patch += 1;
  } else {
    return kind;
  }
  return formatSemver(s);
}

function todayBuild() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function replaceConfigVersion(content, version, build) {
  let out = content.replace(/version:\s*"[^"]+"/, `version: "${version}"`);
  out = out.replace(/build:\s*"[^"]+"/, `build: "${build}"`);
  return out;
}

function replacePackageVersion(content, version) {
  const pkg = JSON.parse(content);
  pkg.version = version;
  return JSON.stringify(pkg, null, 2) + "\n";
}

function replaceHtmlCache(content, cacheNum) {
  return content
    .replace(/style\.css\?v=\d+/g, `style.css?v=${cacheNum}`)
    .replace(/game\.js\?v=\d+/g, `game.js?v=${cacheNum}`);
}

function prependChangelog(version, date) {
  const body = read("CHANGELOG.md");
  const block = `## [${version}] - ${date}

### 新增 Added

- （填写本版本新功能）

### 修复 Fixed

- （填写修复项）

### 改动 Changed

- 资源 \`v=（cache 号）\`

---

`;
  if (body.includes(`## [${version}]`)) {
    console.log("CHANGELOG already has section for", version);
    return;
  }
  const marker = "格式基于 [Keep a Changelog]";
  const idx = body.indexOf(marker);
  const afterIntro = body.indexOf("\n---\n", idx);
  if (afterIntro === -1) {
    write("CHANGELOG.md", block + body);
    return;
  }
  const insertPos = afterIntro + 5;
  write("CHANGELOG.md", body.slice(0, insertPos) + "\n" + block + body.slice(insertPos));
}

function updateVersionsJson(version, build, cache, date) {
  const file = path.join(ROOT, "docs/versions.json");
  const data = JSON.parse(read("docs/versions.json"));
  data.current = version;
  const exists = data.releases.some((r) => r.version === version);
  if (!exists) {
    data.releases.unshift({
      version,
      date,
      build,
      cache,
      gitTag: `v${version}`,
      summary: "（发版时填写摘要）",
    });
  } else {
    const r = data.releases.find((x) => x.version === version);
    r.build = build;
    r.cache = cache;
    r.date = date;
    if (!r.gitTag) r.gitTag = `v${version}`;
  }
  write("docs/versions.json", JSON.stringify(data, null, 2) + "\n");
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/bump-version.js patch|minor|major|1.0.7");
    process.exit(1);
  }

  const pkg = JSON.parse(read("package.json"));
  const oldVersion = pkg.version;
  const newVersion = ["patch", "minor", "major"].includes(arg)
    ? bump(oldVersion, arg)
    : arg;

  parseSemver(newVersion);

  const versionsData = JSON.parse(read("docs/versions.json"));
  const lastCache = versionsData.releases[0]?.cache || 14;
  const newCache = lastCache + 1;

  const dateStr = new Date().toISOString().slice(0, 10);
  const build = `${todayBuild()}-${parseSemver(newVersion).patch}`;

  write("package.json", replacePackageVersion(read("package.json"), newVersion));
  write("config.js", replaceConfigVersion(read("config.js"), newVersion, build));
  write("config.example.js", replaceConfigVersion(read("config.example.js"), newVersion, build));
  write("index.html", replaceHtmlCache(read("index.html"), newCache));
  prependChangelog(newVersion, dateStr);
  updateVersionsJson(newVersion, build, newCache, dateStr);

  console.log("");
  console.log(`Version: ${oldVersion} → ${newVersion}`);
  console.log(`Build:   ${build}`);
  console.log(`Cache:   v=${newCache}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Edit CHANGELOG.md and docs/versions.json summary");
  console.log("  2. npm run verify");
  console.log(`  3. git commit -m "release: v${newVersion} ..."`);
  console.log(`  4. git tag v${newVersion}`);
  console.log("  5. git push origin main && git push origin v" + newVersion);
  console.log("");
}

main();
