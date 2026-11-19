const SCREEN_KEYS = new Set(["home","messages","camera","stories","reels","discover","friends-view","notifications","saved","gifts","settings"]);
const HASH_TO_SCREEN = {
  "#home":"home",
  "#friends":"home",
  "#messages":"messages",
  "#camera":"camera",
  "#stories-view":"stories",
  "#reels":"reels",
  "#discover":"discover",
  "#friends-view":"friends-view",
  "#notifications":"notifications",
  "#saved":"saved",
  "#gifts":"gifts",
  "#settings":"settings"
};

export function initNavigation() {
  const links = [...document.querySelectorAll("[data-nav]")];
  const applyScreen = () => {
    const hash = window.location.hash || "#home";
    const screen = HASH_TO_SCREEN[hash] || "home";
    const previous = document.body.dataset.noxScreen || "home";
    if (previous !== screen) {
      window.dispatchEvent(new CustomEvent("nox:screenchange", {detail:{from:previous,to:screen}}));
    }
    document.body.dataset.noxScreen = screen;

    links.forEach(link => {
      const key = link.dataset.nav;
      const active = key === screen || (screen === "home" && key === "friends" && hash === "#friends");
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    });

    if (hash === "#friends") {
      requestAnimationFrame(() => document.getElementById("friends")?.scrollIntoView({block:"start",behavior:"smooth"}));
    } else if (screen === "home") {
      window.scrollTo({top:0,behavior:"auto"});
    } else {
      requestAnimationFrame(() => {
        const target = document.getElementById(screen === "stories" ? "stories-view" : screen);
        target?.scrollIntoView({block:"start",behavior:"smooth"});
      });
    }
  };

  window.addEventListener("hashchange", applyScreen);
  links.forEach(link => {
    link.addEventListener("click", event => {
      const key = link.dataset.nav;
      if (!SCREEN_KEYS.has(key) && key !== "friends") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("nox:notice", {
          detail: key === "gifts" ? "قسم الهدايا قيد التجهيز" : "هذا القسم قيد التجهيز"
        }));
        return;
      }
      // The URL hash is the navigation state; hashchange also supports browser Back/Forward.
      if (key === "home" && window.location.hash === "#home") applyScreen();
      if (key === "friends" && window.location.hash === "#friends") applyScreen();
    });
  });

  document.querySelector('[data-action="more-menu"]')?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("nox:notice", {
      detail: "الأقسام الإضافية ستظهر هنا عند تجهيزها"
    }));
  });

  applyScreen();
}
