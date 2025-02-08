import express from "express";
import cors from "cors";
import { AdminRouter } from "./Routes/AdminRoute.js";
import { EmployeeRouter } from "./Routes/EmployeeRoute.js";
import { QuoteRouter } from "./Routes/QuoteRoute.js";
import { OrderRouter } from "./Routes/OrderRoute.js";
import { ClientRouter } from "./Routes/ClientRoute.js";
import { UnitsRouter } from "./Routes/UnitsRoute.js";
import { UsersRouter } from "./Routes/UsersRoute.js";
import { MaterialRouter } from "./Routes/Material.Route.js";
import { OrderStatusRouter } from "./Routes/OrderStatusRoute.js";
import { JomControlRouter } from "./Routes/JomControlRoute.js";
import { verifyUser } from "./middleware.js";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/auth", AdminRouter);
app.use("/auth", QuoteRouter);
app.use("/auth", OrderRouter);
app.use("/auth", ClientRouter);
app.use("/auth", UnitsRouter);
app.use("/auth", UsersRouter);
app.use("/auth", MaterialRouter);
app.use("/auth", OrderStatusRouter);
app.use("/auth", JomControlRouter);
app.use("/employee", EmployeeRouter);
app.use("/public", express.static("public"));

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
