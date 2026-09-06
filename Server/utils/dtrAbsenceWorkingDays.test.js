import test from "node:test";
import assert from "node:assert/strict";
import { calculateAbsenceWorkingDays } from "./dtrAbsenceWorkingDays.js";

test("February 15 start excludes January and February 1–14", () => {
  const days = calculateAbsenceWorkingDays(2024, new Set(), {}, "2024-02-15");
  assert.equal(days[0], 0);
  assert.equal(days[1], 13);
  // Working all 13 eligible days must produce no absence deficit.
  assert.equal(Math.max(0, days[1] * 8 - 13 * 8) / 8, 0);
  assert.equal(Math.max(0, days[1] * 8 - 12 * 8) / 8, 1);
});

test("start date remains inclusive while Sundays, holidays and report cutoff still apply", () => {
  const days = calculateAbsenceWorkingDays(2024, new Set(["2024-02-16"]), { 2: 20 }, "2024-02-15");
  assert.equal(days[1], 4); // February 15, 17, 19, 20; Sunday 18 and holiday 16 excluded.
});

test("each employee gets their own start date and later months remain unchanged", () => {
  const earlier = calculateAbsenceWorkingDays(2024, new Set(), {}, "2024-02-01");
  const later = calculateAbsenceWorkingDays(2024, new Set(), {}, "2024-02-15");
  assert.equal(earlier[1], 25);
  assert.equal(later[1], 13);
  assert.equal(earlier[2], later[2]);
});

test("records in a previous year do not restart eligibility at this year's first punch", () => {
  assert.deepEqual(
    calculateAbsenceWorkingDays(2024, new Set(), {}, "2023-02-15"),
    calculateAbsenceWorkingDays(2024, new Set())
  );
});
