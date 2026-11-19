const labels = { male: "ذكر", female: "أنثى", prefer_not_to_say: "أفضل عدم الإجابة" };
const genderSymbols = { male: "♂", female: "♀", prefer_not_to_say: "" };
const byId = id => document.getElementById(id);
const message = (text, success = false) => {
  byId("profile-message").textContent = text;
  byId("profile-message").classList.toggle("success", success);
};
let account;
let currentUser;
async function loadProfile() {
  try {
    ({ account } = await import("./appwrite.js"));
    currentUser = await account.get();
    const prefs = currentUser.prefs || {};
    byId("profile-name").textContent = currentUser.name || "—";
    byId("profile-email").textContent = currentUser.email || "—";
    byId("profile-age").textContent = prefs.age ? String(prefs.age) + " سنة" : "لم يُضف بعد";
    byId("profile-gender").textContent = labels[prefs.gender] || "لم يُحدد";
    byId("profile-gender-symbol").textContent = genderSymbols[prefs.gender] || "";
    byId("edit-age").value = prefs.age || "";
    byId("edit-gender").value = prefs.gender || "";
  } catch {
    window.location.replace("./auth.html");
  }
}
byId("profile-form").addEventListener("submit", async event => {
  event.preventDefault();
  const age = Number(byId("edit-age").value);
  const gender = byId("edit-gender").value;
  if (!Number.isInteger(age) || age < 13 || age > 120 || !gender) {
    message("اكتب عمرًا صحيحًا واختر النوع.");
    return;
  }
  const button = byId("save-profile");
  button.disabled = true;
  button.textContent = "جارٍ الحفظ...";
  try {
    // Appwrite Web SDK 17 expects the preferences object directly.
    await account.updatePrefs({ ...(currentUser.prefs || {}), age, gender });
    currentUser = await account.get();
    byId("profile-age").textContent = age + " سنة";
    byId("profile-gender").textContent = labels[gender];
    byId("profile-gender-symbol").textContent = genderSymbols[gender] || "";
    message("تم حفظ بيانات الملف الشخصي.", true);
  } catch (error) {
    console.error("NOX profile update failed:", error);
    message("تعذر حفظ البيانات: " + (error?.message || "حاول مرة أخرى."));
  } finally {
    button.disabled = false;
    button.textContent = "حفظ التعديلات";
  }
});
loadProfile();
