// Calculate only from the working punches; schedules and approvals play no part.
export function calculatePunchHours(actual) {
  if (!actual || !Number.isFinite(actual.start) || !Number.isFinite(actual.end)) {
    return { hours: 0, overtime: 0 };
  }
  let minutes = Math.max(0, actual.end - actual.start);
  for (let day = Math.floor(actual.start / 1440); day <= Math.floor(actual.end / 1440); day++) {
    for (const [start, end] of [[720, 780], [1140, 1200]]) {
      minutes -= Math.max(0, Math.min(actual.end, day * 1440 + end) - Math.max(actual.start, day * 1440 + start));
    }
  }
  minutes = Math.max(0, minutes);
  return { hours: Number((Math.min(minutes, 480) / 60).toFixed(2)),
    overtime: Number((Math.max(0, minutes - 480) / 60).toFixed(2)) };
}
