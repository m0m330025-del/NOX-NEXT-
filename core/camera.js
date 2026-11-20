import { NOX_FILTERS, NOX_FILTER_GROUPS, getFallbackFilter } from "./nox-filter-engine.js";
import { NOXFaceDetectionEngine } from "./nox-face-detection-engine.js";
import { NOXFaceTrackingEngine } from "./nox-face-tracking-engine.js";
import { NOXFaceRegionEngine } from "./nox-face-region-engine.js";
import { NOXMediaPipeSelfieProvider } from "./nox-mediapipe-selfie-provider.js";
import { NOXBeautyVisionProvider } from "./nox-beauty-vision-provider.js";
import { NOXSkinSegmentationEngine } from "./nox-skin-segmentation-engine.js";
import { NOXMediaPipeFaceLandmarkerProvider } from "./nox-mediapipe-face-landmarker-provider.js";
import { NOXFaceLandmarksEngine } from "./nox-face-landmarks-engine.js";
import { NOXFacialMaskBuilder } from "./nox-facial-mask-builder.js";
import { buildNOXFaceDigitalTwinDiagnostic } from "./nox-face-digital-twin-diagnostics.js";
import { createNOXCortex } from "./nox-cortex.js";
import { NOXSparseOpticalFlowEngine } from "./nox-optical-flow-engine.js";
import { NOXTemporalMemoryEngine } from "./nox-temporal-memory-engine.js";
import { NOXTemporalAlignmentEngine } from "./nox-temporal-alignment-engine.js";
import { NOXSmartMotionSeparationEngine } from "./nox-smart-motion-separation-engine.js";

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
uniform float u_filterGroup;
uniform float u_lowLight;
uniform float u_detail;
uniform float u_waveMatter;
uniform float u_science;
uniform vec2 u_texel;
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
  if (u_waveMatter > 0.5 && u_waveMatter < 1.5) {
    // Thin-film interference approximation: phase depends on optical path length and wavelength.
    float lumWave = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float filmThickness = 260.0 + 390.0 * (0.5 + 0.5 * sin(uv.x * 8.0 + uv.y * 5.0 + u_time * 0.22));
    float viewFactor = 0.62 + 0.38 * (1.0 - abs(uv.y - 0.5) * 1.4);
    float phaseR = 12.56637 * 1.34 * filmThickness * viewFactor / 650.0;
    float phaseG = 12.56637 * 1.34 * filmThickness * viewFactor / 510.0;
    float phaseB = 12.56637 * 1.34 * filmThickness * viewFactor / 475.0;
    vec3 interference = 0.5 + 0.5 * cos(vec3(phaseR, phaseG, phaseB) + vec3(0.0, 0.8, 1.7));
    float materialGate = smoothstep(0.12, 0.88, lumWave);
    c = mix(c, c * (0.62 + interference * 0.72), 0.16 + materialGate * 0.22);
  } else if (u_waveMatter > 1.5 && u_waveMatter < 2.5) {
    // Dispersion-inspired edge separation; deliberately subtle to avoid false detail claims.
    vec2 offset = u_texel * (1.0 + 2.0 * abs(uv.y - 0.5));
    vec3 redSample = texture2D(u_image, uv + vec2(offset.x, 0.0)).rgb;
    vec3 blueSample = texture2D(u_image, uv - vec2(offset.x, 0.0)).rgb;
    float edgeGate = smoothstep(0.025, 0.20, length(redSample - blueSample));
    vec3 dispersed = vec3(redSample.r, c.g, blueSample.b);
    c = mix(c, dispersed, edgeGate * 0.34);
  } else if (u_waveMatter > 2.5) {
    // Rayleigh-like sky scattering grade: wavelength-biased blue lift toward upper image regions.
    float skyFactor = (1.0 - smoothstep(0.18, 0.92, uv.y));
    float horizonHaze = (1.0 - smoothstep(0.18, 0.72, uv.y)) * 0.10;
    vec3 skyTint = vec3(0.42, 0.62, 1.0) * (0.10 + skyFactor * 0.20);
    c = mix(c, c * (vec3(1.0) + skyTint) + vec3(horizonHaze * 0.7, horizonHaze * 0.8, horizonHaze), skyFactor * 0.22);
  }

  if (u_science > 0.5 && u_science < 1.5) {
    vec2 p = uv - vec2(0.5); float radius = length(p);
    float rings = 0.5 + 0.5 * cos(radius * 185.0 - u_time * 2.2);
    float aperture = 1.0 - smoothstep(0.08, 0.52, radius);
    c = mix(c, c * 0.72 + vec3(0.24,0.52,0.92) * rings * 0.42, aperture * 0.30);
  } else if (u_science > 1.5 && u_science < 2.5) {
    float lum = dot(c, vec3(0.299,0.587,0.114));
    float emission = smoothstep(0.28,0.82,lum) * (0.5 + 0.5*sin(u_time*1.4 + uv.y*8.0));
    c = mix(c, c + vec3(0.10,0.48,0.36)*emission, 0.34);
  } else if (u_science > 2.5 && u_science < 3.5) {
    float angle = atan(uv.y-0.5,uv.x-0.5);
    float analyzer = 0.5 + 0.5*cos(angle*2.0 + u_time*0.18);
    c = mix(c, c * (0.72 + 0.48*analyzer) + vec3(0.08,0.16,0.28)*(1.0-analyzer), 0.34);
  } else if (u_science > 3.5 && u_science < 4.5) {
    float lum = dot(c,vec3(0.299,0.587,0.114));
    float depthProxy = smoothstep(0.12,0.88,lum);
    float focusBand = 1.0 - smoothstep(0.08,0.28,abs(depthProxy-0.58));
    vec3 soft = (texture2D(u_image,uv+u_texel*vec2(1.0,0.0)).rgb + texture2D(u_image,uv-u_texel*vec2(1.0,0.0)).rgb + texture2D(u_image,uv+u_texel*vec2(0.0,1.0)).rgb + texture2D(u_image,uv-u_texel*vec2(0.0,1.0)).rgb) * 0.25;
    c = mix(c,soft,focusBand*0.34);
  } else if (u_science > 4.5 && u_science < 5.5) {
    vec2 flarePos = uv-vec2(0.22,0.28);
    float flare = exp(-dot(flarePos,flarePos)*42.0);
    float streak = exp(-abs(uv.y-0.28)*95.0)*0.22;
    c = clamp(c + vec3(1.0,0.72,0.38)*(flare*0.28+streak*0.08),0.0,1.0);
  } else if (u_science > 5.5 && u_science < 6.5) {
    float lum = dot(c,vec3(0.299,0.587,0.114));
    vec3 spectral = vec3(c.r*1.12, c.g*0.96, c.b*1.18) + vec3(0.03,0.0,0.05)*(1.0-lum);
    c = mix(c,spectral,0.42);
  } else if (u_science > 6.5 && u_science < 7.5) {
    float radius = length(uv-vec2(0.52,0.34));
    float halo = exp(-pow((radius-0.22)*34.0,2.0));
    float haze = (1.0-smoothstep(0.15,0.85,uv.y))*0.08;
    c = clamp(c + vec3(0.34,0.48,0.72)*(halo*0.18+haze),0.0,1.0);
  } else if (u_science > 7.5) {
    float lum = dot(c,vec3(0.299,0.587,0.114));
    float grain = 0.5+0.5*sin((uv.x*19.0+uv.y*13.0+lum*3.0)*6.28318);
    vec3 material = mix(vec3(0.12,0.20,0.28),vec3(0.88,0.76,0.58),grain);
    c = mix(c,material*(0.35+lum*0.85),0.28);
  }
  if (u_lowLight > 0.5) {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float darkMask = 1.0 - smoothstep(0.08, 0.52, lum);
    float strength = u_lowLight > 1.5 ? 1.0 : 0.58;
    float lift = darkMask * strength * 0.22;
    c = c + (vec3(1.0) - c) * lift;
    c = pow(max(c, vec3(0.0)), vec3(1.0 - darkMask * strength * 0.16));
    vec3 n1 = texture2D(u_image, uv + vec2(u_texel.x, 0.0)).rgb;
    vec3 n2 = texture2D(u_image, uv - vec2(u_texel.x, 0.0)).rgb;
    vec3 n3 = texture2D(u_image, uv + vec2(0.0, u_texel.y)).rgb;
    vec3 n4 = texture2D(u_image, uv - vec2(0.0, u_texel.y)).rgb;
    float edge1 = abs(dot(n1 - color.rgb, vec3(0.299,0.587,0.114)));
    float edge2 = abs(dot(n2 - color.rgb, vec3(0.299,0.587,0.114)));
    float edge3 = abs(dot(n3 - color.rgb, vec3(0.299,0.587,0.114)));
    float edge4 = abs(dot(n4 - color.rgb, vec3(0.299,0.587,0.114)));
    float w1 = 1.0 - smoothstep(0.025, 0.16, edge1);
    float w2 = 1.0 - smoothstep(0.025, 0.16, edge2);
    float w3 = 1.0 - smoothstep(0.025, 0.16, edge3);
    float w4 = 1.0 - smoothstep(0.025, 0.16, edge4);
    vec3 soft = (color.rgb + n1*w1 + n2*w2 + n3*w3 + n4*w4) / (1.0 + w1 + w2 + w3 + w4);
    c = mix(c, soft, darkMask * strength * 0.24);
    c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, 1.0 - darkMask * strength * 0.10);
  }
  if (u_detail > 0.5) {
    vec3 n1 = texture2D(u_image, uv + vec2(u_texel.x, 0.0)).rgb;
    vec3 n2 = texture2D(u_image, uv - vec2(u_texel.x, 0.0)).rgb;
    vec3 n3 = texture2D(u_image, uv + vec2(0.0, u_texel.y)).rgb;
    vec3 n4 = texture2D(u_image, uv - vec2(0.0, u_texel.y)).rgb;
    float centerLum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float averageLum = dot(n1 + n2 + n3 + n4, vec3(0.299, 0.587, 0.114)) * 0.25;
    float detailSignal = centerLum - averageLum;
    float detailGate = smoothstep(0.012, 0.075, abs(detailSignal));
    float gain = u_detail > 1.5 ? 0.62 : 0.34;
    float protectedDetail = detailSignal * detailGate * gain;
    c = clamp(c + vec3(protectedDetail), 0.0, 1.0);
  }
  // Extended 140-filter families: distinct full-frame looks using existing WebGL only.
  // These are visual grades/proxies, not face/hair/background segmentation.
  if (u_filterGroup > 9.5 && u_filterGroup < 10.5) {
    float cheekL = exp(-dot((uv - vec2(0.34,0.60))*vec2(1.0,1.45),(uv - vec2(0.34,0.60))*vec2(1.0,1.45))*34.0);
    float cheekR = exp(-dot((uv - vec2(0.66,0.60))*vec2(1.0,1.45),(uv - vec2(0.66,0.60))*vec2(1.0,1.45))*34.0);
    vec3 makeupTone = 0.5 + 0.5*cos(vec3(0.0,2.1,4.2) + u_variant*5.2);
    c = mix(c, c*vec3(1.05,0.96,0.94)+makeupTone*0.08, 0.16);
    c = mix(c, vec3(0.92,0.30,0.42), (cheekL+cheekR)*(0.05+u_variant*0.08));
  } else if (u_filterGroup > 10.5 && u_filterGroup < 11.5) {
    vec3 soft = (texture2D(u_image,uv+u_texel*vec2(1.0,0.0)).rgb + texture2D(u_image,uv-u_texel*vec2(1.0,0.0)).rgb + texture2D(u_image,uv+u_texel*vec2(0.0,1.0)).rgb + texture2D(u_image,uv-u_texel*vec2(0.0,1.0)).rgb)*0.25;
    float soften = 0.08 + u_variant*0.16;
    c = mix(c,soft,soften);
    c = mix(c,c*vec3(1.04,1.01,0.99)+vec3(0.018,0.008,0.006),0.18);
  } else if (u_filterGroup > 11.5 && u_filterGroup < 12.5) {
    float hue = u_variant*6.28318;
    vec3 dye = 0.5 + 0.5*cos(vec3(0.0,2.094,4.188)+hue);
    float shine = pow(max(0.0,1.0-abs(uv.x-0.5)),5.0)*(0.04+u_variant*0.08);
    c = mix(c,c*dye*1.25,0.18+u_variant*0.18);
    c += vec3(shine);
  } else if (u_filterGroup > 12.5 && u_filterGroup < 13.5) {
    float eyeLum = dot(c, vec3(0.299, 0.587, 0.114));
    float eyeGrade = smoothstep(0.18,0.78,eyeLum);
    vec3 eyePalette = 0.5 + 0.5*cos(vec3(0.0,2.094,4.188)+u_variant*6.28318);
    c = mix(c,c*mix(vec3(0.86,0.90,1.08),eyePalette,0.34),0.16+u_variant*0.12);
    c = clamp((c-0.5)*(1.04+eyeGrade*0.12)+0.5,0.0,1.0);
  } else if (u_filterGroup > 13.5 && u_filterGroup < 14.5) {
    vec2 cell = floor(uv*vec2(9.0,15.0));
    float seed = fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
    vec2 local = fract(uv*vec2(9.0,15.0))-0.5;
    float radius = length(local);
    float bokeh = (1.0-smoothstep(0.10+u_variant*0.08,0.19+u_variant*0.10,radius))*step(0.84,seed);
    vec3 backdropTint = 0.5+0.5*cos(vec3(0.0,2.1,4.2)+u_variant*5.0);
    c = mix(c,c*0.78+backdropTint*0.28,0.12+u_variant*0.12);
    c += bokeh*0.10;
  } else if (u_filterGroup > 14.5 && u_filterGroup < 15.5) {
    float depthProxy = smoothstep(0.08,0.92,lum);
    float edge = smoothstep(0.25,0.72,length(uv-vec2(0.5)));
    float focus = 1.0-abs(depthProxy-(0.35+u_variant*0.30));
    float blurMix = clamp(edge*(1.0-focus)*(0.10+u_variant*0.18),0.0,0.28);
    vec3 nearby = (texture2D(u_image,uv+u_texel*vec2(2.0,0.0)).rgb+texture2D(u_image,uv-u_texel*vec2(2.0,0.0)).rgb+texture2D(u_image,uv+u_texel*vec2(0.0,2.0)).rgb+texture2D(u_image,uv-u_texel*vec2(0.0,2.0)).rgb)*0.25;
    c = mix(c,nearby,blurMix);
    c = clamp((c-0.5)*(1.08+u_variant*0.12)+0.5,0.0,1.0);
  } else if (u_filterGroup > 15.5 && u_filterGroup < 16.5) {
    vec2 grid = uv*vec2(13.0,21.0);
    vec2 cell = floor(grid);
    vec2 local = fract(grid)-0.5;
    float seed = fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
    float drift = sin(u_time*(0.6+u_variant)+seed*6.28318)*0.12;
    float sparkle = (1.0-smoothstep(0.025+u_variant*0.018,0.11+u_variant*0.025,length(local-vec2(drift,0.0))))*step(0.88,seed);
    vec3 particleTint = 0.5+0.5*cos(vec3(0.0,2.094,4.188)+u_variant*6.28318);
    c += particleTint*sparkle*(0.18+u_variant*0.18);
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
  const temporalMemoryEngine = new NOXTemporalMemoryEngine();
  const temporalAlignmentEngine = new NOXTemporalAlignmentEngine();
  const motionSeparationEngine = new NOXSmartMotionSeparationEngine();
  let motionSeparationResult = motionSeparationEngine.getStatus();
  let opticalFlowMode = "off";
  let opticalFlowProcessing = false;
  let opticalFlowSession = 0;
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
  let subjectLockEnabled = false;
  let subjectLockTemplate = null;
  let subjectLockCenter = null;
  let subjectLockLostFrames = 0;
  let subjectLockConfidence = 0;
  let subjectLockReacquireAttempts = 0;
  let subjectLockWasReacquired = false;
  let motionPredictionEnabled = false;
  let subjectLockVelocity = { x: 0, y: 0 };
  let cameraStabilizationEnabled = false;
  let stabilizationOffset = { x: 0, y: 0 };
  let stabilizationTarget = { x: 0, y: 0 };
  let stabilizationConfidence = 0;
  let lowLightMode = "off";
  let detailRecoveryMode = "off";
  let waveMatterMode = "off";
  let scienceMode = "off";
  let motionFreezeEnabled = false;
  let motionFreezeCapturePending = false;
  let motionFreezeCaptureTimer = 0;
  let motionFreezeCaptureStartedAt = 0;
  let motionFreezeLastSpeed = null;
  let motionFreezeLastSampleAt = 0;
  let motionFreezeState = "غير متاح";
  let photonTimelineEnabled = false;
  let photonTimelineSlots = [];
  let photonTimelineOrder = [];
  let photonTimelineWriteIndex = 0;
  let photonTimelineLastCaptureAt = 0;
  let photonTimelineSelectedIndex = -1;
  let photonTimelineSelectionManual = false;
  let photonTimelineSessionStart = 0;
  let photonTimelineSequence = 0;
  let photonFusionCanvas = null;
  let photonFusionReferenceIndex = -1;
  let photonFusionTilesUsed = 0;
  let photonConfidenceCanvas = null;
  let photonConfidenceReferenceIndex = -1;
  let photonConfidenceCounts = { corroborated: 0, single: 0, uncertain: 0 };
  let photonGhostGuardCanvas = null;
  let photonGhostGuardReferenceIndex = -1;
  let photonGhostGuardTiles = new Set();
  let photonGhostGuardCounts = { blocked: 0, clear: 0 };
  const cortex = createNOXCortex();
  const opticalFlowEngine = new NOXSparseOpticalFlowEngine({ maxDimension: 128, minConfidence: 0.06 });
  const faceDetectionEngine = new NOXFaceDetectionEngine();
  const faceTrackingEngine = new NOXFaceTrackingEngine({ maxMissedFrames: 2, smoothing: 0.58 });
  const faceRegionEngine = new NOXFaceRegionEngine();
  let trackedFaceRegions = null;
  let faceDetectionState = "idle";
  let faceDetectionInFlight = false;
  let faceDetectionAbortController = null;
  let faceDetectionLastAt = 0;
  let faceDetectionSession = 0;
  let trackedFace = null;
  let beautyVisionAdapter = null;
  let beautyVisionProvider = null;
  let faceLandmarkerProvider = null;
  const faceLandmarksEngine = new NOXFaceLandmarksEngine();
  const facialMaskBuilder = new NOXFacialMaskBuilder();
  let latestFacialMaskPreview = null;
  let faceLandmarksState = "متوقف";
  let latestFaceLandmarksAnalysis = null;
  let beautySkinEngine = new NOXSkinSegmentationEngine({
    minConfidence: 0.55, minCoverage: 0.04, maxCoverage: 0.9, minPixels: 16
  });
  let beautyFrameCounter = 0;
  let beautyLastTimestamp = 0;
  let beautyProcessing = false;
  let beautyState = "متوقف";
  const beautyInputCanvas = document.createElement("canvas");
  const beautyInputContext = beautyInputCanvas.getContext("2d", { willReadFrequently: true });
  const beautyOverlay = document.createElement("canvas");
  beautyOverlay.id = "nox-beauty-ai-mask-preview";
  beautyOverlay.hidden = true;
  beautyOverlay.setAttribute("aria-hidden", "true");
  beautyOverlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:3;pointer-events:none;";
  stage.append(beautyOverlay);
  const beautyOverlayContext = beautyOverlay.getContext("2d");

  const beautyPanel = document.createElement("section");
  beautyPanel.className = "nox-beauty-ai-panel";
  const beautyTitle = document.createElement("b");
  beautyTitle.textContent = "NOX BEAUTY VISION — REAL AI";
  const beautyButton = document.createElement("button");
  beautyButton.type = "button";
  beautyButton.textContent = "تحميل نموذج تقسيم البشرة";
  beautyButton.disabled = true;
  const beautyStatus = document.createElement("small");
  beautyStatus.setAttribute("role", "status");
  beautyStatus.textContent = "شغّل الكاميرا ثم ابدأ التحليل. النموذج يُحمّل عند طلبك فقط.";
  const beautyPrivacy = document.createElement("small");
  beautyPrivacy.textContent = "المعالجة على الجهاز. قد ترسل مكتبة MediaPipe بيانات قياس استخدام؛ لا ترسل إطارات الكاميرا إلى خوادم النموذج.";
  beautyPanel.append(beautyTitle, beautyButton, beautyStatus, beautyPrivacy);
  const faceLandmarksButton = document.createElement("button");
  faceLandmarksButton.type = "button";
  faceLandmarksButton.textContent = "تحميل محرك نقاط الوجه (478 نقطة)";
  faceLandmarksButton.disabled = true;
  const faceLandmarksStatus = document.createElement("small");
  faceLandmarksStatus.setAttribute("role", "status");
  faceLandmarksStatus.textContent = "يحدد الشفاه والعينين والحواجب من نقاط MediaPipe الفعلية، دون إنشاء أقنعة تجميل وهمية.";
  beautyPanel.append(faceLandmarksButton, faceLandmarksStatus);
  const faceDigitalTwinButton = document.createElement("button");
  faceDigitalTwinButton.type = "button";
  faceDigitalTwinButton.textContent = "تشغيل تقرير NOX Face Digital Twin";
  faceDigitalTwinButton.disabled = true;
  const faceDigitalTwinStatus = document.createElement("small");
  faceDigitalTwinStatus.setAttribute("role", "status");
  faceDigitalTwinStatus.textContent = "تقرير بحثي منفصل؛ ينتظر تحليل نقاط الوجه.";
  const faceDigitalTwinReport = document.createElement("small");
  faceDigitalTwinReport.setAttribute("aria-live", "polite");
  faceDigitalTwinReport.textContent = "لا توجد نتائج تشخيصية بعد.";
  beautyPanel.append(faceDigitalTwinButton, faceDigitalTwinStatus, faceDigitalTwinReport);
  const faceLandmarksOverlay = document.createElement("canvas");
  faceLandmarksOverlay.id = "nox-face-landmarks-preview";
  faceLandmarksOverlay.hidden = true;
  faceLandmarksOverlay.setAttribute("aria-hidden", "true");
  faceLandmarksOverlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:4;pointer-events:none;";
  stage.append(faceLandmarksOverlay);
  const faceLandmarksContext = faceLandmarksOverlay.getContext("2d");
  page.querySelector(".nox-camera-v2-tools")?.prepend(beautyPanel);

  const supported = {
    secure: window.isSecureContext,
    getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    mediaRecorder: typeof window.MediaRecorder === "function",
    canvasCapture: typeof HTMLCanvasElement.prototype.captureStream === "function",
    webgl: typeof window.WebGLRenderingContext === "function",
    faceDetector: typeof window.FaceDetector === "function"
  };

  function clearBeautyMaskPreview() {
    if (beautyOverlayContext) {
      beautyOverlayContext.clearRect(0, 0, beautyOverlay.width, beautyOverlay.height);
    }
    beautyOverlay.hidden = true;
    beautyOverlay.style.transform = "none";
  }

  function drawBeautyMaskPreview(mask) {
    if (!mask?.data || !beautyOverlayContext) return false;
    const width = mask.width;
    const height = mask.height;
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        mask.data.length !== width * height) return false;
    beautyOverlay.width = width;
    beautyOverlay.height = height;
    const image = beautyOverlayContext.createImageData(width, height);
    for (let i = 0; i < mask.data.length; i += 1) {
      const probability = Math.max(0, Math.min(1, Number(mask.data[i]) || 0));
      const offset = i * 4;
      image.data[offset] = 68;
      image.data[offset + 1] = 245;
      image.data[offset + 2] = 174;
      image.data[offset + 3] = probability > 0 ? Math.round(118 * probability) : 0;
    }
    beautyOverlayContext.putImageData(image, 0, 0);
    beautyOverlay.style.transform = facing === "user" ? "scaleX(-1)" : "none";
    beautyOverlay.hidden = false;
    return true;
  }

  function clearFaceLandmarksPreview() {
    if (faceLandmarksContext) faceLandmarksContext.clearRect(0, 0, faceLandmarksOverlay.width, faceLandmarksOverlay.height);
    faceLandmarksOverlay.hidden = true;
    faceLandmarksOverlay.style.transform = "none";
  }

  function drawFaceLandmarksPreview(analysis) {
    if (!analysis?.regions || !faceLandmarksContext) return false;
    const width = analysis.width;
    const height = analysis.height;
    faceLandmarksOverlay.width = width;
    faceLandmarksOverlay.height = height;
    faceLandmarksContext.clearRect(0, 0, width, height);
    const colors = { lips: "#ff4e91", leftEye: "#62d9ff", rightEye: "#62d9ff", leftEyebrow: "#ffd166", rightEyebrow: "#ffd166", faceOval: "#7df0b1" };
    for (const [name, region] of Object.entries(analysis.regions)) {
      faceLandmarksContext.strokeStyle = colors[name] || "#ffffff";
      faceLandmarksContext.fillStyle = colors[name] || "#ffffff";
      faceLandmarksContext.lineWidth = Math.max(1.2, width / 220);
      faceLandmarksContext.beginPath();
      for (const [start, end] of region.edges) {
        const a = region.points.find(point => point.index === start);
        const b = region.points.find(point => point.index === end);
        if (!a || !b) continue;
        faceLandmarksContext.moveTo(a.x * width, a.y * height);
        faceLandmarksContext.lineTo(b.x * width, b.y * height);
      }
      faceLandmarksContext.stroke();
      for (const point of region.points) {
        faceLandmarksContext.beginPath();
        faceLandmarksContext.arc(point.x * width, point.y * height, Math.max(1, width / 420), 0, Math.PI * 2);
        faceLandmarksContext.fill();
      }
    }
    faceLandmarksOverlay.style.transform = facing === "user" ? "scaleX(-1)" : "none";
    faceLandmarksOverlay.hidden = false;
    return true;
  }

  async function runFaceLandmarksPreview() {
    if (!stream || video.readyState < 2) {
      faceLandmarksStatus.textContent = "شغّل الكاميرا وانتظر ظهور الصورة أولًا.";
      return;
    }
    faceLandmarksButton.disabled = true;
    latestFacialMaskPreview = null;
    faceLandmarksState = "جارٍ تحميل نموذج نقاط الوجه";
    faceLandmarksStatus.textContent = faceLandmarksState + " — التحميل الأول يحتاج اتصالًا بالإنترنت.";
    try {
      const plan = cortex.plan(
        { faceRequested: true, landmarksRequested: true, maskRequested: true },
        { requested: ["face-landmarks", "facial-mask-builder"], mode: lowPower ? "lite" : "balanced" }
      );
      const execution = await cortex.execute(plan, video, {
        "face-landmarks": async source => {
          if (!faceLandmarkerProvider) {
            faceLandmarkerProvider = new NOXMediaPipeFaceLandmarkerProvider({ delegate: "CPU" });
          }
          if (faceLandmarkerProvider.state !== "ready") {
            const initialized = await faceLandmarkerProvider.initialize();
            if (!initialized.available) throw new Error(initialized.reason || "تعذر تحميل Face Landmarker");
          }
          const scale = Math.min(1, 256 / Math.max(source.videoWidth, source.videoHeight));
          const width = Math.max(2, Math.round(source.videoWidth * scale));
          const height = Math.max(2, Math.round(source.videoHeight * scale));
          beautyInputCanvas.width = width;
          beautyInputCanvas.height = height;
          beautyInputContext.drawImage(source, 0, 0, width, height);
          const detected = faceLandmarkerProvider.detect(beautyInputCanvas);
          if (!detected.detected) throw new Error("لم يتم العثور على وجه واضح في الإطار");
          return { detected, analysis: faceLandmarksEngine.analyze(detected) };
        },
        "facial-mask-builder": input => ({
          ...input,
          maskPreview: facialMaskBuilder.build(input.detected, {
            width: input.detected.width,
            height: input.detected.height
          })
        })
      }, { timeoutMs: 15000, stopOnError: true, context: { mode: lowPower ? "lite" : "balanced" } });
      if (execution.state !== "completed" || !execution.output?.analysis) {
        const failed = execution.results.find(item => item.status === "failed");
        throw new Error(failed?.reason === "timeout" ? "انتهت مهلة تحليل الوجه" : "تعذر تنفيذ مسار الوجه والأقنعة عبر NOX CORTEX");
      }
      const analysis = execution.output.analysis;
      latestFacialMaskPreview = execution.output.maskPreview;
      latestFaceLandmarksAnalysis = analysis;
      if (!["complete", "partial"].includes(analysis.state) || !drawFaceLandmarksPreview(analysis)) {
        throw new Error("تعذر استخراج نقاط المناطق");
      }
      faceLandmarksState = "نشط — " + analysis.landmarkCount + " نقطة";
      faceDigitalTwinButton.disabled = false;
      faceDigitalTwinStatus.textContent = "النقاط جاهزة. التقرير سيعرض الأدلة والبيانات المجهولة دون إنشاء أقنعة تجميل.";
      const lipMask = latestFacialMaskPreview?.masks?.lips;
      faceLandmarksStatus.textContent =
        "تم تحديد " + Object.keys(analysis.regions).join("، ") +
        (analysis.unavailable.length ? " — غير متاح: " + analysis.unavailable.join("، ") : "") +
        (lipMask ? " — قناع هندسي أولي للشفاه: " + lipMask.pixelCount + " بكسل، دون درجة ثقة." : " — قناع الشفاه غير متاح: " + (latestFacialMaskPreview?.reason || "لا توجد هندسة صالحة")) +
        ". القناع للمعاينة الهندسية فقط ولا يُقبل كمصدر مكياج.";
      faceLandmarksButton.textContent = "إعادة تحليل ملامح الوجه";
    } catch (error) {
      faceLandmarksState = "غير متاح";
      latestFaceLandmarksAnalysis = null;
      latestFacialMaskPreview = null;
      faceDigitalTwinButton.disabled = true;
      faceDigitalTwinStatus.textContent = "التشخيص غير متاح حتى نجاح تحليل نقاط الوجه.";
      faceDigitalTwinReport.textContent = "لا توجد نتائج تشخيصية.";
      clearFaceLandmarksPreview();
      faceLandmarksStatus.textContent = "تعذر التحليل: " + String(error?.message || error).slice(0, 180);
      faceLandmarksButton.textContent = "إعادة محاولة تحميل نقاط الوجه";
    } finally {
      faceLandmarksButton.disabled = !stream;
      updateDiagnostics();
    }
  }
  faceLandmarksButton.addEventListener("click", runFaceLandmarksPreview);

  function runFaceDigitalTwinDiagnostic() {
    if (!latestFaceLandmarksAnalysis) {
      faceDigitalTwinStatus.textContent = "حلّل نقاط الوجه أولًا.";
      return;
    }
    try {
      const report = buildNOXFaceDigitalTwinDiagnostic(latestFaceLandmarksAnalysis);
      if (report.state !== "research-report") throw new Error(report.reason || "تعذر بناء التقرير");
      const regionRows = Object.entries(report.uncertainty.regions || {}).map(([name, item]) =>
        name + ": " + item.state +
        (item.unknownEvidence.length ? " — غير محسوم: " + item.unknownEvidence.join("، ") : "")
      );
      const topologyRows = Object.entries(report.topology.regions || {}).map(([name, item]) =>
        name + ": " + item.state +
        (item.metrics ? " — مثلثات: " + item.metrics.triangleCount : " — " + item.reason)
      );
      faceDigitalTwinStatus.textContent = "اكتمل التقرير البحثي — لا توجد صلاحية لاستخدامه في محرك المكياج.";
      faceDigitalTwinReport.textContent =
        "Topology: " + topologyRows.join(" | ") +
        " • Evidence: " + regionRows.join(" | ") +
        " • Compositor Eligible: false";
    } catch (error) {
      faceDigitalTwinStatus.textContent = "تعذر التقرير: " + String(error?.message || error).slice(0, 140);
      faceDigitalTwinReport.textContent = "لم يتم إنشاء تقرير قابل للاستخدام.";
    }
    updateDiagnostics();
  }
  faceDigitalTwinButton.addEventListener("click", runFaceDigitalTwinDiagnostic);

  async function releaseFaceLandmarker() {
    clearFaceLandmarksPreview();
    if (faceLandmarkerProvider) {
      try { await faceLandmarkerProvider.dispose(); } catch { /* best-effort cleanup */ }
    }
    faceLandmarkerProvider = null;
    latestFaceLandmarksAnalysis = null;
    latestFacialMaskPreview = null;
    faceDigitalTwinButton.disabled = true;
    faceDigitalTwinStatus.textContent = "تم إيقاف محرك نقاط الوجه وتحرير موارده.";
    faceDigitalTwinReport.textContent = "لا توجد نتائج تشخيصية.";
    faceLandmarksState = "متوقف";
    faceLandmarksButton.textContent = "تحميل محرك نقاط الوجه (478 نقطة)";
    faceLandmarksButton.disabled = true;
    faceLandmarksStatus.textContent = "تم تحرير موارد نموذج نقاط الوجه.";
  }

  async function runBeautyMaskPreview() {
    if (!stream || video.readyState < 2 || beautyProcessing) {
      beautyStatus.textContent = "شغّل الكاميرا وانتظر ظهور الصورة أولًا.";
      return;
    }
    beautyProcessing = true;
    beautyButton.disabled = true;
    beautyState = "جارٍ تحميل النموذج أو تحليل إطار";
    beautyStatus.textContent = beautyState + " — قد يستغرق التحميل الأول وقتًا بسبب حجم النموذج.";
    try {
      if (!beautyVisionAdapter) {
        beautyVisionProvider = new NOXMediaPipeSelfieProvider({
          delegate: "CPU",
          maxInputDimension: 256
        });
        beautyVisionAdapter = new NOXBeautyVisionProvider({
          provider: beautyVisionProvider,
          minSkinConfidence: 0.55,
          minRegionConfidence: 0.8,
          maxFrameAgeMs: 5000,
          now: () => Date.now()
        });
      }
      if (beautyVisionAdapter.state !== "ready") {
        const initialized = await beautyVisionAdapter.initialize();
        if (!initialized.available) {
          throw new Error(initialized.reason || "تعذر تحميل نموذج MediaPipe");
        }
      }

      const scale = Math.min(1, 256 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(2, Math.round(video.videoWidth * scale));
      const height = Math.max(2, Math.round(video.videoHeight * scale));
      beautyInputCanvas.width = width;
      beautyInputCanvas.height = height;
      beautyInputContext.drawImage(video, 0, 0, width, height);

      beautyLastTimestamp = Math.max(Date.now(), beautyLastTimestamp + 1);
      const frame = {
        source: beautyInputCanvas,
        width,
        height,
        frameId: "nox-beauty-" + (++beautyFrameCounter),
        timestamp: beautyLastTimestamp
      };
      const skinPlan = cortex.plan(
        { skinRequested: true },
        { requested: ["skin-segmentation"], mode: lowPower ? "lite" : "balanced" }
      );
      const skinExecution = await cortex.execute(skinPlan, frame, {
        "skin-segmentation": async currentFrame => {
          const vision = await beautyVisionAdapter.processFrame(currentFrame);
          if (!vision || !["complete", "partial"].includes(vision.state) || !vision.skinMask) {
            throw new Error(vision?.reason || "لم يتم اكتشاف منطقة بشرة موثوقة");
          }
          const skin = beautySkinEngine.validateMask({
            data: vision.skinMask.data,
            width: vision.skinMask.width,
            height: vision.skinMask.height,
            confidence: vision.skinMask.confidence,
            source: vision.skinMask.source,
            faceBox: vision.faceBox
          });
          if (skin.state !== "accepted") throw new Error("رفض قناع البشرة: " + skin.reason);
          return { vision, skin };
        }
      }, { timeoutMs: 10000, stopOnError: true, context: { mode: lowPower ? "lite" : "balanced" } });
      if (skinExecution.state !== "completed" || !skinExecution.output?.vision || !skinExecution.output?.skin) {
        const failed = skinExecution.results.find(item => item.status === "failed");
        throw new Error(failed?.reason === "timeout" ? "انتهت مهلة تقسيم البشرة" : "تعذر تنفيذ محرك تقسيم البشرة عبر NOX CORTEX");
      }
      const { vision, skin } = skinExecution.output;
      if (!drawBeautyMaskPreview(vision.skinMask)) {
        throw new Error("تعذر رسم قناع المعاينة");
      }

      beautyState = "نشط — تم اكتشاف بشرة الوجه";
      beautyStatus.textContent =
        "نجح التقسيم الحقيقي: " + skin.pixelCount + " بكسل وجه / ثقة " +
        Math.round(skin.confidence * 100) + "% متوسط احتمال فئة الوجه، وليس نسبة دقة مضمونة. المناطق الدقيقة مثل الشفاه والجفون غير متاحة بهذا النموذج.";
      beautyButton.textContent = "إعادة تحليل إطار";
    } catch (error) {
      beautyState = "غير متاح";
      clearBeautyMaskPreview();
      beautyStatus.textContent = "لم يعمل التحليل: " + String(error?.message || error).slice(0, 180);
      beautyButton.textContent = "إعادة محاولة تحميل النموذج";
    } finally {
      beautyProcessing = false;
      beautyButton.disabled = !stream;
      updateDiagnostics();
    }
  }

  beautyButton.addEventListener("click", runBeautyMaskPreview);

  async function releaseBeautyVision() {
    clearBeautyMaskPreview();
    if (beautyVisionAdapter) {
      try { await beautyVisionAdapter.reset(); } catch { /* release remains best-effort */ }
    }
    beautyVisionAdapter = null;
    beautyVisionProvider = null;
    beautyLastTimestamp = 0;
    beautySkinEngine.reset();
    beautyState = "متوقف";
    beautyButton.textContent = "تحميل نموذج تقسيم البشرة";
    beautyButton.disabled = true;
    beautyStatus.textContent = "تم تحرير موارد النموذج. شغّل الكاميرا لإعادة الاختبار.";
  }

  function resetFaceTracking() {
    faceDetectionSession += 1;
    faceDetectionAbortController?.abort();
    faceDetectionAbortController = null;
    faceDetectionInFlight = false;
    faceDetectionLastAt = 0;
    trackedFace = null;
    trackedFaceRegions = null;
    faceRegionEngine.reset();
    faceTrackingEngine.reset();
    faceDetectionState = "idle";
  }

  async function requestFaceDetection(now) {
    if (!stream || disposed || !faceDetectionEngine.detector || faceDetectionInFlight) return;
    const interval = lowPower ? 650 : 360;
    if (now - faceDetectionLastAt < interval) return;
    faceDetectionLastAt = now;
    faceDetectionInFlight = true;
    const session = faceDetectionSession;
    const controller = new AbortController();
    faceDetectionAbortController = controller;
    const plan = cortex.plan({}, { requested: ["face-detection", "face-tracking"], mode: lowPower ? "lite" : "balanced" });
    const handlers = {
      "face-detection": async (source, { signal }) => {
        if (signal.aborted) throw new Error("detection-cancelled");
        return faceDetectionEngine.detect(source);
      },
      "face-tracking": (detection) => {
        if (detection?.state !== "ok") return { detection, tracking: null };
        return { detection, tracking: faceTrackingEngine.update(detection.faces) };
      }
    };
    cortex.execute(plan, video, handlers, {
      signal: controller.signal,
      timeoutMs: 2800,
      stopOnError: true
    }).then((execution) => {
      if (session !== faceDetectionSession || !stream || disposed || controller.signal.aborted) return;
      if (execution.state !== "completed" || !execution.output?.detection) {
        trackedFace = null;
        trackedFaceRegions = null;
        faceDetectionState = "cortex-" + execution.state;
        faceTrackingEngine.reset();
        return;
      }
      const { detection, tracking } = execution.output;
      if (detection.state === "ok" && tracking) {
        trackedFace = tracking.face;
        trackedFaceRegions = trackedFace ? faceRegionEngine.analyze(trackedFace) : null;
        faceDetectionState = tracking.state;
      } else {
        trackedFace = null;
        trackedFaceRegions = null;
        faceDetectionState = detection.state || "detection-unavailable";
        faceTrackingEngine.reset();
      }
    }).catch(() => {
      if (session === faceDetectionSession && !controller.signal.aborted) {
        trackedFace = null;
        trackedFaceRegions = null;
        faceDetectionState = "cortex-execution-error";
        faceTrackingEngine.reset();
      }
    }).finally(() => {
      if (session === faceDetectionSession) {
        faceDetectionInFlight = false;
        if (faceDetectionAbortController === controller) faceDetectionAbortController = null;
      }
    });
  }

  function drawFaceTrackingOverlay(ctx, width, height) {
    if (!trackedFace?.box || !["acquired", "tracking", "coasting"].includes(faceDetectionState)) return;
    const box = trackedFace.box;
    const x = (facing === "user" ? 1 - box.x - box.width : box.x) * width;
    const y = box.y * height;
    const w = box.width * width;
    const h = box.height * height;
    ctx.save();
    ctx.strokeStyle = faceDetectionState === "coasting" ? "rgba(255,190,80,.82)" : "rgba(75,235,190,.92)";
    ctx.lineWidth = Math.max(2, width * 0.0025);
    ctx.setLineDash(faceDetectionState === "coasting" ? [8, 6] : []);
    ctx.strokeRect(x, y, w, h);
    if (Array.isArray(trackedFace.landmarks)) {
      ctx.fillStyle = "rgba(255,255,255,.92)";
      for (const landmark of trackedFace.landmarks) {
        for (const point of landmark.points || []) {
          const px = (facing === "user" ? 1 - point.x : point.x) * width;
          const py = point.y * height;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2, width * 0.003), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (faceDetectionState !== "coasting" && trackedFaceRegions?.regions) {
      ctx.lineWidth = Math.max(1.5, width * 0.0018);
      ctx.strokeStyle = "rgba(255,220,120,.92)";
      for (const region of Object.values(trackedFaceRegions.regions)) {
        const area = region.bounds;
        const rx = (facing === "user" ? 1 - area.x - area.width : area.x) * width;
        ctx.strokeRect(rx, area.y * height, area.width * width, area.height * height);
      }
    }
    ctx.restore();
  }

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
    beautyButton.disabled = !ready || beautyProcessing;
    faceLandmarksButton.disabled = !ready;
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
      filterGroup: gl.getUniformLocation(program, "u_filterGroup"),
      time: gl.getUniformLocation(program, "u_time"),
      lowLight: gl.getUniformLocation(program, "u_lowLight"),
      detail: gl.getUniformLocation(program, "u_detail"),
      waveMatter: gl.getUniformLocation(program, "u_waveMatter"),
      science: gl.getUniformLocation(program, "u_science"),
      texel: gl.getUniformLocation(program, "u_texel")
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
    temporalMemoryEngine.reset();
    temporalAlignmentEngine.reset();
  }


  function clearPhotonConfidenceMap() {
    if (photonConfidenceCanvas) {
      photonConfidenceCanvas.width = 1;
      photonConfidenceCanvas.height = 1;
    }
    photonConfidenceCanvas = null;
    photonConfidenceReferenceIndex = -1;
    photonConfidenceCounts = { corroborated: 0, single: 0, uncertain: 0 };
  }

  function clearPhotonGhostGuard() {
    if (photonGhostGuardCanvas) { photonGhostGuardCanvas.width = 1; photonGhostGuardCanvas.height = 1; }
    photonGhostGuardCanvas = null;
    photonGhostGuardReferenceIndex = -1;
    photonGhostGuardTiles = new Set();
    photonGhostGuardCounts = { blocked: 0, clear: 0 };
  }

  function clearPhotonDetailFusion() {
    clearPhotonConfidenceMap();
    clearPhotonGhostGuard();
    if (photonFusionCanvas) {
      photonFusionCanvas.width = 1;
      photonFusionCanvas.height = 1;
    }
    photonFusionCanvas = null;
    photonFusionReferenceIndex = -1;
    photonFusionTilesUsed = 0;
  }

  function resetPhotonTimeline() {
    clearPhotonDetailFusion();
    photonTimelineSlots.forEach((slot) => {
      slot.canvas.width = 1;
      slot.canvas.height = 1;
    });
    photonTimelineSlots = [];
    photonTimelineOrder = [];
    photonTimelineWriteIndex = 0;
    photonTimelineLastCaptureAt = 0;
    photonTimelineSelectedIndex = -1;
    photonTimelineSelectionManual = false;
    photonTimelineSessionStart = performance.now();
    photonTimelineSequence = 0;
    updatePhotonTimelineUI();
  }

  function ensurePhotonTimeline(width, height) {
    const maxSide = lowPower ? 192 : 256;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const sampleWidth = Math.max(1, Math.round(width * scale));
    const sampleHeight = Math.max(1, Math.round(height * scale));
    const slotCount = lowPower ? 3 : 4;
    if (photonTimelineSlots.length === slotCount &&
        photonTimelineSlots[0]?.canvas.width === sampleWidth &&
        photonTimelineSlots[0]?.canvas.height === sampleHeight) return;
    resetPhotonTimeline();
    photonTimelineSlots = Array.from({ length: slotCount }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
      return { canvas, context, meta: null };
    }).filter((slot) => slot.context);
  }

  function measurePhotonSharpness(context, width, height) {
    const pixels = context.getImageData(0, 0, width, height).data;
    const luminanceAt = (x, y) => {
      const index = (y * width + x) * 4;
      return (pixels[index] * 77 + pixels[index + 1] * 150 + pixels[index + 2] * 29) / 256;
    };
    let total = 0;
    let samples = 0;
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const center = luminanceAt(x, y);
        const laplacian = Math.abs(
          4 * center - luminanceAt(x - 1, y) - luminanceAt(x + 1, y) -
          luminanceAt(x, y - 1) - luminanceAt(x, y + 1)
        );
        total += laplacian;
        samples += 1;
      }
    }
    return samples ? total / samples : 0;
  }

  function getPhotonMotionEstimate() {
    const usable = opticalFlowVectors
      .filter((vector) => vector.confidence >= 0.12)
      .map((vector) => Math.hypot(vector.dx * opticalFlowWidth, vector.dy * opticalFlowHeight))
      .sort((a, b) => a - b);
    if (usable.length < 4) return null;
    const middle = Math.floor(usable.length / 2);
    return usable.length % 2 ? usable[middle] : (usable[middle - 1] + usable[middle]) / 2;
  }

  function estimatePhotonAlignment(previousCanvas, currentCanvas) {
    if (!previousCanvas || !currentCanvas ||
        previousCanvas.width !== currentCanvas.width ||
        previousCanvas.height !== currentCanvas.height) return null;
    const width = currentCanvas.width;
    const height = currentCanvas.height;
    if (width < 24 || height < 24) return null;
    let previousPixels;
    let currentPixels;
    try {
      previousPixels = previousCanvas.getContext("2d", { willReadFrequently: true })
        .getImageData(0, 0, width, height).data;
      currentPixels = currentCanvas.getContext("2d", { willReadFrequently: true })
        .getImageData(0, 0, width, height).data;
    } catch {
      return null;
    }
    const previousGray = new Uint8Array(width * height);
    const currentGray = new Uint8Array(width * height);
    let mean = 0;
    for (let i = 0, p = 0; i < previousGray.length; i += 1, p += 4) {
      previousGray[i] = (previousPixels[p] * 77 + previousPixels[p + 1] * 150 + previousPixels[p + 2] * 29) >> 8;
      currentGray[i] = (currentPixels[p] * 77 + currentPixels[p + 1] * 150 + currentPixels[p + 2] * 29) >> 8;
      mean += previousGray[i];
    }
    mean /= previousGray.length;
    let variance = 0;
    for (let i = 0; i < previousGray.length; i += 1) {
      const delta = previousGray[i] - mean;
      variance += delta * delta;
    }
    const texture = Math.min(1, Math.sqrt(variance / previousGray.length) / 28);
    if (texture < 0.12) return null;

    const radius = lowPower ? 3 : 5;
    const margin = radius + 2;
    let bestSad = Infinity;
    let secondSad = Infinity;
    let bestDx = 0;
    let bestDy = 0;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        let sad = 0;
        let count = 0;
        for (let y = margin; y < height - margin; y += 3) {
          for (let x = margin; x < width - margin; x += 3) {
            const a = previousGray[y * width + x];
            const b = currentGray[(y + dy) * width + x + dx];
            sad += Math.abs(a - b);
            count += 1;
          }
        }
        const averageSad = count ? sad / count : Infinity;
        if (averageSad < bestSad) {
          secondSad = bestSad;
          bestSad = averageSad;
          bestDx = dx;
          bestDy = dy;
        } else if (Math.abs(dx - bestDx) > 1 || Math.abs(dy - bestDy) > 1) {
          if (averageSad < secondSad) secondSad = averageSad;
        }
      }
    }
    if (!Number.isFinite(bestSad) || bestSad > 38 || !Number.isFinite(secondSad)) return null;
    const uniqueness = Math.max(0, Math.min(1, (secondSad - bestSad) / (secondSad + 1)));
    const confidence = uniqueness * texture;
    if (confidence < 0.035) return null;
    return { dx: bestDx, dy: bestDy, confidence, error: bestSad };
  }

  function drawAlignedPhotonSlot(context, slot, width, height) {
    if (!context || !slot?.meta) return;
    const scaleX = width / slot.canvas.width;
    const scaleY = height / slot.canvas.height;
    const dx = slot.meta.alignmentValid ? slot.meta.alignmentX * scaleX : 0;
    const dy = slot.meta.alignmentValid ? slot.meta.alignmentY * scaleY : 0;
    context.drawImage(slot.canvas, dx, dy, width, height);
  }

  function buildPhotonDetailFusion() {
    if (photonTimelineOrder.length < 2 || photonTimelineSelectedIndex < 0) {
      announce("يلزم وجود عينتين على الأقل لبناء دمج التفاصيل", Boolean(stream));
      return;
    }
    const referenceSlotIndex = photonTimelineOrder[photonTimelineSelectedIndex];
    const referenceSlot = photonTimelineSlots[referenceSlotIndex];
    if (!referenceSlot?.meta || !referenceSlot.meta.alignmentValid) {
      announce("العينة المرجعية لا تملك محاذاة موثوقة؛ اختر عينة أخرى", Boolean(stream));
      return;
    }
    const width = referenceSlot.canvas.width;
    const height = referenceSlot.canvas.height;
    const scratchSlots = [];
    try {
      for (const slotIndex of photonTimelineOrder) {
        const slot = photonTimelineSlots[slotIndex];
        if (!slot?.meta?.alignmentValid) continue;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
        if (!context) continue;
        context.fillStyle = "#000";
        context.fillRect(0, 0, width, height);
        drawAlignedPhotonSlot(context, slot, width, height);
        scratchSlots.push({ slot, canvas, context });
      }
      const reference = scratchSlots.find(item => item.slot === referenceSlot);
      if (!reference || scratchSlots.length < 2) {
        announce("لا توجد عينات كافية بمحاذاة موثوقة للدمج", Boolean(stream));
        scratchSlots.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
        return;
      }
      const referencePixels = reference.context.getImageData(0, 0, width, height).data;
      const candidatePixels = scratchSlots.map(item => ({
        ...item,
        pixels: item.context.getImageData(0, 0, width, height).data
      }));
      const fusion = document.createElement("canvas");
      fusion.width = width;
      fusion.height = height;
      const fusionContext = fusion.getContext("2d");
      if (!fusionContext) throw new Error("fusion context unavailable");
      fusionContext.drawImage(reference.canvas, 0, 0);
      const tileSize = 24;
      const maxOffset = Math.max(
        ...candidatePixels.map(item => Math.max(Math.abs(item.slot.meta.alignmentX), Math.abs(item.slot.meta.alignmentY)))
      );
      const safeMargin = Math.ceil(maxOffset) + 2;
      let tilesUsed = 0;
      const luminance = (pixels, x, y) => {
        const p = (y * width + x) * 4;
        return (pixels[p] * 77 + pixels[p + 1] * 150 + pixels[p + 2] * 29) / 256;
      };
      const tileSharpness = (pixels, x0, y0, tw, th) => {
        let total = 0;
        let count = 0;
        for (let y = y0 + 1; y < y0 + th - 1; y += 2) {
          for (let x = x0 + 1; x < x0 + tw - 1; x += 2) {
            const center = luminance(pixels, x, y);
            total += Math.abs(4 * center - luminance(pixels, x - 1, y) -
              luminance(pixels, x + 1, y) - luminance(pixels, x, y - 1) -
              luminance(pixels, x, y + 1));
            count += 1;
          }
        }
        return count ? total / count : 0;
      };
      for (let y = safeMargin; y + tileSize <= height - safeMargin; y += tileSize) {
        for (let x = safeMargin; x + tileSize <= width - safeMargin; x += tileSize) {
          const baseSharpness = tileSharpness(referencePixels, x, y, tileSize, tileSize);
          let best = null;
          let bestSharpness = baseSharpness;
          for (const candidate of candidatePixels) {
            if (candidate.slot === referenceSlot) continue;
            let difference = 0;
            let count = 0;
            for (let py = y; py < y + tileSize; py += 2) {
              for (let px = x; px < x + tileSize; px += 2) {
                difference += Math.abs(luminance(referencePixels, px, py) -
                  luminance(candidate.pixels, px, py));
                count += 1;
              }
            }
            const meanDifference = count ? difference / count : Infinity;
            if (meanDifference > 14) continue;
            if (photonGhostGuardReferenceIndex === referenceSlotIndex &&
                photonGhostGuardTiles.has(x + ":" + y)) continue;
            const sharpness = tileSharpness(candidate.pixels, x, y, tileSize, tileSize);
            if (sharpness > bestSharpness * 1.12 && sharpness > bestSharpness + 1.5) {
              best = candidate;
              bestSharpness = sharpness;
            }
          }
          if (best) {
            fusionContext.drawImage(best.canvas, x, y, tileSize, tileSize,
              x, y, tileSize, tileSize);
            tilesUsed += 1;
          }
        }
      }
      clearPhotonDetailFusion();
      photonFusionCanvas = fusion;
      photonFusionReferenceIndex = referenceSlotIndex;
      photonFusionTilesUsed = tilesUsed;
      scratchSlots.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
      updatePhotonTimelineUI();
      announce("اكتمل دمج التفاصيل المحافظ: " + tilesUsed + " منطقة محسّنة من عينات متقاربة بصريًا", Boolean(stream));
    } catch {
      scratchSlots.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
      announce("تعذر بناء معاينة الدمج؛ بقيت العينات الأصلية دون تغيير", Boolean(stream));
    }
  }

  function buildPhotonConfidenceMap() {
    if (photonTimelineOrder.length < 2 || photonTimelineSelectedIndex < 0) {
      announce("يلزم وجود عينتين على الأقل لبناء خريطة الثقة", Boolean(stream));
      return;
    }
    const referenceSlotIndex = photonTimelineOrder[photonTimelineSelectedIndex];
    const referenceSlot = photonTimelineSlots[referenceSlotIndex];
    if (!referenceSlot?.meta?.alignmentValid) {
      announce("العينة المرجعية لا تملك محاذاة موثوقة؛ اختر عينة أخرى", Boolean(stream));
      return;
    }
    const width = referenceSlot.canvas.width;
    const height = referenceSlot.canvas.height;
    const scratch = [];
    try {
      for (const slotIndex of photonTimelineOrder) {
        const slot = photonTimelineSlots[slotIndex];
        if (!slot?.meta?.alignmentValid) continue;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
        if (!context) continue;
        context.fillStyle = "#000";
        context.fillRect(0, 0, width, height);
        drawAlignedPhotonSlot(context, slot, width, height);
        scratch.push({ slot, canvas, context });
      }
      const reference = scratch.find(item => item.slot === referenceSlot);
      if (!reference || scratch.length < 2) {
        announce("لا توجد عينات كافية بمحاذاة موثوقة لبناء الخريطة", Boolean(stream));
        scratch.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
        return;
      }
      const pixels = scratch.map(item => ({
        ...item,
        data: item.context.getImageData(0, 0, width, height).data
      }));
      const base = pixels.find(item => item.slot === referenceSlot).data;
      const map = document.createElement("canvas");
      map.width = width;
      map.height = height;
      const context = map.getContext("2d");
      if (!context) throw new Error("confidence map context unavailable");
      context.drawImage(reference.canvas, 0, 0);
      const tileSize = 24;
      const margin = Math.ceil(Math.max(...pixels.map(item =>
        Math.max(Math.abs(item.slot.meta.alignmentX), Math.abs(item.slot.meta.alignmentY))
      ))) + 2;
      const counts = { corroborated: 0, single: 0, uncertain: 0 };
      const lum = (data, x, y) => {
        const p = (y * width + x) * 4;
        return (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) / 256;
      };
      for (let y = margin; y + tileSize <= height - margin; y += tileSize) {
        for (let x = margin; x + tileSize <= width - margin; x += tileSize) {
          let agreeing = 0;
          for (const candidate of pixels) {
            if (candidate.slot === referenceSlot) continue;
            let difference = 0;
            let samples = 0;
            for (let py = y; py < y + tileSize; py += 3) {
              for (let px = x; px < x + tileSize; px += 3) {
                difference += Math.abs(lum(base, px, py) - lum(candidate.data, px, py));
                samples += 1;
              }
            }
            if (samples && difference / samples <= 14) agreeing += 1;
          }
          const category = agreeing >= 2 ? "corroborated" : agreeing === 1 ? "single" : "uncertain";
          counts[category] += 1;
          context.fillStyle = category === "corroborated"
            ? "rgba(34, 197, 94, 0.48)"
            : category === "single"
              ? "rgba(245, 185, 45, 0.52)"
              : "rgba(239, 68, 68, 0.48)";
          context.fillRect(x, y, tileSize, tileSize);
        }
      }
      clearPhotonConfidenceMap();
      photonConfidenceCanvas = map;
      photonConfidenceReferenceIndex = referenceSlotIndex;
      photonConfidenceCounts = counts;
      scratch.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
      updatePhotonTimelineUI();
      announce("خريطة الثقة جاهزة: " + counts.corroborated + " مناطق مدعومة، " +
        counts.single + " بعينة واحدة، و" + counts.uncertain + " غير مؤكدة", Boolean(stream));
    } catch {
      scratch.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
      announce("تعذر بناء خريطة الثقة؛ العينات الأصلية لم تتغير", Boolean(stream));
    }
  }

  function buildPhotonGhostGuard() {
    if (photonTimelineOrder.length < 2 || photonTimelineSelectedIndex < 0) {
      announce("يلزم وجود عينتين على الأقل لاكتشاف الأشباح", Boolean(stream));
      return;
    }
    const referenceSlotIndex = photonTimelineOrder[photonTimelineSelectedIndex];
    const referenceSlot = photonTimelineSlots[referenceSlotIndex];
    if (!referenceSlot?.meta?.alignmentValid) {
      announce("العينة المرجعية لا تملك محاذاة موثوقة؛ اختر عينة أخرى", Boolean(stream));
      return;
    }
    const width = referenceSlot.canvas.width;
    const height = referenceSlot.canvas.height;
    const scratch = [];
    try {
      for (const slotIndex of photonTimelineOrder) {
        const slot = photonTimelineSlots[slotIndex];
        if (!slot?.meta?.alignmentValid) continue;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
        if (!context) continue;
        context.fillStyle = "#000";
        context.fillRect(0, 0, width, height);
        drawAlignedPhotonSlot(context, slot, width, height);
        scratch.push({ slot, canvas, data: context.getImageData(0, 0, width, height).data });
      }
      if (scratch.length < 2 || !scratch.some(item => item.slot === referenceSlot)) {
        announce("لا توجد عينات محاذاة كافية لفحص الحركة الزمنية", Boolean(stream));
        scratch.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
        return;
      }
      const map = document.createElement("canvas");
      map.width = width;
      map.height = height;
      const context = map.getContext("2d");
      if (!context) throw new Error("ghost guard context unavailable");
      context.drawImage(referenceSlot.canvas, 0, 0, width, height);
      const tileSize = 24;
      const maxOffset = Math.max(...scratch.map(item =>
        Math.max(Math.abs(item.slot.meta.alignmentX), Math.abs(item.slot.meta.alignmentY))));
      const margin = Math.ceil(maxOffset) + 2;
      const nextMask = new Set();
      const counts = { blocked: 0, clear: 0 };
      const luminance = (data, x, y) => {
        const p = (y * width + x) * 4;
        return (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) / 256;
      };
      for (let y = margin; y + tileSize <= height - margin; y += tileSize) {
        for (let x = margin; x + tileSize <= width - margin; x += tileSize) {
          let rangeTotal = 0;
          let samples = 0;
          for (let py = y; py < y + tileSize; py += 3) {
            for (let px = x; px < x + tileSize; px += 3) {
              let low = 255;
              let high = 0;
              for (const item of scratch) {
                const value = luminance(item.data, px, py);
                low = Math.min(low, value);
                high = Math.max(high, value);
              }
              rangeTotal += high - low;
              samples += 1;
            }
          }
          const temporalRange = samples ? rangeTotal / samples : 0;
          const key = x + ":" + y;
          const blocked = temporalRange > 18;
          if (blocked) {
            nextMask.add(key);
            counts.blocked += 1;
            context.fillStyle = "rgba(239, 68, 68, 0.56)";
          } else {
            counts.clear += 1;
            context.fillStyle = "rgba(34, 197, 94, 0.18)";
          }
          context.fillRect(x, y, tileSize, tileSize);
        }
      }
      clearPhotonGhostGuard();
      photonGhostGuardCanvas = map;
      photonGhostGuardReferenceIndex = referenceSlotIndex;
      photonGhostGuardTiles = nextMask;
      photonGhostGuardCounts = counts;
      scratch.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
      updatePhotonTimelineUI();
      announce("Ghost Guard: حجب " + counts.blocked + " منطقة متغيرة زمنيًا، وترك " +
        counts.clear + " منطقة دون حجب", Boolean(stream));
    } catch {
      scratch.forEach(item => { item.canvas.width = 1; item.canvas.height = 1; });
      announce("تعذر إنشاء خريطة Ghost Guard؛ العينات الأصلية لم تتغير", Boolean(stream));
    }
  }

  function updatePhotonTimelineUI() {
    const toggle = $("#nox-photon-timeline-toggle");
    const scrub = $("#nox-photon-timeline-scrub");
    const preview = $("#nox-photon-timeline-preview");
    const hint = $("#nox-photon-timeline-hint");
    const bestButton = $("#nox-photon-timeline-best");
    const saveButton = $("#nox-photon-timeline-save");
    const fusionButton = $("#nox-photon-fusion-build");
    const fusionSaveButton = $("#nox-photon-fusion-save");
    const confidenceButton = $("#nox-photon-confidence-build");
    const ghostButton = $("#nox-photon-ghost-build");
    const confidenceCanvas = $("#nox-photon-confidence-map");
    const confidenceHint = $("#nox-photon-confidence-hint");
    const ghostCanvas = $("#nox-photon-ghost-map");
    const ghostHint = $("#nox-photon-ghost-hint");
    const hasFrames = photonTimelineOrder.length > 0;
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(photonTimelineEnabled));
      toggle.textContent = photonTimelineEnabled ? "إيقاف آلة الزمن الضوئي" : "تشغيل آلة الزمن الضوئي";
    }
    if (scrub) {
      scrub.disabled = !hasFrames;
      scrub.max = String(Math.max(0, photonTimelineOrder.length - 1));
      if (photonTimelineSelectedIndex < 0 && hasFrames) photonTimelineSelectedIndex = photonTimelineOrder.length - 1;
      scrub.value = String(Math.max(0, photonTimelineSelectedIndex));
    }
    const selectedSlot = hasFrames && photonTimelineSelectedIndex >= 0
      ? photonTimelineSlots[photonTimelineOrder[Math.min(photonTimelineSelectedIndex, photonTimelineOrder.length - 1)]]
      : null;
    const hasFusion = Boolean(photonFusionCanvas && photonFusionReferenceIndex ===
      (hasFrames ? photonTimelineOrder[photonTimelineSelectedIndex] : -1));
    const hasConfidence = Boolean(photonConfidenceCanvas && photonConfidenceReferenceIndex ===
      (hasFrames ? photonTimelineOrder[photonTimelineSelectedIndex] : -1));
    const hasGhostGuard = Boolean(photonGhostGuardCanvas && photonGhostGuardReferenceIndex ===
      (hasFrames ? photonTimelineOrder[photonTimelineSelectedIndex] : -1));
    if (preview && selectedSlot?.meta) {
      if (preview.width !== selectedSlot.canvas.width || preview.height !== selectedSlot.canvas.height) {
        preview.width = selectedSlot.canvas.width;
        preview.height = selectedSlot.canvas.height;
      }
      const context = preview.getContext("2d");
      if (context) {
        context.clearRect(0, 0, preview.width, preview.height);
        if (hasFusion) context.drawImage(photonFusionCanvas, 0, 0, preview.width, preview.height);
        else drawAlignedPhotonSlot(context, selectedSlot, preview.width, preview.height);
      }
    } else if (preview) {
      const context = preview.getContext("2d");
      if (context) context.clearRect(0, 0, preview.width, preview.height);
    }
    if (bestButton) bestButton.disabled = !hasFrames;
    if (saveButton) saveButton.disabled = !selectedSlot?.meta;
    if (fusionButton) fusionButton.disabled = photonTimelineOrder.length < 2 || !hasFrames;
    if (fusionSaveButton) fusionSaveButton.disabled = !hasFusion;
    if (confidenceButton) confidenceButton.disabled = photonTimelineOrder.length < 2 || !hasFrames;
    if (ghostButton) ghostButton.disabled = photonTimelineOrder.length < 2 || !hasFrames;
    if (confidenceCanvas) {
      if (hasConfidence) {
        if (confidenceCanvas.width !== photonConfidenceCanvas.width || confidenceCanvas.height !== photonConfidenceCanvas.height) {
          confidenceCanvas.width = photonConfidenceCanvas.width;
          confidenceCanvas.height = photonConfidenceCanvas.height;
        }
        const confidenceContext = confidenceCanvas.getContext("2d");
        if (confidenceContext) confidenceContext.drawImage(photonConfidenceCanvas, 0, 0);
      } else {
        const confidenceContext = confidenceCanvas.getContext("2d");
        if (confidenceContext) confidenceContext.clearRect(0, 0, confidenceCanvas.width, confidenceCanvas.height);
      }
    }
    if (ghostCanvas) {
      if (hasGhostGuard) {
        if (ghostCanvas.width !== photonGhostGuardCanvas.width || ghostCanvas.height !== photonGhostGuardCanvas.height) {
          ghostCanvas.width = photonGhostGuardCanvas.width;
          ghostCanvas.height = photonGhostGuardCanvas.height;
        }
        const ghostContext = ghostCanvas.getContext("2d");
        if (ghostContext) ghostContext.drawImage(photonGhostGuardCanvas, 0, 0);
      } else {
        const ghostContext = ghostCanvas.getContext("2d");
        if (ghostContext) ghostContext.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);
      }
    }
    if (ghostHint) ghostHint.textContent = hasGhostGuard
      ? "مناطق محجوبة: " + photonGhostGuardCounts.blocked + " — مناطق غير محجوبة: " + photonGhostGuardCounts.clear + " — حد زمني تقريبي"
      : "الأحمر اختلاف زمني مرتفع؛ الأخضر اختلاف أقل — ليس كشفًا مضمونًا للأجسام";
    if (confidenceHint) confidenceHint.textContent = hasConfidence
      ? "مدعومة بإطارين إضافيين: " + photonConfidenceCounts.corroborated +
        " — عينة واحدة: " + photonConfidenceCounts.single +
        " — غير مؤكدة: " + photonConfidenceCounts.uncertain
      : "الخريطة تقدير بصري محلي وليست قياسًا إحصائيًا أو ضمانًا لصحة التفاصيل";
    if (hint) {
      if (!photonTimelineEnabled) {
        hint.textContent = "المحرك متوقف — شغّله لتسجيل تسلسل زمني قصير من إطارات الكاميرا";
      } else if (!hasFrames) {
        hint.textContent = "جارٍ انتظار أول عينة ضوئية…";
      } else {
        const meta = selectedSlot.meta;
        const elapsed = Math.max(0, (meta.capturedAt - photonTimelineSessionStart) / 1000).toFixed(1);
        const motion = meta.motion === null ? "الحركة غير متاحة" : "الحركة " + meta.motion.toFixed(2);
        hint.textContent = "العينة " + (photonTimelineSelectedIndex + 1) + "/" + photonTimelineOrder.length +
          " — +" + elapsed + "ث — حدة محلية " + meta.sharpness.toFixed(1) +
          " — " + motion +
          (meta.alignmentValid ? " — محاذاة عامة " + (meta.alignmentConfidence * 100).toFixed(0) + "%" : " — دون محاذاة موثوقة") +
          (hasFusion ? " — دمج محافظ: " + photonFusionTilesUsed + " منطقة" : "") +
          " — معاينة منخفضة الدقة";
      }
    }
  }

  function capturePhotonMoment(source, width, height) {
    if (!photonTimelineEnabled || !source || !width || !height) return;
    const now = performance.now();
    const interval = lowPower ? 220 : 150;
    if (photonTimelineLastCaptureAt && now - photonTimelineLastCaptureAt < interval) return;
    ensurePhotonTimeline(width, height);
    if (!photonTimelineSlots.length) return;
    const slot = photonTimelineSlots[photonTimelineWriteIndex];
    const sampleWidth = slot.canvas.width;
    const sampleHeight = slot.canvas.height;
    try {
      clearPhotonDetailFusion();
      slot.context.drawImage(source, 0, 0, sampleWidth, sampleHeight);
      const sharpness = measurePhotonSharpness(slot.context, sampleWidth, sampleHeight);
      const motion = getPhotonMotionEstimate();
      const previousIndex = photonTimelineOrder.length
        ? photonTimelineOrder[photonTimelineOrder.length - 1]
        : -1;
      const previousSlot = previousIndex >= 0 ? photonTimelineSlots[previousIndex] : null;
      const alignment = previousSlot?.meta
        ? estimatePhotonAlignment(previousSlot.canvas, slot.canvas)
        : null;
      const alignmentValid = !previousSlot?.meta ||
        (previousSlot.meta.alignmentValid && Boolean(alignment));
      const alignmentX = previousSlot?.meta && alignmentValid && alignment
        ? previousSlot.meta.alignmentX - alignment.dx
        : 0;
      const alignmentY = previousSlot?.meta && alignmentValid && alignment
        ? previousSlot.meta.alignmentY - alignment.dy
        : 0;
      const detailScore = sharpness / (sharpness + 18);
      const motionPenalty = motion === null ? 0.45 : 1 / (1 + motion * 0.75);
      const alignmentFactor = alignment ? 0.75 + alignment.confidence * 0.25 : (previousSlot?.meta ? 0.65 : 1);
      const score = detailScore * motionPenalty * alignmentFactor;
      slot.meta = {
        capturedAt: now,
        sharpness,
        motion,
        score,
        alignmentX,
        alignmentY,
        alignmentValid,
        alignmentConfidence: alignment?.confidence ?? (previousSlot?.meta ? 0 : 1),
        alignmentError: alignment?.error ?? null,
        sequence: ++photonTimelineSequence
      };
      const droppingOldest = photonTimelineOrder.length >= photonTimelineSlots.length;
      if (droppingOldest) photonTimelineOrder.shift();
      photonTimelineOrder.push(photonTimelineWriteIndex);
      photonTimelineWriteIndex = (photonTimelineWriteIndex + 1) % photonTimelineSlots.length;
      if (!photonTimelineSelectionManual) {
        photonTimelineSelectedIndex = photonTimelineOrder.length - 1;
      } else if (droppingOldest) {
        photonTimelineSelectedIndex = Math.max(0, photonTimelineSelectedIndex - 1);
      }
      photonTimelineLastCaptureAt = now;
      updatePhotonTimelineUI();
    } catch {
      const hint = $("#nox-photon-timeline-hint");
      if (hint) hint.textContent = "تعذر تحليل عينة الإطار؛ سيواصل المحرك المحاولة دون تعطيل الكاميرا";
    }
  }

  function selectBestPhotonMoment() {
    if (!photonTimelineOrder.length) return;
    let bestIndex = 0;
    let bestScore = -1;
    photonTimelineOrder.forEach((slotIndex, index) => {
      const score = photonTimelineSlots[slotIndex]?.meta?.score ?? -1;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    photonTimelineSelectedIndex = bestIndex;
    photonTimelineSelectionManual = true;
    updatePhotonTimelineUI();
    announce("تم اختيار أفضل عينة محفوظة وفق مقياس الحدة والحركة التقريبي", Boolean(stream));
  }

  function saveSelectedPhotonMoment() {
    if (photonTimelineSelectedIndex < 0 || !photonTimelineOrder.length) return;
    const slotIndex = photonTimelineOrder[photonTimelineSelectedIndex];
    const slot = photonTimelineSlots[slotIndex];
    if (!slot?.meta) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = slot.canvas.width;
    exportCanvas.height = slot.canvas.height;
    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext) return announce("تعذر تجهيز صورة اللحظة.");
    drawAlignedPhotonSlot(exportContext, slot, exportCanvas.width, exportCanvas.height);
    exportCanvas.toBlob((blob) => {
      exportCanvas.width = 1;
      exportCanvas.height = 1;
      if (!blob) return announce("تعذر حفظ معاينة اللحظة.");
      showBlob(blob, "image", "nox-photon-moment-aligned-preview.jpg");
      announce("تم تجهيز معاينة منخفضة الدقة بعد المحاذاة العامة؛ الأصل الكامل لم يتغير.");
    }, "image/jpeg", 0.9);
  }

  function savePhotonDetailFusion() {
    if (!photonFusionCanvas || photonFusionReferenceIndex < 0) return;
    photonFusionCanvas.toBlob((blob) => {
      if (!blob) return announce("تعذر حفظ معاينة دمج التفاصيل.");
      showBlob(blob, "image", "nox-temporal-detail-fusion-preview.jpg");
      announce("تم حفظ معاينة دمج منخفضة الدقة؛ لم يتم تعديل الصورة الأصلية.");
    }, "image/jpeg", 0.92);
  }

  function setPhotonTimelineEnabled(enabled) {
    photonTimelineEnabled = Boolean(enabled);
    resetPhotonTimeline();
    if (photonTimelineEnabled) {
      if (opticalFlowMode === "off") {
        const flowSelect = $("#nox-flow-mode");
        if (flowSelect) flowSelect.value = "vectors";
        setOpticalFlowMode("vectors");
      }
      announce("بدأ NOX PHOTON TIME MACHINE تسجيل عينات زمنية محلية قصيرة", Boolean(stream));
    } else {
      announce("تم إيقاف آلة الزمن الضوئي ومسح عيناتها المؤقتة", Boolean(stream));
    }
    updatePhotonTimelineUI();
    updateDiagnostics();
    if (stream) renderFrame(false);
  }

  function ensureTemporalMemory(width, height) {
    const profile = temporalMemoryEngine.configure(width, height, { lowPower });
    temporalAlignmentEngine.configure(profile.bufferCount);
    if (temporalBuffers.length === profile.bufferCount &&
        temporalBuffers[0]?.canvas.width === profile.sampleWidth &&
        temporalBuffers[0]?.canvas.height === profile.sampleHeight) return;
    temporalBuffers.forEach((buffer) => {
      buffer.canvas.width = 1;
      buffer.canvas.height = 1;
    });
    temporalBuffers = Array.from({ length: profile.bufferCount }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = profile.sampleWidth;
      canvas.height = profile.sampleHeight;
      return { canvas, context: canvas.getContext("2d", { alpha: false }) };
    }).filter((buffer) => buffer.context);
  }

  function renderTemporalMemory(ctx, width, height) {
    if (!ctx || !width || !height) return;
    ensureTemporalMemory(width, height);
    if (!temporalBuffers.length) return;
    const now = performance.now();
    const capture = temporalMemoryEngine.getCaptureDecision(now);
    let capturedCurrent = false;
    if (capture.capture) {
      const buffer = temporalBuffers[capture.index];
      if (!buffer) {
        resetTemporalMemory();
        return;
      }
      buffer.context.drawImage(renderCanvas, 0, 0, buffer.canvas.width, buffer.canvas.height);
      temporalMemoryEngine.commitCapture(now);
      temporalAlignmentEngine.onCapture(capture.index);
      capturedCurrent = true;
    }
    const plan = temporalMemoryEngine.getCompositePlan(temporalMode, width, capturedCurrent);
    if (!plan.length) return;
    ctx.save();
    ctx.globalCompositeOperation = temporalMode === "motion-trace" ? "screen" : "source-over";
    for (const layer of plan) {
      const buffer = temporalBuffers[layer.index];
      const alignment = temporalAlignmentEngine.getTransform(layer.index);
      if (!buffer || !alignment.valid) continue;
      ctx.globalAlpha = layer.alpha * Math.max(0.2, alignment.confidence);
      ctx.drawImage(buffer.canvas, layer.offset + alignment.dx * width, alignment.dy * height, width, height);
    }
    ctx.restore();
  }

  function resetOpticalFlow() {
    opticalFlowSession += 1;
    opticalFlowProcessing = false;
    opticalFlowEngine.reset();
    temporalAlignmentEngine.reset();
    motionSeparationEngine.reset();
    motionSeparationResult = motionSeparationEngine.getStatus();
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

  async function estimateOpticalFlow() {
    if (opticalFlowMode === "off" || !video.videoWidth || !video.videoHeight || opticalFlowProcessing) return;
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

    const session = opticalFlowSession;
    const previous = opticalFlowPrevious;
    opticalFlowProcessing = true;
    try {
      const plan = cortex.plan({ motion: true }, {
        requested: ["optical-flow"],
        mode: lowPower ? "lite" : "balanced"
      });
      const execution = await cortex.execute({
        ...plan,
      }, { current: gray, previous, width: sampleWidth, height: sampleHeight }, {
        "optical-flow": input => opticalFlowEngine.process(
          input.current, input.previous, input.width, input.height, {
            cellStep: 8,
            patchRadius: 1,
            searchRadius: lowPower ? 2 : 3
          }
        )
      }, { timeoutMs: 1200, stopOnError: true });
      if (session !== opticalFlowSession || !stream ||
          execution.state !== "completed" || !execution.output?.vectors) return;
      opticalFlowVectors = execution.output.vectors;
      opticalFlowConfidence = execution.output.confidence;
      updateMotionFreezeState();
      updateCameraStabilization();
      opticalFlowPrevious = gray;
      opticalFlowSequence += 1;
      motionSeparationResult = motionSeparationEngine.process(opticalFlowVectors);
      temporalAlignmentEngine.ingest(
        motionSeparationResult.accepted ? motionSeparationResult.globalVectors : [],
        { sequence: opticalFlowSequence, width: sampleWidth, height: sampleHeight }
      );
      updateSubjectLock(gray, sampleWidth, sampleHeight);
      updateTrackedRegionFromFlow();
    } catch {
      // A failed flow sample is discarded; the last valid motion state remains intact.
    } finally {
      opticalFlowProcessing = false;
    }
  }

  function clearSubjectLock() {
    subjectLockEnabled = false;
    subjectLockTemplate = null;
    subjectLockCenter = null;
    subjectLockLostFrames = 0;
    subjectLockConfidence = 0;
    subjectLockReacquireAttempts = 0;
    subjectLockWasReacquired = false;
    subjectLockVelocity = { x: 0, y: 0 };
    const button = $("#nox-subject-lock-toggle");
    if (button) {
      button.setAttribute("aria-pressed", "false");
      button.textContent = "تثبيت المنطقة المختارة";
    }
    const hint = $("#nox-subject-lock-hint");
    if (hint) hint.textContent = "القفل البصري متوقف";
  }

  function setSubjectLockEnabled(enabled) {
    if (!enabled) {
      clearSubjectLock();
      announce("تم إيقاف NOX Subject Lock", Boolean(stream));
      updateDiagnostics();
      return;
    }
    if (!livingMetalRegion || !opticalFlowPrevious || !opticalFlowWidth || !opticalFlowHeight) {
      announce("شغّل الكاميرا وحدد منطقة وانتظر اكتمال أول عينتين للحركة", Boolean(stream));
      return;
    }
    const regionCenterX = livingMetalRegion.x + livingMetalRegion.width / 2;
    const centerX = Math.round((facing === "user" ? 1 - regionCenterX : regionCenterX) * opticalFlowWidth);
    const centerY = Math.round((livingMetalRegion.y + livingMetalRegion.height / 2) * opticalFlowHeight);
    const radius = 2;
    if (centerX < radius || centerY < radius || centerX >= opticalFlowWidth - radius || centerY >= opticalFlowHeight - radius) {
      announce("مركز المنطقة قريب جدًا من حافة الصورة؛ حدد منطقة أبعد للداخل", Boolean(stream));
      return;
    }
    const patch = [];
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        patch.push(opticalFlowPrevious[(centerY + y) * opticalFlowWidth + centerX + x]);
      }
    }
    const mean = patch.reduce((sum, value) => sum + value, 0) / patch.length;
    const variance = patch.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / patch.length;
    if (variance < 12) {
      announce("المنطقة قليلة التفاصيل؛ اختر نقطة أوضح داخل الجسم", Boolean(stream));
      return;
    }
    subjectLockTemplate = patch;
    subjectLockCenter = { x: centerX, y: centerY };
    subjectLockLostFrames = 0;
    subjectLockConfidence = 1;
    subjectLockEnabled = true;
    setRegionFollowEnabled(false);
    const button = $("#nox-subject-lock-toggle");
    if (button) {
      button.setAttribute("aria-pressed", "true");
      button.textContent = "إيقاف تثبيت المنطقة";
    }
    const hint = $("#nox-subject-lock-hint");
    if (hint) hint.textContent = "تم حفظ بصمة بصرية محلية — تجنب حجب المنطقة";
    announce("تم تثبيت بصمة المنطقة بصريًا", Boolean(stream));
    updateDiagnostics();
  }

  function setMotionPredictionEnabled(enabled) {
    motionPredictionEnabled = Boolean(enabled);
    if (!motionPredictionEnabled) subjectLockVelocity = { x: 0, y: 0 };
    const button = $("#nox-motion-prediction-toggle");
    if (button) {
      button.setAttribute("aria-pressed", String(motionPredictionEnabled));
      button.textContent = motionPredictionEnabled ? "إيقاف التنبؤ بالحركة" : "تشغيل التنبؤ بالحركة";
    }
    const hint = $("#nox-motion-prediction-hint");
    if (hint) hint.textContent = motionPredictionEnabled
      ? "تقدير قصير للموضع التالي من سرعة القفل السابقة — دون ذكاء اصطناعي أو توقع بعيد"
      : "التنبؤ متوقف — البحث حول آخر موضع مؤكد";
    updateDiagnostics();
  }

  function updateSubjectLock(gray, width, height) {
    if (!subjectLockEnabled || !subjectLockTemplate || !subjectLockCenter || !livingMetalRegion) return;
    const patchRadius = 2;
    const reacquiring = subjectLockLostFrames >= 2;
    const search = reacquiring ? (lowPower ? 9 : 14) : (lowPower ? 5 : 7);
    const leadLimit = lowPower ? 4 : 6;
    const leadX = motionPredictionEnabled ? Math.max(-leadLimit, Math.min(leadLimit, subjectLockVelocity.x)) : 0;
    const leadY = motionPredictionEnabled ? Math.max(-leadLimit, Math.min(leadLimit, subjectLockVelocity.y)) : 0;
    const searchCenterX = Math.max(patchRadius, Math.min(width - patchRadius - 1, subjectLockCenter.x + leadX));
    const searchCenterY = Math.max(patchRadius, Math.min(height - patchRadius - 1, subjectLockCenter.y + leadY));
    let bestSad = Infinity;
    let secondSad = Infinity;
    let bestX = subjectLockCenter.x;
    let bestY = subjectLockCenter.y;
    for (let cy = Math.max(patchRadius, searchCenterY - search); cy <= Math.min(height - patchRadius - 1, searchCenterY + search); cy += 1) {
      for (let cx = Math.max(patchRadius, searchCenterX - search); cx <= Math.min(width - patchRadius - 1, searchCenterX + search); cx += 1) {
        let sad = 0;
        let index = 0;
        for (let py = -patchRadius; py <= patchRadius; py += 1) {
          for (let px = -patchRadius; px <= patchRadius; px += 1) {
            sad += Math.abs(gray[(cy + py) * width + cx + px] - subjectLockTemplate[index]);
            index += 1;
          }
        }
        if (sad < bestSad) {
          if (bestSad < Infinity && (Math.abs(bestX - cx) > 2 || Math.abs(bestY - cy) > 2)) {
            secondSad = Math.min(secondSad, bestSad);
          }
          bestSad = sad;
          bestX = cx;
          bestY = cy;
        } else if ((Math.abs(cx - bestX) > 2 || Math.abs(cy - bestY) > 2) && sad < secondSad) {
          secondSad = sad;
        }
      }
    }
    const meanSad = bestSad / subjectLockTemplate.length;
    const secondMeanSad = secondSad / subjectLockTemplate.length;
    const distinctMatchMargin = secondMeanSad - meanSad;
    subjectLockConfidence = Math.max(0, Math.min(1, 1 - meanSad / 72));
    const ambiguousReacquire = reacquiring && (meanSad > 25 || distinctMatchMargin < 1.5);
    if (meanSad > 38 || subjectLockConfidence < 0.46 || ambiguousReacquire) {
      subjectLockLostFrames += 1;
      if (reacquiring) subjectLockReacquireAttempts += 1;
      const hint = $("#nox-subject-lock-hint");
      if (hint) hint.textContent = reacquiring
        ? "محاولة استعادة البصمة " + subjectLockReacquireAttempts + " — لا يوجد تطابق فريد موثوق"
        : "ثقة القفل منخفضة — جارٍ انتظار تطابق أوضح";
      return;
    }
    if (reacquiring) subjectLockWasReacquired = true;
    subjectLockLostFrames = 0;
    const observedDx = bestX - subjectLockCenter.x;
    const observedDy = bestY - subjectLockCenter.y;
    subjectLockVelocity = {
      x: Math.max(-8, Math.min(8, subjectLockVelocity.x * 0.62 + observedDx * 0.38)),
      y: Math.max(-8, Math.min(8, subjectLockVelocity.y * 0.62 + observedDy * 0.38))
    };
    const dx = Math.max(-0.08, Math.min(0.08, observedDx / width));
    const dy = Math.max(-0.08, Math.min(0.08, observedDy / height));
    const displayDx = facing === "user" ? -dx : dx;
    const region = livingMetalRegion;
    livingMetalRegion = {
      ...region,
      x: Math.max(0, Math.min(1 - region.width, region.x + displayDx)),
      y: Math.max(0, Math.min(1 - region.height, region.y + dy))
    };
    subjectLockCenter = { x: bestX, y: bestY };
    const hint = $("#nox-subject-lock-hint");
    if (hint) hint.textContent = subjectLockWasReacquired
      ? "تمت استعادة البصمة — ثقة التطابق " + Math.round(subjectLockConfidence * 100) + "%"
      : "القفل البصري نشط — ثقة المطابقة " + Math.round(subjectLockConfidence * 100) + "%";
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
    if (opticalFlowMode === "off") {
      setRegionFollowEnabled(false);
      clearSubjectLock();
      if (cameraStabilizationEnabled) setCameraStabilizationEnabled(false);
    }
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

  function setLowLightMode(mode) {
    lowLightMode = mode === "strong" || mode === "gentle" ? mode : "off";
    const control = $("#nox-low-light-mode");
    if (control) control.value = lowLightMode;
    const hint = $("#nox-low-light-hint");
    if (hint) hint.textContent = lowLightMode === "strong"
      ? "إنقاذ قوي: رفع الظلال وتنعيم مكاني خفيف — قد يقلل التفاصيل الدقيقة"
      : lowLightMode === "gentle"
        ? "إنقاذ متوازن: رفع محدود للظلال مع حماية نسبية للحواف"
        : "متوقف — الصورة الأصلية دون رفع إضاءة أو تنعيم";
    if (stream) renderFrame(false);
    updateDiagnostics();
  }

  function setDetailRecoveryMode(mode) {
    detailRecoveryMode = mode === "strong" || mode === "natural" ? mode : "off";
    const control = $("#nox-detail-recovery-mode");
    if (control) control.value = detailRecoveryMode;
    const hint = $("#nox-detail-recovery-hint");
    if (hint) hint.textContent = detailRecoveryMode === "strong"
      ? "تفاصيل أوضح بقوة أعلى — قد يبرز التشويش والحواف المصطنعة"
      : detailRecoveryMode === "natural"
        ? "حدة طبيعية خفيفة مع عتبة لحماية المناطق المسطحة"
        : "متوقف — لا توجد زيادة حدة";
    if (stream) renderFrame(false);
    updateDiagnostics();
  }

  function setWaveMatterMode(mode) {
    waveMatterMode = ["thin-film", "dispersion", "atmosphere"].includes(mode) ? mode : "off";
    const control = $("#nox-wave-matter-mode");
    if (control) control.value = waveMatterMode;
    const hint = $("#nox-wave-matter-hint");
    if (hint) hint.textContent = waveMatterMode === "thin-film"
      ? "تداخل طبقات رقيقة مستوحى من ألوان فقاعات الصابون والزيوت — محاكاة لونية وليست قياسًا للمادة"
      : waveMatterMode === "dispersion"
        ? "تشتت لوني محدود عند الحواف مستوحى من الانكسار — قد يظهر انحرافًا لونيًا مصطنعًا"
        : waveMatterMode === "atmosphere"
          ? "تدرج جوي مستوحى من تشتت رايلي — لا يستخرج حالة الطقس أو تركيب الهواء"
          : "متوقف — لا توجد محاكاة موجية";
    if (stream) renderFrame(false);
    updateDiagnostics();
  }


  function setScienceMode(mode) {
    const modes = ["diffraction","fluorescence","polarization","light-field","flare","spectral","atmosphere","material"];
    scienceMode = modes.includes(mode) || mode === "lucky-frame" ? mode : "off";
    const control = $("#nox-science-mode");
    if (control) control.value = scienceMode;
    const hint = $("#nox-science-hint");
    const descriptions = {
      diffraction:"حيود وحلقات موجية — محاكاة شكلية وليست قياسًا للجبهة الموجية",
      fluorescence:"توهج مستوحى من الفلورسنس — لا يكشف تركيبًا كيميائيًا",
      polarization:"ألوان مستوحاة من الاستقطاب — لا يقيس استقطاب الضوء",
      "light-field":"عمق وإعادة تركيز أحادي الكاميرا — لا يعادل Light Field حقيقيًا",
      flare:"وهج وهالات عدسة فنية — ليست إعادة بناء فيزيائية للعدسة",
      spectral:"تلوين مستوحى من الأطياف — لا يلتقط UV أو IR",
      atmosphere:"هالات وضباب جوي فني — لا يستخرج الطقس أو تركيب الهواء",
      material:"مظهر مواد معدنية وخزفية ولؤلؤية — لا يتعرف على المادة",
      "lucky-frame":"مساعد التقاط اللحظة؛ لا يدّعي اختيار Burst متعدد الصور",
      off:"متوقف — لا توجد محاكاة علمية إضافية"
    };
    if (hint) hint.textContent = descriptions[scienceMode];
    if (stream) renderFrame(false);
    updateDiagnostics();
  }

  function updateMotionFreezeState() {
    const usable = opticalFlowVectors.filter((vector) => vector.confidence >= 0.12);
    if (opticalFlowMode === "off" || usable.length < 4 || !opticalFlowLastAt || performance.now() - opticalFlowLastAt > 700) {
      motionFreezeLastSpeed = null;
      motionFreezeState = "غير متاح";
    } else {
      const speeds = usable.map((vector) => Math.hypot(vector.dx * opticalFlowWidth, vector.dy * opticalFlowHeight)).sort((a, b) => a - b);
      motionFreezeLastSpeed = speeds[Math.floor(speeds.length / 2)];
      motionFreezeState = motionFreezeLastSpeed <= 0.9 ? "هادئة" : motionFreezeLastSpeed <= 2.2 ? "متوسطة" : "سريعة";
    }
    motionFreezeLastSampleAt = opticalFlowLastAt || 0;
    const hint = $("#nox-motion-freeze-hint");
    if (hint) hint.textContent = motionFreezeEnabled
      ? (motionFreezeState === "غير متاح" ? "ننتظر قياس حركة موثوقًا…" : "الحركة " + motionFreezeState + " — " + (motionFreezeLastSpeed ?? 0).toFixed(2) + " بكسل/عينة")
      : "مساعد توقيت الالتقاط — لا يتحكم في سرعة الغالق";
  }

  function cancelMotionFreezeCapture(message = "تم إلغاء انتظار الالتقاط") {
    if (motionFreezeCaptureTimer) window.clearTimeout(motionFreezeCaptureTimer);
    motionFreezeCaptureTimer = 0;
    motionFreezeCapturePending = false;
    const cancel = $("#nox-motion-freeze-cancel");
    if (cancel) cancel.hidden = true;
    if (capture) capture.setAttribute("aria-label", "التقاط صورة");
    if (message) announce(message, Boolean(stream));
  }

  function capturePhotoNow() {
    if (!stream || !video.videoWidth) return announce("انتظر حتى يظهر بث الكاميرا.");
    renderFrame(false);
    const output = createOutputCanvas();
    output.toBlob((blob) => {
      if (!blob) return announce("تعذر إنشاء الصورة.");
      showBlob(blob, "image", "nox-next-photo.jpg");
      announce("تم التقاط الصورة. اضغط حفظ على الجهاز.");
    }, "image/jpeg", 0.92);
  }

  function waitForMotionFreezeCapture() {
    if (!motionFreezeCapturePending || !stream) return;
    const age = performance.now() - motionFreezeLastSampleAt;
    const reliable = motionFreezeLastSpeed !== null && age <= 700 && opticalFlowVectors.filter((vector) => vector.confidence >= 0.12).length >= 4;
    if (reliable && motionFreezeLastSpeed <= 0.9) {
      cancelMotionFreezeCapture(null);
      capturePhotoNow();
      announce("تم الالتقاط عند هدوء الحركة.");
      return;
    }
    if (performance.now() - motionFreezeCaptureStartedAt >= 1400) {
      cancelMotionFreezeCapture(null);
      capturePhotoNow();
      announce("انتهى انتظار الهدوء — تم الالتقاط الآن.");
      return;
    }
    motionFreezeCaptureTimer = window.setTimeout(waitForMotionFreezeCapture, 90);
  }

  function resetCameraStabilization() {
    stabilizationOffset = { x: 0, y: 0 };
    stabilizationTarget = { x: 0, y: 0 };
    stabilizationConfidence = 0;
  }

  function updateCameraStabilization() {
    if (!cameraStabilizationEnabled) return;
    const stableVectors = opticalFlowVectors.filter((vector) => vector.confidence >= 0.16);
    if (stableVectors.length < 4) {
      stabilizationConfidence = 0;
      return;
    }
    const median = (values) => {
      values.sort((a, b) => a - b);
      const middle = Math.floor(values.length / 2);
      return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    };
    const motionX = median(stableVectors.map((vector) => vector.dx));
    const motionY = median(stableVectors.map((vector) => vector.dy));
    const maxOffset = 0.025;
    stabilizationTarget = {
      x: Math.max(-maxOffset, Math.min(maxOffset, stabilizationTarget.x - motionX * 0.72)),
      y: Math.max(-maxOffset, Math.min(maxOffset, stabilizationTarget.y - motionY * 0.72))
    };
    stabilizationOffset = {
      x: stabilizationOffset.x * 0.76 + stabilizationTarget.x * 0.24,
      y: stabilizationOffset.y * 0.76 + stabilizationTarget.y * 0.24
    };
    stabilizationConfidence = stableVectors.reduce((sum, vector) => sum + vector.confidence, 0) / stableVectors.length;
  }

  function setCameraStabilizationEnabled(enabled) {
    cameraStabilizationEnabled = Boolean(enabled);
    if (cameraStabilizationEnabled && opticalFlowMode === "off") {
      const flowSelect = $("#nox-flow-mode");
      if (flowSelect) flowSelect.value = "vectors";
      setOpticalFlowMode("vectors");
    }
    if (!cameraStabilizationEnabled) resetCameraStabilization();
    const button = $("#nox-stabilizer-toggle");
    if (button) {
      button.setAttribute("aria-pressed", String(cameraStabilizationEnabled));
      button.textContent = cameraStabilizationEnabled ? "إيقاف تثبيت الصورة" : "تشغيل تثبيت الصورة";
    }
    const hint = $("#nox-stabilizer-hint");
    if (hint) hint.textContent = cameraStabilizationEnabled
      ? "تثبيت إلكتروني خفيف من متوسط حركة الصورة — قصّ محدود حتى 5% تقريبًا"
      : "التثبيت متوقف — لا يوجد قصّ للصورة";
    updateDiagnostics();
    if (stream) renderFrame(false);
  }

  function drawStabilizedSource(ctx, source, width, height, mirror = false) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    const zoom = cameraStabilizationEnabled ? 1.06 : 1;
    const offsetX = cameraStabilizationEnabled ? stabilizationOffset.x * width : 0;
    const offsetY = cameraStabilizationEnabled ? stabilizationOffset.y * height : 0;
    ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
    ctx.scale(zoom * (mirror ? -1 : 1), zoom);
    ctx.drawImage(source, -width / 2, -height / 2, width, height);
    ctx.restore();
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
        gl.uniform1f(renderer.filterGroup, selectedFilter ? selectedFilter.groupIndex : -1);
        gl.uniform1f(renderer.time, performance.now() / 1000);
        gl.uniform1f(renderer.mirror, facing === "user" ? 1 : 0);
        gl.uniform1f(renderer.lowLight, lowLightMode === "strong" ? 2 : lowLightMode === "gentle" ? 1 : 0);
        gl.uniform1f(renderer.detail, detailRecoveryMode === "strong" ? 2 : detailRecoveryMode === "natural" ? 1 : 0);
        gl.uniform1f(renderer.waveMatter, waveMatterMode === "thin-film" ? 1 : waveMatterMode === "dispersion" ? 2 : waveMatterMode === "atmosphere" ? 3 : 0);
        const scienceModes = ["diffraction","fluorescence","polarization","light-field","flare","spectral","atmosphere","material"];
        gl.uniform1f(renderer.science, Math.max(0, scienceModes.indexOf(scienceMode) + 1));
        gl.uniform2f(renderer.texel, 1 / Math.max(1, outWidth), 1 / Math.max(1, outHeight));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const outputContext = renderCanvas.getContext("2d");
        drawStabilizedSource(outputContext, glCanvas, outWidth, outHeight);
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
      const baseFilter = selectedFilter ? getFallbackFilter(selectedFilter) : filters[selectedLens];
      const lowLightFilter = lowLightMode === "strong" ? "brightness(1.28) contrast(1.08) saturate(1.04)" : lowLightMode === "gentle" ? "brightness(1.14) contrast(1.04) saturate(1.02)" : "none";
      const detailFilter = detailRecoveryMode === "strong" ? "contrast(1.16) saturate(1.03)" : detailRecoveryMode === "natural" ? "contrast(1.08)" : "none";
      ctx.filter = [baseFilter, lowLightFilter, detailFilter].filter(value => value !== "none").join(" ") || "none";
      drawStabilizedSource(ctx, video, outWidth, outHeight, facing === "user");
      ctx.restore();
      renderMode = "Canvas 2D";
    } else {
      renderMode = lowPower ? "WebGL منخفض الطاقة" : "WebGL";
    }
    requestFaceDetection(frameNow);
    const outputContext = renderCanvas.getContext("2d");
    if (outputContext) {
      estimateOpticalFlow();
      capturePhotonMoment(renderCanvas, outWidth, outHeight);
      outputContext.save();
      if (cameraStabilizationEnabled) {
        outputContext.translate(outWidth / 2 + stabilizationOffset.x * outWidth, outHeight / 2 + stabilizationOffset.y * outHeight);
        outputContext.scale(1.06, 1.06);
        outputContext.translate(-outWidth / 2, -outHeight / 2);
      }
      drawLivingMetal(outputContext, outWidth, outHeight);
      renderTemporalMemory(outputContext, outWidth, outHeight);
      drawOpticalFlow(outputContext, outWidth, outHeight);
      outputContext.restore();
      drawFaceTrackingOverlay(outputContext, outWidth, outHeight);
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
    const cortexMode = qualityTier >= 2 ? "lite" : qualityTier === 1 ? "balanced" : "quality";
    const cortexPlan = cortex.plan({
      faceRequested: Boolean(latestFaceLandmarksAnalysis),
      landmarksRequested: Boolean(latestFaceLandmarksAnalysis),
      motion: opticalFlowMode !== "off",
      temporalRequested: temporalMode !== "off",
      motionPrediction: motionPredictionEnabled,
      stabilization: cameraStabilizationEnabled,
      lowLight: lowLightMode !== "off",
      detailRecovery: detailRecoveryMode !== "off",
      waveMatter: waveMatterMode !== "off",
      scienceOptics: scienceMode !== "off",
      photonFusion: photonFusionCanvas !== null,
      filterSelected: Boolean(selectedFilter) || selectedLens !== 0
    }, { mode: cortexMode });
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
      ["NOX CORTEX", cortexMode + " — " + cortexPlan.engines.map(engine => engine.id).join(" ← ") + " — تكلفة " + cortexPlan.totalCost + "/" + cortexPlan.budget.maxCost + (cortexPlan.rejected.length ? " — مستبعد " + cortexPlan.rejected.length : "")],
      ["آخر تنفيذ للعقل", cortex.getStatus().lastExecution?.state || "لم يبدأ التنفيذ"],
      ["قناع الشفاه الهندسي", latestFacialMaskPreview?.masks?.lips ? latestFacialMaskPreview.masks.lips.pixelCount + " بكسل — معاينة فقط، بلا ثقة دلالية" : "غير متاح / لم يُحلل"],
      ["الفلتر المختار", selectedFilter ? selectedFilter.name + " — " + selectedFilter.category : LENSES[selectedLens].name],
      ["تتبّع الأجسام", "غير مفعّل — لا يوجد تتبّع دلالي في هذه المرحلة"],
      ["الذاكرة الزمنية", temporalMode === "off" ? "متوقفة" : (temporalMode === "motion-trace" ? "Motion Trace" : "Time Echo") + " — " + temporalMemoryEngine.getStatus().frameCount + "/" + temporalBuffers.length + " إطارات مصغرة"],
      ["NOX PHOTON TIME MACHINE", photonTimelineEnabled ? "نشط — " + photonTimelineOrder.length + "/" + photonTimelineSlots.length + " عينات زمنية / اختيار " + (photonTimelineSelectedIndex + 1) : "متوقف"],
      ["تقدير الحركة", opticalFlowMode === "off" ? "متوقف" : "Sparse block matching — " + opticalFlowVectors.length + " متجهًا، ثقة " + Math.round(opticalFlowConfidence * 100) + "%"],
      ["NOX Smart Motion Separation", motionSeparationResult.accepted
        ? "حركة عامة " + motionSeparationResult.backgroundCount + " / شذوذ محلي " + motionSeparationResult.outlierCount + " / مجموعات محلية " + motionSeparationResult.localizedMotionCandidates.length
        : "غير موثوق — " + motionSeparationResult.reason],
      ["تتبّع قناع المنطقة", regionFollowEnabled ? "نشط — " + regionFollowVectorCount + " متجهًا داخل القناع" : "متوقف"],
      ["NOX Subject Lock", subjectLockEnabled ? "قفل بصري تجريبي — ثقة " + Math.round(subjectLockConfidence * 100) + "% / فقد " + subjectLockLostFrames + " / استعادة " + subjectLockReacquireAttempts : "متوقف"],
      ["NOX Motion Prediction", motionPredictionEnabled ? "تنبؤ محدود مفعّل — سرعة " + subjectLockVelocity.x.toFixed(1) + ", " + subjectLockVelocity.y.toFixed(1) + " عينة/إطار" : "متوقف"],
      ["NOX Smart Stabilizer", cameraStabilizationEnabled ? "تثبيت إلكتروني نشط — ثقة " + Math.round(stabilizationConfidence * 100) + "% / إزاحة " + (stabilizationOffset.x * 100).toFixed(1) + "%, " + (stabilizationOffset.y * 100).toFixed(1) + "%" : "متوقف"],
      ["NOX Low-Light Rescue", lowLightMode === "off" ? "متوقف" : lowLightMode === "gentle" ? "إنقاذ متوازن" : "إنقاذ قوي"],
      ["NOX True Detail Recovery", detailRecoveryMode === "off" ? "متوقف" : detailRecoveryMode === "natural" ? "حدة طبيعية — WebGL" : "حدة قوية — WebGL"],
      ["NOX Motion Freeze", motionFreezeEnabled ? "مساعد توقيت الالتقاط — حركة " + motionFreezeState + (motionFreezeLastSpeed === null ? "" : " / " + motionFreezeLastSpeed.toFixed(2) + " px/sample") : "متوقف"],
      ["NOX Wave Matter", waveMatterMode === "off" ? "متوقف" : waveMatterMode === "thin-film" ? "تداخل طبقات رقيقة — محاكاة" : waveMatterMode === "dispersion" ? "تشتت لوني — محاكاة" : "تشتت جوي — محاكاة"],
      ["حجم الذاكرة الزمنية", temporalBuffers.length ? (temporalMemoryEngine.getStatus().profile?.sampleWidth || 0) + " × " + (temporalMemoryEngine.getStatus().profile?.sampleHeight || 0) + " لكل إطار" : "لم تُخصص بعد"],
      ["قناع المنطقة", livingMetalRegion ? "مستطيل يدوي محفوظ" : (regionMaskEnabled ? "اسحب على الصورة لتحديد منطقة" : "لا يوجد قناع")],
      ["Living Metal", livingMetalEnabled ? (livingMetalRegion ? "نشط داخل القناع اليدوي" : "نشط — حدد منطقة أولًا") : "متوقف"],
      ["NOX Face Landmarks", faceLandmarksState],
      ["NOX Beauty Vision", beautyState],
      ["تجميل البشرة", "معاينة قناع وجه حقيقي؛ لا يوجد مكياج دقيق بعد"],
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
    cancelMotionFreezeCapture(null);
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
    resetPhotonTimeline();
    resetOpticalFlow();
    resetCameraStabilization();
    clearSubjectLock();
    resetFaceTracking();
    await releaseBeautyVision();
    await releaseFaceLandmarker();
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
      resetPhotonTimeline();
      resetOpticalFlow();
      resetCameraStabilization();
      resetFaceTracking();
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
      const faceSupport = await faceDetectionEngine.initialize();
      faceDetectionState = faceSupport.available ? "ready" : "unsupported";
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
      resetOpticalFlow();
      resetCameraStabilization();
      clearSubjectLock();
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
      clearSubjectLock();
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
    clearSubjectLock();
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
  $("#nox-subject-lock-toggle")?.addEventListener("click", () => setSubjectLockEnabled(!subjectLockEnabled));
  $("#nox-motion-prediction-toggle")?.addEventListener("click", () => setMotionPredictionEnabled(!motionPredictionEnabled));
  $("#nox-stabilizer-toggle")?.addEventListener("click", () => setCameraStabilizationEnabled(!cameraStabilizationEnabled));
  $("#nox-low-light-mode")?.addEventListener("change", (event) => setLowLightMode(event.target.value));
  $("#nox-detail-recovery-mode")?.addEventListener("change", (event) => setDetailRecoveryMode(event.target.value));
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
  $("#nox-photon-timeline-toggle")?.addEventListener("click", () => setPhotonTimelineEnabled(!photonTimelineEnabled));
  $("#nox-photon-timeline-scrub")?.addEventListener("input", (event) => {
    clearPhotonDetailFusion();
    photonTimelineSelectedIndex = Number(event.target.value);
    photonTimelineSelectionManual = true;
    updatePhotonTimelineUI();
  });
  $("#nox-photon-timeline-best")?.addEventListener("click", () => {
    clearPhotonDetailFusion();
    selectBestPhotonMoment();
  });
  $("#nox-photon-fusion-build")?.addEventListener("click", buildPhotonDetailFusion);
  $("#nox-photon-fusion-save")?.addEventListener("click", savePhotonDetailFusion);
  $("#nox-photon-confidence-build")?.addEventListener("click", buildPhotonConfidenceMap);
  $("#nox-photon-ghost-build")?.addEventListener("click", buildPhotonGhostGuard);
  $("#nox-photon-timeline-clear")?.addEventListener("click", () => {
    resetPhotonTimeline();
    announce("تم مسح سجل NOX PHOTON TIME MACHINE", Boolean(stream));
    updateDiagnostics();
  });
  $("#nox-photon-timeline-save")?.addEventListener("click", saveSelectedPhotonMoment);

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
    if (motionFreezeCapturePending) {
      cancelMotionFreezeCapture();
      return;
    }
    if (!stream || !video.videoWidth) return announce("انتظر حتى يظهر بث الكاميرا.");
    if (!motionFreezeEnabled && scienceMode !== "lucky-frame") {
      capturePhotoNow();
      return;
    }
    if (opticalFlowMode === "off") setOpticalFlowMode("vectors");
    motionFreezeCapturePending = true;
    motionFreezeCaptureStartedAt = performance.now();
    const cancel = $("#nox-motion-freeze-cancel");
    if (cancel) cancel.hidden = false;
    capture.setAttribute("aria-label", "إلغاء انتظار الالتقاط");
    announce("NOX MOTION FREEZE: ننتظر لحظة حركة أهدأ لمدة قصيرة…");
    waitForMotionFreezeCapture();
  });

  $("#nox-wave-matter-mode")?.addEventListener("change", (event) => setWaveMatterMode(event.target.value));
  $("#nox-science-mode")?.addEventListener("change", (event) => setScienceMode(event.target.value));

  $("#nox-motion-freeze-toggle")?.addEventListener("click", () => {
    motionFreezeEnabled = !motionFreezeEnabled;
    if (motionFreezeEnabled && opticalFlowMode === "off") {
      const flowSelect = $("#nox-flow-mode");
      if (flowSelect) flowSelect.value = "vectors";
      setOpticalFlowMode("vectors");
    }
    const button = $("#nox-motion-freeze-toggle");
    button.setAttribute("aria-pressed", String(motionFreezeEnabled));
    button.textContent = motionFreezeEnabled ? "إيقاف مساعد تجميد الحركة" : "تشغيل مساعد تجميد الحركة";
    if (!motionFreezeEnabled) cancelMotionFreezeCapture("تم إيقاف مساعد توقيت الالتقاط");
    updateMotionFreezeState();
    updateDiagnostics();
  });

  $("#nox-motion-freeze-cancel")?.addEventListener("click", () => cancelMotionFreezeCapture());

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
    placeholder.textContent = "اختر فلترًا من مكتبة NOX (340)";
    filterSelect.append(placeholder);
    NOX_FILTER_GROUPS.forEach((group, family) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group[0];
      NOX_FILTERS.filter((filter) => filter.groupIndex === family).forEach((filter) => {
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
