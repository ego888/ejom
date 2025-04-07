import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get total amount per payment type for received payments
router.get("/total-per-payment-type", verifyUser, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT 
        p.payType,
        COUNT(p.payId) as count,
        SUM(p.amount) as totalAmount
       FROM payments p
       WHERE p.received = 1
       GROUP BY p.payType
       ORDER BY p.payType ASC`
    );

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error fetching payment type totals:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to fetch payment type totals: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

export { router as TotalPerPaymentTypeRouter };
