import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get order statuses
router.get("/order-statuses", verifyUser, (req, res) => {
  const sql = `
      SELECT 
        statusId,
        step
      FROM orderStatus 
      ORDER BY step ASC`;

  con.query(sql, (err, result) => {
    if (err) {
      console.log("Database error fetching order statuses:", err);
      return res.json({
        Status: false,
        Error: "Query Error",
        Details: err.message,
      });
    }
    return res.json({ Status: true, Result: result });
  });
});

export { router as OrderStatusRouter };
