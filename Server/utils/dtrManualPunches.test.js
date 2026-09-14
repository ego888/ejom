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

test('manual IN displays from timeIn while original fields remain unchanged', () => {
  const entry = { id: 1, employeeId: 10, date: '2026-09-01', time: null, origTimeOut: '18:34',
    timeIn: '09:00', timeOut: '18:34' };
  const result = render(entry);
  assert.equal(result.time, null);
  assert.equal(result.origTimeOut, '18:34');
  assert.equal(result.creditedTimeIn, '09:00');
  assert.equal(result.creditedTimeOut, '18:34');
});

test('manual OUT displays directly without creating a missing IN or replacing originals', () => {
  const result = render({ id: 2, employeeId: 10, date: '2026-09-01', time: null, origTimeOut: '18:34',
    timeIn: null, timeOut: '19:00' });
  assert.equal(result.origTimeOut, '18:34');
  assert.equal(result.creditedTimeIn, null);
  assert.equal(result.creditedTimeOut, '19:00');
});
