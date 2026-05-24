# 参与贡献 Contributing

欢迎一起把 **cf-game** 做成更强的开源网页射击游戏！

## 如何开始

1. **Fork** 本仓库到你的 GitHub
2. **Clone** 到本地  
   `git clone https://github.com/你的用户名/cf-game.git`
3. 创建分支  
   `git checkout -b feature/你的功能名`
4. 本地运行（需 Node 可选）  
   ```bash
   npx serve .
   # 浏览器打开 http://localhost:3000
   ```
5. 修改代码后提交  
   ```bash
   git add .
   git commit -m "feat: 简短说明做了什么"
   git push origin feature/你的功能名
   ```
6. 在 GitHub 上发起 **Pull Request**

## 代码约定

| 文件 | 职责 |
|------|------|
| `game.js` | 游戏逻辑、武器、敌人、道具 |
| `style.css` | 界面与 HUD |
| `index.html` | 页面结构 |
| `config.example.js` | 站点配置模板（复制为 `config.js`） |
| `gate.js` | 访问密码门（可选） |

- 改完请在 `CHANGELOG.md` 的 **Unreleased** 或新版本下写清楚：**新增 / 改动 / 修复**
- 静态资源改版本号：`index.html` 里 `game.js?v=`、`style.css?v=` 递增，避免缓存
- 提交信息建议：`feat:` `fix:` `docs:` `chore:`（中文或英文均可）

## 功能方向（欢迎认领）

见 [docs/ROADMAP.md](docs/ROADMAP.md)，包括但不限于：

- 手雷、狙击枪、更多地图
- 音效与背景音乐
- 多人联机
- 移动端虚拟摇杆

认领可在 Issue 里评论「我来做这个」。

## Issue 报告 Bug

请说明：

1. 浏览器与系统  
2. 复现步骤  
3. 期望 vs 实际  
4. 截图（如有）

## 行为准则

友善、尊重、对事不对人。恶意骚扰不予合并。

---

维护者：[@aiyangdie](https://github.com/aiyangdie)
