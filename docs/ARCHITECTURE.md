# 架构说明 Architecture

> 目标：静态部署、无构建步骤、模块边界清晰，便于协作与扩展。

## 目录结构

```
cf-game/
├── index.html          # 入口与 UI 骨架
├── game.js             # 主循环、场景、战斗（逐步瘦身）
├── progression.js      # 军械库 / GP / 存档
├── audio.js            # 音效
├── gate.js             # 可选访问门
├── config.js           # 站点配置
├── data/
│   └── weapons.json    # 武器数据（Mod 参考）
├── js/
│   ├── core/           # 常量、状态机、键位
│   ├── data/           # 数据表加载
│   └── systems/        # 独立玩法系统（手雷、连杀…）
├── docs/               # 文档与版本台账
└── scripts/            # 发版与校验工具
```

## 全局命名空间

| 对象 | 职责 |
|------|------|
| `window.CFGame` | 核心模块容器（Constants、GameState、Weapons、Grenade、Combo） |
| `window.CFProgression` | 永久成长与军械库 |
| `window.CFAudio` | 音效 |
| `window.CF_CONFIG` | 部署配置 |

**约定**：新增系统放在 `js/systems/`，通过 `CFGame.*` 暴露，在 `game.js` 中注入回调，避免循环依赖。

## 游戏状态机

```
MENU → PLAYING ⇄ PAUSE
         ↓
       SHOP（波次间隙）
         ↓
      PLAYING
         ↓
     GAMEOVER → MENU
```

使用 `CFGame.GameState` 枚举，禁止魔法字符串。

## 脚本加载顺序

见 `index.html`：`config` → `gate` → `audio` → `progression` → **core/data/systems** → Three.js → `game.js`。

## 发版

见 [VERSIONING.md](VERSIONING.md)。改 `js/` 下任意文件需递增 `index.html` 中统一的 `?v=` 缓存号。
