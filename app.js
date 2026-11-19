import { initNavigation } from "./core/navigation.js";
import { initTheme } from "./core/theme.js";
import { initApp } from "./core/app.js";
import { initSocialUI } from "./core/social-ui.js";
import { initProfileAvatar } from "./core/profile-avatar.js";
import { initSections } from "./core/sections.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavigation();
  initApp();
  initSocialUI();
  initSections();
  initProfileAvatar();
});
