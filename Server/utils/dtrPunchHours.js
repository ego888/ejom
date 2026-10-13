// Calculate worked minutes from one credited punch window, including meal deductions.
export function calculateWorkedMinutes(actual) {
  if (!actual || !Number.isFinite(actual.start) || !Number.isFinite(actual.end)) {
    return 0;
  }
  let minutes = Math.max(0, actual.end - actual.start);
  for (let day = Math.floor(actual.start / 1440); day <= Math.floor(actual.end / 1440); day++) {
    for (const [start, end] of [[720, 780], [1140, 1200]]) {
      minutes -= Math.max(0, Math.min(actual.end, day * 1440 + end) - Math.max(actual.start, day * 1440 + start));
    }
  }
  return Math.max(0, minutes);
}

// Calculate only from the working punches; schedules and approvals play no part.
export function calculatePunchHours(actual) {
  const minutes = calculateWorkedMinutes(actual);
  return { hours: Number((Math.min(minutes, 480) / 60).toFixed(2)),
    overtime: Number((Math.max(0, minutes - 480) / 60).toFixed(2)) };
}

// Apply the eight-hour regular limit once per employee/workday across split entries.
export function allocateDailyPunchHours(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.employeeKey}:${entry.workDate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const allocation = new Map();
  for (const rows of groups.values()) {
    let regularMinutesRemaining = 480;
    rows.sort((left, right) =>
      (left.credited?.start ?? Number.POSITIVE_INFINITY) -
        (right.credited?.start ?? Number.POSITIVE_INFINITY) ||
      Number(left.id) - Number(right.id));
    for (const row of rows) {
      const workedMinutes = calculateWorkedMinutes(row.credited);
      const regularMinutes = Math.min(workedMinutes, regularMinutesRemaining);
      regularMinutesRemaining -= regularMinutes;
      allocation.set(row.id, {
        hours: Number((regularMinutes / 60).toFixed(2)),
        overtime: Number(((workedMinutes - regularMinutes) / 60).toFixed(2)),
      });
    }
  }
  return allocation;
}
