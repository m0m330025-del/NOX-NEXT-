import assert from "node:assert/strict";
import { initCameraSwipeNavigation } from "../core/nox-camera-swipe-navigation.mjs";

class Classes {
  constructor(initial = []) { this.values = new Set(initial); }
  contains(value) { return this.values.has(value); }
  add(value) { this.values.add(value); }
  toggle(value, force) {
    const enabled = force === undefined ? !this.values.has(value) : Boolean(force);
    if (enabled) this.values.add(value); else this.values.delete(value);
    return enabled;
  }
}
class Element {
  constructor(classes = []) {
    this.classList = new Classes(classes);
    this.dataset = {};
    this.attrs = {};
    this.listeners = {};
    this.hidden = false;
    this.clickCount = 0;
  }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name] ?? null; }
  click() { this.clickCount++; for (const fn of this.listeners.click || []) fn({ detail: 0 }); }
  dispatch(type, event) { for (const fn of this.listeners[type] || []) fn(event); }
}
const families = ["beauty", "color", "classic"];
const tabs = families.map((family, index) => {
  const tab = new Element(["nox-camera-family-tab"]);
  tab.dataset.lensFamily = family;
  tab.setAttribute("aria-pressed", String(index === 0));
  return tab;
});
const lenses = families.flatMap((family, familyIndex) =>
  Array.from({ length: familyIndex === 0 ? 3 : 2 }, (_, index) => {
    const lens = new Element(["nox-lens-v2"]);
    lens.dataset.lensFamily = family;
    lens.classList.toggle("active", familyIndex === 0 && index === 0);
    lens.click = function () {
      this.clickCount++;
      lenses.filter((item) => item.dataset.lensFamily === family)
        .forEach((item) => item.classList.toggle("active", item === this));
    };
    return lens;
  })
);
const orbit = new Element();
orbit.querySelectorAll = (selector) => selector.includes(".nox-lens-v2") ? lenses : [];
const page = {
  querySelector: (selector) => selector === "#nox-lens-orbit" ? orbit : null,
  querySelectorAll: () => tabs
};
globalThis.document = { querySelector: (selector) => selector === ".nox-camera-page" ? page : null };

initCameraSwipeNavigation();
assert.equal(orbit.dataset.swipeReady, "true");
assert.deepEqual(lenses.filter((lens) => !lens.hidden).map((lens) => lens.dataset.lensFamily), ["beauty", "beauty", "beauty"]);

const touch = (type, x, y) => orbit.dispatch(type, {
  touches: type === "touchstart" ? [{ clientX: x, clientY: y }] : [],
  changedTouches: type === "touchend" ? [{ clientX: x, clientY: y }] : [],
  preventDefault() { this.prevented = true; }
});
touch("touchstart", 100, 100);
touch("touchend", 100, 40);
assert.equal(lenses[1].classList.contains("active"), true, "up swipe advances lens");

touch("touchstart", 100, 100);
touch("touchend", 40, 100);
assert.equal(tabs[1].getAttribute("aria-pressed"), "true", "left swipe advances family");
assert.deepEqual(lenses.filter((lens) => !lens.hidden).map((lens) => lens.dataset.lensFamily), ["color", "color"]);

touch("touchstart", 100, 100);
orbit.dispatch("touchcancel", {});
touch("touchend", 100, 20);
assert.equal(tabs[1].getAttribute("aria-pressed"), "true", "cancelled gesture does not change family");

tabs[2].dispatch("click", {});
assert.equal(tabs[2].getAttribute("aria-pressed"), "true", "family tab click selects family");
const keyboardEvent = { key: "ArrowDown", preventDefault() { this.prevented = true; } };
orbit.dispatch("keydown", keyboardboardSafe(keyboardEvent));
assert.equal(keyboardEvent.prevented, true);
assert.equal(lenses.find((lens) => lens.dataset.lensFamily === "classic" && lens.classList.contains("active"))?.clickCount > 0, true);
console.log("NOX camera swipe navigation tests passed");

function keyboardboardSafe(event) { return event; }
