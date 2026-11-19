const $ = (selector) => document.querySelector(selector);

export function initCamera() {
  const page = $("#camera");
  if (!page) return;

  const video = $("#nox-camera-video");
  const stage = $("#nox-camera-stage");
  const empty = $("#nox-camera-empty");
  const start = $("#nox-camera-start");
  const stopState = $("#nox-camera-state");
  const status = $("#nox-camera-status");
  const flip = $("#nox-camera-flip");
  const capture = $("#nox-camera-capture");
  const record = $("#nox-camera-record");
  const renderCanvas = $("#nox-camera-render");
  const orbit = $("#nox-lens-orbit");
  const track = $("#nox-lens-track");
  const lenses = [...document.querySelectorAll(".nox-lens-v2")];
  const caption = $("#nox-camera-caption");
  const fileInput = $("#nox-camera-file");
  const result = $("#nox-camera-result");
  const photo = $("#nox-camera-photo");
  const videoResult = $("#nox-camera-video-result");
  const save = $("#nox-camera-save");

  let stream = null;
  let facing = "user";
  let filter = "none";
  let recorder = null;
  let recordingStream = null;
  let chunks = [];
  let frameId = 0;
  let outputUrl = null;
  let activeIndex = 0;
  let pointerStart = null;
  let recording = false;

  const say = (message) => {
    status.textContent = message;
    stopState.textContent = stream ? "الكاميرا تعمل" : "الكاميرا متوقفة";
  };

  function setReady(ready) {
    capture.disabled = !ready;
    record.disabled = !ready || !window.MediaRecorder;
    flip.disabled = !ready;
    start.hidden = ready;
    empty.hidden = ready;
    video.hidden = !ready;
    stage.classList.toggle("is-live", ready);
  }

  function revokeOutput() {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
    photo.hidden = true;
    videoResult.pause();
    videoResult.hidden = true;
    photo.removeAttribute("src");
    videoResult.removeAttribute("src");
    save.removeAttribute("href");
    result.hidden = true;
  }

  async function stopCamera() {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    if (recordingStream) recordingStream.getTracks().forEach((track) => track.stop());
    recordingStream = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
    video.style.filter = "none";
    setReady(false);
    say("تم إيقاف الكاميرا");
  }

  async function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      say("افتح الموقع عبر HTTPS في Chrome حديث للسماح بالكاميرا.");
      return;
    }
    start.disabled = true;
    start.textContent = "جارٍ طلب الإذن…";
    say("سيطلب Chrome إذن استخدام الكاميرا الآن.");
    try {
      if (stream) await stopCamera();
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      stream = nextStream;
      video.srcObject = stream;
      video.style.filter = filter;
      await video.play();
      if (!video.videoWidth) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("VIDEO_TIMEOUT")), 8000);
          video.addEventListener("loadedmetadata", () => { clearTimeout(timeout); resolve(); }, { once: true });
        });
      }
      setReady(true);
      say(facing === "user" ? "الكاميرا الأمامية تعمل" : "الكاميرا الخلفية تعمل");
    } catch (error) {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stream = null;
      setReady(false);
      const messages = {
        NotAllowedError: "إذن الكاميرا مرفوض. افتح إعدادات الموقع في Chrome واسمح بالكاميرا.",
        NotFoundError: "لم يتم العثور على كاميرا متاحة على الجهاز.",
        NotReadableError: "الكاميرا مشغولة بتطبيق آخر. أغلقه ثم أعد المحاولة.",
        OverconstrainedError: "الكاميرا لا تدعم الإعداد المطلوب. حاول مرة أخرى."
      };
      say(messages[error?.name] || "تعذر تشغيل الكاميرا: " + (error?.message || "خطأ غير معروف"));
    } finally {
      start.disabled = false;
      start.textContent = "تشغيل الكاميرا";
    }
  }

  function drawFrame(ctx, width, height) {
    ctx.save();
    if (facing === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = filter;
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
    const text = caption.value.trim();
    if (text) {
      ctx.save();
      ctx.direction = "rtl";
      ctx.textAlign = "center";
      ctx.font = "bold " + Math.max(24, width * 0.055) + "px sans-serif";
      ctx.lineWidth = Math.max(3, width * 0.008);
      ctx.strokeStyle = "rgba(20,8,50,.8)";
      ctx.fillStyle = "#fff";
      ctx.strokeText(text, width / 2, height * 0.88);
      ctx.fillText(text, width / 2, height * 0.88);
      ctx.restore();
    }
  }

  function paintRecordFrame() {
    if (!stream || !video.videoWidth || !recording) return;
    const canvas = $("#nox-camera-record-canvas") || renderCanvas;
    const ctx = canvas.getContext("2d");
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    drawFrame(ctx, canvas.width, canvas.height);
    frameId = requestAnimationFrame(paintRecordFrame);
  }

  function showBlob(blob, kind, filename) {
    revokeOutput();
    outputUrl = URL.createObjectURL(blob);
    result.hidden = false;
    if (kind === "image") {
      photo.src = outputUrl;
      photo.hidden = false;
    } else {
      videoResult.src = outputUrl;
      videoResult.hidden = false;
    }
    save.href = outputUrl;
    save.download = filename;
  }

  capture.addEventListener("click", () => {
    if (!stream || !video.videoWidth) return say("انتظر حتى تظهر صورة الكاميرا.");
    const canvas = renderCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    drawFrame(canvas.getContext("2d"), canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return say("تعذر إنشاء الصورة.");
      showBlob(blob, "image", "nox-next-photo.jpg");
      say("تم التقاط الصورة. احفظها على جهازك.");
    }, "image/jpeg", 0.94);
  });

  record.addEventListener("click", () => {
    if (!stream) return say("شغّل الكاميرا أولًا.");
    if (recording) {
      recording = false;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      record.textContent = "فيديو";
      say("جارٍ تجهيز الفيديو…");
      return;
    }
    try {
      chunks = [];
      const canvas = $("#nox-camera-record-canvas") || renderCanvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      recording = true;
      paintRecordFrame();
      recordingStream = canvas.captureStream(24);
      const types = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
      const mimeType = types.find((type) => MediaRecorder.isTypeSupported?.(type));
      recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = () => {
        recording = false;
        say("حدث خطأ أثناء تسجيل الفيديو.");
      };
      recorder.onstop = () => {
        recording = false;
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        if (recordingStream) recordingStream.getTracks().forEach((track) => track.stop());
        recordingStream = null;
        if (!chunks.length) return say("لم يتم إنشاء ملف فيديو.");
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        showBlob(blob, "video", "nox-next-video." + ext);
        say("الفيديو جاهز للحفظ على جهازك.");
      };
      recorder.start(250);
      record.textContent = "إيقاف";
      say("جارٍ تسجيل الفيديو… اضغط إيقاف عند الانتهاء.");
    } catch (error) {
      recording = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      say("هذا المتصفح لا يدعم تسجيل الفيديو بهذه الإعدادات.");
    }
  });

  flip.addEventListener("click", async () => {
    facing = facing === "user" ? "environment" : "user";
    await startCamera();
  });

  document.querySelector("#nox-camera-gallery").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    revokeOutput();
    const url = URL.createObjectURL(file);
    outputUrl = url;
    result.hidden = false;
    if (file.type.startsWith("image/")) {
      photo.src = url;
      photo.hidden = false;
    } else if (file.type.startsWith("video/")) {
      videoResult.src = url;
      videoResult.hidden = false;
    } else {
      revokeOutput();
      return say("نوع الملف غير مدعوم.");
    }
    save.href = url;
    save.download = file.name || "nox-media";
    say("تم فتح الملف من جهازك.");
  });

  $("#nox-camera-retake").addEventListener("click", () => {
    revokeOutput();
    if (!stream) startCamera();
  });

  $("#nox-camera-back").addEventListener("click", () => { location.hash = "#home"; });
  $("#nox-camera-exit")?.addEventListener("click", () => { location.hash = "#home"; });
  start.addEventListener("click", startCamera);

  function selectLens(index) {
    activeIndex = (index + lenses.length) % lenses.length;
    lenses.forEach((button, i) => {
      const active = i === activeIndex;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    filter = lenses[activeIndex].dataset.filter || "none";
    video.style.filter = filter;
    const angle = -activeIndex * (360 / lenses.length);
    track.style.setProperty("--lens-rotation", angle + "deg");
    track.style.transform = "rotate(" + angle + "deg)";
    lenses.forEach((button) => {

    });
    say(stream ? "تم تطبيق عدسة " + lenses[activeIndex].innerText.trim() : "اخترت العدسة. شغّل الكاميرا لمعاينتها.");
  }

  lenses.forEach((button, index) => button.addEventListener("click", () => selectLens(index)));
  orbit.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, index: activeIndex, id: event.pointerId };
    orbit.setPointerCapture(event.pointerId);
  });
  orbit.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const delta = event.clientX - pointerStart.x;
    if (Math.abs(delta) > 24) {
      const step = Math.round(delta / 48) || Math.sign(delta);
      selectLens(pointerStart.index - step);
    }
    pointerStart = null;
  });
  orbit.addEventListener("pointercancel", () => { pointerStart = null; });

  window.addEventListener("nox:screenchange", (event) => {
    if (event.detail?.from === "camera" && event.detail?.to !== "camera") stopCamera();
  });
  window.addEventListener("pagehide", stopCamera);
  setReady(false);
  selectLens(0);
}
