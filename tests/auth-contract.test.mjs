import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("new accounts receive an Appwrite session immediately and enter the app", () => {
  const auth = read("core/auth-page.js");
  assert.match(auth, /account\.create\(ID\.unique\(\), email, password, name\)/);
  assert.match(auth, /account\.createEmailPasswordSession\(email, password\)/);
  assert.match(auth, /window\.location\.replace\("\.\/index\.html"\)/);
});

test("signup has no minimum-age or required gender gate", () => {
  const html = read("auth.html");
  const js = read("core/auth-page.js");
  assert.match(html, /id="age"[^>]*min="0"[^>]*placeholder="اختياري"/);
  assert.doesNotMatch(html, /id="age"[^>]*required/);
  assert.doesNotMatch(html, /id="gender"[^>]*required/);
  assert.doesNotMatch(js, /age\s*<\s*13|age\s*>\s*120/);
});

test("profile fields remain optional for all ages", () => {
  const html = read("profile.html");
  const js = read("core/profile-page.js");
  assert.doesNotMatch(html, /id="edit-age"[^>]*min="13"/);
  assert.doesNotMatch(html, /id="edit-age"[^>]*required/);
  assert.doesNotMatch(html, /id="edit-gender"[^>]*required/);
  assert.doesNotMatch(js, /age\s*<\s*13|age\s*>\s*120/);
});

test("the original uses the approved NOX NEXT CORE project", () => {
  const config = read("core/appwrite.js");
  assert.match(config, /https:\/\/fra\.cloud\.appwrite\.io\/v1/);
  assert.match(config, /6af9ca51000735dfb692/);
});

test("auth and profile modules pass Node syntax checks", () => {
  for (const path of ["core/auth-page.js", "core/profile-page.js", "core/appwrite.js", "app.js"]) {
    const source = read(path);
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: source, encoding: "utf8" });
    assert.equal(result.status, 0, path + ": " + result.stderr);
  }
});
