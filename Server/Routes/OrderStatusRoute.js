import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get order statuses
router.get("/order-statuses", verifyUser, async (req, res) => {
  try {
    const sql = `
        SELECT 
          statusId,
          step
        FROM orderStatus 
        ORDER BY step ASC`;

    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Database error fetching order statuses:", err);
    return res.json({
      Status: false,
      Error: "Query Error",
      Details: err.message,
    });
  }
});

export { router as OrderStatusRouter };
