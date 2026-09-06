// Count only eligible dates on or after the employee's first non-deleted DTR record.
export const calculateAbsenceWorkingDays = (year, holidaySet, monthEndDays = {}, firstAttendanceDate = null) => {
  const workingDays = Array(12).fill(0);
  for (let month = 0; month < 12; month++) {
    const date = new Date(Date.UTC(year, month, 1));
    const limitDay = monthEndDays[month + 1];
    while (date.getUTCMonth() === month) {
      if (typeof limitDay === "number" && date.getUTCDate() > limitDay) break;
      const dateKey = date.toISOString().slice(0, 10);
      if ((!firstAttendanceDate || dateKey >= firstAttendanceDate)
        && date.getUTCDay() !== 0 && !holidaySet.has(dateKey)) {
        workingDays[month] += 1;
      }
      date.setUTCDate(date.getUTCDate() + 1);
    }
  }
  return workingDays;
};
