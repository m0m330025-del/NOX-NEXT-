const $ = (selector) => document.querySelector(selector);

const LENSES = [
  { name: "طبيعي", icon: "◎", mode: 0 },
  { name: "Glow", icon: "✧", mode: 1 },
  { name: "روز", icon: "🌸", mode: 2 },
  { name: "نيون", icon: "◈", mode: 3 },
  { name: "ألوان", icon: "✺", mode: 4 },
  { name: "Retro", icon: "☼", mode: 5 },
  { name: "أبيض وأسود", icon: "◐", mode: 6 }
];

const SHADERS = {
  vertex: `attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`,
  fragment: `precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform float u_mode;
uniform float u_time;
uniform float u_mirror;
void main() {
  vec2 uv = v_texCoord;
  if (u_mirror > 0.5) uv.x = 1.0 - uv.x;
  vec4 color = texture2D(u_image, uv);
  vec3 c = color.rgb;
  if (u_mode > 0.5 && u_mode < 1.5) {
    c = min(vec3(1.0), c * vec3(1.08, 1.04, 1.10) + vec3(0.035));
    c = mix(c, vec3(dot(c, vec3(0.299,0.587,0.114))), 0.08);
  } else if (u_mode > 1.5 && u_mode < 2.5) {
    c.r *= 1.08; c.g *= 0.96; c.b *= 1.02;
    c = mix(c, vec3(dot(c, vec3(0.299,0.587,0.114))), 0.12);
  } else if (u_mode > 2.5 && u_mode < 3.5) {
    c.r = 0.5 + 0.5 * sin(6.28318 * (c.r + 0.02));
    c.g = 0.5 + 0.5 * sin(6.28318 * (c.g + 0.34));
    c.b = 0.5 + 0.5 * sin(6.28318 * (c.b + 0.67));
    c = mix(c, color.rgb, 0.28);
  } else if (u_mode > 3.5 && u_mode < 4.5) {
    float gray = dot(c, vec3(0.299,0.587,0.114));
    c = clamp((c - vec3(gray)) * 1.28 + vec3(gray), 0.0, 1.0);
  } else if (u_mode > 4.5 && u_mode < 5.5) {
    c = vec3(dot(c, vec3(0.393,0.769,0.189)),
             dot(c, vec3(0.349,0.686,0.168)),
             dot(c, vec3(0.272,0.534,0.131)));
  } else if (u_mode > 5.5) {
    float gray = dot(c, vec3(0.299,0.587,0.114));
    c = vec3(gray);
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), color.a);
}`
};

export function initCamera() {
  const page = $("#camera");
  if (!page) return;

  const video = $("#nox-camera-video");
  const stage = $("#nox-camera-stage");
  const empty = $("#nox-camera-empty");
  const startButton = $("#nox-camera-start");
  const state = $("#nox-camera-state");
  const status = $("#nox-camera-status");
  const flip = $("#nox-camera-flip");
  const stopButton = $("#nox-camera-stop");
  const capture = $("#nox-camera-capture");
  const recordButton = $("#nox-camera-record");
  const renderCanvas = $("#nox-camera-render");
  const orbit = $("#nox-lens-orbit");
  const track = $("#nox-lens-track");
  const caption = $("#nox-camera-caption");
  const fileInput = $("#nox-camera-file");
  const result = $("#nox-camera-result");
  const photo = $("#nox-camera-photo");
  const videoResult = $("#nox-camera-video-result");
  const save = $("#nox-camera-save");
  if (!video || !stage || !renderCanvas || !startButton) return;

  let stream = null;
  let facing = "user";
  let selectedLens = 0;
  let recorder = null;
  let recordingStream = null;
  let chunks = [];
  let animationFrame = 0;
  let outputUrl = null;
  let recording = false;
  let renderer = null;
  let renderMode = "غير مهيأ";
  let pointerStart = null;
  let lastFrameAt = 0;
  let lowPower = false;
  let disposed = false;

  const supported = {
    secure: window.isSecureContext,
    getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    mediaRecorder: typeof window.MediaRecorder === "function",
    canvasCapture: typeof HTMLCanvasElement.prototype.captureStream === "function",
    webgl: Boolean(document.createElement("canvas").getContext("webgl", { alpha: false, antialias: false })),
    faceDetector: typeof window.FaceDetector === "function"
  };

  function announce(message, live = Boolean(stream)) {
    if (status) status.textContent = message;
    if (state) state.textContent = live ? "الكاميرا تعمل" : "الكاميرا متوقفة";
  }

  function setReady(ready) {
    capture.disabled = !ready;
    recordButton.disabled = !ready || !supported.mediaRecorder || !supported.canvasCapture;
    flip.disabled = !ready;
    stopButton.disabled = !ready;
    startButton.hidden = ready;
    empty.hidden = ready;
    video.hidden = !ready;
    renderCanvas.hidden = !ready;
    stage.classList.toggle("is-live", ready);
  }

  function stopTracks(target) {
    target?.getTracks?.().forEach((trackItem) => trackItem.stop());
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

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || "تعذر تجهيز مؤثر WebGL");
    }
    return shader;
  }

  function createRenderer() {
    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl", {
      alpha: false, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: "low-power"
    });
    if (!gl) return null;
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, SHADERS.vertex));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, SHADERS.fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "تعذر ربط مؤثرات WebGL");
    }
    gl.useProgram(program);
    const vertices = new Float32Array([
      -1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,
      -1,1, 0,1,   1,-1, 1,0,   1,1, 1,1
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const stride = 16;
    const position = gl.getAttribLocation(program, "a_position");
    const texCoord = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, stride, 8);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return {
      gl, canvas: glCanvas, program, texture,
      mode: gl.getUniformLocation(program, "u_mode"),
      mirror: gl.getUniformLocation(program, "u_mirror")
    };
  }

  function renderFrame() {
    if (!stream || video.readyState < 2 || disposed) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    const maxDimension = lowPower ? 960 : 1280;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const outWidth = Math.max(2, Math.round(width * scale));
    const outHeight = Math.max(2, Math.round(height * scale));
    if (renderCanvas.width !== outWidth || renderCanvas.height !== outHeight) {
      renderCanvas.width = outWidth;
      renderCanvas.height = outHeight;
    }
    if (renderer) {
      const { gl, canvas: glCanvas, texture } = renderer;
      glCanvas.width = outWidth;
      glCanvas.height = outHeight;
      gl.viewport(0, 0, outWidth, outHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform1i(gl.getUniformLocation(renderer.program, "u_image"), 0);
        gl.uniform1f(renderer.mode, LENSES[selectedLens].mode);
        gl.uniform1f(renderer.mirror, facing === "user" ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const outputContext = renderCanvas.getContext("2d");
        outputContext.clearRect(0, 0, outWidth, outHeight);
        outputContext.drawImage(glCanvas, 0, 0, outWidth, outHeight);
      } catch {
        renderer = null;
        renderMode = "Canvas 2D احتياطي";
      }
    }
    if (!renderer) {
      const ctx = renderCanvas.getContext("2d");
      if (!ctx) return;
      const filters = ["none", "brightness(1.08) saturate(1.1)", "sepia(.18) saturate(1.12)", "hue-rotate(145deg) saturate(1.2)", "saturate(1.45) contrast(1.04)", "sepia(.42) contrast(1.05)", "grayscale(1) contrast(1.08)"];
      ctx.save();
      ctx.clearRect(0, 0, outWidth, outHeight);
      ctx.filter = filters[selectedLens];
      if (facing === "user") {
        ctx.translate(outWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, outWidth, outHeight);
      ctx.restore();
      renderMode = "Canvas 2D";
    } else {
      renderMode = lowPower ? "WebGL منخفض الطاقة" : "WebGL";
    }
    if (stream && !disposed) animationFrame = requestAnimationFrame(renderFrame);
  }

  async function waitForVideo() {
    if (video.readyState >= 2 && video.videoWidth) return;
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("انتهت مهلة انتظار صورة الكاميرا")), 9000);
      video.addEventListener("loadeddata", () => { clearTimeout(timeout); resolve(); }, { once: true });
      video.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("تعذر قراءة بث الكاميرا")); }, { once: true });
    });
  }

  function updateDiagnostics() {
    let panel = $("#nox-camera-diagnostics");
    if (!panel) {
      panel = document.createElement("details");
      panel.id = "nox-camera-diagnostics";
      panel.className = "nox-camera-diagnostics";
      panel.innerHTML = "<summary>تشخيص توافق الجهاز</summary><dl></dl>";
      page.querySelector(".nox-camera-v2-tools")?.append(panel);
    }
    const rows = [
      ["HTTPS", supported.secure ? "متاح" : "غير آمن — يلزم HTTPS"],
      ["getUserMedia", supported.getUserMedia ? "متاح" : "غير مدعوم"],
      ["MediaRecorder", supported.mediaRecorder ? "متاح" : "غير مدعوم"],
      ["تسجيل Canvas", supported.canvasCapture ? "متاح" : "غير مدعوم"],
      ["WebGL", supported.webgl ? "متاح" : "غير مدعوم"],
      ["FaceDetector", supported.faceDetector ? "واجهة متاحة تجريبيًا؛ التتبع غير مفعّل" : "غير متاح؛ تتبع الوجه غير مفعّل"],
      ["تجميل البشرة", "غير مفعّل في هذه النسخة — لا توجد معالجة وجه وهمية"],
      ["المؤثر النشط", renderMode],
      ["الدقة الحالية", stream && video.videoWidth ? video.videoWidth + " × " + video.videoHeight : "لا يوجد بث"]
    ];
    const dl = panel.querySelector("dl");
    dl.replaceChildren();
    rows.forEach(([label, value]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      dl.append(dt, dd);
    });
  }

  async function stopCamera() {
    recording = false;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch {}
    }
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    stopTracks(recordingStream);
    recordingStream = null;
    stopTracks(stream);
    stream = null;
    video.pause();
    video.srcObject = null;
    setReady(false);
    announce("تم إيقاف الكاميرا", false);
    updateDiagnostics();
  }

  async function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      announce("الكاميرا تحتاج موقع HTTPS ومتصفحًا يدعم getUserMedia.", false);
      updateDiagnostics();
      return;
    }
    startButton.disabled = true;
    startButton.textContent = "جارٍ طلب الإذن…";
    announce("اسمح للمتصفح باستخدام الكاميرا عند ظهور نافذة الإذن.", false);
    try {
      if (stream) await stopCamera();
      const memory = Number(navigator.deviceMemory || 4);
      lowPower = memory <= 3 || (navigator.hardwareConcurrency || 4) <= 4;
      const base = lowPower
        ? { width: { ideal: 640, max: 960 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 24, max: 30 } }
        : { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 30, max: 30 } };
      let nextStream;
      try {
        nextStream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { ...base, facingMode: { ideal: facing } }
        });
      } catch (firstError) {
        if (firstError.name === "NotAllowedError" || firstError.name === "NotFoundError") throw firstError;
        nextStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing } });
      }
      stream = nextStream;
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await waitForVideo();
      try { renderer = renderer || createRenderer(); } catch { renderer = null; }
      renderMode = renderer ? "WebGL" : "Canvas 2D";
      renderFrame();
      setReady(true);
      announce(facing === "user" ? "الكاميرا الأمامية تعمل" : "الكاميرا الخلفية تعمل");
      updateDiagnostics();
    } catch (error) {
      stopTracks(stream);
      stream = null;
      setReady(false);
      const messages = {
        NotAllowedError: "إذن الكاميرا مرفوض. اسمح بالكاميرا من إعدادات المتصفح.",
        NotFoundError: "لم يتم العثور على كاميرا متاحة.",
        NotReadableError: "الكاميرا مستخدمة في تطبيق آخر. أغلقه وحاول مجددًا.",
        OverconstrainedError: "إعداد الدقة غير مدعوم. أعد المحاولة بجودة أقل."
      };
      announce(messages[error?.name] || ("تعذر تشغيل الكاميرا: " + (error?.message || "خطأ غير معروف")), false);
      updateDiagnostics();
    } finally {
      startButton.disabled = false;
      startButton.textContent = "تشغيل الكاميرا";
    }
  }

  async function switchCamera() {
    if (!stream) return;
    const nextFacing = facing === "user" ? "environment" : "user";
    const [videoTrack] = stream.getVideoTracks();
    try {
      await videoTrack.applyConstraints({ facingMode: { exact: nextFacing } });
      facing = nextFacing;
      renderFrame();
      announce(facing === "user" ? "الكاميرا الأمامية تعمل" : "الكاميرا الخلفية تعمل");
      updateDiagnostics();
    } catch {
      facing = nextFacing;
      await startCamera();
    }
  }

  function drawCaption(ctx, width, height) {
    const text = caption?.value?.trim();
    if (!text) return;
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.font = "bold " + Math.max(22, width * 0.05) + "px sans-serif";
    ctx.lineWidth = Math.max(3, width * 0.008);
    ctx.strokeStyle = "rgba(20,8,50,.82)";
    ctx.fillStyle = "#fff";
    ctx.strokeText(text, width / 2, height * 0.88);
    ctx.fillText(text, width / 2, height * 0.88);
    ctx.restore();
  }

  function createOutputCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = renderCanvas.width;
    canvas.height = renderCanvas.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(renderCanvas, 0, 0);
    drawCaption(ctx, canvas.width, canvas.height);
    return canvas;
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
    if (!stream || !video.videoWidth) return announce("انتظر حتى يظهر بث الكاميرا.");
    renderFrame();
    const output = createOutputCanvas();
    output.toBlob((blob) => {
      if (!blob) return announce("تعذر إنشاء الصورة.");
      showBlob(blob, "image", "nox-next-photo.jpg");
      announce("تم التقاط الصورة. اضغط حفظ على الجهاز.");
    }, "image/jpeg", 0.92);
  });

  recordButton.addEventListener("click", () => {
    if (!stream) return;
    if (recording) {
      recording = false;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recordButton.textContent = "فيديو";
      announce("جارٍ تجهيز الفيديو…");
      return;
    }
    if (!supported.mediaRecorder || !supported.canvasCapture) {
      announce("تسجيل الفيديو غير مدعوم في هذا المتصفح.");
      return;
    }
    try {
      chunks = [];
      recording = true;
      const output = renderCanvas.captureStream(lowPower ? 20 : 24);
      recordingStream = output;
      const mimeTypes = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported?.(type));
      recorder = new MediaRecorder(output, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = () => { recording = false; announce("حدث خطأ أثناء التسجيل."); };
      recorder.onstop = () => {
        recording = false;
        stopTracks(recordingStream);
        recordingStream = null;
        if (!chunks.length) return announce("لم ينتج ملف فيديو.");
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        const extension = blob.type.includes("mp4") ? "mp4" : "webm";
        showBlob(blob, "video", "nox-next-video." + extension);
        announce("الفيديو جاهز للحفظ.");
      };
      recorder.start(300);
      recordButton.textContent = "إيقاف";
      announce("جارٍ تسجيل الفيديو…");
    } catch {
      recording = false;
      stopTracks(recordingStream);
      recordingStream = null;
      announce("تعذر بدء تسجيل الفيديو على هذا الجهاز.");
    }
  });

  function selectLens(index) {
    selectedLens = (index + LENSES.length) % LENSES.length;
    const buttons = [...page.querySelectorAll(".nox-lens-v2")];
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === selectedLens;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (track) {
      track.style.transform = "rotate(" + (-selectedLens * 360 / LENSES.length) + "deg)";
    }
    if (stream) renderFrame();
    announce("تم اختيار عدسة " + LENSES[selectedLens].name, Boolean(stream));
    updateDiagnostics();
  }

  function buildLensWheel() {
    if (!orbit || !track) return;
    track.replaceChildren();
    LENSES.forEach((lens, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nox-lens-v2" + (index === 0 ? " active" : "");
      button.dataset.filter = String(lens.mode);
      button.setAttribute("aria-pressed", String(index === 0));
      button.innerHTML = "<span></span><b></b>";
      button.querySelector("span").textContent = lens.icon;
      button.querySelector("b").textContent = lens.name;
      const angle = index * 360 / LENSES.length;
      button.style.setProperty("--lens-angle", angle + "deg");
      button.style.setProperty("--lens-counter", -angle + "deg");
      button.addEventListener("click", () => selectLens(index));
      track.append(button);
    });
    orbit.addEventListener("pointerdown", (event) => {
      pointerStart = { x: event.clientX, y: event.clientY, index: selectedLens, id: event.pointerId };
      orbit.setPointerCapture?.(event.pointerId);
    });
    orbit.addEventListener("pointerup", (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) {
        const step = Math.max(1, Math.round(Math.hypot(dx, dy) / 52));
        selectLens(pointerStart.index + (dx < 0 ? step : -step));
      }
      pointerStart = null;
    });
    orbit.addEventListener("pointercancel", () => { pointerStart = null; });
    selectLens(0);
  }

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      announce("نوع الملف غير مدعوم.");
      return;
    }
    revokeOutput();
    outputUrl = URL.createObjectURL(file);
    result.hidden = false;
    if (file.type.startsWith("image/")) {
      photo.src = outputUrl;
      photo.hidden = false;
    } else {
      videoResult.src = outputUrl;
      videoResult.hidden = false;
    }
    save.href = outputUrl;
    save.download = file.name || "nox-media";
    announce("تم فتح الملف من جهازك.");
  });

  $("#nox-camera-gallery")?.addEventListener("click", () => fileInput?.click());
  $("#nox-camera-retake")?.addEventListener("click", () => {
    revokeOutput();
    if (!stream) startCamera();
  });
  $("#nox-camera-back")?.addEventListener("click", () => { location.hash = "#home"; });
  $("#nox-camera-exit")?.addEventListener("click", () => { location.hash = "#home"; });
  startButton.addEventListener("click", startCamera);
  stopButton.addEventListener("click", stopCamera);
  flip.addEventListener("click", switchCamera);

  window.addEventListener("nox:screenchange", (event) => {
    if (event.detail?.from === "camera" && event.detail?.to !== "camera") stopCamera();
  });
  window.addEventListener("pagehide", stopCamera);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && stream && !recording) stopCamera();
  });
  window.addEventListener("beforeunload", () => {
    disposed = true;
    stopCamera();
    revokeOutput();
  });

  buildLensWheel();
  setReady(false);
  updateDiagnostics();
}
