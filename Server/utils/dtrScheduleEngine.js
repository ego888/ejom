export const timeToMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

export const loadSchedulingContext = async (connection, dateFrom, dateTo) => {
  const [[shifts], [groups], [members], [assignments], [overrides]] = await Promise.all([
    connection.query(`SELECT id, name, color, TIME_FORMAT(timeIn,'%H:%i') timeIn,
      TIME_FORMAT(timeOut,'%H:%i') timeOut,
      TIME_FORMAT(mealBreakStart,'%H:%i') mealBreakStart,
      TIME_FORMAT(mealBreakEnd,'%H:%i') mealBreakEnd,
      standardMinutes, graceMinutes FROM DTRShiftTemplates`),
    connection.query("SELECT id, name, color FROM DTRShiftGroups"),
    connection.query(`SELECT employeeId, groupId,
      DATE_FORMAT(effectiveFrom,'%Y-%m-%d') effectiveFrom,
      DATE_FORMAT(effectiveUntil,'%Y-%m-%d') effectiveUntil
      FROM DTRShiftGroupMembers WHERE effectiveFrom<=?
      AND COALESCE(effectiveUntil,'9999-12-31')>=?`, [dateTo, dateFrom]),
    connection.query(`SELECT * , DATE_FORMAT(dateFrom,'%Y-%m-%d') dateFrom,
      DATE_FORMAT(dateTo,'%Y-%m-%d') dateTo FROM DTRShiftAssignments
      WHERE dateFrom<=? AND dateTo>=? ORDER BY createdAt, id`, [dateTo, dateFrom]),
    connection.query(`SELECT employeeId, shiftId, scheduleType, notes,
      TIME_FORMAT(timeIn,'%H:%i') timeIn, TIME_FORMAT(timeOut,'%H:%i') timeOut,
      DATE_FORMAT(workDate,'%Y-%m-%d') workDate FROM DTRScheduleOverrides
      WHERE workDate BETWEEN ? AND ?`, [dateFrom, dateTo]),
  ]);
  return {
    shifts: new Map(shifts.map((shift) => [Number(shift.id), shift])),
    groups: new Map(groups.map((group) => [Number(group.id), group])),
    members,
    assignments,
    overrides,
  };
};

export const resolveSchedule = (context, employeeId, workDate) => {
  const id = Number(employeeId);
  const override = context.overrides.find((row) => Number(row.employeeId) === id && row.workDate === workDate);
  if (override) {
    const shift = context.shifts.get(Number(override.shiftId));
    const base = resolveSchedule({ ...context, overrides: [] }, employeeId, workDate);
    return {
      type: override.scheduleType,
      shift: shift ? { ...shift, timeIn: override.timeIn || shift.timeIn, timeOut: override.timeOut || shift.timeOut } : null,
      group: base?.group || null,
      source: "override",
      notes: override.notes || null,
      overrideTimeIn: override.timeIn || null,
      overrideTimeOut: override.timeOut || null,
    };
  }
  const weekday = new Date(`${workDate}T00:00:00`).getDay();
  const applies = (row) => workDate >= row.dateFrom && workDate <= row.dateTo && (Number(row.weekdaysMask) & (1 << weekday));
  const individual = context.assignments.filter((row) => Number(row.employeeId) === id && applies(row)).at(-1);
  if (individual) return { type: "WORK", shift: context.shifts.get(Number(individual.shiftId)), source: "employee" };
  const groupIds = context.members.filter((row) => Number(row.employeeId) === id && workDate >= row.effectiveFrom && (!row.effectiveUntil || workDate <= row.effectiveUntil)).map((row) => Number(row.groupId));
  const group = context.assignments.filter((row) => groupIds.includes(Number(row.groupId)) && applies(row)).at(-1);
  if (group) return {
    type: "WORK",
    shift: context.shifts.get(Number(group.shiftId)),
    group: context.groups?.get(Number(group.groupId)) || null,
    source: "group",
  };
  return null;
};

export const getActualPunchWindow = (entry) => {
  const start = timeToMinutes(entry.timeIn);
  let end = timeToMinutes(entry.timeOut);
  if (start === null && end === null) return null;
  if (end !== null && ((entry.dateOut && entry.dateOut > entry.date) || (start !== null && end < start))) end += 1440;
  return { start, end };
};

export const getActualWindow = (entry) => {
  const actual = getActualPunchWindow(entry);
  return actual && actual.start !== null && actual.end !== null ? actual : null;
};

// Use imported punches for approvals while respecting explicit manual edits.
export const getApprovalPunchWindow = (entry) => getActualPunchWindow({
  ...entry,
  timeIn: entry.editedIn ? entry.timeIn : entry.time || entry.timeIn,
  timeOut: entry.editedOut ? entry.timeOut : entry.origTimeOut || entry.timeOut,
});

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
  unscheduledPunchApproved = false,
  unscheduledInApproved = false,
  unscheduledOutApproved = false,
  unscheduledInTime = null,
  unscheduledOutTime = null,
}) => {
  if (!actual) return null;
  if (schedule?.type === "WORK" && schedule.shift) {
    const planned = getScheduledWindow(schedule.shift);
    if (!planned) return null;
    return {
      start: actual.start === null ? null : Math.max(actual.start, planned.start - Number(earlyApproved || 0)),
      end: actual.end === null ? null : Math.min(actual.end, planned.end + Number(lateApproved || 0)),
    };
  }
  if (unscheduledInApproved || unscheduledOutApproved) {
    return {
      start: unscheduledInApproved && Number.isFinite(unscheduledInTime)
        ? unscheduledInTime
        : unscheduledInApproved ? actual.start : null,
      end: unscheduledOutApproved && Number.isFinite(unscheduledOutTime)
        ? unscheduledOutTime
        : unscheduledOutApproved ? actual.end : null,
    };
  }
  if (unscheduledPunchApproved && (actual.start === null || actual.end === null)) {
    return { start: actual.start, end: actual.end };
  }
  if (Number(unscheduledApproved) > 0 && actual.start !== null && actual.end !== null) {
    return {
      start: actual.start,
      end: Math.min(actual.end, actual.start + Number(unscheduledApproved)),
    };
  }
  return null;
};

// Apply schedule boundaries only to punches that actually exist.
export const getAnalyzedScheduleTimes = (entry, schedule) => {
  if (schedule?.type !== "WORK" || !schedule.shift) return null;
  const window = getCreditedWindow({ actual: getActualPunchWindow(entry), schedule });
  if (!window) return null;
  const dateOut = window.end === null ? entry.dateOut : new Date(
    Date.parse(`${entry.date}T00:00:00Z`) + Math.floor(window.end / 1440) * 86400000
  ).toISOString().slice(0, 10);
  return { timeIn: minutesToTime(window.start), timeOut: minutesToTime(window.end), dateOut };
};
