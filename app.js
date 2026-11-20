import { initNavigation } from "./core/navigation.js";
import { initTheme } from "./core/theme.js";
import { initApp } from "./core/app.js";
import { initSocialUI } from "./core/social-ui.js";
import { initCameraPresentation } from "./core/nox-camera-presentation.js";
import { initCameraSwipeNavigation } from "./core/nox-camera-swipe-navigation.js";
import { initCamera } from "./core/camera.js?v=3";
import { initProfileAvatar } from "./core/profile-avatar.js";
import { initSections } from "./core/sections.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavigation();
  initApp();
  initSocialUI();
  // Camera initialization may append diagnostics and effect controls.
  // Group the complete set only after those controls have been registered.
  initCamera();
  initCameraPresentation();
  initCameraSwipeNavigation();
  initSections();
  initProfileAvatar();
});
