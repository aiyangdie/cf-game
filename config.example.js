/**
 * 站点配置模板
 * 复制本文件为 config.js 后修改（config.js 已在 .gitignore，不会提交密码）
 */
window.CF_CONFIG = {
  /** 访问密码门：适合自建网站简单限制访客（非银行级安全，密码在前端可见） */
  accessGate: {
    enabled: false,
    password: "cf2025",
    title: "穿越火线 · 网页版",
    hint: "请输入访问码进入游戏",
  },
  /** 显示在关于/页脚 */
  siteName: "CF Web Edition",
  version: "1.0.0",
};
