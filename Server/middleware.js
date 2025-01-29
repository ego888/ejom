import jwt from "jsonwebtoken";

export const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.json({ Status: false, Error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, "jwt_secret_key");
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Token Error:", error);
    return res.json({ Status: false, Error: "Invalid token" });
  }
};
