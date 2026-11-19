const labels = { male: "ذكر", female: "أنثى", prefer_not_to_say: "أفضل عدم الإجابة" };
const genderSymbols = { male: "♂", female: "♀", prefer_not_to_say: "" };
const byId = id => document.getElementById(id);
const message = (text, success = false) => {
  byId("profile-message").textContent = text;
  byId("profile-message").classList.toggle("success", success);
};
let account, storage, ID, Permission, Role, PROFILE_BUCKET_ID;
let currentUser;
let selectedPhoto = null;
let previewUrl = null;

function setPhoto(url) {
  const image = byId("profile-photo");
  const fallback = byId("profile-avatar-fallback");
  if (url) {
    image.src = url;
    image.hidden = false;
    fallback.hidden = true;
  } else {
    image.removeAttribute("src");
    image.hidden = true;
    fallback.hidden = false;
  }
}
function renderProfile() {
  const prefs = currentUser.prefs || {};
  byId("profile-name").textContent = currentUser.name || "—";
  byId("profile-email").textContent = currentUser.email || "—";
  byId("profile-age").textContent = prefs.age ? String(prefs.age) + " سنة" : "لم يُضف بعد";
  byId("profile-gender").textContent = labels[prefs.gender] || "لم يُحدد";
  byId("profile-gender-symbol").textContent = genderSymbols[prefs.gender] || "";
  byId("profile-about-preview").textContent = prefs.about || "مساحتك في عالم NOX NEXT — أضف نبذة قصيرة ليعرفك الآخرون.";
  byId("about-card-text").textContent = prefs.about || "لم تضف نبذة شخصية بعد.";
  byId("about-detail-text").textContent = prefs.about || "لم تضف نبذة شخصية بعد.";
  byId("side-nox-id").textContent = currentUser.$id;
  byId("about-nox-id").textContent = currentUser.$id;
  byId("public-gender-value").textContent = prefs.showGender === true && labels[prefs.gender] ? labels[prefs.gender] : "غير معروض";
  byId("profile-nox-id").textContent = currentUser.$id;
  byId("edit-name").value = currentUser.name || "";
  byId("edit-about").value = prefs.about || "";
  byId("edit-age").value = prefs.age || "";
  byId("edit-gender").value = prefs.gender || "";
  byId("show-gender").checked = prefs.showGender === true;
  const emblem = byId("profile-gender-emblem");
  emblem.textContent = prefs.showGender === true ? (genderSymbols[prefs.gender] || "") : "";
  emblem.hidden = !emblem.textContent;
}
async function loadPhoto(fileId) {
  if (!fileId || !PROFILE_BUCKET_ID) { setPhoto(""); return; }
  try {
    const url = storage.getFileView(PROFILE_BUCKET_ID, fileId);
    setPhoto(url.toString());
  } catch (error) {
    console.warn("NOX profile photo could not be loaded:", error);
    setPhoto("");
  }
}
async function loadProfile() {
  try {
    ({ account, storage, ID, Permission, Role, PROFILE_BUCKET_ID } = await import("./appwrite.js"));
    currentUser = await account.get();
    renderProfile();
    await loadPhoto(currentUser.prefs?.profilePhotoFileId);
  } catch (error) {
    console.error("NOX profile load failed:", error);
    window.location.replace("./auth.html");
  }
}

byId("profile-photo-input").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    message("اختَر صورة بصيغة JPG أو PNG أو WEBP.");
    event.target.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    message("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.");
    event.target.value = "";
    return;
  }
  selectedPhoto = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  setPhoto(previewUrl);
  message("معاينة الصورة جاهزة. اضغط تغيير الصورة لحفظها.");
});
byId("upload-profile-photo").addEventListener("click", async () => {
  if (!selectedPhoto) {
    byId("profile-photo-input").click();
    return;
  }
  if (!PROFILE_BUCKET_ID) {
    message("الصورة جاهزة للمعاينة، لكن يلزم إنشاء Storage Bucket باسم profile-images وإضافة معرّفه في core/appwrite.js قبل رفعها.");
    return;
  }
  const button = byId("upload-profile-photo");
  button.disabled = true;
  button.textContent = "جارٍ رفع الصورة...";
  try {
    const owner = Role.user(currentUser.$id);
    const uploaded = await storage.createFile(
      PROFILE_BUCKET_ID,
      ID.unique(),
      selectedPhoto,
      [Permission.read(owner), Permission.update(owner), Permission.delete(owner)]
    );
    const oldFileId = currentUser.prefs?.profilePhotoFileId;
    await account.updatePrefs({ ...(currentUser.prefs || {}), profilePhotoFileId: uploaded.$id });
    currentUser = await account.get();
    await loadPhoto(uploaded.$id);
    selectedPhoto = null;
    byId("profile-photo-input").value = "";
    if (oldFileId && oldFileId !== uploaded.$id) {
      try { await storage.deleteFile(PROFILE_BUCKET_ID, oldFileId); }
      catch (cleanupError) { console.warn("Old NOX profile photo cleanup skipped:", cleanupError); }
    }
    message("تم حفظ الصورة الشخصية بنجاح.", true);
  } catch (error) {
    console.error("NOX profile photo upload failed:", error);
    message("تعذر رفع الصورة: " + (error?.message || "تحقق من إعدادات Storage والصلاحيات."));
  } finally {
    button.disabled = false;
    button.textContent = "＋ تغيير الصورة الشخصية";
  }
});

byId("copy-nox-id").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentUser.$id);
    message("تم نسخ NOX ID.", true);
  } catch {
    message("تعذر النسخ تلقائيًا. يمكنك تحديد NOX ID ونسخه يدويًا.");
  }
});

byId("profile-form").addEventListener("submit", async event => {
  event.preventDefault();
  const name = byId("edit-name").value.trim();
  const ageValue = byId("edit-age").value.trim();
  const age = ageValue === "" ? null : Number(ageValue);
  const gender = byId("edit-gender").value || null;
  const about = byId("edit-about").value.trim();
  const showGender = byId("show-gender").checked;
  if (!name || name.length > 60 || (age !== null && (!Number.isInteger(age) || age < 0))) {
    message("اكتب اسمًا صحيحًا، وإذا أدخلت العمر فتأكد أنه رقم صحيح غير سالب.");
    return;
  }
  const button = byId("save-profile");
  button.disabled = true;
  button.textContent = "جارٍ الحفظ...";
  try {
    if (name !== currentUser.name) await account.updateName(name);
    const nextPrefs = { ...(currentUser.prefs || {}), about, showGender };
    if (age === null) delete nextPrefs.age; else nextPrefs.age = age;
    if (gender === null) delete nextPrefs.gender; else nextPrefs.gender = gender;
    await account.updatePrefs(nextPrefs);
    currentUser = await account.get();
    renderProfile();
    message("تم حفظ تعديلات الملف الشخصي.", true);
  } catch (error) {
    console.error("NOX profile update failed:", error);
    message("تعذر حفظ البيانات: " + (error?.message || "حاول مرة أخرى."));
  } finally {
    button.disabled = false;
    button.textContent = "حفظ التعديلات";
  }
});

// Profile tabs: delegated click handling keeps navigation reliable even if the
// tab bar is re-rendered, and updates both the selected tab and visible panel.
const profileTabBar = document.querySelector(".profile-social-nav");
const profileTabs = [...document.querySelectorAll("[data-profile-tab]")];
const profilePanels = {
  posts: byId("panel-posts"),
  photos: byId("panel-photos"),
  friends: byId("panel-friends"),
  about: byId("panel-about")
};
function activateProfileTab(key, moveFocus = false) {
  if (!Object.prototype.hasOwnProperty.call(profilePanels, key) || !profilePanels[key]) return;
  profileTabs.forEach(tab => {
    const active = tab.dataset.profileTab === key;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.setAttribute("tabindex", active ? "0" : "-1");
    if (active && moveFocus) tab.focus();
  });
  Object.entries(profilePanels).forEach(([name, panel]) => {
    const active = name === key;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  document.querySelector(".profile-main-column")?.setAttribute("data-active-profile-tab", key);
}
if (profileTabBar) {
  profileTabBar.addEventListener("click", event => {
    const tab = event.target.closest("[data-profile-tab]");
    if (!tab || !profileTabBar.contains(tab)) return;
    activateProfileTab(tab.dataset.profileTab);
  });
  profileTabBar.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const current = profileTabs.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0
      : event.key === "End" ? profileTabs.length - 1
      : (current + (event.key === "ArrowRight" ? 1 : -1) + profileTabs.length) % profileTabs.length;
    activateProfileTab(profileTabs[next].dataset.profileTab, true);
  });
}
activateProfileTab("posts");

const editor = byId("profile-editor");
const openEditor = () => {
  editor.hidden = false;
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
};
byId("edit-profile-toggle").addEventListener("click", openEditor);
byId("close-profile-editor").addEventListener("click", () => { editor.hidden = true; });
byId("privacy-edit-link").addEventListener("click", openEditor);

loadProfile();
