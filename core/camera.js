import { NOX_FILTERS, NOX_FILTER_GROUPS, getFallbackFilter } from "./nox-filter-engine.js";

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
uniform float u_variant;
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
  } else if (u_mode > 5.5 && u_mode < 9.5) {
    float gray = dot(c, vec3(0.299,0.587,0.114));
    c = vec3(gray);
  } else if (u_mode > 9.5) {
    float family = floor(u_mode - 10.0 + 0.5);
    float v = clamp(u_variant, 0.0, 1.0);
    float lum = dot(c, vec3(0.299,0.587,0.114));
    if (family < 0.5) {
      float metalBand = 0.5 + 0.5 * sin((uv.x + uv.y) * 18.0 + u_time * (0.7 + v));
      vec3 metalTint = mix(vec3(0.30,0.42,0.62), vec3(0.88,0.94,1.0), metalBand);
      c = mix(c, metalTint * (0.48 + lum * 0.72), 0.18 + v * 0.20);
    } else if (family < 1.5) {
      float streak = 0.5 + 0.5 * sin((uv.x * 0.8 + uv.y * 0.2) * 85.0 + u_time * 2.0);
      c = mix(c, c * vec3(0.72,0.90,1.18) + vec3(streak * 0.08), 0.12 + v * 0.16);
    } else if (family < 2.5) {
      c = vec3(c.r * (1.0 + 0.18 * v), c.g * (0.92 + 0.16 * sin(u_time + v)), c.b * (1.12 + 0.22 * v));
      c = mix(c, vec3(0.12,0.82,1.0), clamp((lum - 0.58) * (0.25 + v * 0.35), 0.0, 0.28));
    } else if (family < 3.5) {
      vec3 worldTint = mix(vec3(0.08,0.34,0.48), vec3(0.62,0.28,0.72), uv.y);
      c = mix(c, c * 0.72 + worldTint * 0.34, 0.16 + v * 0.15);
    } else if (family < 4.5) {
      float speedLines = 0.5 + 0.5 * sin((uv.x * 0.7 + uv.y) * 110.0);
      c = clamp((c - 0.5) * (1.12 + v * 0.42) + 0.5 + speedLines * 0.025, 0.0, 1.0);
    } else if (family < 5.5) {
      c = mix(c, vec3(lum * 1.05, lum * 0.92, lum * 0.88), 0.10 + v * 0.12);
      c = clamp(c * (1.04 + v * 0.06) + vec3(0.012), 0.0, 1.0);
    } else if (family < 6.5) {
      vec3 weatherTint = mix(vec3(0.12,0.32,0.58), vec3(0.72,0.86,1.0), uv.y);
      c = mix(c, c * 0.70 + weatherTint * 0.38, 0.14 + v * 0.18);
    } else if (family < 7.5) {
      c = vec3(dot(c,vec3(0.42,0.36,0.22)), dot(c,vec3(0.34,0.42,0.24)), dot(c,vec3(0.24,0.30,0.18)));
      c = clamp((c - 0.42) * (1.18 + v * 0.28) + 0.46, 0.0, 1.0);
    } else if (family < 8.5) {
      vec3 leftC = texture2D(u_image, uv + vec2(0.002 + v * 0.002, 0.0)).rgb;
      vec3 rightC = texture2D(u_image, uv - vec2(0.002 + v * 0.002, 0.0)).rgb;
      float edge = length(leftC - rightC);
      c = mix(c, vec3(0.12,0.90,1.0), clamp(edge * (1.2 + v * 2.0), 0.0, 0.32));
      c = clamp(c * (1.08 + v * 0.16), 0.0, 1.0);
    } else {
      float wave = 0.5 + 0.5 * sin((uv.x * 7.0 + uv.y * 11.0 + lum * 2.0) * 6.28318 + u_time);
      c = mix(c, vec3(wave, 0.25 + 0.65 * (1.0-wave), 0.72), 0.12 + v * 0.22);
      c = clamp(c * (1.04 + v * 0.14), 0.0, 1.0);
    }
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
  const filterSelect = $("#nox-filter-select");
  if (!video || !stage || !renderCanvas || !startButton) return;

  let stream = null;
  let facing = "user";
  let selectedLens = 0;
  let selectedFilter = null;
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
  let qualityTier = 0;
  let slowFrameStreak = 0;
  let stableFrameStreak = 0;
  let averageFrameCost = 0;
  let measuredFps = 0;
  let fpsWindowStart = 0;
  let fpsWindowFrames = 0;
  let lastRenderedAt = 0;
  const QUALITY_TIERS = [
    { name: "جودة عالية", maxDimension: 1280, targetFps: 30 },
    { name: "متوازن", maxDimension: 960, targetFps: 24 },
    { name: "إنقاذ الأداء", maxDimension: 640, targetFps: 18 }
  ];
  let disposed = false;
  let livingMetalEnabled = false;
  let livingMetalRegion = null;
  let regionMaskEnabled = false;
  let regionMaskDrawing = false;
  let regionMaskStart = null;
  let regionMaskPreview = null;
  let livingMetalPhase = 0;
  let temporalMode = "off";
  let temporalBuffers = [];
  let temporalWriteIndex = 0;
  let temporalFrameCount = 0;
  let temporalLastCaptureAt = 0;
  let temporalSampleWidth = 0;
  let temporalSampleHeight = 0;
  let opticalFlowMode = "off";
  let opticalFlowCanvas = null;
  let opticalFlowContext = null;
  let opticalFlowPrevious = null;
  let opticalFlowWidth = 0;
  let opticalFlowHeight = 0;
  let opticalFlowLastAt = 0;
  let opticalFlowVectors = [];
  let opticalFlowConfidence = 0;
  let opticalFlowSequence = 0;
  let regionFollowEnabled = false;
  let regionFollowLastSequence = -1;
  let regionFollowVectorCount = 0;

  const supported = {
    secure: window.isSecureContext,
    getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    mediaRecorder: typeof window.MediaRecorder === "function",
    canvasCapture: typeof HTMLCanvasElement.prototype.captureStream === "function",
    webgl: typeof window.WebGLRenderingContext === "function",
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
      mirror: gl.getUniformLocation(program, "u_mirror"),
      variant: gl.getUniformLocation(program, "u_variant"),
      time: gl.getUniformLocation(program, "u_time")
    };
  }

  function drawLivingMetal(ctx, width, height) {
    if (!livingMetalEnabled || !livingMetalRegion) return;
    livingMetalPhase = (livingMetalPhase + 0.035) % (Math.PI * 2);
    const x = livingMetalRegion.x * width, y = livingMetalRegion.y * height;
    const w = livingMetalRegion.width * width, h = livingMetalRegion.height * height;
    if (w < 2 || h < 2) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalCompositeOperation = "screen";
    const sweep = x + ((Math.sin(livingMetalPhase) + 1) * 0.5) * w;
    const metal = ctx.createLinearGradient(x, y, x + w, y + h);
    metal.addColorStop(0, "rgba(105,225,255,.08)");
    metal.addColorStop(.32, "rgba(235,250,255,.48)");
    metal.addColorStop(.5, "rgba(70,105,150,.24)");
    metal.addColorStop(.72, "rgba(255,255,255,.52)");
    metal.addColorStop(1, "rgba(115,75,205,.14)");
    ctx.fillStyle = metal; ctx.fillRect(x, y, w, h);
    const glint = ctx.createRadialGradient(sweep, y + h * .28, 1, sweep, y + h * .28, Math.max(12, Math.min(w,h) * .55));
    glint.addColorStop(0, "rgba(255,255,255,.68)");
    glint.addColorStop(1, "rgba(180,225,255,0)");
    ctx.fillStyle = glint; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  function normalizedPoint(event) {
    const rect = renderCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { x: Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)), y: Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)) };
  }
  function buildRegionMask(start, end) {
    return { x: Math.min(start.x,end.x), y: Math.min(start.y,end.y), width: Math.abs(end.x-start.x), height: Math.abs(end.y-start.y) };
  }
  function updateRegionMaskOverlay() {
    const overlay = $("#nox-region-mask-overlay");
    const region = regionMaskPreview || (regionMaskEnabled ? livingMetalRegion : null);
    if (!overlay) return;
    if (!region || !regionMaskEnabled || region.width < 0.01 || region.height < 0.01) {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;
    overlay.style.left = (region.x * 100) + "%";
    overlay.style.top = (region.y * 100) + "%";
    overlay.style.width = (region.width * 100) + "%";
    overlay.style.height = (region.height * 100) + "%";
  }
  
  function resetTemporalMemory() {
    temporalBuffers.forEach((buffer) => {
      buffer.canvas.width = 1;
      buffer.canvas.height = 1;
    });
    temporalBuffers = [];
    temporalWriteIndex = 0;
    temporalFrameCount = 0;
    temporalLastCaptureAt = 0;
    temporalSampleWidth = 0;
    temporalSampleHeight = 0;
  }

  function ensureTemporalMemory(width, height) {
    const maxSide = lowPower ? 160 : 224;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const sampleWidth = Math.max(1, Math.round(width * scale));
    const sampleHeight = Math.max(1, Math.round(height * scale));
    const bufferCount = lowPower ? 3 : 4;
    if (sampleWidth === temporalSampleWidth && sampleHeight === temporalSampleHeight && temporalBuffers.length === bufferCount) return;
    resetTemporalMemory();
    temporalSampleWidth = sampleWidth;
    temporalSampleHeight = sampleHeight;
    temporalBuffers = Array.from({ length: bufferCount }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      return { canvas, context: canvas.getContext("2d", { alpha: false }) };
    }).filter((buffer) => buffer.context);
  }

  function renderTemporalMemory(ctx, width, height) {
    if (!ctx || !width || !height) return;
    ensureTemporalMemory(width, height);
    if (!temporalBuffers.length) return;
    const now = performance.now();
    const interval = lowPower ? 180 : 120;
    let capturedCurrent = false;
    if (!temporalLastCaptureAt || now - temporalLastCaptureAt >= interval) {
      const buffer = temporalBuffers[temporalWriteIndex];
      buffer.context.drawImage(renderCanvas, 0, 0, temporalSampleWidth, temporalSampleHeight);
      temporalWriteIndex = (temporalWriteIndex + 1) % temporalBuffers.length;
      temporalFrameCount = Math.min(temporalFrameCount + 1, temporalBuffers.length);
      temporalLastCaptureAt = now;
      capturedCurrent = true;
    }
    if (temporalMode === "off" || temporalFrameCount < 2) return;
    const firstAge = capturedCurrent ? 2 : 1;
    if (temporalFrameCount < firstAge) return;
    ctx.save();
    ctx.globalCompositeOperation = temporalMode === "motion-trace" ? "screen" : "source-over";
    for (let age = temporalFrameCount; age >= firstAge; age -= 1) {
      const index = (temporalWriteIndex - age + temporalBuffers.length) % temporalBuffers.length;
      const buffer = temporalBuffers[index];
      const strength = temporalMode === "motion-trace"
        ? 0.08 + ((temporalFrameCount - age) * 0.025)
        : 0.12 + ((temporalFrameCount - age) * 0.035);
      ctx.globalAlpha = strength;
      const offset = temporalMode === "time-echo" ? (temporalFrameCount - age + 1) * width * 0.004 : 0;
      ctx.drawImage(buffer.canvas, offset, 0, width, height);
    }
    ctx.restore();
  }

  function resetOpticalFlow() {
    opticalFlowPrevious = null;
    opticalFlowLastAt = 0;
    opticalFlowVectors = [];
    opticalFlowConfidence = 0;
    opticalFlowSequence = 0;
    regionFollowLastSequence = -1;
    regionFollowVectorCount = 0;
    opticalFlowWidth = 0;
    opticalFlowHeight = 0;
    if (opticalFlowCanvas) {
      opticalFlowCanvas.width = 1;
      opticalFlowCanvas.height = 1;
    }
  }

  function ensureOpticalFlowCanvas() {
    if (opticalFlowCanvas) return;
    opticalFlowCanvas = document.createElement("canvas");
    opticalFlowContext = opticalFlowCanvas.getContext("2d", { willReadFrequently: true, alpha: false });
  }

  function estimateOpticalFlow() {
    if (opticalFlowMode === "off" || !video.videoWidth || !video.videoHeight) return;
    const now = performance.now();
    const interval = lowPower ? 240 : 160;
    if (opticalFlowLastAt && now - opticalFlowLastAt < interval) return;
    ensureOpticalFlowCanvas();
    if (!opticalFlowContext) return;
    const sampleWidth = lowPower ? 48 : 64;
    const sampleHeight = lowPower ? 36 : 48;
    if (opticalFlowCanvas.width !== sampleWidth || opticalFlowCanvas.height !== sampleHeight) {
      opticalFlowCanvas.width = sampleWidth;
      opticalFlowCanvas.height = sampleHeight;
      opticalFlowPrevious = null;
    }
    opticalFlowContext.drawImage(video, 0, 0, sampleWidth, sampleHeight);
    let pixels;
    try {
      pixels = opticalFlowContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    } catch {
      resetOpticalFlow();
      return;
    }
    const gray = new Uint8Array(sampleWidth * sampleHeight);
    for (let i = 0, p = 0; i < gray.length; i += 1, p += 4) {
      gray[i] = (pixels[p] * 77 + pixels[p + 1] * 150 + pixels[p + 2] * 29) >> 8;
    }
    opticalFlowLastAt = now;
    if (!opticalFlowPrevious || opticalFlowWidth !== sampleWidth || opticalFlowHeight !== sampleHeight) {
      opticalFlowPrevious = gray;
      opticalFlowWidth = sampleWidth;
      opticalFlowHeight = sampleHeight;
      opticalFlowVectors = [];
      opticalFlowConfidence = 0;
      return;
    }
    const cellStep = lowPower ? 8 : 8;
    const patchRadius = 1;
    const searchRadius = lowPower ? 2 : 3;
    const vectors = [];
    let confidenceTotal = 0;
    const border = searchRadius + patchRadius;
    for (let cy = border; cy < sampleHeight - border; cy += cellStep) {
      for (let cx = border; cx < sampleWidth - border; cx += cellStep) {
        let bestSad = Infinity;
        let secondSad = Infinity;
        let bestDx = 0;
        let bestDy = 0;
        for (let dy = -searchRadius; dy <= searchRadius; dy += 1) {
          for (let dx = -searchRadius; dx <= searchRadius; dx += 1) {
            let sad = 0;
            for (let py = -patchRadius; py <= patchRadius; py += 1) {
              for (let px = -patchRadius; px <= patchRadius; px += 1) {
                const index = (cy + py) * sampleWidth + cx + px;
                const previousIndex = (cy + dy + py) * sampleWidth + cx + dx + px;
                sad += Math.abs(gray[index] - opticalFlowPrevious[previousIndex]);
              }
            }
            if (sad < bestSad) {
              secondSad = bestSad;
              bestSad = sad;
              bestDx = dx;
              bestDy = dy;
            } else if (sad < secondSad) secondSad = sad;
          }
        }
        const uniqueness = secondSad === Infinity ? 0 : Math.max(0, Math.min(1, (secondSad - bestSad) / (secondSad + 1)));
        const texture = Math.min(1, secondSad / 90);
        const confidence = uniqueness * texture;
        if ((Math.abs(bestDx) + Math.abs(bestDy)) > 0 && confidence > 0.06) {
          vectors.push({ x: cx / sampleWidth, y: cy / sampleHeight, dx: -bestDx / sampleWidth, dy: -bestDy / sampleHeight, confidence });
          confidenceTotal += confidence;
        }
      }
    }
    opticalFlowVectors = vectors;
    opticalFlowConfidence = vectors.length ? confidenceTotal / vectors.length : 0;
    opticalFlowPrevious = gray;
    opticalFlowSequence += 1;
    updateTrackedRegionFromFlow();
  }

  function updateTrackedRegionFromFlow() {
    if (!regionFollowEnabled || !livingMetalRegion || opticalFlowSequence === regionFollowLastSequence) return;
    regionFollowLastSequence = opticalFlowSequence;
    const region = livingMetalRegion;
    let weightedX = 0;
    let weightedY = 0;
    let totalWeight = 0;
    let count = 0;
    opticalFlowVectors.forEach((vector) => {
      const displayX = facing === "user" ? 1 - vector.x : vector.x;
      const displayDx = facing === "user" ? -vector.dx : vector.dx;
      const displayDy = vector.dy;
      if (displayX < region.x || displayX > region.x + region.width ||
          vector.y < region.y || vector.y > region.y + region.height) return;
      const weight = vector.confidence;
      weightedX += displayDx * weight;
      weightedY += displayDy * weight;
      totalWeight += weight;
      count += 1;
    });
    regionFollowVectorCount = count;
    if (count < 2 || totalWeight < 0.12) return;
    const rawDx = weightedX / totalWeight;
    const rawDy = weightedY / totalWeight;
    const dx = Math.max(-0.025, Math.min(0.025, rawDx * 0.55));
    const dy = Math.max(-0.025, Math.min(0.025, rawDy * 0.55));
    const nextX = Math.max(0, Math.min(1 - region.width, region.x + dx));
    const nextY = Math.max(0, Math.min(1 - region.height, region.y + dy));
    livingMetalRegion = { ...region, x: nextX, y: nextY };
  }

  function drawOpticalFlow(ctx, width, height) {
    if (opticalFlowMode !== "vectors" || !opticalFlowVectors.length) return;
    ctx.save();
    ctx.strokeStyle = "rgba(105, 235, 255, .88)";
    ctx.fillStyle = "rgba(210, 250, 255, .95)";
    ctx.lineWidth = Math.max(1, width / 700);
    ctx.lineCap = "round";
    opticalFlowVectors.forEach((vector) => {
      const mirrored = facing === "user";
      const x = (mirrored ? 1 - vector.x : vector.x) * width;
      const y = vector.y * height;
      const dx = vector.dx * width * 2.8 * (mirrored ? -1 : 1);
      const dy = vector.dy * height * 2.8;
      const endX = x + dx;
      const endY = y + dy;
      ctx.globalAlpha = 0.25 + vector.confidence * 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      const angle = Math.atan2(dy, dx);
      const head = Math.max(3, width / 180);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - Math.cos(angle - 0.55) * head, endY - Math.sin(angle - 0.55) * head);
      ctx.lineTo(endX - Math.cos(angle + 0.55) * head, endY - Math.sin(angle + 0.55) * head);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  function setRegionFollowEnabled(enabled) {
    regionFollowEnabled = Boolean(enabled);
    regionFollowLastSequence = opticalFlowSequence;
    regionFollowVectorCount = 0;
    if (regionFollowEnabled && opticalFlowMode === "off") {
      const flowSelect = $("#nox-flow-mode");
      if (flowSelect) flowSelect.value = "vectors";
      setOpticalFlowMode("vectors");
    }
    const button = $("#nox-region-follow-toggle");
    if (button) {
      button.setAttribute("aria-pressed", String(regionFollowEnabled));
      button.textContent = regionFollowEnabled ? "إيقاف تتبع المنطقة بالحركة" : "تتبع المنطقة بالحركة";
    }
    const hint = $("#nox-region-follow-hint");
    if (hint) hint.textContent = regionFollowEnabled
      ? (livingMetalRegion ? "القناع سيتحرك مع متوسط اتجاه الحركة داخله" : "حدد قناعًا يدويًا أولًا ثم شغّل التتبع")
      : "التتبع متوقف — القناع ثابت";
    if (regionFollowEnabled && !livingMetalRegion) announce("حدد منطقة يدويًا أولًا لتشغيل تتبعها", Boolean(stream));
    else announce(regionFollowEnabled ? "تم تشغيل تتبع قناع المنطقة" : "تم إيقاف تتبع قناع المنطقة", Boolean(stream));
    updateDiagnostics();
  }

  function setOpticalFlowMode(mode) {
    opticalFlowMode = mode === "vectors" ? "vectors" : "off";
    if (opticalFlowMode === "off") setRegionFollowEnabled(false);
    resetOpticalFlow();
    const hint = $("#nox-flow-hint");
    if (hint) hint.textContent = opticalFlowMode === "off"
      ? "تقدير الحركة متوقف"
      : "Sparse Optical Flow: أسهم تقديرية لحركة أجزاء الصورة — انتظر إطارين";
    announce(opticalFlowMode === "off" ? "تم إيقاف تقدير الحركة" : "تم تشغيل تقدير الحركة البصري", Boolean(stream));
    updateDiagnostics();
    if (stream) renderFrame(false);
  }

  function setTemporalMode(mode) {
    temporalMode = ["off", "motion-trace", "time-echo"].includes(mode) ? mode : "off";
    resetTemporalMemory();
    const hint = $("#nox-temporal-hint");
    if (hint) hint.textContent = temporalMode === "off"
      ? "الذاكرة الزمنية متوقفة"
      : temporalMode === "motion-trace"
        ? "Motion Trace: يدمج آثارًا خفيفة من الإطارات السابقة"
        : "Time Echo: يضيف صدى بصريًا قصيرًا من الإطارات السابقة";
    announce(temporalMode === "off" ? "تم إيقاف الذاكرة الزمنية" : "تم تفعيل " + (temporalMode === "motion-trace" ? "Motion Trace" : "Time Echo") + " — انتظر لحظات لامتلاء الذاكرة", Boolean(stream));
    updateDiagnostics();
    if (stream) renderFrame(false);
  }

  function renderFrame(scheduleNext = true) {
    if (!stream || video.readyState < 2 || disposed) return;
    const frameNow = performance.now();
    const tier = QUALITY_TIERS[qualityTier];
    const frameInterval = 1000 / tier.targetFps;
    if (scheduleNext && lastRenderedAt && frameNow - lastRenderedAt < frameInterval * 0.92) {
      animationFrame = requestAnimationFrame(() => renderFrame(true));
      return;
    }
    const renderStartedAt = frameNow;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    const maxDimension = Math.min(tier.maxDimension, lowPower ? 960 : 1280);
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
        gl.uniform1f(renderer.mode, selectedFilter ? 10 + selectedFilter.family : LENSES[selectedLens].mode);
        gl.uniform1f(renderer.variant, selectedFilter ? selectedFilter.variant / 19 : 0);
        gl.uniform1f(renderer.time, performance.now() / 1000);
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
      ctx.filter = selectedFilter ? getFallbackFilter(selectedFilter) : filters[selectedLens];
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
    const outputContext = renderCanvas.getContext("2d");
    if (outputContext) {
      drawLivingMetal(outputContext, outWidth, outHeight);
      renderTemporalMemory(outputContext, outWidth, outHeight);
      estimateOpticalFlow();
      drawOpticalFlow(outputContext, outWidth, outHeight);
    }
    const renderCost = performance.now() - renderStartedAt;
    averageFrameCost = averageFrameCost ? averageFrameCost * 0.88 + renderCost * 0.12 : renderCost;
    lastRenderedAt = performance.now();
    fpsWindowFrames += 1;
    if (!fpsWindowStart) fpsWindowStart = lastRenderedAt;
    if (lastRenderedAt - fpsWindowStart >= 1000) {
      measuredFps = fpsWindowFrames * 1000 / (lastRenderedAt - fpsWindowStart);
      fpsWindowFrames = 0;
      fpsWindowStart = lastRenderedAt;
    }
    if (renderCost > frameInterval * 1.25 || averageFrameCost > frameInterval * 0.92) {
      slowFrameStreak += 1;
      stableFrameStreak = 0;
    } else {
      stableFrameStreak += 1;
      slowFrameStreak = Math.max(0, slowFrameStreak - 1);
    }
    if (slowFrameStreak >= 8 && qualityTier < QUALITY_TIERS.length - 1) {
      qualityTier += 1;
      slowFrameStreak = 0;
      stableFrameStreak = 0;
      announce("NOX Adaptive Rescue: خفض الحمل إلى " + QUALITY_TIERS[qualityTier].name, true);
      updateDiagnostics();
    } else if (stableFrameStreak >= 150 && qualityTier > (lowPower ? 1 : 0)) {
      qualityTier -= 1;
      stableFrameStreak = 0;
      announce("NOX Adaptive Rescue: استعادة تدريجية — " + QUALITY_TIERS[qualityTier].name, true);
      updateDiagnostics();
    }
    if (scheduleNext && stream && !disposed) animationFrame = requestAnimationFrame(() => renderFrame(true));
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
      ["مكتبة NOX", NOX_FILTERS.length + " إعدادًا ضمن 10 محركات مؤثرات"],
      ["الفلتر المختار", selectedFilter ? selectedFilter.name + " — " + selectedFilter.category : LENSES[selectedLens].name],
      ["تتبّع الأجسام", "غير مفعّل — لا يوجد تتبّع دلالي في هذه المرحلة"],
      ["الذاكرة الزمنية", temporalMode === "off" ? "متوقفة" : (temporalMode === "motion-trace" ? "Motion Trace" : "Time Echo") + " — " + temporalFrameCount + "/" + temporalBuffers.length + " إطارات مصغرة"],
      ["تقدير الحركة", opticalFlowMode === "off" ? "متوقف" : "Sparse block matching — " + opticalFlowVectors.length + " متجهًا، ثقة " + Math.round(opticalFlowConfidence * 100) + "%"],
      ["تتبّع قناع المنطقة", regionFollowEnabled ? "نشط — " + regionFollowVectorCount + " متجهًا داخل القناع" : "متوقف"],
      ["حجم الذاكرة الزمنية", temporalBuffers.length ? temporalSampleWidth + " × " + temporalSampleHeight + " لكل إطار" : "لم تُخصص بعد"],
      ["قناع المنطقة", livingMetalRegion ? "مستطيل يدوي محفوظ" : (regionMaskEnabled ? "اسحب على الصورة لتحديد منطقة" : "لا يوجد قناع")],
      ["Living Metal", livingMetalEnabled ? (livingMetalRegion ? "نشط داخل القناع اليدوي" : "نشط — حدد منطقة أولًا") : "متوقف"],
      ["تجميل البشرة", "غير مفعّل في هذه النسخة — لا توجد معالجة وجه وهمية"],
      ["المؤثر النشط", renderMode],
      ["Adaptive Rescue", QUALITY_TIERS[qualityTier].name + " — " + QUALITY_TIERS[qualityTier].targetFps + " FPS مستهدف"],
      ["أداء المعالجة", averageFrameCost.toFixed(1) + " ms متوسط / " + measuredFps.toFixed(1) + " FPS مقاس"],
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
      try { recorder.stop(); } catch { stopTracks(recordingStream); recordingStream = null; }
    } else {
      stopTracks(recordingStream);
      recordingStream = null;
    }
    if (recordButton) recordButton.textContent = "فيديو";
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastRenderedAt = 0;
    slowFrameStreak = 0;
    stableFrameStreak = 0;
    averageFrameCost = 0;
    measuredFps = 0;
    fpsWindowStart = 0;
    fpsWindowFrames = 0;
    qualityTier = lowPower ? 1 : 0;
    resetTemporalMemory();
    resetOpticalFlow();
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
      qualityTier = lowPower ? 1 : 0;
      lastRenderedAt = 0;
      slowFrameStreak = 0;
      stableFrameStreak = 0;
      averageFrameCost = 0;
      measuredFps = 0;
      fpsWindowStart = 0;
      fpsWindowFrames = 0;
      resetTemporalMemory();
      resetOpticalFlow();
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
      renderFrame(false);
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

  renderCanvas.addEventListener("pointerdown", (event) => {
    if (!regionMaskEnabled || !stream) return;
    const point = normalizedPoint(event);
    if (!point) return;
    regionMaskDrawing = true;
    regionMaskStart = point;
    regionMaskPreview = { x: point.x, y: point.y, width: 0, height: 0 };
    renderCanvas.setPointerCapture?.(event.pointerId);
    renderFrame(false);
  });
  renderCanvas.addEventListener("pointermove", (event) => {
    if (!regionMaskDrawing || !regionMaskStart) return;
    const point = normalizedPoint(event);
    if (!point) return;
    regionMaskPreview = buildRegionMask(regionMaskStart, point);
    updateRegionMaskOverlay();
    renderFrame(false);
  });
  function finishRegionMask(event) {
    if (!regionMaskDrawing || !regionMaskStart) return;
    const point = normalizedPoint(event) || regionMaskStart;
    const next = buildRegionMask(regionMaskStart, point);
    regionMaskDrawing = false;
    regionMaskStart = null;
    regionMaskPreview = null;
    updateRegionMaskOverlay();
    if (next.width >= 0.025 && next.height >= 0.025) {
      livingMetalRegion = next;
      announce("تم حفظ قناع المنطقة اليدوي لإعادة استخدامه مع المؤثرات الموضعية", true);
    } else {
      announce("المنطقة صغيرة جدًا؛ اسحب لتحديد مساحة أكبر", true);
    }
    renderFrame(false);
    updateDiagnostics();
  }
  renderCanvas.addEventListener("pointerup", finishRegionMask);
  renderCanvas.addEventListener("pointercancel", finishRegionMask);
  $("#nox-region-mask-toggle")?.addEventListener("click", () => {
    regionMaskEnabled = !regionMaskEnabled;
    regionMaskDrawing = false;
    regionMaskStart = null;
    regionMaskPreview = null;
    const button = $("#nox-region-mask-toggle");
    button.textContent = regionMaskEnabled ? "إيقاف تحديد المنطقة" : "تحديد منطقة يدويًا";
    button.setAttribute("aria-pressed", String(regionMaskEnabled));
    const hint = $("#nox-region-mask-hint");
    if (hint) hint.textContent = regionMaskEnabled ? "اسحب بإصبعك فوق الصورة لرسم مستطيل حول المنطقة المطلوبة" : "حدد منطقة من الصورة لاستخدامها مع المؤثرات الموضعية";
    updateRegionMaskOverlay();
    announce(regionMaskEnabled ? "وضع تحديد المنطقة نشط" : "تم إيقاف وضع التحديد", Boolean(stream));
    updateDiagnostics();
  });
  $("#nox-region-mask-clear")?.addEventListener("click", () => {
    livingMetalRegion = null;
    regionFollowVectorCount = 0;
    regionFollowLastSequence = opticalFlowSequence;
    regionMaskPreview = null;
    updateRegionMaskOverlay();
    regionMaskDrawing = false;
    regionMaskStart = null;
    if (stream) renderFrame(false);
    announce("تم مسح قناع المنطقة", Boolean(stream));
    updateDiagnostics();
  });

  $("#nox-temporal-mode")?.addEventListener("change", (event) => setTemporalMode(event.target.value));
  $("#nox-flow-mode")?.addEventListener("change", (event) => setOpticalFlowMode(event.target.value));
  $("#nox-region-follow-toggle")?.addEventListener("click", () => setRegionFollowEnabled(!regionFollowEnabled));
  $("#nox-flow-clear")?.addEventListener("click", () => {
    resetOpticalFlow();
    announce("تم مسح بيانات تقدير الحركة", Boolean(stream));
    updateDiagnostics();
  });
  $("#nox-temporal-clear")?.addEventListener("click", () => {
    resetTemporalMemory();
    announce("تم مسح الذاكرة الزمنية", Boolean(stream));
    updateDiagnostics();
  });

  $("#nox-living-metal-toggle")?.addEventListener("click", () => {
    livingMetalEnabled = !livingMetalEnabled;
    const button = $("#nox-living-metal-toggle");
    button.textContent = livingMetalEnabled ? "إيقاف Living Metal" : "تشغيل Living Metal";
    button.setAttribute("aria-pressed", String(livingMetalEnabled));
    const hint = $("#nox-living-metal-hint");
    if (hint) hint.textContent = livingMetalEnabled ? (livingMetalRegion ? "التأثير يعمل داخل قناع المنطقة المحدد" : "فعّل تحديد المنطقة واسحب فوق الصورة أولًا") : "تأثير معدني تجريبي داخل قناع مستطيل يدوي";
    if (stream) renderFrame(false);
    updateDiagnostics();
  });

  capture.addEventListener("click", () => {
    if (!stream || !video.videoWidth) return announce("انتظر حتى يظهر بث الكاميرا.");
    renderFrame(false);
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
        if (recordButton) recordButton.textContent = "فيديو";
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
    selectedFilter = null;
    if (filterSelect) filterSelect.value = "";
    const buttons = [...page.querySelectorAll(".nox-lens-v2")];
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === selectedLens;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (track) {
      track.style.transform = "rotate(" + (-selectedLens * 360 / LENSES.length) + "deg)";
    }
    if (stream) renderFrame(false);
    announce("تم اختيار عدسة " + LENSES[selectedLens].name, Boolean(stream));
    updateDiagnostics();
  }

  function buildFilterLibrary() {
    if (!filterSelect) return;
    filterSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "اختر فلترًا من مكتبة NOX (200)";
    filterSelect.append(placeholder);
    NOX_FILTER_GROUPS.forEach((group, family) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group[0];
      NOX_FILTERS.filter((filter) => filter.family === family).forEach((filter) => {
        const option = document.createElement("option");
        option.value = String(filter.id);
        option.textContent = filter.name;
        optgroup.append(option);
      });
      filterSelect.append(optgroup);
    });
    filterSelect.addEventListener("change", () => {
      const id = Number(filterSelect.value);
      selectedFilter = filterSelect.value === "" ? null : (NOX_FILTERS[id] || null);
      if (stream) renderFrame(false);
      announce(selectedFilter ? "تم اختيار " + selectedFilter.name : "تم الرجوع إلى العدسات الأساسية", Boolean(stream));
      updateDiagnostics();
    });
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
