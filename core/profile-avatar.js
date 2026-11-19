import { account, storage, PROFILE_BUCKET_ID } from "./appwrite.js";

export async function initProfileAvatar() {
  const ownAvatars = document.querySelectorAll("[data-profile-avatar]");
  if (!ownAvatars.length) return;
  try {
    const user = await account.get();
    const fileId = user.prefs?.profilePhotoFileId;
    if (!fileId || !PROFILE_BUCKET_ID) return;
    const photoUrl = storage.getFileView(PROFILE_BUCKET_ID, fileId).toString();
    ownAvatars.forEach(image => {
      image.src = photoUrl;
      image.classList.add("nox-profile-avatar");
      image.alt = "الصورة الشخصية";
    });
  } catch (error) {
    // The public shell may be opened while signed out; keep its safe placeholder.
    console.info("NOX profile avatar is not available in this session.");
  }
}
