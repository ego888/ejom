import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { timeToMinutes } from "./dtrScheduleEngine.js";

const source = fs.readFileSync(new URL("../Routes/DTRRoute.js", import.meta.url), "utf8");
const start = source.indexOf('router.put("/schedule-exceptions/:id/approve"');
const approvalSource = source.slice(start, source.indexOf('router.put("/schedule-exceptions/:id/clear"', start));

const approve = async ({ punchSide, actualTime, approvedTime }) => {
  const updates = [];
  let handler;
  const pool = { query: async (sql, values) => {
    if (sql.startsWith("SELECT")) return [[{
      availableMinutes: 0,
      exceptionType: "NO_SCHEDULE",
      punchSide,
      actualTime,
    }]];
    updates.push({ sql, values });
    return [{}];
  } };
  vm.runInNewContext(approvalSource, {
    router: { put: (_path, _auth, fn) => { handler = fn; } },
    verifyUser: () => {}, pool, timeToMinutes,
  });
  let result;
  await handler(
    { params: { id: 1 }, body: { approvedMinutes: 0, approvedTime }, user: { id: 9 } },
    { status: (status) => ({ json: (body) => { result = { status, ...body }; } }), json: (body) => { result = body; } },
  );
  return { result, updates };
};

test("no-schedule Time In approval may stay equal or move later", async () => {
  const valid = await approve({ punchSide: "IN", actualTime: "08:16:00", approvedTime: "08:30" });
  assert.equal(valid.result.Status, true);
  assert.equal(valid.updates[0].values[1], "08:30:00");

  const invalid = await approve({ punchSide: "IN", actualTime: "08:16:00", approvedTime: "08:00" });
  assert.equal(invalid.result.status, 400);
  assert.match(invalid.result.Error, /cannot be earlier/);
  assert.equal(invalid.updates.length, 0);
});

test("no-schedule Time Out approval may stay equal or move earlier", async () => {
  const valid = await approve({ punchSide: "OUT", actualTime: "17:01:00", approvedTime: "16:45" });
  assert.equal(valid.result.Status, true);
  assert.equal(valid.updates[0].values[1], "16:45:00");

  const invalid = await approve({ punchSide: "OUT", actualTime: "17:01:00", approvedTime: "17:30" });
  assert.equal(invalid.result.status, 400);
  assert.match(invalid.result.Error, /cannot be later/);
  assert.equal(invalid.updates.length, 0);
});
