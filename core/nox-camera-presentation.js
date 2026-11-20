/**
 * NOX Camera presentation layer.
 * Keeps every existing camera engine control wired, but groups advanced tools
 * behind a native disclosure so the capture workflow stays primary.
 */
export function initCameraPresentation() {
  const page = document.querySelector(".nox-camera-page");
  const tools = page?.querySelector(".nox-camera-v2-tools");
  if (!page || !tools || tools.dataset.presentationReady === "true") return;

  const title = tools.querySelector(".nox-camera-v2-section-title");
  const filterLibrary = tools.querySelector(".nox-filter-library");
  const result = tools.querySelector(".nox-camera-v2-result");
  const captionLabel = tools.querySelector(".nox-camera-caption-label");
  const caption = tools.querySelector("#nox-camera-caption");
  const status = tools.querySelector("#nox-camera-status");
  const firstAdvanced = tools.querySelector(
    ".nox-region-mask-panel, .nox-region-follow-panel, .nox-subject-lock-panel, " +
    ".nox-temporal-panel, .nox-photon-timeline-panel, .nox-low-light-panel, " +
    ".nox-detail-recovery-panel, .nox-wave-matter-panel, .nox-science-engine-panel, " +
    ".nox-motion-freeze-panel, .nox-stabilizer-panel, .nox-flow-panel, .nox-living-metal-panel"
  );

  const advanced = document.createElement("details");
  advanced.className = "nox-camera-advanced";
  const summary = document.createElement("summary");
  summary.innerHTML = "<span>استوديو المعالجة المتقدمة</span><small>التتبع · الذاكرة · الإضاءة · أدوات المحركات</small>";
  advanced.append(summary);

  if (firstAdvanced) {
    tools.insertBefore(advanced, firstAdvanced);
    const children = [...tools.children];
    let moving = false;
    for (const child of children) {
      if (child === firstAdvanced) moving = true;
      if (moving && child !== filterLibrary && child !== result &&
          child !== captionLabel && child !== caption && child !== status) {
        advanced.append(child);
      }
    }
  }

  if (title) title.querySelector("b")?.replaceChildren(document.createTextNode("العدسات والفلاتر"));
  if (title) {
    const hint = title.querySelector("small");
    if (hint) hint.textContent = "اختر عدسة دائرية أو افتح مكتبة الفلاتر";
  }

  if (filterLibrary) {
    const heading = filterLibrary.querySelector("b");
    if (heading) heading.textContent = "كل فلاتر NOX";
  }

  const stage = page.querySelector(".nox-camera-v2-stage");
  stage?.setAttribute("aria-label", "معاينة كاميرا NOX NEXT");
  tools.dataset.presentationReady = "true";

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./camera-pro.css?v=2";
  document.head.append(link);
}
