const labels = {
  friends: "قسم الأصدقاء",
  messages: "قسم المحادثات",
  camera: "قسم الكاميرا",
  calls: "قسم المكالمات",
  stories: "قسم الحالات",
  reels: "قسم المقاطع",
  gifts: "قسم الهدايا",
  settings: "الإعدادات"
};

export function initNavigation() {
  const links = document.querySelectorAll("[data-nav]");
  links.forEach(link => {
    link.addEventListener("click", event => {
      const key = link.dataset.nav;
      if (!["home", "stories", "friends", "messages", "camera", "reels"].includes(key)) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("nox:notice", {
          detail: labels[key] || "هذا القسم قيد التجهيز"
        }));
      }
      links.forEach(item => item.classList.toggle("active", item.dataset.nav === key));
    });
  });

  document.querySelector('[data-action="more-menu"]')?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("nox:notice", {
      detail: "الأقسام الإضافية ستظهر هنا عند تجهيزها"
    }));
  });
}
