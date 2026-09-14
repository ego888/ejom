// Keep excluded entries visible without treating incomplete punches as worked time.
export const comparisonSkipReason = (entry) => {
  if (!entry.timeIn && !entry.timeOut) return "No analyzed punches — run Analyze Time";
  const validTime = (value) => /^([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value));
  if ((entry.timeIn && !validTime(entry.timeIn)) || (entry.timeOut && !validTime(entry.timeOut))) return "Invalid time in or time out";
  if (!entry.employeeId) return "DTR ID is not mapped to an employee";
  return null;
};
