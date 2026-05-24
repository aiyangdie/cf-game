/**
 * 站点配置模板
 * 复制本文件为 config.js 后修改（自建站可将 config.js 加入 .gitignore 避免提交密码）
 */
window.CF_CONFIG = {
  /** 访问密码门：适合自建网站简单限制访客（非银行级安全，密码在前端可见） */
  accessGate: {
    enabled: false,
    password: "cf2025",
    title: "穿越火线 · 网页版",
    hint: "请输入访问码进入游戏",
  },
  /** 显示在主菜单版本标签 */
  siteName: "CF Web Edition",
  version: "1.1.0",
  build: "20260524-0",
};
