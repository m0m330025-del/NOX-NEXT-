import { account, ID } from "./appwrite.js";

const form = document.getElementById("auth-form");
const nameField = document.getElementById("name-field");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("form-message");
const submitButton = document.getElementById("submit-button");
const title = document.getElementById("form-title");
const subtitle = document.getElementById("form-subtitle");
const tabs = document.querySelectorAll("[data-mode]");
let mode = "login";

function setMessage(text, success = false) {
  message.textContent = text;
  message.classList.toggle("success", success);
}

function setMode(nextMode) {
  mode = nextMode;
  const signup = mode === "signup";
  nameField.hidden = !signup;
  nameInput.required = signup;
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
  title.textContent = signup ? "إنشاء حساب جديد" : "تسجيل الدخول";
  subtitle.textContent = signup
    ? "أنشئ حسابك وابدأ رحلتك في NOX NEXT."
    : "ادخل إلى حسابك وتابع عالمك الاجتماعي.";
  submitButton.textContent = signup ? "إنشاء حساب" : "دخول إلى NOX NEXT";
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  setMessage("");
}

tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

form.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage("");
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const name = nameInput.value.trim();

  if (!email || !password || (mode === "signup" && !name)) {
    setMessage("من فضلك أكمل البيانات المطلوبة.");
    return;
  }
  if (mode === "signup" && password.length < 8) {
    setMessage("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = mode === "signup" ? "جارٍ إنشاء الحساب..." : "جارٍ تسجيل الدخول...";
  try {
    if (mode === "signup") {
      await account.create(ID.unique(), email, password, name);
    }
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    sessionStorage.setItem("nox.auth.notice", "مرحبًا " + (user.name || "بك") + "، تم تسجيل الدخول بنجاح.");
    window.location.replace("./index.html");
  } catch (error) {
    const text = error?.code === 409
      ? "هذا البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول."
      : error?.code === 401
        ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        : error?.message || "تعذر إكمال العملية. حاول مرة أخرى.";
    setMessage(text);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = mode === "signup" ? "إنشاء حساب" : "دخول إلى NOX NEXT";
  }
});

account.get().then(user => {
  if (user) {
    setMessage("أنت مسجل الدخول بالفعل باسم " + (user.name || "مستخدم NOX") + ".", true);
  }
}).catch(() => {});
