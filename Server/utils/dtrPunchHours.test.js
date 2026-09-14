import test from "node:test";
import assert from "node:assert/strict";
import { calculatePunchHours } from "./dtrPunchHours.js";
import { getActualWindow } from "./dtrScheduleEngine.js";

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

test("batch calculation reads no scheduling data and includes unprocessed rows", async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const source = readFileSync(new URL('../Routes/DTRRoute.js', import.meta.url), 'utf8');
  const start = source.indexOf('router.post("/calculate-hours/');
  const updates = [];
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, values) => {
      assert.doesNotMatch(sql, /DTRSchedule|DTRShift|employee|processed\s*=/);
      if (sql.includes('FROM DTRBatches')) return [[{ id: 1 }]];
      if (sql.includes('FROM DTREntries')) return [[
        { id: 1, timeIn: '08:00', timeOut: '21:00', processed: 0 },
        { id: 2, timeIn: null, timeOut: '18:00' },
      ]];
      updates.push(Array.from(values));
      return [{}];
    },
  };
  let handler;
  runInNewContext(source.slice(start, source.indexOf('// Process Sunday/Holiday hours', start)), {
    router: { post: (_path, fn) => { handler = fn; } }, pool: { getConnection: async () => connection },
    calculatePunchHours, getActualWindow, console,
  });
  await handler({ params: { batchId: 1 } }, { json: (body) => assert.equal(body.UpdatedCount, 2),
    status: () => { throw new Error('Calculation failed'); } });
  assert.deepEqual(updates.map((row) => row.slice(0, 2)), [[8, 3], [0, 0]]);
});
