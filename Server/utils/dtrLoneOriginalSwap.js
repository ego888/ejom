// Move only the existing source punch; never copy a manual value into originals.
export function swappedLoneOriginal(entry) {
  if (entry.timeIn && !entry.timeOut && entry.time && !entry.origTimeOut) {
    return { time: null, origTimeOut: entry.time };
  }
  if (!entry.timeIn && entry.timeOut && entry.origTimeOut &&
      (!entry.time || String(entry.time).slice(0, 5) === String(entry.origTimeOut).slice(0, 5))) {
    return { time: entry.origTimeOut, origTimeOut: null };
  }
  return null;
}
