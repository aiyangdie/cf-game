(function () {
  "use strict";

  const cfg = (window.CF_CONFIG && window.CF_CONFIG.accessGate) || { enabled: false };
  if (!cfg.enabled) return;

  const STORAGE_KEY = "cf_game_access_ok";

  if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

  document.documentElement.classList.add("gate-locked");

  const overlay = document.createElement("div");
  overlay.id = "access-gate";
  overlay.innerHTML =
    '<div class="gate-panel">' +
    "<h2>" + (cfg.title || "穿越火线") + "</h2>" +
    "<p>" + (cfg.hint || "请输入访问码") + "</p>" +
    '<input type="password" id="gate-password" placeholder="访问码" autocomplete="off" />' +
    '<p id="gate-error" class="gate-error hidden"></p>' +
    '<button type="button" id="gate-submit">进入游戏</button>' +
    '<p class="gate-note">开源项目 · 密码仅用于简单访客限制</p>' +
    "</div>";

  document.body.appendChild(overlay);

  const input = document.getElementById("gate-password");
  const err = document.getElementById("gate-error");

  function tryEnter() {
    if (input.value === cfg.password) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      overlay.remove();
      document.documentElement.classList.remove("gate-locked");
      return;
    }
    err.textContent = "访问码错误";
    err.classList.remove("hidden");
  }

  document.getElementById("gate-submit").addEventListener("click", tryEnter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryEnter();
  });
})();
