export const timeToMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

export const loadSchedulingContext = async (connection, dateFrom, dateTo) => {
  const [[shifts], [members], [assignments], [overrides]] = await Promise.all([
    connection.query(`SELECT id, name, TIME_FORMAT(timeIn,'%H:%i') timeIn,
      TIME_FORMAT(timeOut,'%H:%i') timeOut,
      TIME_FORMAT(mealBreakStart,'%H:%i') mealBreakStart,
      TIME_FORMAT(mealBreakEnd,'%H:%i') mealBreakEnd,
      standardMinutes FROM DTRShiftTemplates`),
    connection.query(`SELECT employeeId, groupId,
      DATE_FORMAT(effectiveFrom,'%Y-%m-%d') effectiveFrom,
      DATE_FORMAT(effectiveUntil,'%Y-%m-%d') effectiveUntil
      FROM DTRShiftGroupMembers WHERE effectiveFrom<=?
      AND COALESCE(effectiveUntil,'9999-12-31')>=?`, [dateTo, dateFrom]),
    connection.query(`SELECT * , DATE_FORMAT(dateFrom,'%Y-%m-%d') dateFrom,
      DATE_FORMAT(dateTo,'%Y-%m-%d') dateTo FROM DTRShiftAssignments
      WHERE dateFrom<=? AND dateTo>=? ORDER BY id`, [dateTo, dateFrom]),
    connection.query(`SELECT employeeId, shiftId, scheduleType,
      DATE_FORMAT(workDate,'%Y-%m-%d') workDate FROM DTRScheduleOverrides
      WHERE workDate BETWEEN ? AND ?`, [dateFrom, dateTo]),
  ]);
  return { shifts: new Map(shifts.map((s) => [Number(s.id), s])), members, assignments, overrides };
};

export const resolveSchedule = (context, employeeId, workDate) => {
  const id = Number(employeeId);
  const override = context.overrides.find((row) => Number(row.employeeId) === id && row.workDate === workDate);
  if (override) return { type: override.scheduleType, shift: context.shifts.get(Number(override.shiftId)) || null, source: "override" };
  const weekday = new Date(`${workDate}T00:00:00`).getDay();
  const applies = (row) => workDate >= row.dateFrom && workDate <= row.dateTo && (Number(row.weekdaysMask) & (1 << weekday));
  const individual = context.assignments.filter((row) => Number(row.employeeId) === id && applies(row)).at(-1);
  if (individual) return { type: "WORK", shift: context.shifts.get(Number(individual.shiftId)), source: "employee" };
  const groupIds = context.members.filter((row) => Number(row.employeeId) === id && workDate >= row.effectiveFrom && (!row.effectiveUntil || workDate <= row.effectiveUntil)).map((row) => Number(row.groupId));
  const group = context.assignments.filter((row) => groupIds.includes(Number(row.groupId)) && applies(row)).at(-1);
  if (group) return { type: "WORK", shift: context.shifts.get(Number(group.shiftId)), source: "group" };
  return null;
};

export const getActualWindow = (entry) => {
  const start = timeToMinutes(entry.timeIn);
  let end = timeToMinutes(entry.timeOut);
  if (start === null || end === null) return null;
  if ((entry.dateOut && entry.dateOut > entry.date) || end < start) end += 1440;
  return { start, end };
};

export const getScheduledWindow = (shift) => {
  const start = timeToMinutes(shift?.timeIn);
  let end = timeToMinutes(shift?.timeOut);
  if (start === null || end === null) return null;
  if (end <= start) end += 1440;
  return { start, end };
};

export const minutesToTime = (minutes) => {
  if (!Number.isFinite(minutes)) return null;
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
};

export const getCreditedWindow = ({
  actual,
  schedule,
  earlyApproved = 0,
  lateApproved = 0,
  unscheduledApproved = 0,
}) => {
  if (!actual) return null;
  if (schedule?.type === "WORK" && schedule.shift) {
    const planned = getScheduledWindow(schedule.shift);
    if (!planned) return null;
    return {
      start: Math.max(actual.start, planned.start - Number(earlyApproved || 0)),
      end: Math.min(actual.end, planned.end + Number(lateApproved || 0)),
    };
  }
  if (Number(unscheduledApproved) > 0) {
    return {
      start: actual.start,
      end: Math.min(actual.end, actual.start + Number(unscheduledApproved)),
    };
  }
  return null;
};
