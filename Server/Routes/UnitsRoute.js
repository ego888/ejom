import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get units
router.get("/units", async (req, res) => {
  try {
    const sql = "SELECT * FROM units ORDER BY unit";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Error fetching units:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

export { router as UnitsRouter };
