# 版本管理说明

> **原则**：每个版本都要**先留档、再打 tag、再 push**。Git 标签 = 版本快照，Release zip = 可下载的游戏包，Pages = 在线试玩。

---

## 三个「版本」分别是什么

| 名称 | 存在哪 | 作用 |
|------|--------|------|
| **SemVer** `1.0.x` | `package.json`、`config.js`、`CHANGELOG` | 对外版本号 |
| **build** `20250524-6b` | `config.js` | 同版本多次部署 / 强刷缓存 |
| **cache** `?v=14` | `index.html` | 浏览器不读旧 JS/CSS |

**版本台账（单一查阅）**：[`docs/versions.json`](versions.json) — 列出所有已发布版本、tag、cache、摘要。

---

## 标准发版流程（每个版本必做）

```
1. 开发完成，本地能玩
2. npm run version:patch          # 或 version:1.0.7 指定版本
3. 编辑 CHANGELOG 新章节（脚本会生成空模板）
4. 编辑 docs/versions.json 顶部新版本的 summary（脚本会追加条目）
5. npm run verify                 # 全部文件版本一致
6. git add -A && git commit -m "release: vX.Y.Z 简述"
7. git tag vX.Y.Z                 # ★ 版本快照，必须打
8. git push origin main
9. git push origin vX.Y.Z         # 触发 Release 打包 zip
10. 等 Pages 部署，检查在线 config.js
```

**顺序不能乱**：先 commit，再 tag 打在**该 commit 上**，再 push。

---

## Git 里版本怎么「留下来」

| 机制 | 说明 |
|------|------|
| **`git tag v1.0.x`** | 永久标记某一 commit，GitHub Releases 对应此 tag |
| **`CHANGELOG.md`** | 人类可读的更新说明 |
| **`docs/versions.json`** | 机器可读的版本列表，便于核对 |
| **Git 历史** | 每个 commit 都是记录，tag 是「正式版」书签 |

缺 tag 的版本（如历史 v1.0.4）在 `versions.json` 里注明，**不要**随意补打旧 tag，以免和现有 Release 冲突。

---

## 常用命令

```bash
# 升 patch 版本（1.0.6 → 1.0.7），自动改 config、cache、台账
npm run version:patch

# 指定版本号
npm run version -- 1.1.0

# 发版前检查
npm run verify

# 本地打 zip 自测
npm run build
```

---

## 发版检查清单

- [ ] `package.json` / `config.js` / `config.example.js` 版本一致
- [ ] `index.html` 里 `style.css?v=` 与 `game.js?v=` 已递增且**相同**
- [ ] `CHANGELOG.md` 有 `## [X.Y.Z]` 章节
- [ ] `docs/versions.json` 的 `current` 与最新 release 一致
- [ ] 已打 `git tag vX.Y.Z` 并 push tag
- [ ] 在线 https://aiyangdie.github.io/cf-game/config.js 版本正确

---

## 在线确认

主菜单左下角：**版本 X.Y.Z · build …**（读 `config.js`）。

强刷：**Ctrl+F5**。

---

## 相关文件

- [`CHANGELOG.md`](../CHANGELOG.md) — 详细更新日志  
- [`docs/versions.json`](versions.json) — 版本台账  
- [`scripts/bump-version.js`](../scripts/bump-version.js) — 一键升版本  
- [`scripts/verify-versions.js`](../scripts/verify-versions.js) — 发版前校验  
