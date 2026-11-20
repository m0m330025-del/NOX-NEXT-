const normalizeIds = (value, field) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) {
    throw new TypeError(field + "-must-be-an-array-of-non-empty-strings");
  }
  return [...new Set(value.map(item => item.trim()))];
};

const defaultClock = () => {
  if (typeof performance !== "undefined" && Number.isFinite(performance.now())) return performance.now();
  return Date.now();
};

const percentile = (values, ratio) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};

export const NOX_ENGINE_ADAPTER_CONTRACT_VERSION = 1;

/**
 * Standard bridge from a runtime engine to NOX CORTEX and the runtime registry.
 * Registration makes the engine available to planning; execution still requires
 * an explicit CORTEX plan and execute() call by the host application.
 */
export class NOXDynamicEngineAdapter {
  constructor({
    id, name, category = "processing", instance, process, processSync,
    cost = 1, estimatedCostMs = null, priority = 0,
    requires = [], requiresCapabilities = [], capabilities = [], conflictsWith = [],
    enabled = true, when, validateInput, validateOutput,
    dispose, clock = defaultClock, historyLimit = 16, minSamplesForMeasuredCost = 3
  } = {}) {
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) {
      throw new TypeError("invalid-engine-adapter-id");
    }
    if (!instance || (typeof instance !== "object" && typeof instance !== "function")) {
      throw new TypeError("engine-adapter-instance-required");
    }
    if (typeof process !== "function" && typeof processSync !== "function") throw new TypeError("engine-adapter-process-required");
    if (!Number.isFinite(cost) || cost < 0) throw new TypeError("engine-adapter-cost-invalid");
    if (estimatedCostMs !== null && (!Number.isFinite(estimatedCostMs) || estimatedCostMs < 0)) {
      throw new TypeError("engine-adapter-estimated-cost-invalid");
    }
    if (typeof when !== "undefined" && typeof when !== "function") throw new TypeError("engine-adapter-when-invalid");
    if (typeof validateInput !== "undefined" && typeof validateInput !== "function") throw new TypeError("engine-adapter-input-validator-invalid");
    if (typeof validateOutput !== "undefined" && typeof validateOutput !== "function") throw new TypeError("engine-adapter-output-validator-invalid");
    if (typeof dispose !== "undefined" && typeof dispose !== "function") throw new TypeError("engine-adapter-dispose-invalid");
    if (typeof clock !== "function") throw new TypeError("engine-adapter-clock-invalid");

    this.id = id;
    this.name = typeof name === "string" && name.trim() ? name.trim() : id;
    this.category = typeof category === "string" && category.trim() ? category.trim() : "processing";
    this.instance = instance;
    this.process = process;
    this.processSync = processSync;
    this.cost = cost;
    this.declaredEstimatedCostMs = estimatedCostMs;
    this.priority = Number.isFinite(priority) ? priority : 0;
    this.requires = normalizeIds(requires, "requires");
    this.requiresCapabilities = normalizeIds(requiresCapabilities, "requires-capabilities");
    this.capabilities = normalizeIds(capabilities, "capabilities");
    this.conflictsWith = normalizeIds(conflictsWith, "conflicts-with");
    this.enabled = enabled !== false;
    this.when = when;
    this.validateInput = validateInput;
    this.validateOutput = validateOutput;
    this.dispose = dispose;
    this.clock = clock;
    this.historyLimit = Number.isInteger(historyLimit) ? Math.max(1, Math.min(64, historyLimit)) : 16;
    this.minSamplesForMeasuredCost = Number.isInteger(minSamplesForMeasuredCost)
      ? Math.max(1, Math.min(this.historyLimit, minSamplesForMeasuredCost)) : 3;
    this.history = [];
    this.failures = 0;
    this.state = "idle";
    this.lastDurationMs = null;
    this.lastError = null;
    this.detachRegistry = null;
    this.cortex = null;
    this.previousCortexEngine = null;
    this.cortexEngineDescriptor = null;
  }

  getStatus() {
    const averageDurationMs = this.history.length
      ? this.history.reduce((sum, value) => sum + value, 0) / this.history.length : null;
    const measuredP95 = this.history.length >= this.minSamplesForMeasuredCost
      ? percentile(this.history, 0.95) : null;
    return {
      enabled: this.enabled,
      state: this.state,
      samples: this.history.length,
      averageDurationMs,
      measuredP95Ms: measuredP95,
      estimatedCostMs: this.declaredEstimatedCostMs ?? measuredP95,
      lastDurationMs: this.lastDurationMs,
      failures: this.failures,
      lastError: this.lastError
    };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.cortex) this.cortex.setEngineEnabled(this.id, this.enabled);
    return this.enabled;
  }

  async handle(input, context = {}) {
    if (!this.enabled) throw new Error("engine-disabled");
    if (context.signal?.aborted) throw new Error("engine-aborted");

    const started = this.clock();
    this.state = "running";
    this.lastError = null;
    try {
      if (this.validateInput && this.validateInput(input) === false) throw new TypeError("engine-input-rejected");
      const output = await this.process(input, {
        engineId: this.id,
        adapterVersion: NOX_ENGINE_ADAPTER_CONTRACT_VERSION,
        context: context.context || {},
        previousResults: Array.isArray(context.previousResults) ? context.previousResults.slice() : [],
        signal: context.signal
      });
      if (output === undefined) throw new Error("engine-returned-undefined");
      if (this.validateOutput && this.validateOutput(output) === false) throw new TypeError("engine-output-rejected");
      const ended = this.clock();
      const duration = Number.isFinite(started) && Number.isFinite(ended) ? Math.max(0, ended - started) : null;
      if (duration !== null) {
        this.lastDurationMs = duration;
        this.history.push(duration);
        if (this.history.length > this.historyLimit) this.history.shift();
      }
      this.state = "ready";
      return output;
    } catch (error) {
      this.failures += 1;
      this.state = "failed";
      this.lastError = typeof error?.message === "string" ? error.message.slice(0, 120) : "engine-error";
      const ended = this.clock();
      if (Number.isFinite(started) && Number.isFinite(ended)) this.lastDurationMs = Math.max(0, ended - started);
      throw error;
    }
  }

  handleSync(input, context = {}) {
    if (typeof this.processSync !== "function") throw new Error("engine-sync-handler-unavailable");
    if (!this.enabled) throw new Error("engine-disabled");
    if (context.signal?.aborted) throw new Error("engine-aborted");
    const started = this.clock();
    this.state = "running";
    this.lastError = null;
    try {
      if (this.validateInput && this.validateInput(input) === false) throw new TypeError("engine-input-rejected");
      const output = this.processSync(input, {
        engineId: this.id,
        adapterVersion: NOX_ENGINE_ADAPTER_CONTRACT_VERSION,
        context: context.context || {},
        signal: context.signal
      });
      if (output && typeof output.then === "function") throw new Error("sync-engine-returned-promise");
      if (output === undefined) throw new Error("engine-returned-undefined");
      if (this.validateOutput && this.validateOutput(output) === false) throw new TypeError("engine-output-rejected");
      const ended = this.clock();
      const duration = Number.isFinite(started) && Number.isFinite(ended) ? Math.max(0, ended - started) : null;
      if (duration !== null) {
        this.lastDurationMs = duration;
        this.history.push(duration);
        if (this.history.length > this.historyLimit) this.history.shift();
      }
      this.state = "ready";
      return output;
    } catch (error) {
      this.failures += 1;
      this.state = "failed";
      this.lastError = typeof error?.message === "string" ? error.message.slice(0, 120) : "engine-error";
      const ended = this.clock();
      if (Number.isFinite(started) && Number.isFinite(ended)) this.lastDurationMs = Math.max(0, ended - started);
      throw error;
    }
  }

  attach({ cortex, registry } = {}) {
    if (this.cortex || this.detachRegistry) throw new Error("engine-adapter-already-attached");
    if (!cortex || typeof cortex.registerEngine !== "function" || typeof cortex.setEngineEnabled !== "function") {
      throw new TypeError("compatible-nox-cortex-required");
    }
    if (!registry || typeof registry.register !== "function") throw new TypeError("compatible-engine-registry-required");

    const cortexDescriptor = {
      id: this.id,
      group: this.category,
      cost: this.cost,
      priority: this.priority,
      requires: this.requires,
      tags: this.capabilities,
      conflictsWith: this.conflictsWith,
      enabled: this.enabled,
      when: this.when
    };
    this.previousCortexEngine = typeof cortex.replaceEngine === "function"
      ? cortex.replaceEngine(cortexDescriptor)
      : (cortex.registerEngine(cortexDescriptor), null);
    this.cortexEngineDescriptor = cortex.engines?.get(this.id) || null;
    try {
      const registryDescriptor = {
        id: this.id,
        name: this.name,
        category: this.category,
        instance: this.instance,
        capabilities: this.capabilities,
        requiresCapabilities: this.requiresCapabilities,
        conflictsWith: this.conflictsWith,
        estimatedCostMs: this.declaredEstimatedCostMs,
        priority: this.priority,
        getStatus: () => this.getStatus(),
        isEnabled: () => this.enabled
      };
      this.detachRegistry = typeof registry.replace === "function"
        ? registry.replace(registryDescriptor)
        : registry.register(registryDescriptor);
      this.cortex = cortex;
    } catch (error) {
      if (this.cortexEngineDescriptor && cortex.engines?.get(this.id) === this.cortexEngineDescriptor) {
        cortex.unregisterEngine(this.id);
        if (this.previousCortexEngine) cortex.registerEngine(this.previousCortexEngine);
      }
      this.previousCortexEngine = null;
      this.cortexEngineDescriptor = null;
      throw error;
    }
    return this;
  }

  detach() {
    if (!this.cortex && !this.detachRegistry) return false;
    this.detachRegistry?.();
    this.detachRegistry = null;
    if (this.cortex && this.cortex.engines?.get(this.id) === this.cortexEngineDescriptor) {
      this.cortex.unregisterEngine(this.id);
      if (this.previousCortexEngine) this.cortex.registerEngine(this.previousCortexEngine);
    }
    this.cortex = null;
    this.previousCortexEngine = null;
    this.cortexEngineDescriptor = null;
    this.state = "idle";
    return true;
  }
}

export class NOXDynamicEngineAdapterHost {
  constructor({ cortex, registry } = {}) {
    if (!cortex || !registry) throw new TypeError("cortex-and-registry-required");
    this.cortex = cortex;
    this.registry = registry;
    this.adapters = new Map();
  }

  register(adapter) {
    if (!(adapter instanceof NOXDynamicEngineAdapter)) throw new TypeError("nox-dynamic-engine-adapter-required");
    if (this.adapters.has(adapter.id)) throw new Error("duplicate-adapter-id:" + adapter.id);
    adapter.attach({ cortex: this.cortex, registry: this.registry });
    this.adapters.set(adapter.id, adapter);
    return () => this.unregister(adapter.id);
  }

  unregister(id) {
    const adapter = this.adapters.get(id);
    if (!adapter) return false;
    adapter.detach();
    this.adapters.delete(id);
    return true;
  }

  setEnabled(id, enabled) {
    const adapter = this.adapters.get(id);
    return adapter ? adapter.setEnabled(enabled) : false;
  }

  getHandlers() {
    return Object.fromEntries([...this.adapters].map(([id, adapter]) => [id,
      typeof adapter.process === "function" ? adapter.handle.bind(adapter) : adapter.handleSync.bind(adapter)
    ]));
  }

  runSync(id, input, context = {}) {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error("engine-adapter-not-registered:" + id);
    return adapter.handleSync(input, context);
  }

  getStatus() {
    return [...this.adapters.values()].map(adapter => ({ id: adapter.id, ...adapter.getStatus() }));
  }

  clear() {
    for (const id of [...this.adapters.keys()]) this.unregister(id);
  }
}
