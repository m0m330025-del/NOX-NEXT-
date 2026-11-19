const form = document.getElementById("auth-form");
const nameField = document.getElementById("name-field");
const nameInput = document.getElementById("name");
const profileFields = document.getElementById("profile-fields");
const ageInput = document.getElementById("age");
const genderInput = document.getElementById("gender");
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
  profileFields.hidden = !signup;
  ageInput.required = signup;
  genderInput.required = signup;
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
  const age = Number(ageInput.value);
  const gender = genderInput.value;
  const submittedMode = mode;

  if (!email || !password || (submittedMode === "signup" && (!name || !ageInput.value || !gender))) {
    setMessage("من فضلك أكمل البيانات المطلوبة.");
    return;
  }
  if (submittedMode === "signup" && (!Number.isInteger(age) || age < 13 || age > 120)) {
    setMessage("العمر يجب أن يكون رقمًا صحيحًا من 13 إلى 120 سنة.");
    return;
  }
  if (submittedMode === "signup" && password.length < 8) {
    setMessage("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    return;
  }

  submitButton.disabled = true;
  tabs.forEach(tab => { tab.disabled = true; });
  submitButton.textContent = submittedMode === "signup" ? "جارٍ إنشاء الحساب..." : "جارٍ تسجيل الدخول...";
  try {
    // Load the SDK only when the visitor actually submits the form.
    const { account, ID } = await import("./appwrite.js");
    if (submittedMode === "signup") {
      await account.create(ID.unique(), email, password, name);
    }
    await account.createEmailPasswordSession(email, password);
    if (submittedMode === "signup") {
      await account.updatePrefs({ age, gender });
    }
    const user = await account.get();
    sessionStorage.setItem("nox.auth.notice", "مرحبًا " + (user.name || "بك") + "، تم تسجيل الدخول بنجاح.");
    window.location.replace("./index.html");
  } catch (error) {
    const text = error?.code === 409
      ? "هذا البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول."
      : error?.code === 401
        ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        : error?.code === 429
          ? "محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول."
          : error instanceof TypeError
            ? "تعذر الاتصال بخدمة الحسابات. تحقق من الإنترنت وحاول مرة أخرى."
            : "تعذر إكمال العملية. راجع إعدادات Appwrite وحاول مرة أخرى.";
    setMessage(text);
  } finally {
    submitButton.disabled = false;
    tabs.forEach(tab => { tab.disabled = false; });
    submitButton.textContent = mode === "signup" ? "إنشاء حساب" : "دخول إلى NOX NEXT";
  }
});
