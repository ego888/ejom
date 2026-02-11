export const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const LAST_ACTIVITY_KEY = "lastActivityAt";
const ACTIVITY_THROTTLE_MS = 30 * 1000;

export const touchSessionActivity = (force = false) => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const now = Date.now();
  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);

  if (force || !lastActivity || now - lastActivity >= ACTIVITY_THROTTLE_MS) {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  }
};

export const clearSessionAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("valid");
  localStorage.removeItem("userName");
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};
