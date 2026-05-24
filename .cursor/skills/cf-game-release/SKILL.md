---
name: cf-game-release
description: >-
  End-to-end release workflow for the open-source browser FPS cf-game
  (aiyangdie/cf-game): bump version, update docs and cache bust, commit, push
  main for GitHub Pages, tag for Release zip. Use when changing cf-game source,
  finishing a feature, or when the user mentions 更新/推送/发布/上线/在线玩/Pages/Release/版本/游戏包.
---

# CF 网页游戏 · 完整发版流程

> **项目**：穿越火线网页版 · [cf-game](https://github.com/aiyangdie/cf-game)  
> **在线玩**：https://aiyangdie.github.io/cf-game/  
> **原则**：改源码 = 同步版本号 + 文档 + 缓存 + 推送 main + 打 tag。三件事一起做完：**源码 · 游戏包 · 在线站**。

---

## 何时必须走本流程

用户说「更新了」「推送」「上线」「发版」「在线也要最新」或功能改完准备交付时，**默认执行完整 checklist**，不要只改 `game.js` 就结束。

---

## 发版 Checklist（按顺序）

```
- [ ] 1. 功能/修复已完成，本地可玩
- [ ] 2. 确定新版本号（semver patch: 1.0.x）
- [ ] 3. 同步版本到所有文件（见下表）
- [ ] 4. 更新 CHANGELOG.md
- [ ] 5. 更新 README / ROADMAP（如有新功能）
- [ ] 6. node scripts/verify-versions.js 通过
- [ ] 7. git commit + push origin main  → 触发 Pages 在线更新
- [ ] 8. git tag vX.Y.Z + push origin tag → 触发 Release zip
- [ ] 9. 验证在线 config.js 版本与 build
- [ ] 10. 告知用户：在线地址、版本号、Ctrl+F5 强刷
```

---

## 必须同步版本的文件

| 文件 | 改什么 |
|------|--------|
| `package.json` | `"version": "X.Y.Z"` |
| `config.js` | `version`, `build`（如 `20250524-6b`） |
| `config.example.js` | 同上 |
| `index.html` | `style.css?v=N`、`game.js?v=N` **递增 N** |
| `CHANGELOG.md` | 新增 `## [X.Y.Z] - 日期` |
| `README.md` | 当前版本说明、版本历史表、Release 下载名 |
| `scripts/build-release.js` | 若新增静态文件，加入 `INCLUDE` 数组 |

**build 号**：功能发版用 `YYYYMMDD-N`；仅强制刷新缓存可在末尾加字母如 `6b`，不必升主版本。

---

## Git 命令（Windows PowerShell）

```powershell
# 检查
git status
git diff --stat
node scripts/verify-versions.js

# 提交推送（用户明确要求发版时）
git add -A
git commit -m "feat: 简短说明 vX.Y.Z"
git push origin main

# 游戏包 Release（打 tag 后 CI 自动 npm run build 并上传 zip）
git tag vX.Y.Z
git push origin vX.Y.Z
```

- **不要**改 git config；**不要** force push main  
- PowerShell 用 `git commit -m "..."` ，不必 heredoc  
- 只有用户要求或功能交付时才 commit/push

---

## 三件事如何自动更新

| 目标 | 机制 |
|------|------|
| **在线玩** | push `main` → `.github/workflows/pages.yml` 部署 GitHub Pages |
| **游戏包 zip** | push tag `v*` → `.github/workflows/release.yml` 跑 `npm run build` 上传 `dist/cf-game-v*.zip` |
| **源码** | GitHub `main` 分支 |

本地可选：`npm run build` 生成 `dist/cf-game-vX.Y.Z.zip` 自测。

---

## 在线验证

推送后等 1–3 分钟，检查：

```
https://aiyangdie.github.io/cf-game/config.js
```

应看到与本地一致的 `version` 和 `build`。  
主菜单左下角版本标签读取 `CF_CONFIG`。

仅文档/缓存刷新：可只 bump `build` 后缀和 `index.html` 的 `?v=`，再 push main。

---

## 项目结构（发版相关）

```
cf-game/
├── game.js, audio.js, style.css, index.html  # 游戏源码
├── config.js, config.example.js              # 版本号展示
├── scripts/
│   ├── build-release.js                      # Release 打包
│   └── verify-versions.js                    # 发版前校验
├── .github/workflows/
│   ├── pages.yml                             # 在线站
│   └── release.yml                           # 游戏包
└── CHANGELOG.md, README.md, docs/ROADMAP.md
```

---

## 游戏开发约定（发版时别破坏）

- 射击：每帧 `syncCameraRotation()` 后再射线检测  
- 按键：`keysDown` Set + `e.code`；失焦/暂停/解锁鼠标时 `clearAllKeys()`  
- 冲刺：仅 `Shift + W` 向前  
- 新静态资源：加入 `build-release.js` 的 `INCLUDE`  
- 响应用户用**中文**

---

## 发版说明模板（给用户）

```markdown
### 已发布 vX.Y.Z
- **在线**：https://aiyangdie.github.io/cf-game/
- **Release**：https://github.com/aiyangdie/cf-game/releases/tag/vX.Y.Z
- **确认**：主菜单显示「版本 X.Y.Z · build …」
- 旧版缓存：**Ctrl+F5** 强刷
```

---

## 版本历史摘要（维护时更新 README）

| 版本 | 要点 |
|------|------|
| v1.0.6 | 可见飞行子弹、敌人随波次变强 |
| v1.0.5 | 跳跃、冲刺、音效、暂停 |
| v1.0.4 | 音效模块、子弹轨迹、Shift 修复 |
| v1.0.3 | 射击射线、辅助瞄准 |
| v1.0.0 | 开源首发 |

完整记录见 `CHANGELOG.md`。
