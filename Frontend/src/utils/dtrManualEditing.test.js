import test from "node:test";
import assert from "node:assert/strict";
import { canEditDtrTime } from "./dtrManualEditing.js";

test("Add Next Day rows allow both populated fields even when edit flags were cleared", () => {
  const entry = { timeIn: "08:00", timeOut: "17:00", editedIn: 0, editedOut: 0, remarks: "HOURS, MANUAL ADD" };
  assert.equal(canEditDtrTime(entry, "in"), true);
  assert.equal(canEditDtrTime(entry, "out"), true);
  assert.equal(canEditDtrTime({ ...entry, deleteRecord: 1 }, "in"), false);
});
test("imported punches retain the existing edit restrictions", () => {
  const entry = { timeIn: "08:00", timeOut: null, editedIn: "0", remarks: "LACK3" };
  assert.equal(canEditDtrTime(entry, "in"), false);
  assert.equal(canEditDtrTime(entry, "out"), true);
  assert.equal(canEditDtrTime({ ...entry, editedIn: 1 }, "in"), true);
});
