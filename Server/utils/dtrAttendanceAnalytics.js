import { getActualWindow, getScheduledWindow, resolveSchedule, timeToMinutes } from "./dtrScheduleEngine.js";

const DAY = 86400000;
export const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
export const validDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
  && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
  && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

const metricKeys = ["workedDays", "scheduledDays", "attendedDays", "absentDays", "absenceMinutes",
  "lateDays", "lateMinutes", "undertimeDays", "undertimeMinutes", "lostMinutes", "lostDays",
  "overtimeMinutes", "leaveDays", "reviewDays", "uncoveredDays", "unscheduledDays", "gapMinutes"];
const emptyMetrics = () => Object.fromEntries(metricKeys.map((key) => [key, 0]));
const addMetrics = (target, source) => metricKeys.forEach((key) => { target[key] += source[key]; });
const finish = (metrics) => ({ ...metrics,
  attendanceRate: metrics.scheduledDays ? 100 * metrics.attendedDays / metrics.scheduledDays : null,
});

// Attendance measures time within the assigned shift. Overtime never cancels lost time.
const workMinutes = (start, end, shift, planned) => {
  if (end <= start) return 0;
  let mealStart = timeToMinutes(shift.mealBreakStart);
  let mealEnd = timeToMinutes(shift.mealBreakEnd);
  if (mealStart === null || mealEnd === null) return end - start;
  if (mealStart < planned.start) mealStart += 1440;
  if (mealEnd <= mealStart) mealEnd += 1440;
  return end - start - Math.max(0, Math.min(end, mealEnd) - Math.max(start, mealStart));
};

const mergeWindows = (windows) => {
  const merged = [];
  for (const window of windows.sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && window.start <= last.end) last.end = Math.max(last.end, window.end);
    else merged.push({ ...window });
  }
  return merged;
};

export function buildAttendanceAnalytics({ employees, entries, coverage, holidays, context,
  dateFrom, dateTo, today, nowMinutes = 1440, includeSundays = false, includeHolidays = false, employeeId = "", groupId = "" }) {
  const days = Math.round((Date.parse(dateTo) - Date.parse(dateFrom)) / DAY) + 1;
  const previousFrom = addDays(dateFrom, -days);
  const previousTo = addDays(dateFrom, -1);
  const holidaySet = new Set(holidays.map((row) => row.holidayDate));
  const entryMap = new Map();
  for (const entry of entries) {
    const key = `${entry.empId}:${entry.date}`;
    if (!entryMap.has(key)) entryMap.set(key, []);
    entryMap.get(key).push(entry);
  }
  const coverageMap = new Map();
  for (const row of coverage) {
    const key = String(row.empId);
    if (!coverageMap.has(key)) coverageMap.set(key, []);
    coverageMap.get(key).push(row);
  }
  const total = emptyMetrics();
  const previous = emptyMetrics();
  const months = new Map();
  const weekdays = Array.from({ length: 7 }, (_, weekday) => ({ weekday, ...emptyMetrics() }));
  const rows = [];
  for (const employee of employees) {
    if (employeeId && String(employee.id) !== String(employeeId)) continue;
    const metrics = emptyMetrics();
    let selected = false;
    const memberships = context.members.filter((m) => Number(m.employeeId) === Number(employee.id));
    const employeeCoverage = coverageMap.get(String(employee.dtrEmpId)) || [];
    for (let date = previousFrom; date <= dateTo; date = addDays(date, 1)) {
      // Current-day and future shifts are not yet final, including missing check-outs.
      if (date >= today) continue;
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      if ((!includeSundays && weekday === 0) || (!includeHolidays && holidaySet.has(date))) continue;
      if (groupId && !memberships.some((m) => String(m.groupId) === String(groupId)
        && date >= m.effectiveFrom && (!m.effectiveUntil || date <= m.effectiveUntil))) continue;
      if (date >= dateFrom) selected = true;
      const daily = emptyMetrics();
      const schedule = resolveSchedule(context, employee.id, date);
      const planned = schedule?.type === "WORK" ? getScheduledWindow(schedule.shift) : null;
      if (date === addDays(today, -1) && planned && planned.end > 1440 + nowMinutes) continue;
      const expected = Number(schedule?.shift?.standardMinutes || 0);
      const dayEntries = entryMap.get(`${employee.dtrEmpId}:${date}`) || [];
      // Overlapping imports are ambiguous; never choose an arbitrary batch for payroll facts.
      const batches = new Set(dayEntries.map((entry) => String(entry.batchId)));
      const windows = dayEntries.map((entry) => getActualWindow(entry));
      const ordered = windows.filter(Boolean).sort((a, b) => a.start - b.start);
      const overlapping = ordered.some((window, index) => index > 0 && window.start < ordered[index - 1].end);
      const incomplete = dayEntries.some((entry, index) => Number(entry.processed) !== 1
        || !windows[index] || windows[index].end <= windows[index].start || windows[index].end - windows[index].start > 1440);
      const covered = employeeCoverage.some((row) => date >= row.periodStart && date <= row.periodEnd && Number(row.ready));
      const review = batches.size > 1 || incomplete || overlapping;
      if (review) daily.reviewDays = 1;
      if (schedule?.type === "LEAVE") daily.leaveDays = 1;
      if (!review && dayEntries.length) {
        daily.workedDays = 1;
        daily.overtimeMinutes = dayEntries.reduce((sum, entry) => sum + 60 * (
          Number(entry.overtime || 0) + Number(entry.sundayOT || 0) + Number(entry.holidayOT || 0) + Number(entry.specialOT || 0)), 0);
        if (!schedule) daily.unscheduledDays = 1;
      }
      if (schedule?.type === "WORK" && (!planned || expected <= 0)) daily.reviewDays = 1;
      if (planned && expected > 0) {
        if (!dayEntries.length && !covered) daily.uncoveredDays = 1;
        else if (!review) {
          daily.scheduledDays = 1;
          if (!dayEntries.length) {
            daily.absentDays = 1;
            daily.absenceMinutes = expected;
          } else {
            const merged = mergeWindows(windows.map((window) => ({ start: Math.max(window.start, planned.start), end: Math.min(window.end, planned.end) }))
              .filter((window) => window.end > window.start));
            if (!merged.length) {
              // Punches entirely outside the shift need review; they do not prove attendance.
              daily.scheduledDays = 0;
              daily.reviewDays = 1;
            } else {
              daily.attendedDays = 1;
              const first = merged[0].start;
              const last = merged.at(-1).end;
              const late = workMinutes(planned.start, first, schedule.shift, planned);
              daily.lateMinutes = first - planned.start > Number(schedule.shift.graceMinutes || 0) ? late : 0;
              daily.undertimeMinutes = workMinutes(last, planned.end, schedule.shift, planned);
              daily.lateDays = Number(daily.lateMinutes > 0);
              daily.undertimeDays = Number(daily.undertimeMinutes > 0);
              for (let index = 1; index < merged.length; index++) {
                daily.gapMinutes += workMinutes(merged[index - 1].end, merged[index].start, schedule.shift, planned);
              }
            }
          }
          daily.lostMinutes = Math.min(expected, daily.absenceMinutes + daily.lateMinutes + daily.undertimeMinutes);
          daily.lostDays = daily.lostMinutes / expected;
        }
      }
      if (date < dateFrom) addMetrics(previous, daily);
      else {
        addMetrics(metrics, daily);
        addMetrics(total, daily);
        addMetrics(weekdays[weekday], daily);
        const month = date.slice(0, 7);
        if (!months.has(month)) months.set(month, { month, ...emptyMetrics() });
        addMetrics(months.get(month), daily);
      }
    }
    if (selected) rows.push({ id: employee.id, empId: employee.dtrEmpId, name: employee.fullName || employee.name, ...finish(metrics) });
  }
  return { dateFrom, dateTo, throughDate: dateTo < today ? dateTo : addDays(today, -1),
    totals: finish(total), employees: rows, previous: { dateFrom: previousFrom, dateTo: previousTo, ...finish(previous) },
    months: [...months.values()].map(finish), weekdays: weekdays.map(finish) };
}
