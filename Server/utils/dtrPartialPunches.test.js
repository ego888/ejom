import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { getActualPunchWindow, getActualWindow, getCreditedWindow, getScheduledWindow, minutesToTime } from "./dtrScheduleEngine.js";
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
async function analyze(times) {
  const rows = times.map((time, index) => ({ id: index + 1, batchId: 1, empId: "10", date: "2026-09-01", time, processed: 0, deleteRecord: 0 }));
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, values) => {
      if (sql.includes("UPDATE DTREntries")) {
        const keys = ["dateOut", "timeIn", "timeOut", "editedIn", "editedOut", "processed", "deleteRecord", "remarks"];
        const row = rows.find((row) => row.id === values[8]);
        keys.forEach((key, index) => { row[key] = values[index]; });
        return [{}];
      }
      const selected = sql.includes("AND processed = 0")
        ? rows.filter((row) => !row.processed && !row.deleteRecord && !row.timeIn && !row.timeOut) : rows;
      return [structuredClone(selected)];
    },
  };
  let handler;
  vm.runInNewContext(analysisSource, { router: { post: (_path, fn) => { handler = fn; } }, pool: { getConnection: async () => connection }, console });
  let response;
  await handler({ params: { batchId: 1 } }, { json: (body) => { response = body; }, status: () => { throw new Error("Analysis failed"); } });
  assert.equal(response.Status, true);
  return rows;
}

test("Analyze Time classifies lone punches using 2 PM, leaving the opposite punch empty", async () => {
  for (const time of ["00:00", "08:00", "12:00", "13:59", "14:00", "18:00"]) {
    const [row] = await analyze([time]);
    assert.equal(row.timeIn, time < "14:00" ? time : null);
    assert.equal(row.timeOut, time >= "14:00" ? time : null);
  }
});

test("Analyze Time does not revive the last consumed time-out as an incomplete entry", async () => {
  const rows = await analyze(["08:00", "17:00"]);
  assert.equal(rows[0].timeIn, "08:00");
  assert.equal(rows[0].timeOut, "17:00");
  assert.equal(rows[1].deleteRecord, 1);
  assert.equal(rows[1].processed, 1);
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
    resolveSchedule: () => schedule, getActualPunchWindow, getScheduledWindow, comparisonSkipReason,
  });
  let response;
  await handler({ params: { batchId: 1 } }, { json: (body) => { response = body; }, status: () => { throw new Error("Comparison failed"); } });
  assert.equal(response.ComparedCount, 4);
  assert.equal(response.NoExceptionCount, 2);
  assert.equal(response.SkippedEntries.length, 0);
  assert.deepEqual(inserts.map((values) => Array.from(values).slice(1, 2).concat(Array.from(values).slice(4))), [
    [1, "EARLY_IN", "08:00:00", "07:00:00", 60],
    [2, "LATE_OUT", "17:00:00", "18:00:00", 60],
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
    resolveSchedule: () => null, getActualPunchWindow, getScheduledWindow, comparisonSkipReason,
  });
  let response;
  await handler({ params: { batchId: 1 } }, { json: (body) => { response = body; }, status: () => { throw new Error("Comparison failed"); } });
  assert.equal(response.ComparedCount, 4);
  assert.equal(response.NoExceptionCount, 0);
  assert.equal(response.SkippedEntries.length, 0);
  assert.deepEqual(inserts.map((values) => Array.from(values).slice(1, 2).concat(Array.from(values).slice(4))), [
    [1, "NO_SCHEDULE", null, "07:00:00", 0],
    [2, "NO_SCHEDULE", null, "18:00:00", 0],
    [3, "NO_SCHEDULE", null, "09:00:00", 0],
    [4, "NO_SCHEDULE", null, "16:00:00", 0],
  ]);
});


test("approved unscheduled or rest-day lone punches retain only the available side", () => {
  for (const schedule of [null, { type: "REST" }]) {
    for (const actual of [{ start: 805, end: null }, { start: null, end: 1114 }]) {
      assert.equal(getCreditedWindow({ actual, schedule }), null);
      assert.deepEqual(getCreditedWindow({ actual, schedule, unscheduledPunchApproved: true }), actual);
    }
  }
});
