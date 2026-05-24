# 穿越火线 · 网页版 CF（开源）

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/play-online-blue)](https://aiyangdie.github.io/cf-game/)
[![Release](https://img.shields.io/github/v/release/aiyangdie/cf-game)](https://github.com/aiyangdie/cf-game/releases)

基于 **Three.js** 的浏览器第一人称射击游戏，致敬 CF 玩法。  
**完全开源（MIT）**，欢迎 Fork、PR，一起做大做强。

| | |
|---|---|
| **在线试玩** | https://aiyangdie.github.io/cf-game/ |
| **下载发布包** | [Releases](https://github.com/aiyangdie/cf-game/releases) |
| **更新记录** | [CHANGELOG.md](CHANGELOG.md) |
| **参与贡献** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **路线图** | [docs/ROADMAP.md](docs/ROADMAP.md) |

---

## 当前版本 v1.0.0 有什么

### 玩法
- 波次敌人、掩体躲子弹、碰撞不穿墙
- **三把武器**：`1` AK47 · `2` 沙鹰 · `3` 军刀
- **道具**：绿十字补血、橙箱补弹（走近拾取，击杀概率掉落）
- **爆头**：大字「爆头!」+ 统计

### 工程化
- 源码即网站，推送 `main` 自动部署 Pages
- `npm run build` 打 zip，附在 **GitHub Releases**
- 可选 **访问密码门**（自建站简单限访）

### 后续计划（欢迎一起做）
手雷 · 狙击枪 · 音效 · 多地图 · 多人联机 → 见 [ROADMAP](docs/ROADMAP.md)

---

## 操作

| 按键 | 功能 |
|------|------|
| W A S D | 移动 |
| Shift | 冲刺 |
| 鼠标 | 瞄准（点击画面锁定） |
| 左键 | 射击 / 挥刀 |
| 1 / 2 / 3 | AK / 沙鹰 / 军刀 |
| R | 换弹 |
| ESC | 暂停 |

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

或直接双击 / 用浏览器打开 `index.html`。

### 下载 Release 部署到自己的服务器
1. 打开 [Releases](https://github.com/aiyangdie/cf-game/releases) 下载 `cf-game-v1.0.0.zip`
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
    enabled: true,      // 开启
    password: "你的密码",
    title: "穿越火线 · 网页版",
    hint: "请输入访问码",
  },
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
├── index.html          # 入口
├── game.js             # 游戏主逻辑
├── style.css           # 样式
├── gate.js             # 访问密码门
├── config.js           # 站点配置（演示站）
├── config.example.js   # 配置模板
├── scripts/
│   └── build-release.js
├── docs/
│   └── ROADMAP.md
├── .github/workflows/  # Pages 部署 + Release 打包
├── CHANGELOG.md
├── CONTRIBUTING.md
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
# 1. 改版本号 package.json + CHANGELOG.md
# 2. 提交
git add .
git commit -m "release: v1.0.0"
git push origin main

# 3. 打标签触发 Release 工作流（自动上传 zip）
git tag v1.0.0
git push origin v1.0.0
```

---

## 免责声明

非腾讯「穿越火线」官方产品，仅供学习与交流。  

---

## English (brief)

Open-source browser FPS inspired by CrossFire. MIT licensed.  
Play: https://aiyangdie.github.io/cf-game/ · Download: [Releases](https://github.com/aiyangdie/cf-game/releases) · PRs welcome.

---

**Stars ⭐ 是对开源最大的鼓励！** 一起把手雷、狙击、多人做出来。
