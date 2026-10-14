import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { getAnalyzedScheduleTimes, getApprovalPunchWindow, resolveSchedule, getActualPunchWindow, getActualWindow, getCreditedWindow, getScheduledWindow, minutesToTime } from "./dtrScheduleEngine.js";
import { comparisonSkipReason } from "./dtrComparisonEligibility.js";

const schedule = { type: "WORK", shift: { timeIn: "08:00", timeOut: "17:00" } };
test("approving a lone arrival or departure preserves the absent punch", () => {
  for (const [timeIn, timeOut, earlyApproved, lateApproved, expected] of [
    ["07:00", null, 60, 0, { start: 420, end: null }],
    [null, "18:00", 0, 60, { start: null, end: 1080 }],
    ["07:00", null, 0, 0, { start: 480, end: null }],
    [null, "18:00", 0, 0, { start: null, end: 1020 }],
  ]) {
    const entry = { timeIn, timeOut, date: "2026-09-01" };
    assert.deepEqual(getCreditedWindow({ actual: getActualPunchWindow(entry), schedule, earlyApproved, lateApproved }), expected);
    assert.equal(getActualWindow(entry), null, "a single punch cannot supply worked hours");
  }
  assert.equal(minutesToTime(null), null);
});

// Run the actual analysis handler against an in-memory query adapter.
const source = fs.readFileSync(new URL("../Routes/DTRRoute.js", import.meta.url), "utf8");
const analysisSource = source.slice(source.indexOf('router.post("/analyze-time/'), source.indexOf('// Delete repeated records'));
async function analyze(times, repeat = false, schedule = null) {
  const rows = times.map((time, index) => ({ id: index + 1, batchId: 1, empId: "10", date: "2026-09-01", time, processed: 0, deleteRecord: 0 }));
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, values) => {
      if (sql.includes("SELECT id, dtrEmpId FROM employee")) return [[{ id: 1, dtrEmpId: "10" }]];
      if (sql.includes("SET timeIn=?, timeOut=?, dateOut=?")) {
        const row = rows.find((row) => row.id === values[3]);
        [row.timeIn, row.timeOut, row.dateOut] = values;
        return [{}];
      }
      if (sql.includes("UPDATE DTREntries")) {
        const keys = ["dateOut", "timeIn", "timeOut", "editedIn", "editedOut", "processed", "deleteRecord", "remarks"];
        const row = rows.find((row) => row.id === values.at(-2));
        keys.forEach((key, index) => { row[key] = values[index]; });
        row.origTimeOut = values[8] ?? row.origTimeOut ?? values[10];
        row.time = values[11];
        return [{}];
      }
      const selected = sql.includes("AND processed = 0")
        ? rows.filter((row) => !row.processed && !row.deleteRecord && !row.timeIn && !row.timeOut) : rows;
      return [structuredClone(selected).map((row) => ({ ...row, time: row.time ?? row.origTimeOut }))];
    },
  };
  let handler;
  vm.runInNewContext(analysisSource, { router: { post: (_path, fn) => { handler = fn; } }, pool: { getConnection: async () => connection },
    loadSchedulingContext: async () => ({ shifts: new Map(schedule ? [[1, schedule.shift]] : []), members: [], overrides: [], assignments: schedule ? [{ employeeId: 1, shiftId: 1, dateFrom: "2026-09-01", dateTo: "2026-09-30", weekdaysMask: 127 }] : [] }),
    getAnalyzedScheduleTimes, resolveSchedule, console });
  let response;
  await handler({ params: { batchId: 1 } }, { json: (body) => { response = body; }, status: () => { throw new Error("Analysis failed"); } });
  assert.equal(response.Status, true);
  if (repeat) await handler({ params: { batchId: 1 } }, { json: () => {}, status: () => { throw new Error("Repeated analysis failed"); } });
  return rows;
}

test("Analyze Time classifies lone punches using 2 PM, leaving the opposite punch empty", async () => {
  for (const time of ["00:00", "08:00", "12:00", "13:59", "14:00", "18:00"]) {
    const [row] = await analyze([time]);
    assert.equal(row.timeIn, time < "14:00" ? time : null);
    assert.equal(row.timeOut, time >= "14:00" ? time : null);
    assert.equal(row.origTimeOut, time >= "14:00" ? time : null);
    assert.equal(row.time, time >= "14:00" ? null : time);
  }
});

test("Analyze Time does not revive the last consumed time-out as an incomplete entry", async () => {
  const rows = await analyze(["08:00", "17:00"]);
  assert.equal(rows[0].timeIn, "08:00");
  assert.equal(rows[0].timeOut, "17:00");
  assert.equal(rows[0].origTimeOut, "17:00");
  assert.equal(rows[0].time, "08:00");
  assert.equal(rows[1].deleteRecord, 1);
  assert.equal(rows[1].processed, 1);
});

test("Analyze Time ignores repeated punches instead of pairing a duplicate as Time Out", async () => {
  const rows = await analyze(["07:55", "07:55", "18:08", "18:08"]);
  assert.equal(rows[0].timeIn, "07:55");
  assert.equal(rows[0].timeOut, "18:08");
  assert.equal(rows[0].origTimeOut, "18:08");
  assert.equal(rows[1].deleteRecord, 1);
  assert.equal(rows[1].remarks, "REPEAT");
  assert.equal(rows[2].deleteRecord, 1);
  assert.equal(rows[3].deleteRecord, 1);
  assert.equal(rows[3].remarks, "REPEAT");
});

test("Compare Schedules creates approvals independently for incomplete analyzed entries", async () => {
  const entries = [
    { id: 1, timeIn: "07:00", timeOut: null },
    { id: 2, timeIn: null, timeOut: "18:00" },
    { id: 3, timeIn: "09:00", timeOut: null },
    { id: 4, timeIn: null, timeOut: "16:00" },
  ].map((row) => ({ ...row, batchId: 1, employeeId: 10, empId: "10", date: "2026-09-01", processed: 0 }));
  const inserts = [];
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, values) => {
      if (sql.includes("FROM DTRBatches")) return [[{ periodStart: "2026-09-01", periodEnd: "2026-09-30" }]];
      if (sql.includes("FROM DTREntries")) return [entries];
      if (sql.includes("INSERT INTO DTRScheduleExceptions")) inserts.push(values);
      return [[]];
    },
  };
  let handler;
  const comparisonSource = source.slice(source.indexOf('router.post("/compare-schedules/'), source.indexOf('router.get("/schedule-exceptions/'));
  vm.runInNewContext(comparisonSource, {
    router: { post: (_path, _auth, fn) => { handler = fn; } }, verifyUser: () => {},
    pool: { getConnection: async () => connection }, loadSchedulingContext: async () => ({}),
    resolveSchedule: () => schedule, getApprovalPunchWindow, getScheduledWindow, comparisonSkipReason,
  });
  let response;
  await handler({ params: { batchId: 1 } }, { json: (body) => { response = body; }, status: () => { throw new Error("Comparison failed"); } });
  assert.equal(response.ComparedCount, 4);
  assert.equal(response.NoExceptionCount, 2);
  assert.equal(response.SkippedEntries.length, 0);
  assert.deepEqual(inserts.map((values) => Array.from(values).slice(1, 2).concat(Array.from(values).slice(4))), [
    [1, "EARLY_IN", "WINDOW", "08:00:00", "07:00:00", 60],
    [2, "LATE_OUT", "WINDOW", "17:00:00", "18:00:00", 60],
  ]);
});

test("Unscheduled lone punches are offered for approval without inventing duration", async () => {
  const entries = [
    { id: 1, timeIn: "07:00", timeOut: null },
    { id: 2, timeIn: null, timeOut: "18:00" },
    { id: 3, timeIn: "09:00", timeOut: null },
    { id: 4, timeIn: null, timeOut: "16:00" },
  ].map((row) => ({ ...row, batchId: 1, employeeId: 10, empId: "10", date: "2026-09-01", processed: 0 }));
  const inserts = [];
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, values) => {
      if (sql.includes("FROM DTRBatches")) return [[{ periodStart: "2026-09-01", periodEnd: "2026-09-30" }]];
      if (sql.includes("FROM DTREntries")) return [entries];
      if (sql.includes("INSERT INTO DTRScheduleExceptions")) inserts.push(values);
      return [[]];
    },
  };
  let handler;
  const comparisonSource = source.slice(source.indexOf('router.post("/compare-schedules/'), source.indexOf('router.get("/schedule-exceptions/'));
  vm.runInNewContext(comparisonSource, {
    router: { post: (_path, _auth, fn) => { handler = fn; } }, verifyUser: () => {},
    pool: { getConnection: async () => connection }, loadSchedulingContext: async () => ({}),
    resolveSchedule: () => null, getApprovalPunchWindow, getScheduledWindow, comparisonSkipReason,
  });
  let response;
  await handler({ params: { batchId: 1 } }, { json: (body) => { response = body; }, status: () => { throw new Error("Comparison failed"); } });
  assert.equal(response.ComparedCount, 4);
  assert.equal(response.NoExceptionCount, 0);
  assert.equal(response.SkippedEntries.length, 0);
  assert.deepEqual(inserts.map((values) => Array.from(values).slice(1, 2).concat(Array.from(values).slice(4))), [
    [1, "NO_SCHEDULE", "IN", null, "07:00:00", 0],
    [2, "NO_SCHEDULE", "OUT", null, "18:00:00", 0],
    [3, "NO_SCHEDULE", "IN", null, "09:00:00", 0],
    [4, "NO_SCHEDULE", "OUT", null, "16:00:00", 0],
  ]);
});

test("unscheduled IN and OUT approvals are independent", () => {
  const actual = { start: 496, end: 1021 };
  assert.deepEqual(getCreditedWindow({ actual, schedule: null, unscheduledInApproved: true }),
    { start: 496, end: null });
  assert.deepEqual(getCreditedWindow({ actual, schedule: null, unscheduledOutApproved: true }),
    { start: null, end: 1021 });
  assert.deepEqual(getCreditedWindow({ actual, schedule: null, unscheduledInApproved: true, unscheduledOutApproved: true }),
    actual);
});

test("approved unscheduled punch times can only reduce the credited window", () => {
  const actual = { start: 496, end: 1021 };
  assert.deepEqual(getCreditedWindow({
    actual,
    schedule: null,
    unscheduledInApproved: true,
    unscheduledOutApproved: true,
    unscheduledInTime: 510,
    unscheduledOutTime: 990,
  }), { start: 510, end: 990 });
});


test("approved unscheduled or rest-day lone punches retain only the available side", () => {
  for (const schedule of [null, { type: "REST" }]) {
    for (const actual of [{ start: 805, end: null }, { start: null, end: 1114 }]) {
      assert.equal(getCreditedWindow({ actual, schedule }), null);
      assert.deepEqual(getCreditedWindow({ actual, schedule, unscheduledPunchApproved: true }), actual);
    }
  }
});


test("repeated analysis preserves a lone OUT after the original IN column is cleared", async () => {
  const [row] = await analyze(["18:34"], true);
  assert.equal(row.time, null);
  assert.equal(row.origTimeOut, "18:34");
  assert.equal(row.timeIn, null);
  assert.equal(row.timeOut, "18:34");
});

test("Analyze Time applies schedules, preserves late arrivals and early departures, and retains originals", async () => {
  for (const [punches, expected] of [
    [["07:30", "18:00"], ["08:00:00", "17:00:00"]],
    [["08:30", "16:30"], ["08:30:00", "16:30:00"]],
    [["07:30", "16:30"], ["08:00:00", "16:30:00"]],
    [["08:30", "18:00"], ["08:30:00", "17:00:00"]],
  ]) {
    const [row] = await analyze(punches, true, schedule);
    assert.deepEqual([row.timeIn, row.timeOut], expected);
    assert.equal(row.time, punches[0]);
    assert.equal(row.origTimeOut, punches[1]);
  }
});

test("scheduled analysis keeps missing punches empty", async () => {
  const [arrival] = await analyze(["07:30"], true, schedule);
  assert.equal(arrival.timeIn, "08:00:00");
  assert.equal(arrival.timeOut, null);
  const [departure] = await analyze(["18:00"], true, schedule);
  assert.equal(departure.timeIn, null);
  assert.equal(departure.timeOut, "17:00:00");
});

test("schedule boundaries preserve overnight checkout dates", () => {
  assert.deepEqual(getAnalyzedScheduleTimes({ date: "2026-09-01", dateOut: "2026-09-02", timeIn: "21:30", timeOut: "06:30" },
    { type: "WORK", shift: { timeIn: "22:00", timeOut: "06:00" } }),
    { timeIn: "22:00:00", timeOut: "06:00:00", dateOut: "2026-09-02" });
});

test("schedule resolution reads edited assignments and shift templates with override precedence", () => {
  const context = { shifts: new Map([[1, { name: "Morning" }], [2, { name: "Evening" }]]),
    members: [{ employeeId: 1, groupId: 3, effectiveFrom: "2026-09-01" }],
    assignments: [{ groupId: 3, shiftId: 1, dateFrom: "2026-09-01", dateTo: "2026-09-30", weekdaysMask: 127 }], overrides: [] };
  assert.equal(resolveSchedule(context, 1, "2026-09-01").shift.name, "Morning");
  context.assignments[0].shiftId = 2;
  assert.equal(resolveSchedule(context, 1, "2026-09-01").shift.name, "Evening");
  context.shifts.get(2).name = "Updated evening";
  assert.equal(resolveSchedule(context, 1, "2026-09-01").shift.name, "Updated evening");
  context.overrides.push({ employeeId: 1, workDate: "2026-09-01", scheduleType: "REST" });
  assert.equal(resolveSchedule(context, 1, "2026-09-01").type, "REST");
});
