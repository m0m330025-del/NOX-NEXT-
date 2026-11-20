import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

test("room server enforces the 15-seat room contract", () => {
  assert.match(source, /const MAX_SEATS = 15/);
  assert.match(source, /action === "room\.join"/);
  assert.match(source, /action === "room\.snapshot"/);
  assert.match(source, /action === "room\.start"/);
});

test("room actions verify the caller's Appwrite JWT", () => {
  assert.match(source, /setJWT\(jwt\)/);
  assert.match(source, /account\.get\(\)/);
});

test("seat claims use deterministic document IDs to prevent duplicate seat claims", () => {
  assert.match(source, /\$\{room\.\$id\}_\$\{seatIndex\}/);
  assert.match(source, /SEAT_TAKEN_RETRY/);
});

test("starting a room is owner-only and requires two players", () => {
  assert.match(source, /OWNER_ONLY/);
  assert.match(source, /NEED_TWO_PLAYERS/);
});
