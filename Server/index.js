import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AdminRouter } from "./Routes/AdminRoute.js";
import { EmployeeRouter } from "./Routes/EmployeeRoute.js";
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
import { ReportRouter } from "./Routes/ReportRoute.js";
import { DTRRouter } from "./Routes/DTRRoute.js";
import InvoiceRoute from "./Routes/InvoiceRoute.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse CORS origins from environment variable
if (!process.env.CORS_ORIGIN) {
  console.error("CORS_ORIGIN environment variable is required");
  process.exit(1);
}

const corsOrigins = process.env.CORS_ORIGIN.split(",");

const app = express();
app.use(
  cors({
    origin: corsOrigins,
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
app.use("/auth/dtr", DTRRouter);
app.use("/auth", InvoiceRoute);
app.use("/employee", EmployeeRouter);
app.use("/public", express.static("public"));

app.use(express.static("Public"));

app.get("/verify", verifyUser, (req, res) => {
  return res.json({ Status: true, role: req.user.role, id: req.user.id });
});

app.get("/test", (req, res) => {
  console.log("Test route hit");
  res.json({ message: "Server is running" });
});

// Improved server startup with error handling
const startServer = (port) => {
  return new Promise((resolve, reject) => {
    const server = app
      .listen(port, "0.0.0.0")
      .on("listening", () => {
        console.log(
          `🚀 Server started on port ${port} at ${new Date().toLocaleTimeString()}`
        );
        resolve(server);
      })
      .on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.warn(`⚠️ Port ${port} is already in use`);
          reject(err);
        } else {
          console.error("Server error:", err);
          reject(err);
        }
      });
  });
};

// Start the server on port 3000, fallback to alternatives if needed
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
const MAX_PORT_ATTEMPTS = 5;

// async function attemptToStartServer() {
//   for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
//     const portToTry = PORT + i;
//     try {
//       // Start server
//       await startServer(portToTry);
//       return; // Server successfully started
//     } catch (err) {
//       if (err.code === "EADDRINUSE" && i < MAX_PORT_ATTEMPTS - 1) {
//         // Try next port
//         continue;
//       }

//       console.error("Failed to start server after multiple attempts:", err);
//       process.exit(1);
//     }
//   }
// }

// attemptToStartServer();
