# 穿越火线 · 网页版 CF（开源）

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/play-online-blue)](https://aiyangdie.github.io/cf-game/)
[![Release](https://img.shields.io/github/v/release/aiyangdie/cf-game)](https://github.com/aiyangdie/cf-game/releases)

基于 **Three.js** 的浏览器第一人称射击游戏，致敬 CF 玩法。  
**完全开源（MIT）**，欢迎 Fork、PR，一起做大做强。

| | |
|---|---|
| **在线试玩** | https://aiyangdie.github.io/cf-game/ |
| **下载发布包** | [Releases](https://github.com/aiyangdie/cf-game/releases/latest) |
| **更新记录** | [CHANGELOG.md](CHANGELOG.md) · [版本台账](docs/versions.json) |
| **版本管理** | [docs/VERSIONING.md](docs/VERSIONING.md) |
| **参与贡献** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **路线图** | [docs/ROADMAP.md](docs/ROADMAP.md) |

> 主菜单会显示 **版本号 / build 号**。若与 [最新 Release](https://github.com/aiyangdie/cf-game/releases/latest) 不一致，请 **Ctrl+F5** 强刷。

---

## 当前版本 v1.1.0 有什么

### 玩法
- 波次敌人、掩体、可见飞行子弹、难度曲线（新兵/老兵/精英）
- **三把武器** + **军械库升级**（GP 购买，永久保存）
- 每波清场 → **军械库** 升级火力 / 弹匣 / 防弹衣 / 生命 / 速度
- 军衔等级与 GP 显示在 HUD

### 音效（`audio.js`）
Web Audio 程序化合成，无需外部音频文件：
枪声 / 换弹 / 命中 / 爆头 / 击杀 / 受伤 / 拾取 / 过关 / 脚步 / 跳跃 / 落地  
按 **`M`** 开关音效。

### 工程化
- 源码即网站，推送 `main` 自动部署 [GitHub Pages](https://aiyangdie.github.io/cf-game/)
- `npm run build` 打 zip，附在 **GitHub Releases**
- 可选 **访问密码门**（自建站简单限访）
- 主菜单显示版本号，资源带 `?v=` 防缓存

### 后续计划（欢迎一起做）
手雷 · 狙击枪 · 多地图 · 多人联机 → 见 [ROADMAP](docs/ROADMAP.md)

---

## 操作说明

| 按键 | 功能 |
|------|------|
| W A S D | 移动 |
| Shift + W | 向前冲刺（须按住 W，不能同时按 S） |
| Space | 跳跃 |
| 鼠标 | 瞄准（点击画面锁定） |
| 左键 | 射击 / 挥刀 |
| 1 / 2 / 3 | AK / 沙鹰 / 军刀 |
| R | 换弹 |
| ESC / P | 暂停 / 继续 |
| M | 开关音效 |

**小技巧：** Shift 卡住时按 **ESC 暂停 → P 继续** 可重置按键状态。

---

## 快速开始

### 在线
打开：https://aiyangdie.github.io/cf-game/ → **Ctrl+F5** 强刷

### 本地开发
```bash
git clone https://github.com/aiyangdie/cf-game.git
cd cf-game
npm start
# 浏览器 http://localhost:3000
```

或直接双击 / 用浏览器打开 `index.html`（推荐 Chrome / Edge）。

### 下载 Release 部署到自己的服务器
1. 打开 [Releases](https://github.com/aiyangdie/cf-game/releases/latest) 下载 `cf-game-v1.0.6.zip`
2. 解压到网站根目录
3. 用 Nginx / Apache / 对象存储静态托管即可

---

## 访问密码门（可选）

适合「只想让知道密码的人玩」，**不是**服务端级安全（懂技术的人仍可在前端看到逻辑）。

1. 复制 `config.example.js` → `config.js`
2. 修改：

```javascript
window.CF_CONFIG = {
  accessGate: {
    enabled: true,
    password: "你的密码",
    title: "穿越火线 · 网页版",
    hint: "请输入访问码",
  },
  siteName: "CF Web Edition",
  version: "1.0.6",
  build: "20250524-6",
};
```

3. 重新部署。同一会话内输入一次即可（`sessionStorage`）。

公开演示站默认 **关闭** 密码门。

---

## 参与开源

1. Fork 本仓库  
2. 新分支 `feature/xxx`  
3. 改代码 + 更新 `CHANGELOG.md`  
4. 发起 Pull Request  

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 项目结构

```
cf-game/
├── index.html          # 入口页面
├── game.js             # 游戏主逻辑（移动、射击、敌人、道具）
├── audio.js            # 程序化音效（Web Audio）
├── style.css           # 界面与 HUD
├── favicon.svg         # 站点图标
├── gate.js             # 访问密码门
├── config.js           # 站点配置（演示站，含版本号）
├── config.example.js   # 配置模板
├── scripts/
│   └── build-release.js  # Release 打包脚本
├── docs/
│   └── ROADMAP.md      # 产品路线图
├── .github/
│   ├── workflows/      # Pages 部署 + Release 打包
│   └── ISSUE_TEMPLATE/
├── CHANGELOG.md        # 版本更新说明
├── CONTRIBUTING.md     # 贡献指南
└── LICENSE             # MIT
```

---

## 部署到 GitHub Pages

1. Fork 或 Push 到 `main`
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
3. 推送后 Actions 自动发布

---

## 版本与发布流程（维护者）

```bash
# 1. 改版本号：package.json、config.js、config.example.js、CHANGELOG.md
# 2. 递增 index.html 里 style.css?v= 和 game.js?v=
# 3. 提交并推送
git add .
git commit -m "release: v1.0.6"
git push origin main

# 4. 打标签触发 Release 工作流（自动上传 zip）
git tag v1.0.6
git push origin v1.0.6
```

---

## 版本历史（摘要）

| 版本 | 要点 |
|------|------|
| **v1.1.0** | 军械库 GP 升级、武器/角色/装备成长 |
| **v1.0.7** | 版本台账、发版脚本与 VERSIONING 文档 |
| **v1.0.6** | 可见飞行子弹、敌人随波次变强（新兵/老兵/精英） |
| **v1.0.5** | 跳跃、冲刺优化、脚步声、head bob |
| **v1.0.4** | 音效、暂停、子弹轨迹、Shift 卡住修复 |
| **v1.0.3** | 射击射线修复、辅助瞄准、弹着点反馈 |
| **v1.0.2** | 武器栏点击、穿墙/可见性修复 |
| **v1.0.0** | 开源首发、三武器、道具、爆头、Pages |

完整记录见 [CHANGELOG.md](CHANGELOG.md)。

---

## 免责声明

非腾讯「穿越火线」官方产品，仅供学习与交流。

---

## English (brief)

**CF Web Edition** — open-source browser FPS inspired by CrossFire, built with Three.js.

- **Play:** https://aiyangdie.github.io/cf-game/
- **Download:** [Releases](https://github.com/aiyangdie/cf-game/releases/latest)
- **License:** MIT
- **Controls:** WASD move · Shift+W sprint · Space jump · LMB shoot · 1/2/3 weapons · R reload · ESC/P pause · M mute

PRs welcome. See [ROADMAP](docs/ROADMAP.md) for grenades, sniper, maps, and multiplayer.

---

**Stars ⭐ 是对开源最大的鼓励！** 一起把手雷、狙击、多人做出来。
