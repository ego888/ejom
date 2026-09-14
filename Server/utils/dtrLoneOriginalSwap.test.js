import test from "node:test";
import assert from "node:assert/strict";
import { swappedLoneOriginal } from "./dtrLoneOriginalSwap.js";

test("a reversed lone IN moves the original punch to original OUT", () => {
  assert.deepEqual(swappedLoneOriginal({ time: "13:25", origTimeOut: null, timeIn: "13:25", timeOut: null }),
    { time: null, origTimeOut: "13:25" });
});
test("a reversed lone OUT moves the source punch to original IN", () => {
  for (const time of [null, "13:25:00"]) {
    assert.deepEqual(swappedLoneOriginal({ time, origTimeOut: "13:25", timeIn: null, timeOut: "13:25" }),
      { time: "13:25", origTimeOut: null });
  }
});
test("paired or manual-only records do not change original punches", () => {
  assert.equal(swappedLoneOriginal({ time: "09:00", origTimeOut: "18:00", timeIn: "09:00", timeOut: "18:00" }), null);
  assert.equal(swappedLoneOriginal({ time: null, origTimeOut: null, timeIn: "09:00", timeOut: null }), null);
});
