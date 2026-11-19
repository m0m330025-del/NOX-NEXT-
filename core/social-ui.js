export function initSocialUI() {
  const toast = document.querySelector("#toast");
  let toastTimer;

  function notice(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  document.querySelector(".add-story")?.addEventListener("click", () => {
    window.location.hash = "#camera";
  });

  document.querySelector("#nox-id-submit")?.addEventListener("click", () => {
    const input = document.querySelector("#nox-id-search");
    const id = input?.value.trim();
    notice(id
      ? "واجهة البحث جاهزة؛ ربط البحث بقاعدة البيانات في المرحلة التالية."
      : "اكتب NOX ID للبحث.");
  });

  document.querySelector("#nox-id-search")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") document.querySelector("#nox-id-submit")?.click();
  });

  document.querySelectorAll(".story-preview-card").forEach((button) => {
    button.addEventListener("click", () => {
      const result = document.querySelector("#nox-story-result");
      if (!result) return;
      result.replaceChildren();
      const title = document.createElement("b");
      const note = document.createElement("small");
      title.textContent = button.dataset.storyPreview || "حالة";
      note.textContent = "معاينة شكلية فقط — الحالات الحقيقية ستُحمّل من قاعدة البيانات";
      result.append(title, note);
    });
  });

  document.querySelectorAll("[data-reel-like]").forEach((button) => {
    button.addEventListener("click", () => {
      const liked = button.classList.toggle("liked");
      button.textContent = liked ? "♥ أعجبني" : "♡ إعجاب";
      button.setAttribute("aria-pressed", String(liked));
    });
  });
}
