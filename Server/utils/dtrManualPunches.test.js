import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getApprovalPunchWindow, getCreditedWindow, minutesToTime, timeToMinutes } from './dtrScheduleEngine.js';

const source = fs.readFileSync(new URL('../Routes/DTRRoute.js', import.meta.url), 'utf8');
const start = source.indexOf('const entriesWithCreditedTimes =');
const display = source.slice(start, source.indexOf('    res.json', start));
function render(entry, approvals = new Map(), followSchedule = false) {
  const context = { entries: [entry], approvals, scheduleContext: {},
    followSchedule, resolveSchedule: () => null, getApprovalPunchWindow, getCreditedWindow, minutesToTime, timeToMinutes };
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

test('follow schedule hides unscheduled punches until each side is approved', () => {
  const entry = { id: 3, employeeId: 10, date: '2026-09-01', time: '08:16',
    origTimeOut: '17:01', timeIn: '08:16', timeOut: '17:01' };
  const pending = render(entry, new Map(), true);
  assert.equal(pending.creditedTimeIn, null);
  assert.equal(pending.creditedTimeOut, null);

  const approvedIn = render(entry, new Map([['3:NO_SCHEDULE:IN', { minutes: 0, approvedTime: '08:30' }]]), true);
  assert.equal(approvedIn.creditedTimeIn, '08:30:00');
  assert.equal(approvedIn.creditedTimeOut, null);

  const approvedBoth = render(entry, new Map([
    ['3:NO_SCHEDULE:IN', { minutes: 0, approvedTime: '08:30' }],
    ['3:NO_SCHEDULE:OUT', { minutes: 0, approvedTime: '16:45' }],
  ]), true);
  assert.equal(approvedBoth.creditedTimeIn, '08:30:00');
  assert.equal(approvedBoth.creditedTimeOut, '16:45:00');
});

test('manual OUT displays directly without creating a missing IN or replacing originals', () => {
  const result = render({ id: 2, employeeId: 10, date: '2026-09-01', time: null, origTimeOut: '18:34',
    timeIn: null, timeOut: '19:00', editedOut: 1 });
  assert.equal(result.origTimeOut, '18:34');
  assert.equal(result.creditedTimeIn, null);
  assert.equal(result.creditedTimeOut, '19:00');
});
