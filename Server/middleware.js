import jwt from "jsonwebtoken";

export const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.json({ Status: false, Error: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(token, "jwt_secret_key");
    req.user = decoded;
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
