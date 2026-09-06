import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET_KEY || "jwt_secret_key";
const SESSION_TTL = "24h";

const getTokenPayload = (decodedToken) => {
  const { iat, exp, ...payload } = decodedToken;
  return payload;
};

export const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.json({ Status: false, Error: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const tokenPayload = getTokenPayload(decoded);
    req.user = tokenPayload;

    const refreshedToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: SESSION_TTL,
    });
    res.setHeader("x-refreshed-token", refreshedToken);

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        Status: false,
        Error: "jwt expired",
        message: "Your session has expired. Please log in again.",
      });
    }
    return res.status(401).json({
      Status: false,
      Error: "Invalid token",
      message: "Authentication failed",
    });
  }
};

// New middleware for role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        Status: false,
        Error: "Not authenticated",
        message: "You must be logged in to access this resource",
      });
    }

    // Check if user has sales permission (either admin or sales role)
    const hasPermission =
      (roles.includes("admin") && req.user.categoryId === 1) || // Admin permission
      (roles.includes("sales") && req.user.sales === 1) || // Sales permission
      (roles.includes("accounting") && req.user.accounting === 1) || // Accounting permission
      (roles.includes("artist") && req.user.artist === 1) || // Artist permission
      (roles.includes("production") && req.user.production === 1) || // Production permission
      (roles.includes("operator") && req.user.operator === 1); // Operator permission

    if (!hasPermission) {
      return res.status(403).json({
        Status: false,
        Error: "Not authorized",
        message: "You don't have permission to perform this action",
      });
    }

    next();
  };
};

const getDtrPermissionForPath = (path) => {
  if (path.startsWith("/schedules/calendar")) return "dtr.calendar";
  if (path.startsWith("/schedules/assignment")) return "dtr.assignments";
  if (path.startsWith("/schedules/overrides")) return "dtr.overrides";
  if (path.startsWith("/schedules/groups") || path.startsWith("/schedules/members")) return "dtr.groups";
  if (path.startsWith("/schedules/employees")) return "dtr.scheduling";
  if (path.startsWith("/shifts")) return "dtr.shifts";
  if (path.startsWith("/holidays") || path.startsWith("/add-holiday")) return "dtr.holidays";
  if (path.startsWith("/monthly")) return "dtr.monthly";
  if (path.startsWith("/absences")) return "dtr.absences";
  if (path.startsWith("/upload")) return "dtr.import";
  return "dtr.batches";
};

export const authorizeDtrRequest = (req, res, next) => {
  if (req.user?.categoryId === 1) return next();
  const permissions = Array.isArray(req.user?.dtrPermissions)
    ? req.user.dtrPermissions
    : [];
  const required = getDtrPermissionForPath(req.path);
  const allowed = required === "dtr.scheduling"
    ? ["dtr.calendar", "dtr.assignments", "dtr.groups", "dtr.overrides"].some((key) => permissions.includes(key))
    : permissions.includes(required);
  if (allowed) return next();
  return res.status(403).json({
    Status: false,
    Error: "Not authorized",
    message: "You do not have access to this DTR feature",
  });
};

// Helper to log important user actions
export const logUserAction = (action) => {
  return (req, res, next) => {
    if (req.user) {
      console.log(
        `User ${req.user.name} (ID: ${req.user.id}) performed: ${action}`
      );
    }
    next();
  };
};
