import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getActualPunchWindow, getCreditedWindow, minutesToTime } from './dtrScheduleEngine.js';

const source = fs.readFileSync(new URL('../Routes/DTRRoute.js', import.meta.url), 'utf8');
const start = source.indexOf('const entriesWithCreditedTimes =');
const display = source.slice(start, source.indexOf('    res.json', start));
function render(entry, approvals = new Map()) {
  const context = { entries: [entry], approvals, scheduleContext: {},
    resolveSchedule: () => null, getActualPunchWindow, getCreditedWindow, minutesToTime };
  vm.runInNewContext(display + '\nresult = entriesWithCreditedTimes[0];', context);
  return context.result;
}

test('manual IN fills only credited IN while preserving an absent original IN and approved original OUT', () => {
  const entry = { id: 1, employeeId: 10, date: '2026-09-01', timeIn: '09:00', timeOut: '18:34',
    originalPunchesCaptured: 1, originalTimeIn: null, originalTimeOut: '18:34', manualIn: 1, manualOut: 0 };
  const result = render(entry, new Map([['1:NO_SCHEDULE', 0]]));
  assert.equal(result.originalTimeIn, null);
  assert.equal(result.originalTimeOut, '18:34');
  assert.equal(result.creditedTimeIn, '09:00');
  assert.equal(result.creditedTimeOut, '18:34:00');
  assert.equal(entry.originalTimeIn, null);
});

test('manual OUT displays directly without replacing the original or creating a missing IN', () => {
  const result = render({ id: 2, employeeId: 10, date: '2026-09-01', timeIn: null, timeOut: '19:00',
    originalPunchesCaptured: 1, originalTimeIn: null, originalTimeOut: '18:34', manualIn: 0, manualOut: 1 });
  assert.equal(result.originalTimeOut, '18:34');
  assert.equal(result.creditedTimeIn, null);
  assert.equal(result.creditedTimeOut, '19:00');
});
