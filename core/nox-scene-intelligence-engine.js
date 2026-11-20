/**
 * NOX Scene Intelligence Engine.
 * Classifies measured frame luminance/contrast and supplied motion evidence only.
 * No semantic recognition, pixel synthesis, or camera control.
 */
const finite = value => Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class NOXSceneIntelligenceEngine {
  constructor({ minMotionVectors = 4, maxFrameRatio = 0.92 } = {}) {
    this.minMotionVectors = Number.isInteger(minMotionVectors) ? clamp(minMotionVectors, 2, 64) : 4;
    this.maxFrameRatio = finite(maxFrameRatio) ? clamp(maxFrameRatio, 0.5, 1.5) : 0.92;
    this.reset();
  }

  evaluate({ meanLuminance, contrast, motion, frameCostMs, targetFrameMs } = {}) {
    const validLight = finite(meanLuminance) && meanLuminance >= 0 && meanLuminance <= 1;
    const validContrast = finite(contrast) && contrast >= 0 && contrast <= 1;
    const lighting = !validLight ? "unknown" : meanLuminance < 0.16 ? "very-dim" : meanLuminance < 0.34 ? "dim" : meanLuminance > 0.82 ? "bright" : "normal";
    const contrastClass = !validContrast ? "unknown" : contrast < 0.09 ? "low" : contrast > 0.28 ? "high" : "normal";
    const vectorCount = Number.isInteger(motion?.vectorCount) ? motion.vectorCount : 0;
    const accepted = motion?.accepted === true;
    const ratio = finite(frameCostMs) && frameCostMs >= 0 && finite(targetFrameMs) && targetFrameMs > 0 ? frameCostMs / targetFrameMs : null;
    const performanceProtected = ratio !== null && ratio >= this.maxFrameRatio;
    const movement = !motion || motion.enabled === false ? "unknown" : accepted && vectorCount >= this.minMotionVectors ? "dynamic" : motion.accepted === false ? "ambiguous-or-insufficient" : "unknown";
    const confidence = clamp((validLight ? 0.42 : 0) + (validContrast ? 0.18 : 0) + (movement === "dynamic" ? 0.28 : movement === "ambiguous-or-insufficient" ? 0.08 : 0) + (ratio !== null ? 0.12 : 0), 0, 1);
    const recommendation = performanceProtected ? "protect-frame-budget" : lighting === "very-dim" || lighting === "dim" ? "consider-low-light-pipeline" : movement === "dynamic" ? "prefer-motion-aware-pipeline" : movement === "ambiguous-or-insufficient" ? "hold-motion-dependent-effects" : "keep-live-frame-baseline";
    this.lastResult = { lighting, contrast: contrastClass, movement, performance: performanceProtected ? "over-budget" : ratio === null ? "unknown" : "within-budget", frameRatio: ratio, confidence, recommendation, evidence: { luminanceAvailable: validLight, contrastAvailable: validContrast, motionVectorCount: vectorCount, motionConsensusAccepted: accepted }, semanticRecognition: false };
    return this.lastResult;
  }

  getStatus() { return this.lastResult || { lighting: "unknown", contrast: "unknown", movement: "unknown", performance: "unknown", frameRatio: null, confidence: 0, recommendation: "keep-live-frame-baseline", evidence: { luminanceAvailable: false, contrastAvailable: false, motionVectorCount: 0, motionConsensusAccepted: false }, semanticRecognition: false }; }
  reset() { this.lastResult = null; }
}