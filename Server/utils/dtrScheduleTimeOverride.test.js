import test from "node:test";
import assert from "node:assert/strict";
import { resolveSchedule, getAnalyzedScheduleTimes } from "./dtrScheduleEngine.js";

const contextFor = (times) => ({
  shifts: new Map([[1, { id: 1, timeIn: "08:00", timeOut: "17:00" }]]),
  groups: new Map([[2, { id: 2, name: "Production" }]]),
  members: [{ employeeId: 3, groupId: 2, effectiveFrom: "2026-10-01" }],
  assignments: [{ groupId: 2, shiftId: 1, dateFrom: "2026-10-01", dateTo: "2026-10-31", weekdaysMask: 127 }],
  overrides: [{ employeeId: 3, workDate: "2026-10-15", shiftId: 1, scheduleType: "WORK", ...times }],
});

test("start and end overrides preserve the other boundary and shared template", () => {
  for (const times of [{ timeIn: "07:00" }, { timeOut: "22:00" }, { timeIn: "07:00", timeOut: "22:00" }]) {
    const context = contextFor(times);
    const schedule = resolveSchedule(context, 3, "2026-10-15");
    assert.equal(schedule.shift.timeIn, times.timeIn || "08:00");
    assert.equal(schedule.shift.timeOut, times.timeOut || "17:00");
    assert.equal(schedule.group.name, "Production");
    assert.deepEqual(context.shifts.get(1), { id: 1, timeIn: "08:00", timeOut: "17:00" });
    assert.equal(resolveSchedule(context, 3, "2026-10-16").shift.timeOut, "17:00");
    assert.equal(resolveSchedule(context, 4, "2026-10-15"), null);
  }
});

test("schedule resolution exposes override notes for the calendar tooltip", () => {
  const schedule = resolveSchedule(contextFor({ timeIn: "07:00", notes: "Client delivery" }), 3, "2026-10-15");
  assert.equal(schedule.notes, "Client delivery");
  assert.equal(schedule.overrideTimeIn, "07:00");
  assert.equal(schedule.overrideTimeOut, null);
});

test("attendance analysis uses the employee's overridden boundaries", () => {
  const schedule = resolveSchedule(contextFor({ timeIn: "07:00", timeOut: "22:00" }), 3, "2026-10-15");
  assert.deepEqual(getAnalyzedScheduleTimes({ date: "2026-10-15", timeIn: "06:30", timeOut: "22:30" }, schedule), {
    timeIn: "07:00:00", timeOut: "22:00:00", dateOut: "2026-10-15",
  });
});
