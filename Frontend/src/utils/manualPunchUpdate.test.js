import test from "node:test";
import assert from "node:assert/strict";
import { manualPunchUpdate } from "./manualPunchUpdate.js";

test("earlier manual OUT becomes IN while the original assumed IN becomes OUT", () => {
  const entry = { id: 1, date: "2026-08-29", timeIn: "13:25", timeOut: null, originalTimeIn: "13:25", originalTimeOut: null };
  const before = structuredClone(entry);
  const { endpoint, payload } = manualPunchUpdate(entry, "out", "09:00", entry.date);
  assert.equal(endpoint, "update-time-in-out");
  assert.equal(payload.timeIn, "09:00");
  assert.equal(payload.timeOut, "13:25");
  assert.equal(payload.originalTimeIn, undefined);
  assert.equal(payload.originalTimeOut, undefined);
  assert.deepEqual(entry, before);
});

test("later manual IN becomes OUT and preserves the other credited time", () => {
  const { payload } = manualPunchUpdate({ id: 1, date: "2026-09-01", timeOut: "13:25", creditedTimeOut: "13:00" }, "in", "18:00", "2026-09-01");
  assert.equal(payload.timeIn, "13:00");
  assert.equal(payload.timeOut, "18:00");
});

test("next-day OUT is not reversed merely because the clock time is earlier", () => {
  const result = manualPunchUpdate({ id: 1, date: "2026-09-01", timeIn: "22:00" }, "out", "06:00", "2026-09-02");
  assert.equal(result.endpoint, "update-time-out");
  assert.equal(result.payload.timeIn, undefined);
});

test("without an opposite punch only the requested field is saved", () => {
  const result = manualPunchUpdate({ id: 1, date: "2026-09-01" }, "in", "09:00", "2026-09-01");
  assert.equal(result.endpoint, "update-time-in");
  assert.equal(result.payload.timeOut, undefined);
});
