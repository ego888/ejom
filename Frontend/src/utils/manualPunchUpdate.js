export function manualPunchUpdate(entry, type, time, date) {
  const otherTime = type === "in"
    ? entry.creditedTimeOut || entry.timeOut
    : entry.creditedTimeIn || entry.timeIn;
  const otherDate = type === "in" ? entry.dateOut || entry.date : entry.date;
  const entered = `${date}T${time.slice(0, 5)}`;
  const other = otherTime && `${otherDate}T${otherTime.slice(0, 5)}`;
  const swap = other && (type === "in" ? entered > other : entered < other);
  if (swap) {
    return {
      endpoint: "update-time-in-out",
      payload: {
        id: entry.id,
        timeIn: type === "in" ? otherTime : time,
        timeOut: type === "in" ? time : otherTime,
        date: type === "in" ? otherDate : date,
        dateOut: type === "in" ? date : otherDate,
        editedIn: 1,
        editedOut: 1,
      },
    };
  }
  return {
    endpoint: type === "in" ? "update-time-in" : "update-time-out",
    payload: { id: entry.id, [type === "in" ? "timeIn" : "timeOut"]: time,
      [type === "in" ? "date" : "dateOut"]: date, processed: 1 },
  };
}
