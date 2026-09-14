import test from "node:test";
import assert from "node:assert/strict";
import { comparisonSkipReason } from "./dtrComparisonEligibility.js";

const complete = { processed: 1, employeeId: 12, timeIn: "08:00:00", timeOut: "17:00:00" };

test("complete daytime, midnight, and overnight punches remain eligible", () => {
  for (const [timeIn, timeOut] of [["08:00", "17:00"], ["00:00", "08:00"], ["22:00:00", "06:00:00"]]) {
    assert.equal(comparisonSkipReason({ ...complete, timeIn, timeOut }), null);
  }
});

test("excluded entries have an actionable reason instead of silently disappearing", () => {
  assert.equal(comparisonSkipReason({ ...complete, processed: 0 }), null);
  assert.equal(comparisonSkipReason({ ...complete, timeIn: null }), null);
  assert.equal(comparisonSkipReason({ ...complete, timeOut: "" }), null);
  assert.match(comparisonSkipReason({ ...complete, timeIn: null, timeOut: null }), /No analyzed punches/);
  assert.match(comparisonSkipReason({ ...complete, employeeId: null }), /not mapped/);
});

test("malformed stored punches cannot crash comparison or create incorrect exceptions", () => {
  for (const value of ["bad", "25:00", "08:75", "08:00:99"]) {
    assert.match(comparisonSkipReason({ ...complete, timeOut: value }), /Invalid/);
  }
});
