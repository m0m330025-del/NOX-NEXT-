export class NOXOpticalFlowRecoveryGate {
  constructor({ requiredConsecutive = 3 } = {}) {
    this.requiredConsecutive = Number.isInteger(requiredConsecutive)
      ? Math.max(1, Math.min(10, requiredConsecutive)) : 3;
    this.blocked = false;
    this.healthyStreak = 0;
  }

  evaluate(eligible) {
    if (eligible !== true) {
      this.blocked = true;
      this.healthyStreak = 0;
      return this.getStatus(false);
    }
    if (!this.blocked) return this.getStatus(true);
    this.healthyStreak += 1;
    if (this.healthyStreak >= this.requiredConsecutive) {
      this.blocked = false;
      this.healthyStreak = 0;
      return this.getStatus(true);
    }
    return this.getStatus(false);
  }

  getStatus(allowed = !this.blocked) {
    return {
      allowed,
      recovering: this.blocked,
      healthyStreak: this.healthyStreak,
      requiredConsecutive: this.requiredConsecutive
    };
  }

  reset() {
    this.blocked = false;
    this.healthyStreak = 0;
  }
}
