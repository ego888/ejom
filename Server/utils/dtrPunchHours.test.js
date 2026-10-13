import test from "node:test";
import assert from "node:assert/strict";
import { allocateDailyPunchHours, calculatePunchHours } from "./dtrPunchHours.js";
import {
  getActualWindow,
  getApprovalPunchWindow,
  getCreditedWindow,
  timeToMinutes,
} from "./dtrScheduleEngine.js";

const run = (timeIn, timeOut) => calculatePunchHours(getActualWindow({ timeIn, timeOut }));
test("8 AM to 5 PM is eight regular hours after lunch", () => {
  assert.deepEqual(run("08:00", "17:00"), { hours: 8, overtime: 0 });
});
test("both meals are deducted and time beyond eight hours is overtime", () => {
  assert.deepEqual(run("08:00", "21:00"), { hours: 8, overtime: 3 });
});
test("deduct only actual overlap with a meal", () => {
  assert.deepEqual(run("12:30", "14:00"), { hours: 1, overtime: 0 });
  assert.deepEqual(run("18:30", "19:30"), { hours: 0.5, overtime: 0 });
  assert.deepEqual(run("12:00", "13:00"), { hours: 0, overtime: 0 });
});
test("overnight punches use the same rules", () => {
  assert.deepEqual(run("18:00", "06:00"), { hours: 8, overtime: 3 });
});
test("missing punches clear stale hours and overtime", () => {
  assert.deepEqual(run(null, "18:00"), { hours: 0, overtime: 0 });
  assert.deepEqual(run("09:00", null), { hours: 0, overtime: 0 });
});

test("split entries share one daily eight-hour regular limit", () => {
  const allocation = allocateDailyPunchHours([
    { id: 1, employeeKey: 385, workDate: "2026-10-01", credited: { start: 780, end: 1048 } },
    { id: 2, employeeKey: 385, workDate: "2026-10-01", credited: { start: 1097, end: 1681 } },
  ]);
  assert.deepEqual(allocation.get(1), { hours: 4.47, overtime: 0 });
  assert.deepEqual(allocation.get(2), { hours: 3.53, overtime: 5.2 });
});

test("batch calculation uses approved schedule boundaries and includes unprocessed rows", async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const source = readFileSync(new URL('../Routes/DTRRoute.js', import.meta.url), 'utf8');
  const start = source.indexOf('router.post("/calculate-hours/');
  const updates = [];
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, values) => {
      assert.doesNotMatch(sql, /processed\s*=/);
      if (sql.includes('FROM DTRBatches')) return [[{ id: 1, periodStart: '2026-09-01', periodEnd: '2026-09-30' }]];
      if (sql.includes('FROM DTREntries')) return [[
        { id: 1, employeeId: 10, date: '2026-09-01', time: '07:00', origTimeOut: '18:00', timeIn: '08:00', timeOut: '17:00', editedIn: 0, editedOut: 0, processed: 0 },
        { id: 2, employeeId: null, date: '2026-09-01', timeIn: null, timeOut: '18:00' },
      ]];
      if (sql.includes('FROM DTRScheduleExceptions')) return [[
        { dtrEntryId: 1, exceptionType: 'EARLY_IN', punchSide: 'WINDOW', approvedMinutes: 30 },
        { dtrEntryId: 1, exceptionType: 'LATE_OUT', punchSide: 'WINDOW', approvedMinutes: 60 },
      ]];
      updates.push(Array.from(values));
      return [{}];
    },
  };
  let handler;
  runInNewContext(source.slice(start, source.indexOf('// Process Sunday/Holiday hours', start)), {
    router: { post: (_path, fn) => { handler = fn; } }, pool: { getConnection: async () => connection },
    allocateDailyPunchHours, getApprovalPunchWindow, getCreditedWindow, timeToMinutes,
    loadSchedulingContext: async () => ({}),
    resolveSchedule: (_context, employeeId) => employeeId
      ? { type: 'WORK', shift: { timeIn: '08:00', timeOut: '17:00' } }
      : null,
    console,
  });
  await handler({ params: { batchId: 1 } }, { json: (body) => assert.equal(body.UpdatedCount, 2),
    status: () => { throw new Error('Calculation failed'); } });
  assert.deepEqual(updates.map((row) => row.slice(0, 2)), [[8, 1.5], [0, 0]]);
});
