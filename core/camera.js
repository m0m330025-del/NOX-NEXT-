import { NOX_FILTERS, NOX_FILTER_GROUPS, getFallbackFilter } from "./nox-filter-engine.js";
import { ensureNOXCanvasSize } from "./nox-camera-render-surface.js";
import { listNOXFilters } from "./nox-original-filter-library.js";
import { NOX_HYBRID_FILTERS, getNOXHybridFilter, buildNOXHybridSelection, NOX_CHAOS_MODES, getNOXChaosMode, createNOXChaosRecipe, validateNOXChaosRecipe, generateNOXChaosRecipe } from "./nox-hybrid-fx-engine.js";
import { NOXFaceDetectionEngine } from "./nox-face-detection-engine.js";
import { NOXFaceTrackingEngine } from "./nox-face-tracking-engine.js";
import { NOXFaceRegionEngine } from "./nox-face-region-engine.js";
import { NOXBiSeNetFaceParsingProvider } from "./nox-bisenet-face-parsing-provider.js";
import { NOXMakeupRenderingEngine } from "./nox-makeup-rendering-engine.js";
import { NOXLiveMakeupController } from "./nox-live-makeup-controller.js";
import { NOXLiveMakeupCompositor } from "./nox-live-makeup-compositor.js";
import { NOXBeautyVisionProvider } from "./nox-beauty-vision-provider.js";
import { NOXMultiModelFaceFusionProvider } from "./nox-multi-model-face-fusion-provider.js";
import { NOXSkinSegmentationEngine } from "./nox-skin-segmentation-engine.js";
import { NOXMediaPipeFaceLandmarkerProvider } from "./nox-mediapipe-face-landmarker-provider.js";
import { NOXFaceLandmarksEngine } from "./nox-face-landmarks-engine.js";
import { estimateNOXFaceRoll } from "./nox-face-roll-estimator.js";
import { NOXFacialMaskBuilder } from "./nox-facial-mask-builder.js";
import { buildNOXFaceDigitalTwinDiagnostic } from "./nox-face-digital-twin-diagnostics.js";
import { createNOXCortex } from "./nox-cortex.js";
import { NOXSparseOpticalFlowEngine } from "./nox-optical-flow-engine.js";
import { NOXTemporalMemoryEngine } from "./nox-temporal-memory-engine.js";
import { NOXTemporalAlignmentEngine } from "./nox-temporal-alignment-engine.js";
import { NOXSmartMotionSeparationEngine } from "./nox-smart-motion-separation-engine.js";
import { NOXAdaptiveTemporalFusionEngine } from "./nox-adaptive-temporal-fusion-engine.js";
import { NOXNeuralCameraOrchestrator } from "./nox-neural-camera-orchestrator.js";
import { NOXPredictiveCameraIntelligence } from "./nox-predictive-camera-intelligence.js";
import { calculateNOXPredictiveStabilizationCorrection } from "./nox-predictive-stabilization-assist.js";
import { NOXSceneIntelligenceEngine } from "./nox-scene-intelligence-engine.js";
import { NOXEngineRegistry } from "./nox-engine-registry.js";
import { NOXEngineOrchestrationPlanner } from "./nox-engine-orchestration-planner.js";
import { NOXAdaptiveRuntimeScheduler } from "./nox-adaptive-runtime-scheduler.js";
import { NOXOpticalFlowRecoveryGate } from "./nox-optical-flow-recovery-gate.js";
import { NOXDynamicEngineAdapter, NOXDynamicEngineAdapterHost } from "./nox-dynamic-engine-adapter.js";

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
uniform float u_signature;
uniform float u_hybrid;
uniform float u_hybridMix;
uniform float u_chaosMode;
uniform float u_hybridWeights[6];
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
    float depthLum = dot(c, vec3(0.299,0.587,0.114));
    float depthProxy = smoothstep(0.08,0.92,depthLum);
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
  // NOX Signature FX: original procedural live GPU effects.
  if (u_signature > 0.5 && u_signature < 1.5) {
    float aurora = sin(uv.x * 10.0 + sin(uv.y * 8.0 + u_time * 0.7) * 2.0 + u_time);
    float veil = exp(-pow((uv.y - (0.30 + aurora * 0.055)) * 13.0, 2.0));
    vec3 tint = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + aurora * 1.8 + u_time * 0.25);
    c = mix(c, c * 0.62 + tint * 0.58, veil * 0.46);
  } else if (u_signature > 1.5 && u_signature < 2.5) {
    vec2 p = uv - vec2(0.5);
    float angle = atan(p.y, p.x);
    float rings = sin(length(p) * 72.0 - u_time * 2.4 + sin(angle * 5.0) * 2.0);
    float gate = smoothstep(0.28, 0.92, abs(rings));
    vec3 spectrum = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + angle * 2.0 + u_time * 0.35);
    c = mix(c, c * 0.58 + spectrum * 0.62, gate * 0.24);
  } else if (u_signature > 2.5 && u_signature < 3.5) {
    vec2 grid = uv * vec2(31.0, 53.0);
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float seed = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    float twinkle = 0.5 + 0.5 * sin(u_time * (1.2 + seed * 3.0) + seed * 40.0);
    float star = (1.0 - smoothstep(0.015, 0.075, length(local))) * step(0.965, seed) * twinkle;
    c += vec3(0.48, 0.72, 1.0) * star * 0.82;
  } else if (u_signature > 3.5 && u_signature < 4.5) {
    vec2 p = uv - vec2(0.5);
    float phase = length(p) * 42.0 - u_time * 2.0 + sin(atan(p.y, p.x) * 4.0) * 1.8;
    float ring = exp(-pow((fract(phase / 6.28318) - 0.5) * 12.0, 2.0));
    vec3 tint = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + phase * 0.22);
    c = mix(c, c * 0.64 + tint * 0.56, 0.08 + ring * 0.24);
  } else if (u_signature > 4.5) {
    float scan = 0.5 + 0.5 * sin(uv.y * 720.0 + u_time * 5.0);
    float sweep = exp(-pow((uv.y - fract(u_time * 0.12)) * 90.0, 2.0));
    c = mix(c, c * vec3(0.62, 1.08, 1.22) + vec3(0.02, 0.12, 0.18), 0.10 + scan * 0.035);
    c += vec3(0.08, 0.62, 0.95) * sweep * 0.22;
  }
  // NOX HYBRID MIXER: independent bit-masked layers with individual weights.
  vec2 centered = uv - vec2(0.5);
  float radius = length(centered);
  float angle = atan(centered.y, centered.x);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 hybridColor = c;
  float chaosLum = dot(c, vec3(0.299, 0.587, 0.114));
  float chaosPulse = 0.5 + 0.5 * sin(u_time * 1.7 + radius * 18.0 + chaosLum * 5.0);
  float chaosPhase = sin(angle * 3.0 + u_time * 0.8 + chaosLum * 6.28318);
  float chaosGravity = exp(-radius * (2.0 + 2.0 * chaosPulse));
  float chaosTemporal = 0.5 + 0.5 * sin(u_time * 0.55 + uv.x * 8.0 - uv.y * 5.0);
  float chaosCoupling = 0.0;
  float fusionSignal = chaosLum;
  if (u_chaosMode > 0.5 && u_chaosMode < 1.5) chaosCoupling = chaosPulse;
  else if (u_chaosMode > 1.5 && u_chaosMode < 2.5) chaosCoupling = 0.5 + 0.5 * chaosPhase;
  else if (u_chaosMode > 2.5 && u_chaosMode < 3.5) chaosCoupling = chaosGravity;
  else if (u_chaosMode > 3.5) chaosCoupling = chaosTemporal;
  if (mod(floor(u_hybrid / 1.0), 2.0) > 0.5) {
    float tide = sin(uv.x * 18.0 + sin(uv.y * 11.0 + u_time * 0.7) * 2.2 + u_time);
    vec2 bend = vec2(cos(tide * 2.4), sin(tide * 2.1)) * u_texel * 5.0;
    vec3 refracted = texture2D(u_image, clamp(uv + bend, 0.0, 1.0)).rgb;
    float edge = length(texture2D(u_image, uv + u_texel * 2.0).rgb - texture2D(u_image, uv - u_texel * 2.0).rgb);
    hybridColor = mix(c, refracted.bgr, 0.22 + 0.18 * abs(tide));
    hybridColor += vec3(0.08, 0.42, 0.58) * smoothstep(0.025, 0.18, edge) * (0.35 + 0.25 * tide);
    c = mix(c, hybridColor, clamp(u_hybridWeights[0] * (u_chaosMode < 0.5 ? 1.0 : (0.68 + chaosCoupling * 0.52 + fusionSignal * 0.12)), 0.0, 0.85));
    fusionSignal = mix(fusionSignal, dot(c, vec3(0.299, 0.587, 0.114)), 0.58);
  }
  if (mod(floor(u_hybrid / 2.0), 2.0) > 0.5) {
    float bands = sin(angle * 7.0 + radius * 46.0 - u_time * 1.3);
    vec3 redTap = texture2D(u_image, clamp(uv + centered * 0.018, 0.0, 1.0)).rgb;
    vec3 blueTap = texture2D(u_image, clamp(uv - centered * 0.018, 0.0, 1.0)).rgb;
    float edge = length(redTap - blueTap);
    hybridColor = vec3(redTap.r, c.g, blueTap.b);
    hybridColor = mix(hybridColor, vec3(0.18, 0.88, 1.0), smoothstep(0.04, 0.24, edge) * 0.42);
    hybridColor += vec3(0.52, 0.18, 0.78) * max(0.0, bands) * 0.10;
    c = mix(c, hybridColor, clamp(u_hybridWeights[1] * (u_chaosMode < 0.5 ? 1.0 : (0.68 + chaosCoupling * 0.42 + fusionSignal * 0.12)), 0.0, 0.85));
    fusionSignal = mix(fusionSignal, dot(c, vec3(0.299, 0.587, 0.114)), 0.58);
  }
  if (mod(floor(u_hybrid / 4.0), 2.0) > 0.5) {
    vec2 cell = floor(uv * vec2(31.0, 23.0));
    float particle = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    float pulse = 0.5 + 0.5 * sin(u_time * 1.8 + particle * 6.28318 + radius * 18.0);
    float bloom = exp(-radius * radius * 9.0) * pulse;
    float spark = smoothstep(0.965, 1.0, particle) * pulse;
    hybridColor = c * vec3(0.72, 0.88, 1.18) + vec3(0.16, 0.30, 0.58) * bloom + vec3(0.38, 0.78, 1.0) * spark * 0.55;
    c = mix(c, hybridColor, clamp(u_hybridWeights[2] * (u_chaosMode < 0.5 ? 1.0 : (0.68 + chaosCoupling * 0.58 + fusionSignal * 0.12)), 0.0, 0.85));
    fusionSignal = mix(fusionSignal, dot(c, vec3(0.299, 0.587, 0.114)), 0.58);
  }
  if (mod(floor(u_hybrid / 8.0), 2.0) > 0.5) {
    float field = sin(uv.x * 22.0 + sin(uv.y * 13.0) * 3.0) + cos(uv.y * 19.0 - u_time * 0.25);
    float contour = 1.0 - smoothstep(0.02, 0.16, abs(fract(field * 0.32 + lum * 0.8) - 0.5));
    float dotGrid = step(0.42, fract(sin(dot(floor(uv * vec2(48.0, 32.0)), vec2(12.9898,78.233))) * 43758.5453));
    vec3 ink = mix(vec3(0.06,0.10,0.22), vec3(0.20,0.92,0.78), contour);
    hybridColor = mix(c, ink * (0.42 + lum * 0.82), 0.18 + contour * 0.24) + vec3(0.32,0.16,0.62) * dotGrid * contour * 0.10;
    c = mix(c, hybridColor, clamp(u_hybridWeights[3] * (u_chaosMode < 0.5 ? 1.0 : (0.68 + chaosCoupling * 0.36 + fusionSignal * 0.12)), 0.0, 0.85));
    fusionSignal = mix(fusionSignal, dot(c, vec3(0.299, 0.587, 0.114)), 0.58);
  }
  if (mod(floor(u_hybrid / 16.0), 2.0) > 0.5) {
    vec2 drift = vec2(sin(u_time * 0.7 + uv.y * 8.0), cos(u_time * 0.55 + uv.x * 7.0)) * u_texel * 4.0;
    vec3 echoA = texture2D(u_image, clamp(uv + drift, 0.0, 1.0)).rgb;
    vec3 echoB = texture2D(u_image, clamp(uv - drift * 1.7, 0.0, 1.0)).rgb;
    float motionMask = smoothstep(0.025, 0.22, length(echoA - echoB));
    hybridColor = mix(c, mix(echoA, echoB.bgr, 0.48), 0.16 + motionMask * 0.38) + vec3(0.10,0.42,0.78) * motionMask * 0.14;
    c = mix(c, hybridColor, clamp(u_hybridWeights[4] * (u_chaosMode < 0.5 ? 1.0 : (0.68 + chaosCoupling * 0.48 + fusionSignal * 0.12)), 0.0, 0.85));
    fusionSignal = mix(fusionSignal, dot(c, vec3(0.299, 0.587, 0.114)), 0.58);
  }
  if (mod(floor(u_hybrid / 32.0), 2.0) > 0.5) {
    float aurora = sin(uv.y * 26.0 + sin(uv.x * 9.0 + u_time * 0.4) * 3.0);
    vec3 film = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + aurora * 2.4 + radius * 13.0);
    float arc = exp(-pow((radius - (0.22 + 0.035 * sin(angle * 3.0 + u_time))) * 34.0, 2.0));
    hybridColor = c * (0.62 + film * 0.72) + vec3(0.12,0.58,0.72) * max(0.0, aurora) * 0.12 + vec3(0.52,0.18,0.82) * arc * 0.20;
    c = mix(c, hybridColor, clamp(u_hybridWeights[5] * (u_chaosMode < 0.5 ? 1.0 : (0.68 + chaosCoupling * 0.62 + fusionSignal * 0.12)), 0.0, 0.85));
    fusionSignal = mix(fusionSignal, dot(c, vec3(0.299, 0.587, 0.114)), 0.58);
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
  let cameraStartGeneration = 0;
  let cameraStartAbortController = null;
  let captureHoldTimer = 0;
  let capturePointerActive = false;
  let captureHoldTriggered = false;
  let suppressCaptureClick = false;
  let facing = "user";
  let selectedLens = 0;
  let selectedFilter = null;
  let selectedOriginalFilter = null;
  let selectedHybridFilter = null;
  let selectedHybridMask = 0;
  let selectedChaosMode = "resonance";
  let selectedHybridWeights = [0.48, 0.52, 0.44, 0.46, 0.40, 0.50];
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
  const noxEngineRegistry = new NOXEngineRegistry();
  const noxEngineOrchestrationPlanner = new NOXEngineOrchestrationPlanner();
  const noxAdaptiveRuntimeScheduler = new NOXAdaptiveRuntimeScheduler();
  const opticalFlowRecoveryGate = new NOXOpticalFlowRecoveryGate({ requiredConsecutive: 3 });
  const temporalMemoryEngine = new NOXTemporalMemoryEngine();
  const temporalAlignmentEngine = new NOXTemporalAlignmentEngine();
  const motionSeparationEngine = new NOXSmartMotionSeparationEngine();
  const adaptiveTemporalFusionEngine = new NOXAdaptiveTemporalFusionEngine();
  const noxNeuralCameraOrchestrator = new NOXNeuralCameraOrchestrator();
  const noxPredictiveCameraIntelligence = new NOXPredictiveCameraIntelligence();
  const noxSceneIntelligenceEngine = new NOXSceneIntelligenceEngine();
  let sceneLuminanceMetrics = null;
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
  let opticalFlowLastSampleAt = 0;
  let opticalFlowRuntimeGate = "warmup-required";
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
  let signatureMode = "off";
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
  let faceLandmarksLiveEnabled = false;
  let faceLandmarksLastAt = 0;
  let faceLandmarksSession = 0;
  let faceLandmarksProcessing = false;
  let faceLandmarkAverageCost = 0;
  let faceLandmarkFrameSequence = 0;
  let latestFaceRollEstimate = null;
  let beautySkinEngine = new NOXSkinSegmentationEngine({
    minConfidence: 0.55, minCoverage: 0.04, maxCoverage: 0.9, minPixels: 16
  });
  const beautyMakeupEngine = new NOXMakeupRenderingEngine({ minConfidence: 0.8, maxOpacity: 0.58 });
  const liveMakeupController = new NOXLiveMakeupController({ intervalMs: 180, maxResultAgeMs: 220 });
  const liveMakeupCompositor = new NOXLiveMakeupCompositor({ maxAgeMs: 220 });
  let activeBeautyLook = null;
  noxEngineRegistry.register({ id: "temporal-memory", name: "Temporal Memory", category: "temporal", instance: temporalMemoryEngine, capabilities: ["frame-history"] });
  noxEngineRegistry.register({ id: "temporal-alignment", name: "Temporal Alignment", category: "temporal", instance: temporalAlignmentEngine, capabilities: ["global-translation-alignment"] });
  noxEngineRegistry.register({ id: "smart-motion-separation", name: "Smart Motion Separation", category: "motion", instance: motionSeparationEngine, capabilities: ["global-motion-consensus", "local-motion-outliers"] });
  noxEngineRegistry.register({ id: "adaptive-temporal-fusion", name: "Adaptive Temporal Fusion", category: "temporal", instance: adaptiveTemporalFusionEngine, capabilities: ["confidence-gated-frame-fusion"] });
  noxEngineRegistry.register({ id: "neural-camera-orchestrator", name: "Neural Camera Orchestrator", category: "orchestration", instance: noxNeuralCameraOrchestrator, capabilities: ["short-term-performance-memory"] });
  noxEngineRegistry.register({ id: "predictive-camera-intelligence", name: "Predictive Camera Intelligence", category: "prediction", instance: noxPredictiveCameraIntelligence, capabilities: ["short-horizon-motion-estimation"] });
  noxEngineRegistry.register({ id: "scene-intelligence", name: "Scene Intelligence", category: "scene-analysis", instance: noxSceneIntelligenceEngine, capabilities: ["luminance", "contrast", "motion-state"] });
  noxEngineRegistry.register({ id: "optical-flow", name: "Sparse Optical Flow", category: "motion", instance: opticalFlowEngine, capabilities: ["sparse-motion-vectors"] });
  noxEngineRegistry.register({ id: "face-detection", name: "Face Detection", category: "vision", instance: faceDetectionEngine, capabilities: ["platform-face-detection"] });
  noxEngineRegistry.register({ id: "face-tracking", name: "Face Tracking", category: "vision", instance: faceTrackingEngine, capabilities: ["face-track-continuity", "live-landmark-smoothing", "short-loss-coasting"] });
  noxEngineRegistry.register({ id: "face-region", name: "Face Region", category: "vision", instance: faceRegionEngine, capabilities: ["face-region-geometry"] });
  noxEngineRegistry.register({ id: "face-landmarks", name: "Face Landmarks", category: "vision", instance: faceLandmarksEngine, capabilities: ["landmark-analysis"] });
  noxEngineRegistry.register({ id: "facial-mask-builder", name: "Facial Mask Builder", category: "vision", instance: facialMaskBuilder, capabilities: ["geometric-face-masks"] });
  noxEngineRegistry.register({ id: "skin-segmentation", name: "Skin Segmentation", category: "vision", instance: beautySkinEngine, capabilities: ["skin-region-segmentation"] });
  const dynamicEngineHost = new NOXDynamicEngineAdapterHost({ cortex, registry: noxEngineRegistry });
  const cameraEngineAdapters = [
    new NOXDynamicEngineAdapter({
      id: "optical-flow", name: "Sparse Optical Flow", category: "motion",
      instance: opticalFlowEngine, cost: 2, priority: 75,
      capabilities: ["sparse-motion-vectors"],
      when: context => context.motion === true,
      process: (input, { context }) => opticalFlowEngine.process(
        input.current, input.previous, input.width, input.height,
        { cellStep: 8, patchRadius: 1, searchRadius: context.lowPower ? 2 : 3 }
      )
    }),
    new NOXDynamicEngineAdapter({
      id: "face-detection", name: "Face Detection", category: "vision",
      instance: faceDetectionEngine, cost: 1, priority: 100,
      capabilities: ["platform-face-detection"],
      when: context => context.faceRequested === true,
      process: source => faceDetectionEngine.detect(source)
    }),
    new NOXDynamicEngineAdapter({
      id: "face-tracking", name: "Face Tracking", category: "vision",
      instance: faceTrackingEngine, cost: 1, priority: 90,
      requires: ["face-detection"], requiresCapabilities: ["platform-face-detection"],
      capabilities: ["face-track-continuity"],
      when: context => context.faceRequested === true && context.motion === true,
      process: detection => detection?.state === "ok"
        ? { detection, tracking: faceTrackingEngine.update(detection.faces) }
        : { detection, tracking: null }
    }),
    new NOXDynamicEngineAdapter({
      id: "face-landmarks", name: "Face Landmarks", category: "vision",
      instance: faceLandmarksEngine, cost: 2, priority: 95,
      capabilities: ["landmark-analysis"],
      when: context => context.faceRequested === true && context.landmarksRequested === true,
      process: async source => {
        if (!faceLandmarkerProvider) faceLandmarkerProvider = new NOXMediaPipeFaceLandmarkerProvider({ delegate: "CPU" });
        if (faceLandmarkerProvider.state !== "ready") {
          const initialized = await faceLandmarkerProvider.initialize();
          if (!initialized.available) throw new Error(initialized.reason || "تعذر تحميل Face Landmarker");
        }
        const sourceWidth = source.videoWidth || source.width;
        const sourceHeight = source.videoHeight || source.height;
        const maxDimension = lowPower ? 192 : 256;
        const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(2, Math.round(sourceWidth * scale));
        const height = Math.max(2, Math.round(sourceHeight * scale));
        faceLandmarkInputCanvas.width = width;
        faceLandmarkInputCanvas.height = height;
        faceLandmarkInputContext.drawImage(source, 0, 0, width, height);
        const capturedAtMonotonicMs = performance.now();
        const frameId = "nox-face-landmarks-" + (++faceLandmarkFrameSequence);
        const timestamp = Date.now();
        const detectedResult = faceLandmarkerProvider.detect(faceLandmarkInputCanvas);
        const detected = { ...detectedResult, frameId, timestamp, capturedAtMonotonicMs,
          coordinateSpace: "source-unmirrored-normalized" };
        return { detected, analysis: detected.detected ? faceLandmarksEngine.analyze(detected) : null };
      }
    }),
    new NOXDynamicEngineAdapter({
      id: "face-landmark-temporal-tracker", name: "Face Landmark Temporal Tracker", category: "vision",
      instance: faceTrackingEngine, cost: 1, priority: 96,
      requires: ["face-landmarks"], requiresCapabilities: ["landmark-analysis"],
      capabilities: ["live-landmark-smoothing", "short-loss-coasting"],
      when: context => context.liveFaceTracking === true,
      process: input => ({
        ...input,
        tracking: faceTrackingEngine.updateLandmarks(input?.detected)
      })
    }),
    new NOXDynamicEngineAdapter({
      id: "facial-mask-builder", name: "Facial Mask Builder", category: "vision",
      instance: facialMaskBuilder, cost: 1, priority: 80,
      requires: ["face-landmarks"], requiresCapabilities: ["landmark-analysis"],
      capabilities: ["geometric-face-masks"],
      when: context => context.maskRequested === true,
      process: input => ({
        ...input,
        maskPreview: facialMaskBuilder.build(input.detected, {
          width: input.detected.width, height: input.detected.height
        })
      })
    }),
    new NOXDynamicEngineAdapter({
      id: "skin-segmentation", name: "Skin Segmentation", category: "vision",
      instance: beautySkinEngine, cost: 3, priority: 65,
      capabilities: ["skin-region-segmentation"],
      when: context => context.skinRequested === true,
      process: async currentFrame => {
        if (!beautyVisionAdapter) throw new Error("beauty-vision-provider-not-initialized");
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
    }),
    new NOXDynamicEngineAdapter({
      id: "makeup-rendering", name: "Semantic Makeup Rendering", category: "vision",
      instance: beautyMakeupEngine, cost: 2, priority: 55,
      capabilities: ["semantic-makeup-rendering"],
      when: context => context.makeupRequested === true,
      process: input => beautyMakeupEngine.render(input.image, input.regionMasks, input.looks)
    }),
    new NOXDynamicEngineAdapter({
      id: "temporal-memory", name: "Temporal Memory", category: "temporal",
      instance: temporalMemoryEngine, cost: 2, priority: 60,
      capabilities: ["frame-history"],
      when: context => context.temporalRequested === true,
      processSync: input => {
        switch (input.operation) {
          case "configure": return temporalMemoryEngine.configure(input.width, input.height, input.options);
          case "capture-decision": return temporalMemoryEngine.getCaptureDecision(input.now);
          case "commit-capture": return temporalMemoryEngine.commitCapture(input.now);
          case "composite-plan": return temporalMemoryEngine.getCompositePlan(input.mode, input.width, input.capturedCurrent);
          case "reset": return temporalMemoryEngine.reset();
          default: throw new Error("unknown-temporal-memory-operation");
        }
      }
    }),
    new NOXDynamicEngineAdapter({
      id: "temporal-alignment", name: "Temporal Alignment", category: "temporal",
      instance: temporalAlignmentEngine, cost: 1, priority: 58,
      requires: ["temporal-memory"], capabilities: ["global-translation-alignment"],
      when: context => context.temporalRequested === true,
      processSync: input => {
        switch (input.operation) {
          case "configure": return temporalAlignmentEngine.configure(input.slotCount);
          case "ingest": return temporalAlignmentEngine.ingest(input.vectors, input.options);
          case "capture": return temporalAlignmentEngine.onCapture(input.index);
          case "transform": return temporalAlignmentEngine.getTransform(input.index);
          case "reset": return temporalAlignmentEngine.reset();
          default: throw new Error("unknown-temporal-alignment-operation");
        }
      }
    }),
    new NOXDynamicEngineAdapter({
      id: "smart-motion-separation", name: "Smart Motion Separation", category: "motion",
      instance: motionSeparationEngine, cost: 1, priority: 70,
      capabilities: ["global-motion-consensus", "local-motion-outliers"],
      when: context => context.motion === true,
      processSync: input => input.operation === "reset"
        ? motionSeparationEngine.reset()
        : input.operation === "status"
          ? motionSeparationEngine.getStatus()
          : motionSeparationEngine.process(input.vectors)
    }),
    new NOXDynamicEngineAdapter({
      id: "adaptive-temporal-fusion", name: "Adaptive Temporal Fusion", category: "temporal",
      instance: adaptiveTemporalFusionEngine, cost: 1, priority: 52,
      requires: ["temporal-alignment"], capabilities: ["confidence-gated-frame-fusion"],
      when: context => context.temporalRequested === true,
      processSync: input => input.operation === "reset"
        ? adaptiveTemporalFusionEngine.reset()
        : adaptiveTemporalFusionEngine.plan(input)
    }),
    new NOXDynamicEngineAdapter({
      id: "predictive-camera-intelligence", name: "Predictive Camera Intelligence", category: "prediction",
      instance: noxPredictiveCameraIntelligence, cost: 1, priority: 55,
      capabilities: ["short-horizon-motion-estimation"],
      when: context => context.motionPrediction === true,
      processSync: input => {
        if (input.operation === "reset") return noxPredictiveCameraIntelligence.reset();
        if (input.operation === "observe") return noxPredictiveCameraIntelligence.observe(input.sample);
        return noxPredictiveCameraIntelligence.evaluate(input.evidence);
      }
    }),
    new NOXDynamicEngineAdapter({
      id: "scene-intelligence", name: "Scene Intelligence", category: "scene-analysis",
      instance: noxSceneIntelligenceEngine, cost: 1, priority: 45,
      capabilities: ["luminance", "contrast", "motion-state"],
      when: context => context.sceneAnalysis === true,
      processSync: input => input.operation === "reset"
        ? noxSceneIntelligenceEngine.reset()
        : noxSceneIntelligenceEngine.evaluate(input.evidence)
    })
  ];
  cameraEngineAdapters.forEach(adapter => dynamicEngineHost.register(adapter));

  let beautyFrameCounter = 0;
  let beautyLastTimestamp = 0;
  let beautyProcessing = false;
  let beautyState = "متوقف";
  let latestBeautyVision = null;
  let latestBeautyImage = null;
  const beautyInputCanvas = document.createElement("canvas");
  const beautyInputContext = beautyInputCanvas.getContext("2d", { willReadFrequently: true });
  const faceLandmarkInputCanvas = document.createElement("canvas");
  const faceLandmarkInputContext = faceLandmarkInputCanvas.getContext("2d", { willReadFrequently: true });
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
  beautyButton.textContent = "تحميل نموذج تحليل الوجه";
  beautyButton.disabled = true;
  const beautyStatus = document.createElement("small");
  beautyStatus.setAttribute("role", "status");
  beautyStatus.textContent = "شغّل الكاميرا ثم ابدأ التحليل. النموذج يُحمّل عند طلبك فقط.";
  const beautyPrivacy = document.createElement("small");
  beautyPrivacy.textContent = "إطارات الكاميرا تُحلّل محليًا داخل المتصفح؛ يتم تنزيل ملف النموذج ومكتبة التشغيل فقط.";
  const beautyLipsButton = document.createElement("button");
  beautyLipsButton.type = "button";
  beautyLipsButton.textContent = "تجربة لون الشفاه";
  beautyLipsButton.disabled = true;
  const beautyBrowsButton = document.createElement("button");
  beautyBrowsButton.type = "button";
  beautyBrowsButton.textContent = "تجربة لون الحواجب";
  beautyBrowsButton.disabled = true;
  const beautyClearLookButton = document.createElement("button");
  beautyClearLookButton.type = "button";
  beautyClearLookButton.textContent = "إزالة التأثير";
  beautyClearLookButton.disabled = true;
  beautyPanel.append(beautyTitle, beautyButton, beautyLipsButton, beautyBrowsButton, beautyClearLookButton, beautyStatus, beautyPrivacy);
  const faceLandmarksButton = document.createElement("button");
  faceLandmarksButton.type = "button";
  faceLandmarksButton.textContent = "تشغيل تتبع الوجه الحي (478 نقطة)";
  faceLandmarksButton.disabled = true;
  const faceLandmarksStatus = document.createElement("small");
  faceLandmarksStatus.setAttribute("role", "status");
  faceLandmarksStatus.textContent = "تتبع حي لنقاط الوجه مع تنعيم زمني؛ وتتوفر أقنعة دلالية مستقلة للشفاه والحواجب.";
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

  const signaturePanel = document.createElement("section");
  signaturePanel.className = "nox-signature-fx-panel";
  signaturePanel.style.cssText = "display:grid;gap:8px;padding:12px;margin:10px 0;border:1px solid rgba(133,105,255,.34);border-radius:14px;background:linear-gradient(135deg,rgba(33,24,66,.92),rgba(13,24,42,.92));color:#f5f3ff;";
  const signatureTitle = document.createElement("b");
  signatureTitle.textContent = "NOX SIGNATURE FX — مؤثرات حصرية";
  const signatureHint = document.createElement("small");
  signatureHint.textContent = "مؤثرات إجرائية متحركة تعمل محليًا أثناء المعاينة والتصوير.";
  const signatureSelect = document.createElement("select");
  signatureSelect.id = "nox-signature-fx";
  signatureSelect.setAttribute("aria-label", "اختيار مؤثر NOX الحصري");
  signatureSelect.style.cssText = "width:100%;min-height:42px;padding:9px 12px;border:1px solid rgba(175,160,255,.45);border-radius:10px;background:#17152b;color:#fff;font:inherit;";
  [["off","بدون مؤثر إضافي"],["aurora","AURORA VEIL — ستائر الشفق"],["prism","PRISM RIFT — شقوق المنشور"],["quantum","QUANTUM DUST — غبار كمي"],["liquid","LIQUID ORBIT — مدارات سائلة"],["holo","HOLO SCAN — مسح هولوجرافي"]].forEach(([value,label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    signatureSelect.append(option);
  });
  signaturePanel.append(signatureTitle, signatureHint, signatureSelect);
  page.querySelector(".nox-camera-v2-tools")?.append(signaturePanel);
  signatureSelect.addEventListener("change", () => {
    signatureMode = signatureSelect.value;
    signatureHint.textContent = signatureMode === "off" ? "المؤثرات الحصرية متوقفة." : "نشط: " + signatureSelect.selectedOptions[0].textContent + " — معالجة محلية مباشرة.";
    if (stream) renderFrame(false);
    updateDiagnostics();
  });

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

  function drawBeautyMakeupPreview(result) {
    if (!result?.image?.data || !beautyOverlayContext) return false;
    const { width, height, data } = result.image;
    if (!Number.isInteger(width) || !Number.isInteger(height) || data.length !== width * height * 4) return false;
    beautyOverlay.width = width;
    beautyOverlay.height = height;
    const image = beautyOverlayContext.createImageData(width, height);
    image.data.set(data);
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
    if (faceLandmarksOverlay.width !== width) faceLandmarksOverlay.width = width;
    if (faceLandmarksOverlay.height !== height) faceLandmarksOverlay.height = height;
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

  async function processLiveFaceLandmarks(now = performance.now(), force = false) {
    if (!faceLandmarksLiveEnabled || !stream || video.readyState < 2 ||
        !faceLandmarkerProvider || faceLandmarkerProvider.state !== "ready" ||
        faceLandmarksProcessing) return;
    const interval = Math.round(Math.min(480, Math.max(lowPower ? 220 : 120, faceLandmarkAverageCost * 2.2)));
    if (!force && now - faceLandmarksLastAt < interval) return;
    faceLandmarksLastAt = now;
    faceLandmarksProcessing = true;
    const session = faceLandmarksSession;
    const processingStartedAt = performance.now();
    try {
      const plan = cortex.plan(
        { faceRequested: true, landmarksRequested: true, liveFaceTracking: true },
        { requested: ["face-landmarks", "face-landmark-temporal-tracker"], mode: lowPower ? "lite" : "balanced" }
      );
      const execution = await cortex.execute(plan, video, dynamicEngineHost.getHandlers(), {
        timeoutMs: 2200,
        stopOnError: true,
        context: { lowPower, liveFaceTracking: true }
      });
      if (session !== faceLandmarksSession || !faceLandmarksLiveEnabled || !stream) return;
      if (execution.state !== "completed" || !execution.output?.tracking) {
        const failed = execution.results.find(item => item.status === "failed");
        throw new Error(failed?.reason || "تعذر تنفيذ مسار التتبع عبر NOX CORTEX");
      }
      const tracking = execution.output.tracking;
      if (tracking.state === "lost" || !tracking.result) {
        latestFaceLandmarksAnalysis = null;
        latestFaceRollEstimate = null;
        latestFacialMaskPreview = null;
        faceLandmarksState = "بانتظار اكتشاف الوجه";
        faceDigitalTwinButton.disabled = true;
        clearFaceLandmarksPreview();
        faceLandmarksStatus.textContent = "لم يظهر وجه موثوق في الإطار الحالي — التتبع سيستأنف تلقائيًا عند ظهوره.";
        return;
      }
      const analysis = faceLandmarksEngine.analyze(tracking.result);
      if (!["complete", "partial"].includes(analysis.state) || !drawFaceLandmarksPreview(analysis)) {
        throw new Error("تعذر استخراج مناطق الوجه من نقاط التتبع");
      }
      latestFaceLandmarksAnalysis = analysis;
      latestFaceRollEstimate = estimateNOXFaceRoll(analysis);
      latestFacialMaskPreview = null;
      faceLandmarksState = tracking.state === "coasting"
        ? "ثبات مؤقت — " + analysis.landmarkCount + " نقطة"
        : "تتبع حي — " + analysis.landmarkCount + " نقطة";
      faceDigitalTwinButton.disabled = false;
      faceDigitalTwinStatus.textContent = "النقاط الحية متاحة للتقرير البحثي؛ لا تُستخدم كأقنعة مكياج.";
      const rollAgeMs = latestFaceRollEstimate?.state === "estimated"
        ? performance.now() - latestFaceRollEstimate.frame.capturedAtMonotonicMs : Infinity;
      const rollFresh = Number.isFinite(rollAgeMs) && rollAgeMs >= 0 && rollAgeMs <= 220;
      faceLandmarksStatus.textContent =
        (tracking.state === "coasting" ? "فقد مؤقت — الاحتفاظ بآخر نقاط موثوقة. " : "تتبع حي نشط. ") +
        "الحالة: " + tracking.state + " — المناطق: " + Object.keys(analysis.regions).join("، ") +
        (analysis.unavailable.length ? " — غير متاح: " + analysis.unavailable.join("، ") : "") +
        (rollFresh ? " — قياس ميل حديث متاح." : " — قياس الميل غير صالح للتعويض حاليًا.") +
        ". التحديث كل " + interval + " مللي ثانية تقريبًا عبر NOX CORTEX.";
    } catch (error) {
      if (session !== faceLandmarksSession || !faceLandmarksLiveEnabled) return;
      faceLandmarksState = "خطأ في التتبع";
      faceLandmarksStatus.textContent = "تعذر تحديث نقاط الوجه: " + String(error?.message || error).slice(0, 150);
      faceTrackingEngine.resetLandmarks();
      latestFaceLandmarksAnalysis = null;
      latestFaceRollEstimate = null;
      faceDigitalTwinButton.disabled = true;
      clearFaceLandmarksPreview();
    } finally {
      const processingCost = Math.max(0, performance.now() - processingStartedAt);
      faceLandmarkAverageCost = faceLandmarkAverageCost
        ? faceLandmarkAverageCost * 0.72 + processingCost * 0.28
        : processingCost;
      faceLandmarksProcessing = false;
    }
  }

  async function runFaceLandmarksPreview() {
    if (faceLandmarksLiveEnabled) {
      faceLandmarksSession += 1;
      faceLandmarksLiveEnabled = false;
      faceTrackingEngine.resetLandmarks();
      faceLandmarksLastAt = 0;
      latestFaceLandmarksAnalysis = null;
      latestFacialMaskPreview = null;
      faceLandmarksState = "متوقف";
      faceLandmarksButton.textContent = "تشغيل تتبع الوجه الحي (478 نقطة)";
      faceDigitalTwinButton.disabled = true;
      clearFaceLandmarksPreview();
      faceLandmarksStatus.textContent = "تم إيقاف تتبع الوجه الحي. نموذج MediaPipe سيظل محمّلًا حتى إيقاف الكاميرا.";
      updateDiagnostics();
      return;
    }
    if (!stream || video.readyState < 2) {
      faceLandmarksStatus.textContent = "شغّل الكاميرا وانتظر ظهور الصورة أولًا.";
      return;
    }
    const session = ++faceLandmarksSession;
    faceLandmarksButton.disabled = true;
    faceLandmarksState = "جارٍ تحميل نموذج نقاط الوجه";
    faceLandmarksStatus.textContent = faceLandmarksState + " — التحميل الأول يحتاج اتصالًا بالإنترنت.";
    try {
      if (!faceLandmarkerProvider) {
        faceLandmarkerProvider = new NOXMediaPipeFaceLandmarkerProvider({ delegate: "CPU" });
      }
      if (faceLandmarkerProvider.state !== "ready") {
        const initialized = await faceLandmarkerProvider.initialize();
        if (!initialized.available) throw new Error(initialized.reason || "تعذر تحميل Face Landmarker");
      }
      if (session !== faceLandmarksSession || !stream) return;
      faceTrackingEngine.resetLandmarks();
      faceLandmarksLastAt = 0;
      faceLandmarkAverageCost = 0;
      faceLandmarksLiveEnabled = true;
      faceLandmarksButton.textContent = "إيقاف تتبع الوجه الحي";
      faceLandmarksStatus.textContent = "تم تحميل النموذج. جارٍ بدء التتبع الحي…";
      processLiveFaceLandmarks(performance.now(), true);
    } catch (error) {
      if (session !== faceLandmarksSession) return;
      faceLandmarksLiveEnabled = false;
      faceLandmarksState = "غير متاح";
      faceLandmarksButton.textContent = "إعادة محاولة تتبع الوجه الحي";
      faceLandmarksStatus.textContent = "تعذر تحميل التتبع: " + String(error?.message || error).slice(0, 180);
      clearFaceLandmarksPreview();
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
    faceLandmarksSession += 1;
    faceLandmarksLiveEnabled = false;
    faceLandmarksProcessing = false;
    faceLandmarksLastAt = 0;
    faceLandmarkAverageCost = 0;
    faceTrackingEngine.resetLandmarks();
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
    faceLandmarksButton.textContent = "تشغيل تتبع الوجه الحي (478 نقطة)";
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
    beautyLipsButton.disabled = true;
    beautyBrowsButton.disabled = true;
    beautyClearLookButton.disabled = true;
    beautyState = "جارٍ تحميل نماذج BiSeNet وMediaPipe وتحليل إطار";
    beautyStatus.textContent = beautyState + " — قد يستغرق التحميل الأول وقتًا بسبب حجم النموذج.";
    try {
      if (!beautyVisionAdapter) {
        const segmentationProvider = new NOXBiSeNetFaceParsingProvider({
          maxInputDimension: 256,
          executionProviders: ["webgpu", "wasm"]
        });
        const fusionLandmarkerProvider = new NOXMediaPipeFaceLandmarkerProvider({ delegate: "CPU" });
        beautyVisionProvider = new NOXMultiModelFaceFusionProvider({
          segmentationProvider,
          landmarkProvider: fusionLandmarkerProvider,
          landmarksEngine: faceLandmarksEngine,
          minFaceBoxIoU: 0.2,
          requireLandmarks: false
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
          throw new Error(initialized.reason || "تعذر تحميل نماذج BiSeNet وMediaPipe");
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
      const skinExecution = await cortex.execute(
        skinPlan, frame, dynamicEngineHost.getHandlers(),
        { timeoutMs: 10000, stopOnError: true, context: { mode: lowPower ? "lite" : "balanced", lowPower } }
      );
      if (skinExecution.state !== "completed" || !skinExecution.output?.vision || !skinExecution.output?.skin) {
        const failed = skinExecution.results.find(item => item.status === "failed");
        throw new Error(failed?.reason === "timeout" ? "انتهت مهلة تقسيم البشرة" : "تعذر تنفيذ محرك تقسيم البشرة عبر NOX CORTEX");
      }
      const { vision, skin } = skinExecution.output;
      latestBeautyVision = vision;
      const sourceImage = beautyInputContext.getImageData(0, 0, width, height);
      latestBeautyImage = { width, height, data: new Uint8ClampedArray(sourceImage.data) };
      beautyLipsButton.disabled = !vision.regionMasks?.lips;
      beautyBrowsButton.disabled = !vision.regionMasks?.brows;
      beautyClearLookButton.disabled = true;
      if (!drawBeautyMaskPreview(vision.skinMask)) {
        throw new Error("تعذر رسم قناع المعاينة");
      }

      beautyState = "نشط — تم اكتشاف بشرة الوجه";
      beautyStatus.textContent =
        "نجح تحليل الإطار: " + skin.pixelCount + " بكسل وجه / ثقة " +
        Math.round(skin.confidence * 100) + "% متوسط احتمال فئة البشرة، وليس نسبة دقة مضمونة. هذه طبقة تشخيصية ثابتة للمعاينة فقط ولا تدخل في الصور أو الفيديو. الشفاه والحواجب متاحتان كأقنعة دلالية؛ الجفون والخدود غير متاحتين في هذا النموذج.";
      beautyButton.textContent = "إعادة تحليل إطار";
    } catch (error) {
      beautyState = "غير متاح";
      latestBeautyVision = null;
      latestBeautyImage = null;
      beautyLipsButton.disabled = true;
      beautyBrowsButton.disabled = true;
      beautyClearLookButton.disabled = true;
      clearBeautyMaskPreview();
      beautyStatus.textContent = "لم يعمل التحليل: " + String(error?.message || error).slice(0, 180);
      beautyButton.textContent = "إعادة محاولة تحميل النموذج";
    } finally {
      beautyProcessing = false;
      beautyButton.disabled = !stream;
      updateDiagnostics();
    }
  }

  function startLiveMakeup() {
    if (!stream || !beautyVisionAdapter || beautyVisionAdapter.state !== "ready" || !activeBeautyLook) {
      throw new Error("حلّل إطارًا أولًا وانتظر جاهزية نموذج الوجه.");
    }
    clearBeautyMaskPreview();
    if (liveMakeupController.getStatus().running) return true;
    liveMakeupController.start({
      captureFrame: async ({ sequence }) => {
        const scale = Math.min(1, 256 / Math.max(video.videoWidth, video.videoHeight));
        const width = Math.max(2, Math.round(video.videoWidth * scale));
        const height = Math.max(2, Math.round(video.videoHeight * scale));
        beautyInputCanvas.width = width;
        beautyInputCanvas.height = height;
        beautyInputContext.drawImage(video, 0, 0, width, height);
        const capturedAt = performance.now();
        beautyLastTimestamp = Math.max(Date.now(), beautyLastTimestamp + 1);
        return {
          source: beautyInputCanvas, width, height,
          frameId: "nox-live-makeup-" + sequence,
          timestamp: beautyLastTimestamp,
          capturedAtMonotonicMs: capturedAt
        };
      },
      processFrame: async (frame) => {
        const rawVision = await beautyVisionAdapter.processFrame(frame);
        if (!rawVision || !["complete", "partial"].includes(rawVision.state) ||
            !rawVision.regionMasks || !Object.keys(rawVision.regionMasks).length) {
          throw new Error(rawVision?.reason || "لم يتم اكتشاف قناع وجه موثوق.");
        }
        if (rawVision.frame?.width !== frame.width || rawVision.frame?.height !== frame.height) {
          throw new Error("live-makeup-source-frame-dimensions-mismatch");
        }
        // Stamp provenance only after this adapter has processed this exact captured
        // canvas. This does not claim the separate preview tracker is same-frame.
        const vision = {
          ...rawVision,
          frame: {
            ...rawVision.frame,
            id: frame.frameId,
            timestamp: frame.timestamp,
            capturedAtMonotonicMs: frame.capturedAtMonotonicMs,
            coordinateSpace: "source-unmirrored-normalized"
          },
          landmarks: rawVision.landmarks ? {
            ...rawVision.landmarks,
            frameId: frame.frameId,
            timestamp: frame.timestamp,
            capturedAtMonotonicMs: frame.capturedAtMonotonicMs,
            coordinateSpace: "source-unmirrored-normalized"
          } : null
        };
        const capturedRoll = estimateNOXFaceRoll(vision.landmarks);
        const source = beautyInputContext.getImageData(0, 0, frame.width, frame.height);
        const plan = cortex.plan(
          { makeupRequested: true },
          { requested: ["makeup-rendering"], mode: lowPower ? "lite" : "balanced" }
        );
        const execution = await cortex.execute(
          plan,
          {
            image: { width: frame.width, height: frame.height, data: new Uint8ClampedArray(source.data) },
            regionMasks: vision.regionMasks,
            looks: activeBeautyLook
          },
          dynamicEngineHost.getHandlers(),
          { timeoutMs: 2600, stopOnError: true, context: { lowPower, liveMakeup: true } }
        );
        const makeup = execution.state === "completed" ? execution.output : null;
        if (makeup?.state !== "rendered") {
          throw new Error(makeup?.reason || "رفض محرك المكياج القناع الحالي.");
        }
        return { vision, makeup, capturedRoll };
      },
      onResult: ({ sequence, capturedAt, ageMs, result }) => {
        if (!liveMakeupCompositor.accept({
          sequence, capturedAt, vision: result.vision, look: activeBeautyLook,
          capturedRoll: result.capturedRoll
        })) return;
        beautyClearLookButton.disabled = false;
        beautyStatus.textContent = "المكياج الحي يعمل — قناع دلالي حديث، عمر النتيجة عند الوصول " +
          Math.round(ageMs) + "ms. أي نتيجة أقدم من 220ms تُرفض تلقائيًا.";
      },
      onError: (error) => {
        beautyStatus.textContent = "المكياج الحي ينتظر قناعًا موثوقًا: " +
          String(error?.message || error).slice(0, 120);
      }
    });
    return true;
  }

  async function applyBeautyLook(look) {
    if (!latestBeautyVision || !latestBeautyImage) {
      beautyStatus.textContent = "حلّل إطارًا أولًا قبل تجربة التأثير.";
      return;
    }
    liveMakeupCompositor.clear();
    activeBeautyLook = look;
    beautyLipsButton.disabled = true;
    beautyBrowsButton.disabled = true;
    try {
      startLiveMakeup();
      beautyClearLookButton.disabled = false;
      beautyStatus.textContent = "جارٍ تشغيل المكياج الحي؛ ستُعرض الأقنعة المقبولة فقط بعد اكتمال التحليل.";
    } catch (error) {
      activeBeautyLook = null;
      beautyStatus.textContent = "لم يبدأ المكياج الحي: " + String(error?.message || error).slice(0, 140);
    } finally {
      beautyLipsButton.disabled = !latestBeautyVision?.regionMasks?.lips;
      beautyBrowsButton.disabled = !latestBeautyVision?.regionMasks?.brows;
    }
  }

  beautyLipsButton.addEventListener("click", () => applyBeautyLook({
    lips: { color: [198, 48, 88], opacity: 0.34 }
  }));
  beautyBrowsButton.addEventListener("click", () => applyBeautyLook({
    brows: { color: [74, 52, 44], opacity: 0.22 }
  }));
  beautyClearLookButton.addEventListener("click", () => {
    liveMakeupController.stop();
    liveMakeupCompositor.clear();
    activeBeautyLook = null;
    clearBeautyMaskPreview();
    beautyClearLookButton.disabled = true;
    beautyStatus.textContent = "تم إيقاف المكياج الحي وإزالة طبقته من المعاينة والتسجيل.";
  });

  beautyButton.addEventListener("click", runBeautyMaskPreview);

  async function releaseBeautyVision() {
    liveMakeupController.stop();
    liveMakeupCompositor.clear();
    activeBeautyLook = null;
    clearBeautyMaskPreview();
    if (beautyVisionAdapter) {
      try { await beautyVisionAdapter.reset(); } catch { /* release remains best-effort */ }
    }
    beautyVisionAdapter = null;
    beautyVisionProvider = null;
    beautyLastTimestamp = 0;
    beautySkinEngine.reset();
    beautyMakeupEngine.reset();
    latestBeautyVision = null;
    latestBeautyImage = null;
    beautyLipsButton.disabled = true;
    beautyBrowsButton.disabled = true;
    beautyClearLookButton.disabled = true;
    beautyState = "متوقف";
    beautyButton.textContent = "تحميل نموذج تحليل الوجه";
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
    cortex.execute(plan, video, dynamicEngineHost.getHandlers(), {
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
    videoResult.removeAttribute("src");    save.removeAttribute("href");
    result.hidden = true;  }

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
      signature: gl.getUniformLocation(program, "u_signature"),
      hybrid: gl.getUniformLocation(program, "u_hybrid"),
      hybridMix: gl.getUniformLocation(program, "u_hybridMix"),
      hybridWeights: gl.getUniformLocation(program, "u_hybridWeights[0]"),
      chaosMode: gl.getUniformLocation(program, "u_chaosMode"),
      texel: gl.getUniformLocation(program, "u_texel")
    };
  }

  function drawSignatureOverlay(ctx, width, height) {
    if (!ctx || signatureMode === "off") return;
    const now = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    if (signatureMode === "aurora") {
      const gradient = ctx.createLinearGradient(0, height * (0.18 + Math.sin(now * 0.35) * 0.04), width, height * 0.62);
      gradient.addColorStop(0, "rgba(35,245,204,0)");
      gradient.addColorStop(0.48, "rgba(91,116,255,.20)");
      gradient.addColorStop(1, "rgba(232,74,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (signatureMode === "prism" || signatureMode === "liquid") {
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.46, width * (0.15 + i * 0.065), height * (0.08 + i * 0.038), Math.sin(now * 0.3 + i) * 0.12, 0, Math.PI * 2);
        ctx.strokeStyle = signatureMode === "prism" ? ["rgba(255,80,190,.20)","rgba(80,230,255,.18)","rgba(255,220,100,.16)"][i % 3] : "rgba(100,220,255,.18)";
        ctx.lineWidth = Math.max(1, width * 0.002);
        ctx.stroke();
      }
    } else if (signatureMode === "quantum") {
      for (let i = 0; i < 38; i += 1) {
        const seed = i * 12.9898;
        const x = (Math.sin(seed) * 0.5 + 0.5) * width;
        const y = ((Math.cos(seed * 1.7) * 0.5 + 0.5) * height + now * (12 + i % 9)) % height;
        ctx.fillStyle = "rgba(125,210,255," + (0.24 + 0.32 * (0.5 + 0.5 * Math.sin(now * 2 + i))) + ")";
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (signatureMode === "holo") {
      const y = ((now * 0.22) % 1) * height;
      const gradient = ctx.createLinearGradient(0, y - 24, 0, y + 24);
      gradient.addColorStop(0, "rgba(45,210,255,0)");
      gradient.addColorStop(0.5, "rgba(45,210,255,.22)");
      gradient.addColorStop(1, "rgba(45,210,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y - 24, width, 48);
    }
    ctx.restore();
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
    dynamicEngineHost.runSync("temporal-memory", { operation: "reset" });
    dynamicEngineHost.runSync("temporal-alignment", { operation: "reset" });
    dynamicEngineHost.runSync("smart-motion-separation", { operation: "reset" });
    dynamicEngineHost.runSync("adaptive-temporal-fusion", { operation: "reset" });
    motionSeparationResult = motionSeparationEngine.getStatus();
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
    const profile = dynamicEngineHost.runSync("temporal-memory", { operation: "configure", width, height, options: { lowPower } });
    dynamicEngineHost.runSync("temporal-alignment", { operation: "configure", slotCount: profile.bufferCount });
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
    const capture = dynamicEngineHost.runSync("temporal-memory", { operation: "capture-decision", now });
    let capturedCurrent = false;
    if (capture.capture) {
      const buffer = temporalBuffers[capture.index];
      if (!buffer) {
        resetTemporalMemory();
        return;
      }
      buffer.context.drawImage(renderCanvas, 0, 0, buffer.canvas.width, buffer.canvas.height);
      dynamicEngineHost.runSync("temporal-memory", { operation: "commit-capture", now });
      dynamicEngineHost.runSync("temporal-alignment", { operation: "capture", index: capture.index });
      capturedCurrent = true;
    }
    const plan = dynamicEngineHost.runSync("temporal-memory", { operation: "composite-plan", mode: temporalMode, width, capturedCurrent });
    if (!plan.length) return;
    const alignments = plan.map(layer => ({
      index: layer.index,
      ...dynamicEngineHost.runSync("temporal-alignment", { operation: "transform", index: layer.index })
    }));
    const fusion = dynamicEngineHost.runSync("adaptive-temporal-fusion", {
      layers: plan, alignments, motion: motionSeparationResult, mode: temporalMode
    });
    if (!fusion.layers.length) return;
    ctx.save();
    ctx.globalCompositeOperation = temporalMode === "motion-trace" ? "screen" : "source-over";
    for (const layer of fusion.layers) {
      const buffer = temporalBuffers[layer.index];
      const alignment = alignments.find(item => item.index === layer.index);
      if (!buffer || !alignment?.valid) continue;
      ctx.globalAlpha = layer.alpha;
      ctx.drawImage(buffer.canvas, layer.offset + alignment.dx * width, alignment.dy * height, width, height);
    }
    ctx.restore();
  }

  function resetOpticalFlow() {
    opticalFlowSession += 1;
    opticalFlowProcessing = false;
    opticalFlowEngine.reset();
    temporalAlignmentEngine.reset();
    dynamicEngineHost.runSync("smart-motion-separation", { operation: "reset" });
    dynamicEngineHost.runSync("adaptive-temporal-fusion", { operation: "reset" });
    dynamicEngineHost.runSync("predictive-camera-intelligence", { operation: "reset" });
    dynamicEngineHost.runSync("scene-intelligence", { operation: "reset" });
    sceneLuminanceMetrics = null;
    motionSeparationResult = motionSeparationEngine.getStatus();
    opticalFlowPrevious = null;
    opticalFlowLastAt = 0;
    opticalFlowLastSampleAt = 0;
    opticalFlowRuntimeGate = "warmup-required";
    opticalFlowRecoveryGate.reset();
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
    if (opticalFlowLastSampleAt && now - opticalFlowLastSampleAt < interval) return;
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
    let luminanceSum = 0;
    let luminanceSquaredSum = 0;
    for (const value of gray) { const normalized = value / 255; luminanceSum += normalized; luminanceSquaredSum += normalized * normalized; }
    const meanLuminance = luminanceSum / gray.length;
    sceneLuminanceMetrics = { meanLuminance, contrast: Math.sqrt(Math.max(0, luminanceSquaredSum / gray.length - meanLuminance * meanLuminance)) };
    opticalFlowLastSampleAt = now;
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
      const runtimeSnapshot = dynamicEngineHost.getRuntimeSnapshot();
      const flowRuntime = runtimeSnapshot.find(engine => engine.id === "optical-flow");
      const warmupComplete = Boolean(flowRuntime && flowRuntime.samples >= 3 &&
        Number.isFinite(flowRuntime.measuredP95Ms));
      const cameraPipelineBudgetPlan = {
        state: "planned",
        engines: [
          { id: "optical-flow", requires: [], conflictsWith: [] },
          { id: "predictive-camera-intelligence", requires: ["optical-flow"], conflictsWith: [] },
          { id: "smart-motion-separation", requires: ["optical-flow"], conflictsWith: [] },
          { id: "temporal-alignment", requires: ["smart-motion-separation"], conflictsWith: [] }
        ]
      };
      const cameraPipelineIds = cameraPipelineBudgetPlan.engines.map(engine => engine.id);
      const cameraPipelineWarmupComplete = cameraPipelineIds.every(id => {
        const engine = runtimeSnapshot.find(item => item.id === id);
        return Boolean(engine && engine.samples >= 3 && Number.isFinite(engine.measuredP95Ms));
      });
      let cameraPipelineSchedule = null;
      if (warmupComplete) {
        if (!Number.isFinite(averageFrameCost) || averageFrameCost <= 0) {
          opticalFlowRecoveryGate.evaluate(false);
          opticalFlowRuntimeGate = "held-frame-cost-unavailable";
          opticalFlowPrevious = gray;
          return;
        }
        cameraPipelineSchedule = noxAdaptiveRuntimeScheduler.evaluate({
          cortexPlan: cameraPipelineBudgetPlan,
          runtimeSnapshot,
          targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps,
          frameCostMs: averageFrameCost,
          lowPower
        });
        if (!cameraPipelineSchedule.eligibleEngineIds.includes("optical-flow")) {
          opticalFlowRecoveryGate.evaluate(false);
          opticalFlowRuntimeGate = cameraPipelineSchedule.steps.find(step => step.id === "optical-flow")?.reason || "held-no-safe-schedule";
          opticalFlowPrevious = gray;
          return;
        }
        const recovery = opticalFlowRecoveryGate.evaluate(true);
        if (!recovery.allowed) {
          opticalFlowRuntimeGate = "recovering-" + recovery.healthyStreak + "-of-" + recovery.requiredConsecutive;
          opticalFlowPrevious = gray;
          return;
        }
        opticalFlowRuntimeGate = recovery.recovering ? "recovered-measured-p95" : "scheduled-measured-p95";
      } else {
        opticalFlowRuntimeGate = "warmup-sample-" + (flowRuntime?.samples || 0) + "-of-3";
      }
      const execution = await cortex.execute(
        plan,
        { current: gray, previous, width: sampleWidth, height: sampleHeight },
        dynamicEngineHost.getHandlers(),
        { timeoutMs: 1200, stopOnError: true, context: { lowPower } }
      );
      if (session !== opticalFlowSession || !stream ||
          execution.state !== "completed" || !execution.output?.vectors) return;
      opticalFlowLastAt = performance.now();
      opticalFlowRuntimeGate = warmupComplete ? "executed-controlled" : "executed-warmup";
      opticalFlowVectors = execution.output.vectors;
      opticalFlowConfidence = execution.output.confidence;
      updateMotionFreezeState();
      updateCameraStabilization();
      opticalFlowPrevious = gray;
      opticalFlowSequence += 1;
      const runPipelineEngine = (id) => !cameraPipelineWarmupComplete ||
        cameraPipelineSchedule?.eligibleEngineIds.includes(id) === true;
      if (runPipelineEngine("predictive-camera-intelligence")) {
        dynamicEngineHost.runSync("predictive-camera-intelligence", { operation: "observe", sample: {
          vectors: opticalFlowVectors, timestampMs: performance.now(), sequence: opticalFlowSequence
        } });
      } else {
        noxPredictiveCameraIntelligence.reset();
      }
      if (runPipelineEngine("smart-motion-separation")) {
        motionSeparationResult = dynamicEngineHost.runSync("smart-motion-separation", { vectors: opticalFlowVectors });
      } else {
        motionSeparationEngine.reset();
        motionSeparationResult = motionSeparationEngine.getStatus();
        motionSeparationResult = {
          ...motionSeparationResult, accepted: false, globalVectors: [],
          confidence: 0, backgroundRatio: 0, backgroundCount: 0,
          reason: "runtime-budget-held"
        };
      }
      if (runPipelineEngine("temporal-alignment")) {
        dynamicEngineHost.runSync("temporal-alignment", {
          operation: "ingest",
          vectors: motionSeparationResult.accepted ? motionSeparationResult.globalVectors : [],
          options: { sequence: opticalFlowSequence, width: sampleWidth, height: sampleHeight }
        });
      } else if (cameraPipelineWarmupComplete) {
        temporalAlignmentEngine.reset();
      }
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
      announce("تم التقاط الصورة. اضغط حفظ على الجهاز. مؤثرات خرج الكاميرا النشطة مضمّنة في الملف المحفوظ.");
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
    const prediction = noxPredictiveCameraIntelligence.evaluate({
      nowMs: performance.now(),
      frameCostMs: averageFrameCost > 0 ? averageFrameCost : null,
      targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps
    });
    const stabilizationCorrection = calculateNOXPredictiveStabilizationCorrection({
      measuredDx: motionX,
      measuredDy: motionY,
      prediction: prediction.prediction,
      predictionAction: prediction.action,
      predictionConfidence: prediction.confidence,
      predictionHorizonMs: prediction.horizonMs,
      frameCostMs: averageFrameCost > 0 ? averageFrameCost : null,
      targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps
    });
    const correctionX = stabilizationCorrection.dx;
    const correctionY = stabilizationCorrection.dy;
    const maxOffset = 0.025;
    stabilizationTarget = {
      x: Math.max(-maxOffset, Math.min(maxOffset, stabilizationTarget.x - correctionX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, stabilizationTarget.y - correctionY))
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
    ensureNOXCanvasSize(renderCanvas, outWidth, outHeight);
    if (renderer) {
      const { gl, canvas: glCanvas, texture } = renderer;
      // Assigning canvas dimensions clears its drawing buffer. Only resize when
      // the source dimensions actually change; keep the viewport current per frame.
      ensureNOXCanvasSize(glCanvas, outWidth, outHeight);
      gl.viewport(0, 0, outWidth, outHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform1i(gl.getUniformLocation(renderer.program, "u_image"), 0);
        gl.uniform1f(renderer.mode, selectedOriginalFilter ? 10 + selectedOriginalFilter.familyIndex : selectedFilter ? 10 + selectedFilter.family : LENSES[selectedLens].mode);
        gl.uniform1f(renderer.variant, selectedOriginalFilter ? selectedOriginalFilter.variantIndex / 99 : selectedFilter ? selectedFilter.variant / 19 : 0);
        gl.uniform1f(renderer.filterGroup, selectedOriginalFilter ? -1 : selectedFilter ? selectedFilter.groupIndex : -1);
        gl.uniform1f(renderer.time, performance.now() / 1000);
        gl.uniform1f(renderer.mirror, facing === "user" ? 1 : 0);
        gl.uniform1f(renderer.lowLight, lowLightMode === "strong" ? 2 : lowLightMode === "gentle" ? 1 : 0);
        gl.uniform1f(renderer.detail, detailRecoveryMode === "strong" ? 2 : detailRecoveryMode === "natural" ? 1 : 0);
        gl.uniform1f(renderer.waveMatter, waveMatterMode === "thin-film" ? 1 : waveMatterMode === "dispersion" ? 2 : waveMatterMode === "atmosphere" ? 3 : 0);
        const scienceModes = ["diffraction","fluorescence","polarization","light-field","flare","spectral","atmosphere","material"];
        gl.uniform1f(renderer.science, Math.max(0, scienceModes.indexOf(scienceMode) + 1));
        const signatureModes = ["aurora", "prism", "quantum", "liquid", "holo"];
        gl.uniform1f(renderer.signature, Math.max(0, signatureModes.indexOf(signatureMode) + 1));
        gl.uniform1f(renderer.hybrid, selectedHybridMask);
        gl.uniform1f(renderer.chaosMode, getNOXChaosMode(selectedChaosMode).mode);
        gl.uniform1fv(renderer.hybridWeights, selectedHybridWeights);
        gl.uniform1f(renderer.hybridMix, selectedHybridFilter ? selectedHybridFilter.mix : 0.42);
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
      const originalFallback = selectedOriginalFilter ? ["saturate(1.25) contrast(1.08) hue-rotate(18deg)", "saturate(1.35) contrast(1.12)", "saturate(1.4) hue-rotate(38deg)", "saturate(1.45) contrast(1.08)", "brightness(1.08) saturate(1.22)", "grayscale(1) contrast(1.2)", "contrast(1.12) saturate(1.25)", "sepia(.22) contrast(1.14)", "brightness(.92) contrast(1.18)", "saturate(1.55) hue-rotate(65deg)"][selectedOriginalFilter.familyIndex] : null;
      const hybridFallbackFilters = [
        (weight) => "saturate(" + (1 + weight * 0.9).toFixed(2) + ") hue-rotate(" + Math.round(58 * weight) + "deg) contrast(" + (1 + weight * 0.16).toFixed(2) + ")",
        (weight) => "saturate(" + (1 + weight * 0.85).toFixed(2) + ") hue-rotate(" + Math.round(210 * weight) + "deg) contrast(" + (1 + weight * 0.22).toFixed(2) + ")",
        (weight) => "brightness(" + (1 + weight * 0.22).toFixed(2) + ") saturate(" + (1 + weight * 1.2).toFixed(2) + ")",
        (weight) => "contrast(" + (1 + weight * 0.62).toFixed(2) + ") saturate(" + (1 + weight * 0.6).toFixed(2) + ")",
        (weight) => "saturate(" + (1 + weight * 0.75).toFixed(2) + ") hue-rotate(" + Math.round(185 * weight) + "deg)",
        (weight) => "saturate(" + (1 + weight * 0.8).toFixed(2) + ") hue-rotate(" + Math.round(242 * weight) + "deg) brightness(" + (1 + weight * 0.1).toFixed(2) + ")"
      ];
      const hybridFallback = selectedHybridMask ? hybridFallbackFilters
        .filter((makeFilter, index) => Math.floor(selectedHybridMask / (2 ** index)) % 2 === 1)
        .map((makeFilter, index) => {
          const activeIndex = hybridFallbackFilters.indexOf(makeFilter);
          return makeFilter(selectedHybridWeights[activeIndex]);
        }).join(" ") + (selectedChaosMode === "resonance" ? " contrast(1.04)" : selectedChaosMode === "phase-collision" ? " hue-rotate(28deg) contrast(1.08)" : selectedChaosMode === "chromatic-gravity" ? " saturate(1.22)" : " brightness(1.08) saturate(1.12)") : null;
      const baseFilter = selectedHybridFilter ? hybridFallback : selectedOriginalFilter ? originalFallback : selectedFilter ? getFallbackFilter(selectedFilter) : filters[selectedLens];
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
    processLiveFaceLandmarks(frameNow);
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
      if (!renderer) drawSignatureOverlay(outputContext, outWidth, outHeight);
      renderTemporalMemory(outputContext, outWidth, outHeight);
      drawOpticalFlow(outputContext, outWidth, outHeight);
      outputContext.restore();
      drawFaceTrackingOverlay(outputContext, outWidth, outHeight);
      const renderNow = performance.now();
      liveMakeupCompositor.draw(renderCanvas, {
        now: renderNow,
        nowMonotonicMs: renderNow,
        mirrored: facing === "user",
        currentFaceBox: ["acquired", "tracking"].includes(faceDetectionState) ? trackedFace?.box || null : null,
        currentRoll: latestFaceRollEstimate
      });
    }
    const renderCost = performance.now() - renderStartedAt;
    averageFrameCost = averageFrameCost ? averageFrameCost * 0.88 + renderCost * 0.12 : renderCost;
    noxNeuralCameraOrchestrator.observeFrame({ frameCostMs: renderCost, targetFrameMs: frameInterval });
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
    const qualityDecision = noxNeuralCameraOrchestrator.getAdaptiveRecommendation({
      lowPower,
      currentTier: qualityTier
    });
    if (qualityDecision.action === "recommend-reduce-load" && qualityTier < QUALITY_TIERS.length - 1) {
      qualityTier += 1;
      noxNeuralCameraOrchestrator.commitAdaptiveDecision(qualityDecision.action);
      slowFrameStreak = 0;
      stableFrameStreak = 0;
      announce("NOX Neural Decision: خفض الحمل بعد " + qualityDecision.overloadSamples +
        " عينات ضغط مؤكدة — " + QUALITY_TIERS[qualityTier].name, true);
      updateDiagnostics();
    } else if (qualityDecision.action === "recommend-one-tier-recovery" &&
        qualityTier > (lowPower ? 1 : 0)) {
      qualityTier -= 1;
      noxNeuralCameraOrchestrator.commitAdaptiveDecision(qualityDecision.action);
      stableFrameStreak = 0;
      slowFrameStreak = 0;
      announce("NOX Neural Decision: استعادة مستوى واحد بعد ثبات الأداء — " +
        QUALITY_TIERS[qualityTier].name, true);
      updateDiagnostics();
    }
    if (scheduleNext && stream && !disposed) animationFrame = requestAnimationFrame(() => renderFrame(true));
  }

  async function waitForVideo({ signal } = {}) {
    if (signal?.aborted) throw new DOMException("تم إلغاء تشغيل الكاميرا", "AbortError");
    if (video.readyState >= 2 && video.videoWidth) return;
    await new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        window.clearTimeout(timeout);
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onError);
        signal?.removeEventListener("abort", onAbort);
      };
      const finish = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        error ? reject(error) : resolve();
      };
      const onLoaded = () => video.videoWidth > 0
        ? finish()
        : finish(new Error("وصلت بيانات الفيديو دون أبعاد صالحة"));
      const onError = () => finish(new Error("تعذر قراءة بث الكاميرا"));
      const onAbort = () => finish(new DOMException("تم إلغاء تشغيل الكاميرا", "AbortError"));
      const timeout = window.setTimeout(() => finish(new Error("انتهت مهلة انتظار صورة الكاميرا")), 9000);
      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("error", onError);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
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
      filterSelected: Boolean(selectedFilter) || Boolean(selectedOriginalFilter) || Boolean(selectedHybridFilter) || selectedLens !== 0 || signatureMode !== "off"
    }, { mode: cortexMode });
    let panel = $("#nox-camera-diagnostics");
    if (!panel) {
      panel = document.createElement("details");
      panel.id = "nox-camera-diagnostics";
      panel.className = "nox-camera-diagnostics";
      panel.innerHTML = "<summary>تشخيص توافق الجهاز</summary><dl></dl>";
      page.querySelector(".nox-camera-v2-tools")?.append(panel);
    }
    const intelligencePlan = noxNeuralCameraOrchestrator.evaluate({
      lowPower,
      targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps,
      frameCostMs: averageFrameCost > 0 ? averageFrameCost : null,
      opticalFlow: {
        enabled: opticalFlowMode !== "off",
        vectorCount: opticalFlowVectors.length,
        confidence: opticalFlowConfidence,
        ageMs: opticalFlowLastAt > 0 ? Math.max(0, performance.now() - opticalFlowLastAt) : null
      },
      motion: motionSeparationResult,
      alignment: temporalAlignmentEngine.getStatus(),
      temporal: { enabled: temporalMode !== "off" },
      registeredEngines: noxEngineRegistry.snapshot()
    });
    const predictivePlan = dynamicEngineHost.runSync("predictive-camera-intelligence", { operation: "evaluate", evidence: {
      nowMs: performance.now(), frameCostMs: averageFrameCost > 0 ? averageFrameCost : null,
      targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps
    } });
    const scenePlan = dynamicEngineHost.runSync("scene-intelligence", { operation: "evaluate", evidence: {
      ...(sceneLuminanceMetrics || {}),
      motion: { enabled: opticalFlowMode !== "off", accepted: motionSeparationResult.accepted, vectorCount: motionSeparationResult.backgroundCount || 0 },
      frameCostMs: averageFrameCost > 0 ? averageFrameCost : null,
      targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps
    } });
    const flowAgeMs = opticalFlowLastAt > 0 ? Math.max(0, performance.now() - opticalFlowLastAt) : null;
    const alignmentEvidence = temporalAlignmentEngine.getStatus();
    const memoryEvidence = noxNeuralCameraOrchestrator.getMemoryStatus();
    const flowEvidenceReady = opticalFlowMode !== "off" && flowAgeMs !== null && flowAgeMs <= 700 &&
      opticalFlowVectors.length >= 4 && opticalFlowConfidence >= 0.06;
    const motionEvidenceReady = flowEvidenceReady && motionSeparationResult.accepted === true &&
      Number.isFinite(motionSeparationResult.confidence) && motionSeparationResult.confidence >= 0.14 &&
      Number.isFinite(motionSeparationResult.backgroundRatio) && motionSeparationResult.backgroundRatio >= 0.55;
    const alignmentEvidenceReady = motionEvidenceReady && Number.isInteger(alignmentEvidence.validSlots) &&
      alignmentEvidence.validSlots > 0 && alignmentEvidence.lastAccepted?.confidence >= 0.22;
    const engineOrchestrationPlan = noxEngineOrchestrationPlanner.evaluate({
      registeredEngines: intelligencePlan.engineInventory,
      lowPower,
      performanceMode: intelligencePlan.performanceMode,
      frameCostMs: averageFrameCost > 0 ? averageFrameCost : null,
      targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps,
      capabilityEvidence: [
        { capability: "sparse-motion-vectors", available: flowEvidenceReady, confidence: opticalFlowConfidence, reason: flowEvidenceReady ? "fresh-confident-optical-flow" : "fresh-flow-evidence-unavailable" },
        { capability: "global-motion-consensus", available: motionEvidenceReady, confidence: motionSeparationResult.confidence || 0, reason: motionEvidenceReady ? "dominant-global-motion-confirmed" : "global-motion-consensus-unavailable" },
        { capability: "global-translation-alignment", available: alignmentEvidenceReady, confidence: alignmentEvidence.lastAccepted?.confidence || 0, reason: alignmentEvidenceReady ? "trusted-alignment-available" : "trusted-alignment-unavailable" },
        { capability: "confidence-gated-frame-fusion", available: temporalMode !== "off" && alignmentEvidenceReady, confidence: alignmentEvidence.lastAccepted?.confidence || 0, reason: temporalMode !== "off" && alignmentEvidenceReady ? "temporal-fusion-evidence-ready" : "temporal-fusion-evidence-unavailable" },
        { capability: "luminance", available: Boolean(sceneLuminanceMetrics), confidence: scenePlan.confidence || 0, reason: sceneLuminanceMetrics ? "measured-grayscale-luminance" : "luminance-sample-unavailable" },
        { capability: "contrast", available: Boolean(sceneLuminanceMetrics), confidence: scenePlan.confidence || 0, reason: sceneLuminanceMetrics ? "measured-grayscale-contrast" : "contrast-sample-unavailable" },
        { capability: "motion-state", available: flowEvidenceReady, confidence: opticalFlowConfidence, reason: flowEvidenceReady ? "fresh-motion-sample" : "motion-sample-unavailable" },
        { capability: "short-term-performance-memory", available: memoryEvidence.sampleCount > 0, confidence: Math.min(1, memoryEvidence.sampleCount / 4), reason: memoryEvidence.sampleCount > 0 ? "measured-frame-history-present" : "frame-history-empty" }
      ]
    });
    const adapterRuntimeSnapshot = dynamicEngineHost.getRuntimeSnapshot();
    const adapterRuntimeCounts = adapterRuntimeSnapshot.reduce((counts, engine) => {
      counts.connected += engine.connected ? 1 : 0;
      counts.enabled += engine.enabled ? 1 : 0;
      counts.planned += engine.planned ? 1 : 0;
      counts.executed += engine.executed ? 1 : 0;
      counts.failed += engine.failed ? 1 : 0;
      return counts;
    }, { connected: 0, enabled: 0, planned: 0, executed: 0, failed: 0 });
    const adaptiveRuntimeSchedule = noxAdaptiveRuntimeScheduler.evaluate({
      cortexPlan,
      runtimeSnapshot: adapterRuntimeSnapshot,
      targetFrameMs: 1000 / QUALITY_TIERS[qualityTier].targetFps,
      frameCostMs: averageFrameCost > 0 ? averageFrameCost : null,
      lowPower,
      brainRecommendedIds: engineOrchestrationPlan.steps.map(step => step.engine)
    });
    const recommendedEngineCount = engineOrchestrationPlan.decisions.filter(item => item.action === "recommend").length;
    const rows = [
      ["NOX Multi-Engine Intelligence Brain", intelligencePlan.status + " — " + intelligencePlan.performanceMode + " — " + intelligencePlan.performanceReason],
      ["الاكتشاف التلقائي للمحركات", intelligencePlan.discoveredEngineCount + " محرك مسجل — " + intelligencePlan.engineInventory.map(engine => engine.name + (engine.statusAvailable ? " ✓" : " •")).join("، ")],
      ["المحركات المتصلة بالعقد الموحد", adapterRuntimeCounts.connected + " محرك — " + adapterRuntimeSnapshot.map(engine => engine.id + " (" + engine.state + ")").join("، ")],
      ["حالة دورة حياة المحركات", "متصل " + adapterRuntimeCounts.connected + " / مفعّل " + adapterRuntimeCounts.enabled + " / مخطط CORTEX " + adapterRuntimeCounts.planned + " / نُفّذ بنجاح " + adapterRuntimeCounts.executed + " / فشل آخر تنفيذ " + adapterRuntimeCounts.failed],
      ["أهلية خطة العقل", recommendedEngineCount + " محرك موصى به من " + engineOrchestrationPlan.decisions.length + " — توصية قدرات وأدلة، وليست تشغيلًا تلقائيًا"],
      ["قياسات المحولات", adapterRuntimeSnapshot.map(engine => engine.id + ": " + engine.lastExecutionStatus + " / p95 " + (engine.measuredP95Ms === null ? "غير مقاس" : engine.measuredP95Ms.toFixed(2) + "ms") + " / إخفاقات تراكمية " + engine.failureCount).join(" | ")],
      ["NOX Adaptive Runtime Scheduling", adaptiveRuntimeSchedule.state + " — مؤهل " + adaptiveRuntimeSchedule.eligibleCount + " / مؤجل " + adaptiveRuntimeSchedule.heldCount + " — تكلفة p95 " + adaptiveRuntimeSchedule.estimatedTotalMs.toFixed(2) + "/" + (adaptiveRuntimeSchedule.availableBudgetMs === null ? "ميزانية غير متاحة" : adaptiveRuntimeSchedule.availableBudgetMs.toFixed(2) + "ms") + " — توصية للمحركات الأخرى"],
      ["Optical Flow Runtime Gate", opticalFlowRuntimeGate + " — warm-up 3 عينات، ثم 3 تقييمات سليمة متتالية لاستعادة التشغيل بعد التأجيل"],
      ["قرارات جدولة CORTEX", adaptiveRuntimeSchedule.steps.map(step => step.id + ": " + (step.eligible ? "مؤهل" : "مؤجل (" + step.reason + ")") + (step.brainRecommended ? " — أوصى به العقل" : "")).join(" | ")],
      ["مسار تنسيق المحركات", intelligencePlan.pipeline.length ? intelligencePlan.pipeline.join(" ← ") : "لا يوجد مسار موثوق؛ الإطار الحي محمي"],
      ["خطة اختيار وترتيب المحركات", engineOrchestrationPlan.steps.length ? engineOrchestrationPlan.steps.map(step => step.order + ". " + step.name).join(" ← ") : "لا توجد مجموعة آمنة موصى بها"],
      ["حالة مخطط التشغيل", engineOrchestrationPlan.status + " — " + engineOrchestrationPlan.mode + " — توصية فقط؛ لم يتم تشغيل أي محرك"],
      ["قرارات توافق المحركات", engineOrchestrationPlan.decisions.map(item => item.engine + ": " + item.action + " (" + item.reason + ")").join(" | ")],
      ["قرارات العقل", intelligencePlan.decisions.map(item => item.engine + ": " + item.action + " (" + item.reason + ")").join(" | ")],
      ["ذاكرة التكيف قصيرة المدى", intelligencePlan.adaptiveMemory.action + " — " + intelligencePlan.adaptiveMemory.reason + " — " + intelligencePlan.adaptiveMemory.sampleCount + "/" + intelligencePlan.adaptiveMemory.historyLimit + " إطار"],
      ["NOX Predictive Camera Intelligence", predictivePlan.action + " — " + predictivePlan.reason + " — ثقة " + Math.round(predictivePlan.confidence * 100) + "% / أفق " + (predictivePlan.horizonMs ?? "—") + "ms"],
      ["NOX Scene Intelligence", scenePlan.lighting + " / تباين " + scenePlan.contrast + " / حركة " + scenePlan.movement + " / أداء " + scenePlan.performance + " — " + scenePlan.recommendation + " — ثقة " + Math.round(scenePlan.confidence * 100) + "%"],
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
      ["NOX Signature FX", signatureMode === "off" ? "متوقف" : signatureSelect.selectedOptions[0]?.textContent || signatureMode],
      ["تتبّع الأجسام", "غير مفعّل — لا يوجد تتبّع دلالي في هذه المرحلة"],
      ["الذاكرة الزمنية", temporalMode === "off" ? "متوقفة" : (temporalMode === "motion-trace" ? "Motion Trace" : "Time Echo") + " — " + temporalMemoryEngine.getStatus().frameCount + "/" + temporalBuffers.length + " إطارات مصغرة"],
      ["NOX PHOTON TIME MACHINE", photonTimelineEnabled ? "نشط — " + photonTimelineOrder.length + "/" + photonTimelineSlots.length + " عينات زمنية / اختيار " + (photonTimelineSelectedIndex + 1) : "متوقف"],
      ["تقدير الحركة", opticalFlowMode === "off" ? "متوقف" : "Sparse block matching — " + opticalFlowVectors.length + " متجهًا، ثقة " + Math.round(opticalFlowConfidence * 100) + "%"],
      ["NOX Smart Motion Separation", motionSeparationResult.accepted
        ? "حركة عامة " + motionSeparationResult.backgroundCount + " / شذوذ محلي " + motionSeparationResult.outlierCount + " / مجموعات محلية " + motionSeparationResult.localizedMotionCandidates.length
        : "غير موثوق — " + motionSeparationResult.reason],
      ["NOX Adaptive Temporal Fusion", adaptiveTemporalFusionEngine.getStatus().accepted
        ? "دمج " + adaptiveTemporalFusionEngine.getStatus().selectedCount + " إطار / استبعاد " + adaptiveTemporalFusionEngine.getStatus().rejectedCount
        : "حماية — " + adaptiveTemporalFusionEngine.getStatus().reason],
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
      ["NOX Signature FX", signatureMode === "off" ? "متوقف" : signatureMode + " — مؤثر إجرائي"],
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
    cameraStartGeneration += 1;
    cameraStartAbortController?.abort();
    cameraStartAbortController = null;
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
    noxNeuralCameraOrchestrator.reset();
    resetTemporalMemory();
    resetPhotonTimeline();
    resetOpticalFlow();
    resetCameraStabilization();
    clearSubjectLock();
    resetFaceTracking();

    // Release the physical camera immediately. Model teardown can be slow or
    // wait on a worker/runtime; it must never keep the device camera active.
    const cameraStream = stream;
    stream = null;
    stopTracks(cameraStream);
    video.pause();
    video.srcObject = null;
    setReady(false);

    // Finish asynchronous model cleanup only after the camera is no longer live.
    await Promise.all([
      releaseBeautyVision(),
      releaseFaceLandmarker()
    ]);
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
      const generation = ++cameraStartGeneration;
      const abortController = new AbortController();
      cameraStartAbortController = abortController;
      const isCurrentStart = () => generation === cameraStartGeneration && !abortController.signal.aborted && !disposed;
      const memory = Number(navigator.deviceMemory || 4);
      lowPower = memory <= 3 || (navigator.hardwareConcurrency || 4) <= 4;
      qualityTier = lowPower ? 1 : 0;
      noxNeuralCameraOrchestrator.reset();
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
      if (!isCurrentStart()) {
        stopTracks(nextStream);
        return;
      }
      stream = nextStream;
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      if (!isCurrentStart()) return;
      await waitForVideo({ signal: abortController.signal });
      if (!isCurrentStart()) return;
      const faceSupport = await faceDetectionEngine.initialize();
      if (!isCurrentStart()) return;
      faceDetectionState = faceSupport.available ? "ready" : "unsupported";
      try { renderer = renderer || createRenderer(); } catch { renderer = null; }
      renderMode = renderer ? "WebGL" : "Canvas 2D";
      renderFrame();
      setReady(true);
      announce(facing === "user" ? "الكاميرا الأمامية تعمل" : "الكاميرا الخلفية تعمل");
      updateDiagnostics();
    } catch (error) {
      if (cameraStartAbortController?.signal.aborted || disposed) return;
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
      if (cameraStartAbortController?.signal.aborted || disposed) {
        if (cameraStartAbortController?.signal.aborted) cameraStartAbortController = null;
      } else {
        cameraStartAbortController = null;
        startButton.disabled = false;
        startButton.textContent = "تشغيل الكاميرا";
      }
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
    announce("تم مسح سجل NOX PHOTON TIME MACHINE", Boolean(stream));    updateDiagnostics();  });
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

  function finishCapturePointer(cancelled = false) {
    if (!capturePointerActive) return;
    capturePointerActive = false;
    if (captureHoldTimer) window.clearTimeout(captureHoldTimer);
    captureHoldTimer = 0;
    if (captureHoldTriggered && recording) recordButton.click();
    if (captureHoldTriggered && !cancelled) suppressCaptureClick = true;
    captureHoldTriggered = false;
  }

  capture.addEventListener("pointerdown", (event) => {
    if (!stream || capture.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    capturePointerActive = true;
    captureHoldTriggered = false;
    try { capture.setPointerCapture(event.pointerId); } catch {}
    captureHoldTimer = window.setTimeout(() => {
      if (!capturePointerActive || !stream || recording) return;
      captureHoldTriggered = true;
      recordButton.click();
    }, 420);
  });
  capture.addEventListener("pointerup", () => finishCapturePointer(false));
  capture.addEventListener("pointercancel", () => finishCapturePointer(true));
  capture.addEventListener("lostpointercapture", () => finishCapturePointer(true));

  capture.addEventListener("click", () => {
    if (suppressCaptureClick) {
      suppressCaptureClick = false;
      return;
    }
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
      announce("جارٍ تسجيل الفيديو… مؤثرات خرج الكاميرا النشطة مضمّنة في الفيديو.");
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
    selectedOriginalFilter = null;
    selectedHybridFilter = null;
    selectedHybridMask = 0;
    selectedHybridWeights = [0.48, 0.52, 0.44, 0.46, 0.40, 0.50];
    const hybridPanel = page.querySelector(".nox-hybrid-mixer");
    if (hybridPanel) hybridPanel.hidden = true;
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
    placeholder.textContent = "اختر فلترًا من مكتبة NOX (1,340)";
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
    const hybridGroup = document.createElement("optgroup");
    hybridGroup.label = "NOX HYBRID LAB — محركات ممزوجة";
    NOX_HYBRID_FILTERS.forEach((filter) => {
      const option = document.createElement("option");
      option.value = "hybrid:" + filter.id;
      option.textContent = filter.name + " · " + filter.engines.join(" + ");
      hybridGroup.append(option);
    });
    filterSelect.append(hybridGroup);
    const hybridMixerPanel = document.createElement("div");
    hybridMixerPanel.className = "nox-hybrid-mixer";
    hybridMixerPanel.hidden = true;
    const mixerTitle = document.createElement("b"); mixerTitle.textContent = "NOX CHAOS FUSION";
    const chaosSelect = document.createElement("select");
    chaosSelect.className = "nox-chaos-mode";
    chaosSelect.setAttribute("aria-label", "نمط تفاعل المحركات");
    NOX_CHAOS_MODES.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.name + " — " + item.description; chaosSelect.append(option); });
    chaosSelect.value = selectedChaosMode;
    chaosSelect.addEventListener("change", () => { selectedChaosMode = getNOXChaosMode(chaosSelect.value).id; if (stream) renderFrame(false); announce("نمط التفاعل: " + getNOXChaosMode(selectedChaosMode).name, Boolean(stream)); });
    const recipeName = document.createElement("input"); recipeName.type = "text"; recipeName.maxLength = 32; recipeName.placeholder = "اسم التركيبة"; recipeName.setAttribute("aria-label", "اسم التركيبة");
    const recipeSave = document.createElement("button"); recipeSave.type = "button"; recipeSave.textContent = "حفظ التركيبة";
    const recipeLoad = document.createElement("select"); recipeLoad.setAttribute("aria-label", "استعادة تركيبة محفوظة");
    const evolveButton = document.createElement("button"); evolveButton.type = "button"; evolveButton.className = "nox-evolve-button"; evolveButton.textContent = "✧ توليد تركيبة متطورة";
    const evolveStatus = document.createElement("small"); evolveStatus.className = "nox-evolve-status"; evolveStatus.setAttribute("role", "status"); evolveStatus.textContent = "يبحث عن مزج جديد ويستبعد التركيبات المتشابهة";
    evolveButton.addEventListener("click", () => {
      try {
        let history = [];
        try { const stored = JSON.parse(localStorage.getItem("nox-chaos-recipes-v1") || "[]"); if (Array.isArray(stored)) history = stored.map(validateNOXChaosRecipe).filter(Boolean); } catch {}
        const activeIds = NOX_HYBRID_FILTERS.filter((item,index) => hybridLayerControls[index]?.check.checked).map(item => item.id);
        if (activeIds.length) history.push(createNOXChaosRecipe("CURRENT MIX", activeIds, selectedHybridWeights, selectedChaosMode));
        const generated = generateNOXChaosRecipe(history, { seed: Date.now() });
        if (!generated) throw new Error("لم يتم العثور على تركيبة جديدة؛ احفظ أو غيّر التركيبات السابقة ثم أعد المحاولة");
        selectedChaosMode = generated.mode; chaosSelect.value = generated.mode;
        hybridLayerControls.forEach((control,index) => {
          control.check.checked = generated.ids.includes(NOX_HYBRID_FILTERS[index].id);
          control.slider.value = String(Math.round(generated.weights[index] * 100));
        });
        syncHybridMixer();
        recipeName.value = generated.name;
        evolveStatus.textContent = "تركيبة جديدة · تميّز " + Math.round(generated.score * 100) + "% · اضغط حفظ التركيبة للاحتفاظ بها";
        announce("تم توليد " + generated.name, Boolean(stream));
      } catch (error) { evolveStatus.textContent = "تعذر التوليد: " + String(error.message || error); }
    });
    function refreshChaosRecipes() { recipeLoad.replaceChildren(); const empty = document.createElement("option"); empty.value = ""; empty.textContent = "استعادة تركيبة محفوظة"; recipeLoad.append(empty); try { const list = JSON.parse(localStorage.getItem("nox-chaos-recipes-v1") || "[]"); if (Array.isArray(list)) list.filter(validateNOXChaosRecipe).forEach((item,index) => { const option = document.createElement("option"); option.value = String(index); option.textContent = item.name; recipeLoad.append(option); }); } catch {} }
    recipeSave.addEventListener("click", () => { try { const list = JSON.parse(localStorage.getItem("nox-chaos-recipes-v1") || "[]"); const ids = NOX_HYBRID_FILTERS.filter((item,index) => hybridLayerControls[index].check.checked).map(item => item.id); const recipe = createNOXChaosRecipe(recipeName.value, ids, selectedHybridWeights, selectedChaosMode); const next = (Array.isArray(list) ? list.filter(validateNOXChaosRecipe).filter(item => item.name !== recipe.name) : []); next.push(recipe); localStorage.setItem("nox-chaos-recipes-v1", JSON.stringify(next.slice(-20))); refreshChaosRecipes(); recipeName.value = ""; announce("تم حفظ التركيبة محليًا على هذا المتصفح."); } catch(error) { announce("تعذر الحفظ: " + String(error.message || error)); } });
    recipeLoad.addEventListener("change", () => { if (recipeLoad.value === "") return; try { const list = JSON.parse(localStorage.getItem("nox-chaos-recipes-v1") || "[]"); const validList = Array.isArray(list) ? list.map(validateNOXChaosRecipe).filter(Boolean) : []; const recipe = validList[Number(recipeLoad.value)]; if (!recipe) throw new Error("invalid recipe"); selectedChaosMode = recipe.mode; chaosSelect.value = recipe.mode; hybridLayerControls.forEach((control,index) => { control.check.checked = recipe.ids.includes(NOX_HYBRID_FILTERS[index].id); control.slider.value = String(Math.round(recipe.weights[index] * 100)); }); syncHybridMixer(); announce("تمت استعادة تركيبة " + recipe.name, Boolean(stream)); } catch { announce("تعذر استعادة التركيبة المحفوظة."); } });
    refreshChaosRecipes();
    const mixerHint = document.createElement("small"); mixerHint.textContent = "فعّل أكثر من محرك واضبط قوة كل طبقة";
    const hybridLayers = document.createElement("div"); hybridLayers.className = "nox-hybrid-mixer-layers";
    const hybridCount = document.createElement("span"); hybridCount.className = "nox-hybrid-count";
    const hybridReset = document.createElement("button"); hybridReset.type = "button"; hybridReset.className = "nox-hybrid-reset"; hybridReset.textContent = "إعادة الضبط";
    const mixerHead = document.createElement("div"); mixerHead.className = "nox-hybrid-mixer-head"; mixerHead.append(mixerTitle, mixerHint);
    const mixerFoot = document.createElement("div"); mixerFoot.className = "nox-hybrid-mixer-footer"; mixerFoot.append(hybridCount, hybridReset);
    hybridMixerPanel.append(mixerHead, chaosSelect, evolveButton, evolveStatus, recipeName, recipeSave, recipeLoad, hybridLayers, mixerFoot);
    filterSelect.insertAdjacentElement("afterend", hybridMixerPanel);
    const hybridLayerControls = NOX_HYBRID_FILTERS.map((filter, index) => {
      const row = document.createElement("label"); row.className = "nox-hybrid-layer";
      const top = document.createElement("span"); top.className = "nox-hybrid-layer-top";
      const check = document.createElement("input"); check.type = "checkbox"; check.dataset.hybridIndex = String(index);
      const name = document.createElement("b"); name.textContent = filter.name;
      const output = document.createElement("output"); output.textContent = Math.round(filter.mix * 100) + "%";
      const slider = document.createElement("input"); slider.type = "range"; slider.min = "0"; slider.max = "85"; slider.step = "1"; slider.value = String(Math.round(filter.mix * 100)); slider.dataset.hybridWeight = String(index); slider.className = "nox-hybrid-weight";
      const detail = document.createElement("small"); detail.textContent = filter.engines.join(" · ");
      top.append(check, name, output); row.append(top, slider, detail); hybridLayers.append(row);
      return { row, check, slider, output };
    });
    function syncHybridMixer() {
      const ids = []; const weights = [];
      hybridLayerControls.forEach((control, index) => {
        const weight = Number(control.slider.value) / 100; weights[index] = weight;
        control.output.textContent = Math.round(weight * 100) + "%";
        control.row.classList.toggle("is-active", control.check.checked);
        if (control.check.checked) ids.push(NOX_HYBRID_FILTERS[index].id);
      });
      const selection = buildNOXHybridSelection(ids, weights);
      selectedHybridMask = selection.mask; selectedHybridWeights = selection.weights;
      selectedHybridFilter = ids.length ? getNOXHybridFilter(ids[0]) : null;
      hybridCount.textContent = selection.count + " محركات مفعّلة";
      if (stream) renderFrame(false); updateDiagnostics();
    }
    hybridLayerControls.forEach((control) => { control.check.addEventListener("change", syncHybridMixer); control.slider.addEventListener("input", syncHybridMixer); });
    hybridReset.addEventListener("click", () => {
      hybridLayerControls.forEach((control, index) => { control.check.checked = false; control.slider.value = String(Math.round(NOX_HYBRID_FILTERS[index].mix * 100)); });
      syncHybridMixer(); filterSelect.value = "";
    });
    const originalGroup = document.createElement("optgroup");
    originalGroup.label = "NOX ORIGINAL — 1000 فلتر إجرائي";
    listNOXFilters().forEach((filter, index) => {
      const option = document.createElement("option");
      option.value = "original:" + filter.id;
      option.textContent = filter.name + " · " + filter.id;
      originalGroup.append(option);
    });
    filterSelect.append(originalGroup);
    filterSelect.addEventListener("change", () => {
      const value = filterSelect.value;
      if (value.startsWith("hybrid:")) {
        const chosenHybrid = getNOXHybridFilter(value.slice("hybrid:".length));
        selectedHybridFilter = chosenHybrid;
        selectedOriginalFilter = null;
        selectedFilter = null;
        hybridMixerPanel.hidden = false;
        hybridLayerControls.forEach((control, index) => {
          control.check.checked = NOX_HYBRID_FILTERS[index].id === chosenHybrid?.id;
          control.slider.value = String(Math.round(NOX_HYBRID_FILTERS[index].mix * 100));
        });
        syncHybridMixer();
      } else if (value.startsWith("original:")) {
        selectedHybridFilter = null;
        selectedHybridMask = 0;
        hybridMixerPanel.hidden = true;
        const index = Number(value.slice("original:nox-".length)) - 1;
        selectedOriginalFilter = Number.isInteger(index) && index >= 0 && index < 1000
          ? { familyIndex: Math.floor(index / 100), variantIndex: index % 100, id: value.slice(9) }
          : null;
        selectedFilter = null;
      } else {
        selectedOriginalFilter = null;
        selectedHybridFilter = null;
        selectedHybridMask = 0;
        hybridMixerPanel.hidden = true;
        const id = Number(value);
        selectedFilter = value === "" ? null : (NOX_FILTERS[id] || null);
      }
      if (stream) renderFrame(false);
      announce(selectedHybridFilter ? "تم تشغيل المزيج الهجين " + selectedHybridFilter.name : selectedOriginalFilter ? "تم اختيار " + selectedOriginalFilter.id + " من مكتبة NOX ORIGINAL" : selectedFilter ? "تم اختيار " + selectedFilter.name : "تم الرجوع إلى العدسات الأساسية", Boolean(stream));
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
  $("#nox-camera-exit")?.addEventListener("click", async () => { await stopCamera(); location.hash = "#home"; });
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