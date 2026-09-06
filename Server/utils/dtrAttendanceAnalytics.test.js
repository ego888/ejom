import test from "node:test";
import assert from "node:assert/strict";
import { addDays, buildAttendanceAnalytics, validDate } from "./dtrAttendanceAnalytics.js";
import { authorizeDtrRequest } from "../middleware.js";

const shift = { id: 1, timeIn: "08:00", timeOut: "17:00", mealBreakStart: "12:00", mealBreakEnd: "13:00", standardMinutes: 480, graceMinutes: 5 };
const employee = { id: 1, dtrEmpId: "10", fullName: "Employee One" };
const entry = (date, values = {}) => ({ id: 1, batchId: 1, empId: "10", date, processed: 1, timeIn: "08:00", timeOut: "17:00", ...values });
const context = (values = {}) => ({ shifts: new Map([[1, shift]]), members: [], overrides: [],
  assignments: [{ id: 1, employeeId: 1, shiftId: 1, dateFrom: "2026-01-01", dateTo: "2026-12-31", weekdaysMask: 127 }], ...values });
const run = (values = {}) => buildAttendanceAnalytics({ employees: [employee], entries: [],
  coverage: [{ empId: "10", periodStart: "2026-06-01", periodEnd: "2026-06-30", ready: 1 }],
  holidays: [], context: context(), dateFrom: "2026-06-01", dateTo: "2026-06-01", today: "2026-07-01", ...values });

test("absences use scheduled minutes; overtime never offsets missed work", () => {
  const result = run({ dateTo: "2026-06-02", entries: [entry("2026-06-01", { timeIn: "08:30", timeOut: "16:30", overtime: 4 })] }).totals;
  assert.equal(result.workedDays, 1);
  assert.equal(result.absentDays, 1);
  assert.equal(result.lateMinutes, 30);
  assert.equal(result.undertimeMinutes, 30);
  assert.equal(result.lostMinutes, 540);
  assert.equal(result.lostDays, 1.125);
  assert.equal(result.overtimeMinutes, 240);
  assert.equal(result.attendanceRate, 50);
});

test("Sunday holidays require both switches and never count twice", () => {
  const values = { dateFrom: "2026-06-07", dateTo: "2026-06-07", holidays: [{ holidayDate: "2026-06-07" }] };
  for (const flags of [{}, { includeSundays: true }, { includeHolidays: true }]) assert.equal(run({ ...values, ...flags }).totals.absentDays, 0);
  assert.equal(run({ ...values, includeSundays: true, includeHolidays: true }).totals.absentDays, 1);
  assert.equal(run({ ...values, includeSundays: true, includeHolidays: true, entries: [entry("2026-06-07")] }).totals.workedDays, 1);
});

test("ordinary Sundays and holidays can be toggled independently", () => {
  assert.equal(run({ dateFrom: "2026-06-07", dateTo: "2026-06-07", includeSundays: true }).totals.absentDays, 1);
  assert.equal(run({ holidays: [{ holidayDate: "2026-06-01" }] }).totals.absentDays, 0);
  assert.equal(run({ holidays: [{ holidayDate: "2026-06-01" }], includeHolidays: true }).totals.absentDays, 1);
});

test("rest, leave, no-work, and unassigned days cannot create absences", () => {
  for (const scheduleType of ["REST", "LEAVE", "NO_WORK"]) {
    const totals = run({ context: context({ overrides: [{ employeeId: 1, workDate: "2026-06-01", scheduleType }] }) }).totals;
    assert.equal(totals.absentDays, 0);
    assert.equal(totals.attendanceRate, null);
    assert.equal(totals.leaveDays, Number(scheduleType === "LEAVE"));
  }
  const totals = run({ context: context({ assignments: [] }), entries: [entry("2026-06-01")] }).totals;
  assert.equal(totals.workedDays, 1);
  assert.equal(totals.unscheduledDays, 1);
  assert.equal(totals.absentDays, 0);
  assert.equal(totals.lateMinutes, 0);
});

test("unimported dates and unprocessed employees are unknown, not absent", () => {
  for (const coverage of [[], [{ empId: "10", periodStart: "2026-06-01", periodEnd: "2026-06-01", ready: 0 }]]) {
    const totals = run({ coverage }).totals;
    assert.equal(totals.absentDays, 0);
    assert.equal(totals.uncoveredDays, 1);
    assert.equal(totals.attendanceRate, null);
  }
});

test("missing punches, unprocessed and duplicate imports do not become attendance or absence", () => {
  for (const entries of [[entry("2026-06-01", { timeOut: null })], [entry("2026-06-01", { processed: 0 })],
    [entry("2026-06-01"), entry("2026-06-01", { id: 2, batchId: 2 })],
    [entry("2026-06-01"), entry("2026-06-01", { id: 2 })]]) {
    const totals = run({ entries }).totals;
    assert.equal(totals.reviewDays, 1);
    assert.equal(totals.workedDays, 0);
    assert.equal(totals.absentDays, 0);
    assert.equal(totals.scheduledDays, 0);
    assert.equal(totals.lostMinutes, 0);
  }
});

test("grace threshold and meal breaks are respected", () => {
  assert.equal(run({ entries: [entry("2026-06-01", { timeIn: "08:05" })] }).totals.lateMinutes, 0);
  assert.equal(run({ entries: [entry("2026-06-01", { timeIn: "08:06" })] }).totals.lateMinutes, 6);
  assert.equal(run({ entries: [entry("2026-06-01", { timeIn: "13:30" })] }).totals.lateMinutes, 270);
  assert.equal(run({ entries: [entry("2026-06-01", { timeOut: "11:30" })] }).totals.undertimeMinutes, 270);
});

test("overnight shifts use next-day checkout and next-day meal break", () => {
  const overnight = { ...shift, timeIn: "22:00", timeOut: "07:00", mealBreakStart: "02:00", mealBreakEnd: "03:00" };
  const totals = run({ context: context({ shifts: new Map([[1, overnight]]) }), entries: [entry("2026-06-01", { timeIn: "22:30", timeOut: "06:30", dateOut: "2026-06-02" })] }).totals;
  assert.equal(totals.lateMinutes, 30);
  assert.equal(totals.undertimeMinutes, 30);
  assert.equal(totals.lostDays, 0.125);
});

test("today, future dates, and ongoing overnight shifts are not absent", () => {
  assert.equal(run({ today: "2026-06-01", dateTo: "2026-06-02" }).totals.absentDays, 0);
  const overnight = { ...shift, timeIn: "22:00", timeOut: "07:00", mealBreakStart: "02:00", mealBreakEnd: "03:00" };
  assert.equal(run({ today: "2026-06-02", nowMinutes: 30, context: context({ shifts: new Map([[1, overnight]]) }) }).totals.absentDays, 0);
});

test("equivalent days use each employee's actual shift duration", () => {
  const shortShift = { ...shift, id: 2, timeOut: "12:00", mealBreakStart: null, mealBreakEnd: null, standardMinutes: 240 };
  const totals = run({ dateTo: "2026-06-02", context: context({ shifts: new Map([[1, shift], [2, shortShift]]),
    overrides: [{ employeeId: 1, workDate: "2026-06-02", scheduleType: "WORK", shiftId: 2 }] }),
    entries: [entry("2026-06-01", { timeIn: "09:00" }), entry("2026-06-02", { timeIn: "09:00", timeOut: "12:00" })] }).totals;
  assert.equal(totals.lostMinutes, 120);
  assert.equal(totals.lostDays, 0.375);
});

test("split punches count as one day, with internal gaps separate from late/undertime", () => {
  const totals = run({ entries: [entry("2026-06-01", { timeOut: "11:00" }), entry("2026-06-01", { id: 2, timeIn: "13:00" })] }).totals;
  assert.equal(totals.workedDays, 1);
  assert.equal(totals.attendanceRate, 100);
  assert.equal(totals.gapMinutes, 60);
  assert.equal(totals.lostMinutes, 0);
});

test("punches entirely outside a scheduled shift require review", () => {
  const totals = run({ entries: [entry("2026-06-01", { timeIn: "18:00", timeOut: "20:00" })] }).totals;
  assert.equal(totals.reviewDays, 1);
  assert.equal(totals.absentDays, 0);
  assert.equal(totals.attendanceRate, null);
});

test("employee filters and dated group membership apply to all aggregates", () => {
  const values = { dateTo: "2026-06-02", groupId: "5", context: context({
    members: [{ employeeId: 1, groupId: 5, effectiveFrom: "2026-06-02", effectiveUntil: "2026-06-02" }] }) };
  const result = run(values);
  assert.equal(result.totals.absentDays, 1);
  assert.equal(result.weekdays[2].absentDays, 1);
  assert.equal(result.months[0].absentDays, 1);
  assert.equal(result.previous.absentDays, 0);
  assert.equal(run({ ...values, employeeId: "2" }).employees.length, 0);
});

test("previous period uses equal number of calendar days across month boundaries", () => {
  const result = run({ dateFrom: "2026-07-01", dateTo: "2026-07-02", today: "2026-08-01", entries: [entry("2026-06-30")] });
  assert.equal(result.previous.dateFrom, "2026-06-29");
  assert.equal(result.previous.dateTo, "2026-06-30");
  assert.equal(result.previous.absentDays, 1);
  assert.equal(result.previous.attendanceRate, 50);
  assert.equal(result.totals.workedDays, 0);
});

test("dates reject rollover and support leap-year arithmetic", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate(["2026-06-01"]), false);
  assert.equal(validDate("bad"), false);
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
});

test("overview requires attendance-report permission or admin access", () => {
  for (const key of ["dtr.batches", "dtr.monthly", "dtr.absences", "dtr.groups", "dtr.shifts", null]) {
    let allowed = false;
    let status;
    authorizeDtrRequest({ path: "/overview", user: { categoryId: 2, dtrPermissions: key ? [key] : [] } },
      { status(code) { status = code; return this; }, json() {} }, () => { allowed = true; });
    assert.equal(allowed, ["dtr.batches", "dtr.monthly", "dtr.absences"].includes(key));
    if (!allowed) assert.equal(status, 403);
  }
  let adminAllowed = false;
  authorizeDtrRequest({ path: "/overview", user: { categoryId: 1 } }, {}, () => { adminAllowed = true; });
  assert.equal(adminAllowed, true);
});
