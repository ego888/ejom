export function canEditDtrTime(entry, type) {
  if (Number(entry.deleteRecord)) return false;
  const editedIn = Number(entry.editedIn) === 1;
  const editedOut = Number(entry.editedOut) === 1;
  // Manually added rows normally keep both fields editable. A swapped entry
  // has split flags, which identify the one field containing the entered time.
  if (/\bMANUAL ADD\b/.test(entry.remarks || "") && editedIn === editedOut) {
    return true;
  }
  return type === "in"
    ? !entry.timeIn || editedIn
    : !entry.timeOut || editedOut;
}
