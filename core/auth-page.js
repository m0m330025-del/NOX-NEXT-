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
  let stage = "تحميل خدمة الحسابات";
  try {
    const { account, ID } = await import("./appwrite.js");
    if (submittedMode === "signup") {
      stage = "إنشاء الحساب";
      // Appwrite Web SDK 17 uses positional arguments for Account.create.
      await account.create(ID.unique(), email, password, name);
    }

    stage = "إنشاء جلسة الدخول";
    // Appwrite Web SDK 17 uses positional arguments for email/password sessions.
    await account.createEmailPasswordSession(email, password);

    if (submittedMode === "signup") {
      stage = "حفظ العمر والنوع";
      try {
        // Account.updatePrefs accepts the preferences object directly in SDK 17.
        await account.updatePrefs({ age, gender });
      } catch (prefsError) {
        console.error("NOX profile preferences save failed:", prefsError);
        sessionStorage.setItem("nox.profile.pending", JSON.stringify({ age, gender }));
      }
    }

    stage = "تحميل بيانات الحساب";
    const user = await account.get();
    const notice = submittedMode === "signup"
      ? "مرحبًا " + (user.name || "بك") + "، تم إنشاء حسابك بنجاح."
      : "مرحبًا بعودتك " + (user.name || "إلى NOX NEXT") + "، تم تسجيل الدخول بنجاح.";
    sessionStorage.setItem("nox.auth.notice", notice);
    window.location.replace(submittedMode === "signup" ? "./profile.html" : "./index.html");
  } catch (error) {
    console.error("NOX authentication failed at stage:", stage, error);
    const code = Number(error?.code);
    const errorType = typeof error?.type === "string" ? error.type : "";
    const serverMessage = typeof error?.message === "string" ? error.message : "";
    const detail = [errorType, code ? "HTTP " + code : "", serverMessage]
      .filter(Boolean).join(" — ");
    const text = code === 409
      ? "هذا البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول."
      : code === 401
        ? "رفض Appwrite العملية أثناء " + stage + (detail ? ": " + detail : ". راجع بيانات الدخول وحالة الحساب.")
        : code === 400
          ? "Appwrite رفض البيانات أثناء " + stage + (detail ? ": " + detail : ". راجع البيانات المطلوبة.")
          : code === 429
            ? "محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول."
            : error instanceof TypeError
              ? "تعذر الاتصال بخدمة Appwrite. تأكد من إضافة نطاق الموقع في إعدادات Platforms."
              : "فشل " + stage + (detail ? ": " + detail : ". راجع إعدادات Appwrite.");
    setMessage(text);
  } finally {
    submitButton.disabled = false;
    tabs.forEach(tab => { tab.disabled = false; });
    submitButton.textContent = mode === "signup" ? "إنشاء حساب" : "دخول إلى NOX NEXT";
  }
});
