import express from "express";
import cors from "cors";
import { AdminRouter } from "./Routes/AdminRoute.js";
import { EmployeeRouter } from "./Routes/EmployeeRoute.js";
import { QuoteRouter } from "./Routes/QuoteRoute.js";
import { OrderRouter } from "./Routes/OrderRoute.js";
import { verifyUser } from "./middleware.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173"],
    origin: ["http://192.168.86.8:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/auth", AdminRouter);
app.use("/auth", QuoteRouter);
app.use("/auth", OrderRouter);
app.use("/employee", EmployeeRouter);
app.use(express.static("Public"));

app.get("/verify", verifyUser, (req, res) => {
  return res.json({ Status: true, role: req.user.role, id: req.user.id });
});

app.listen(3000, () => {
  console.log(
    "🚀 Server restarted on port 3000 at",
    new Date().toLocaleTimeString()
  );
});
