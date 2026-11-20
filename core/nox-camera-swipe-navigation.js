/**
 * Swipe-first navigation for the primary NOX camera lens selector.
 * Vertical gestures move between lenses; horizontal gestures change families.
 * Existing lens buttons remain the single source of truth for engine selection.
 */
export function initCameraSwipeNavigation() {
  const page = document.querySelector(".nox-camera-page");
  const orbit = page?.querySelector("#nox-lens-orbit");
  const tabs = [...(page?.querySelectorAll("[data-lens-family]") || [])]
    .filter((node) => node.classList.contains("nox-camera-family-tab"));
  const lenses = [...(orbit?.querySelectorAll(".nox-lens-v2[data-lens-family]") || [])];
  if (!page || !orbit || !tabs.length || !lenses.length || orbit.dataset.swipeReady === "true") return;

  const familyOrder = tabs.map((tab) => tab.dataset.lensFamily);
  let activeFamily = tabs.find((tab) => tab.getAttribute("aria-pressed") === "true")?.dataset.lensFamily || familyOrder[0];
  let startPoint = null;
  let suppressClickUntil = 0;

  const familyLenses = (family) => lenses.filter((lens) => lens.dataset.lensFamily === family);
  const currentLensIndex = () => {
    const visible = familyLenses(activeFamily);
    const active = visible.findIndex((lens) => lens.classList.contains("active"));
    return Math.max(0, active);
  };

  function selectFamily(family, preserveSelection = false) {
    if (!familyOrder.includes(family)) return;
    activeFamily = family;
    tabs.forEach((tab) => {
      const selected = tab.dataset.lensFamily === family;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
    lenses.forEach((lens) => { lens.hidden = lens.dataset.lensFamily !== family; });
    const visible = familyLenses(family);
    if (!preserveSelection || !visible.some((lens) => lens.classList.contains("active"))) {
      visible[0]?.click();
    }
  }

  function stepLens(direction) {
    const visible = familyLenses(activeFamily);
    if (!visible.length) return;
    const nextIndex = (currentLensIndex() + direction + visible.length) % visible.length;
    visible[nextIndex]?.click();
  }

  function stepFamily(direction) {
    const current = familyOrder.indexOf(activeFamily);
    const next = (current + direction + familyOrder.length) % familyOrder.length;
    selectFamily(familyOrder[next]);
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => selectFamily(tab.dataset.lensFamily)));
  orbit.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) { startPoint = null; return; }
    const touch = event.touches[0];
    startPoint = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  orbit.addEventListener("touchend", (event) => {
    if (!startPoint || event.changedTouches.length !== 1) { startPoint = null; return; }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startPoint.x;
    const dy = touch.clientY - startPoint.y;
    startPoint = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 34 || Math.abs(dx) === Math.abs(dy)) return;

    event.preventDefault();
    suppressClickUntil = Date.now() + 360;
    if (Math.abs(dy) > Math.abs(dx)) stepLens(dy < 0 ? 1 : -1);
    else stepFamily(dx < 0 ? 1 : -1);
  }, { passive: false });

  // A cancelled touch must never be reused as the start of a later gesture.
  orbit.addEventListener("touchcancel", () => { startPoint = null; }, { passive: true });

  orbit.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowUp") { event.preventDefault(); stepLens(-1); }
    else if (event.key === "ArrowDown") { event.preventDefault(); stepLens(1); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); stepFamily(1); }
    else if (event.key === "ArrowRight") { event.preventDefault(); stepFamily(-1); }
  });

  orbit.addEventListener("click", (event) => {
    if (Date.now() < suppressClickUntil && event.detail !== 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  selectFamily(activeFamily, true);
  orbit.dataset.swipeReady = "true";
}
