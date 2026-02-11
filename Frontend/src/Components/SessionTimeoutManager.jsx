import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  SESSION_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  touchSessionActivity,
  clearSessionAuth,
} from "../utils/sessionTimeout";

const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

const SessionTimeoutManager = () => {
  const navigate = useNavigate();
  const lastEventHandledAt = useRef(0);

  useEffect(() => {
    if (localStorage.getItem("token") && !localStorage.getItem(LAST_ACTIVITY_KEY)) {
      touchSessionActivity(true);
    }

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastEventHandledAt.current < 1000) return;
      lastEventHandledAt.current = now;
      touchSessionActivity();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        touchSessionActivity();
      }
    };

    const handleStorageSync = (event) => {
      if (event.key === "token" && !event.newValue && window.location.pathname !== "/") {
        navigate("/", { replace: true });
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleActivity);
    window.addEventListener("storage", handleStorageSync);

    const timerId = window.setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);

      if (!lastActivity) {
        touchSessionActivity(true);
        return;
      }

      if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
        clearSessionAuth();
        if (window.location.pathname !== "/") {
          navigate("/", { replace: true });
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleActivity);
      window.removeEventListener("storage", handleStorageSync);
      window.clearInterval(timerId);
    };
  }, [navigate]);

  return null;
};

export default SessionTimeoutManager;
