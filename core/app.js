import { account } from "./appwrite.js";

export function initApp() {
  const toast = document.getElementById("toast");
  let toastTimer;

  function showNotice(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  window.addEventListener("nox:notice", event => showNotice(event.detail));

  const authNotice = sessionStorage.getItem("nox.auth.notice");
  if (authNotice) {
    showNotice(authNotice);
    sessionStorage.removeItem("nox.auth.notice");
  }

  account.get().then(user => {
    const name = document.querySelector(".topbar-user b");
    if (name) name.textContent = user.name || "حسابي";
  }).catch(() => {});

  document.querySelector('[data-action="logout"]')?.addEventListener("click", async () => {
    try {
      await account.deleteSession("current");
      showNotice("تم تسجيل الخروج بنجاح");
      window.setTimeout(() => window.location.assign("./auth.html"), 500);
    } catch (error) {
      showNotice("لا يوجد حساب مسجل للدخول حاليًا");
    }
  });

  document.querySelectorAll('[data-action="demo-notice"]').forEach(button => {
    button.addEventListener("click", () => {
      showNotice("هذه الخاصية واجهة تجريبية وستُفعّل في مرحلة لاحقة");
    });
  });

  document.querySelector('[data-action="focus-search"]')?.addEventListener("click", () => {
    document.getElementById("global-search")?.focus();
    showNotice("البحث الكامل سيُفعّل مع نظام الأعضاء");
  });

  document.querySelectorAll('[data-action="like"]').forEach(button => {
    button.addEventListener("click", () => {
      const liked = button.classList.toggle("liked");
      button.firstChild.textContent = liked ? "♥ " : "♡ ";
      button.setAttribute("aria-pressed", String(liked));
    });
  });

  const search = document.getElementById("global-search");
  search?.addEventListener("keydown", event => {
    if (event.key === "Enter" && search.value.trim()) {
      showNotice("البحث عن الأعضاء والمحتوى سيُربط بقاعدة البيانات لاحقًا");
    }
  });
}
