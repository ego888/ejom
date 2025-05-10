import jwt from "jsonwebtoken";

export const verifyUser = (req, res, next) => {
  console.log("Verifying user token");
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("No token provided");
    return res.json({ Status: false, Error: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(token, "jwt_secret_key");
    console.log("Token decoded successfully:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
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
