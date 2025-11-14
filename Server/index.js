import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AdminRouter } from "./Routes/AdminRoute.js";
import { QuoteRouter } from "./Routes/QuoteRoute.js";
import { OrderRouter } from "./Routes/OrderRoute.js";
import { ClientRouter } from "./Routes/ClientRoute.js";
import { UnitsRouter } from "./Routes/UnitsRoute.js";
import { UsersRouter } from "./Routes/UsersRoute.js";
import { MaterialRouter } from "./Routes/MaterialRoute.js";
import { OrderStatusRouter } from "./Routes/OrderStatusRoute.js";
import { JomControlRouter } from "./Routes/JomControlRoute.js";
import { PaymentRouter } from "./Routes/PaymentRoute.js";
import { verifyUser } from "./middleware.js";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { ReportRouter } from "./Routes/ReportRoute.js";
import { ReportProductionRouter } from "./Routes/ReportProductionRoute.js";
import { DTRRouter } from "./Routes/DTRRoute.js";
import InvoiceRoute from "./Routes/InvoiceRoute.js";

// Load environment variables
dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  console.warn(`Public directory not found at ${publicDir}`);
}

// Parse CORS origins from environment variable
if (!process.env.CORS_ORIGIN) {
  console.error("CORS_ORIGIN environment variable is required");
  process.exit(1);
}

const corsOrigins = process.env.CORS_ORIGIN.split(",");

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like curl, Postman)
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/auth", AdminRouter);
app.use("/auth", QuoteRouter);
app.use("/auth", OrderRouter);
app.use("/auth", ClientRouter);
app.use("/auth", UnitsRouter);
app.use("/auth", UsersRouter);
app.use("/auth", MaterialRouter);
app.use("/auth", OrderStatusRouter);
app.use("/auth", JomControlRouter);
app.use("/auth", PaymentRouter);
app.use("/auth", ReportRouter);
app.use("/auth", ReportProductionRouter);
app.use("/auth/dtr", DTRRouter);
app.use("/auth", InvoiceRoute);
app.use("/public", express.static("public"));

app.use(express.static("Public"));

app.get("/verify", verifyUser, (req, res) => {
  return res.json({ Status: true, role: req.user.role, id: req.user.id });
});

app.get("/test", (req, res) => {
  console.log("Test route hit");
  res.json({ message: "Server is running" });
});

// Start the server on port 3000, fallback to alternatives if needed
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
const MAX_PORT_ATTEMPTS = 5;
