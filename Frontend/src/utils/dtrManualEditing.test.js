import test from "node:test";
import assert from "node:assert/strict";
import { canEditDtrTime } from "./dtrManualEditing.js";

test("Add Next Day rows allow both populated fields even when edit flags were cleared", () => {
  const entry = { timeIn: "08:00", timeOut: "17:00", editedIn: 0, editedOut: 0, remarks: "HOURS, MANUAL ADD" };
  assert.equal(canEditDtrTime(entry, "in"), true);
  assert.equal(canEditDtrTime(entry, "out"), true);
  assert.equal(canEditDtrTime({ ...entry, deleteRecord: 1 }, "in"), false);
});

test("a swapped manual row only keeps the field containing the entered time editable", () => {
  const earlierOut = {
    timeIn: "08:00",
    timeOut: "17:00",
    editedIn: 1,
    editedOut: 0,
    remarks: "MANUAL ADD",
  };
  assert.equal(canEditDtrTime(earlierOut, "in"), true);
  assert.equal(canEditDtrTime(earlierOut, "out"), false);

  const laterIn = { ...earlierOut, editedIn: 0, editedOut: 1 };
  assert.equal(canEditDtrTime(laterIn, "in"), false);
  assert.equal(canEditDtrTime(laterIn, "out"), true);
});

test("imported punches retain the existing edit restrictions", () => {
  const entry = { timeIn: "08:00", timeOut: null, editedIn: "0", remarks: "LACK3" };
  assert.equal(canEditDtrTime(entry, "in"), false);
  assert.equal(canEditDtrTime(entry, "out"), true);
  assert.equal(canEditDtrTime({ ...entry, editedIn: 1 }, "in"), true);
});
