export function canEditDtrTime(entry, type) {
  if (Number(entry.deleteRecord)) return false;
  if (/\bMANUAL ADD\b/.test(entry.remarks || "")) return true;
  return type === "in"
    ? !entry.timeIn || Number(entry.editedIn) === 1
    : !entry.timeOut || Number(entry.editedOut) === 1;
}
