const isPlainObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const scalarSummary = value => {
  if (!isPlainObject(value)) return {};
  const summary = {};
  for (const [key, item] of Object.entries(value).slice(0, 16)) {
    if (item === null || ["string", "number", "boolean"].includes(typeof item)) summary[key] = item;
  }
  return summary;
};

/**
 * Runtime registry for instantiated NOX engines.
 * Engines are registered once when the camera adapter creates them. The brain
 * reads this inventory generically; it does not need engine-specific edits.
 */
export class NOXEngineRegistry {
  constructor() {
    this.entries = new Map();
  }

  register({ id, name, category = "processing", instance, capabilities = [], getStatus, isEnabled } = {}) {
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) {
      throw new TypeError("invalid-engine-id");
    }
    if (!instance || (typeof instance !== "object" && typeof instance !== "function")) {
      throw new TypeError("engine-instance-required");
    }
    const descriptor = {
      id,
      name: typeof name === "string" && name.trim() ? name.trim() : id,
      category: typeof category === "string" ? category : "processing",
      capabilities: [...new Set(Array.isArray(capabilities) ? capabilities.filter(item => typeof item === "string") : [])],
      instance,
      getStatus: typeof getStatus === "function" ? getStatus : null,
      isEnabled: typeof isEnabled === "function" ? isEnabled : null
    };
    this.entries.set(id, descriptor);
    return () => {
      if (this.entries.get(id) === descriptor) this.entries.delete(id);
    };
  }

  snapshot() {
    return [...this.entries.values()].map(entry => {
      let rawStatus = null;
      let statusAvailable = false;
      try {
        const reader = entry.getStatus || (typeof entry.instance.getStatus === "function"
          ? entry.instance.getStatus.bind(entry.instance) : null);
        if (reader) {
          rawStatus = reader();
          statusAvailable = true;
        }
      } catch {
        rawStatus = null;
      }
      let enabled = null;
      try {
        if (entry.isEnabled) enabled = entry.isEnabled() === true;
        else if (typeof rawStatus?.enabled === "boolean") enabled = rawStatus.enabled;
        else if (typeof rawStatus?.active === "boolean") enabled = rawStatus.active;
      } catch {
        enabled = null;
      }
      return {
        id: entry.id,
        name: entry.name,
        category: entry.category,
        capabilities: entry.capabilities.slice(),
        registered: true,
        statusAvailable,
        enabled,
        status: scalarSummary(rawStatus)
      };
    });
  }

  get size() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
  }
}
