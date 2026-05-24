# 参与贡献 Contributing

欢迎一起把 **cf-game** 做成更强的开源网页射击游戏！

## 如何开始

1. **Fork** 本仓库到你的 GitHub
2. **Clone** 到本地  
   `git clone https://github.com/你的用户名/cf-game.git`
3. 创建分支  
   `git checkout -b feature/你的功能名`
4. 本地运行  
   ```bash
   npm start
   # 或 npx serve . -p 3000
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
| `game.js` | 游戏逻辑：移动、武器、敌人、道具、射击 |
| `audio.js` | Web Audio 程序化音效 |
| `style.css` | 界面与 HUD |
| `index.html` | 页面结构、脚本引用、缓存版本号 |
| `config.js` / `config.example.js` | 站点配置（版本号、密码门） |
| `gate.js` | 访问密码门（可选） |
| `scripts/build-release.js` | Release zip 打包 |

### 发版 checklist（维护者 / 较大 PR）

- [ ] 功能在 Chrome / Edge 桌面浏览器测试通过
- [ ] 更新 `CHANGELOG.md`（新增 / 改动 / 修复）
- [ ] 同步 `package.json`、`config.js`、`config.example.js` 的 `version` / `build`
- [ ] `index.html` 中 `style.css?v=`、`game.js?v=` **递增**
- [ ] 若新增静态文件，加入 `scripts/build-release.js` 的 `INCLUDE` 列表
- [ ] 必要时更新 `README.md`、`docs/ROADMAP.md`
- [ ] 运行 `npm run verify` 检查版本号一致
- [ ] 完整发版流程见 [`.cursor/skills/cf-game-release/SKILL.md`](.cursor/skills/cf-game-release/SKILL.md)

- 提交信息建议：`feat:` `fix:` `docs:` `chore:`（中文或英文均可）

## 功能方向（欢迎认领）

见 [docs/ROADMAP.md](docs/ROADMAP.md)，包括但不限于：

- 手雷、狙击枪、更多地图
- 更丰富的音效与背景音乐
- 蹲伏、滑铲、更多移动动作
- 多人联机
- 移动端虚拟摇杆

认领可在 Issue 里评论「我来做这个」。

## Issue 报告 Bug

请说明：

1. **版本号**（主菜单左下角，如 `1.0.5 · build 20250524-5`）
2. 浏览器与系统  
3. 复现步骤  
4. 期望 vs 实际  
5. 截图（如有）

## 行为准则

友善、尊重、对事不对人。恶意骚扰不予合并。

---

维护者：[@aiyangdie](https://github.com/aiyangdie)
