import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get company control info
router.get("/jomcontrol", async (req, res) => {
  try {
    const sql = "SELECT * FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/jomcontrol/lastDR", async (req, res) => {
  try {
    const sql = "SELECT lastDrNumber FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// get VAT%
router.get("/jomcontrol/VAT", async (req, res) => {
  try {
    const sql = "SELECT vatPercent FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get artist incentive settings
router.get("/jomcontrol/artistIncentive", verifyUser, async (req, res) => {
  try {
    const sql = `
      SELECT 
        vatPercent,
        major,
        minor,
        ArtistMaxPercent,
        ArtistMinAmount,
        HalfIncentiveSqFt
      FROM jomcontrol 
      LIMIT 1
    `;

    const [result] = await pool.query(sql);
    return res.json({
      Status: true,
      Result: result[0],
    });
  } catch (err) {
    console.error("Error fetching artist incentive settings:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch artist incentive settings: " + err.message,
    });
  }
});

// get sales incentive, override incentive, max sales incentive
router.get("/jomcontrol/salesIncentive", async (req, res) => {
  try {
    const sql =
      "SELECT salesIncentive, overrideIncentive, HalfIncentiveSqFt, vatPercent FROM jomControl LIMIT 1";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching company control:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

export { router as JomControlRouter };
