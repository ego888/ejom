import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get company control info
router.get("/jomcontrol", (req, res) => {
  const sql = "SELECT * FROM jomControl LIMIT 1";
  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching company control:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
});

router.get("/jomcontrol/lastDR", (req, res) => {
  const sql = "SELECT lastDrNumber FROM jomControl LIMIT 1";
  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching company control:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
});

// get VAT%
router.get("/jomcontrol/VAT", (req, res) => {
  const sql = "SELECT vatPercent FROM jomControl LIMIT 1";
  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching company control:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
});

// Get artist incentive settings
router.get("/jomcontrol/artistIncentive", verifyUser, (req, res) => {
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

  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching artist incentive settings:", err);
      return res.json({
        Status: false,
        Error: "Failed to fetch artist incentive settings: " + err.message,
      });
    }

    return res.json({
      Status: true,
      Result: result[0],
    });
  });
});

// get sales incentive, override incentive, max sales incentive
router.get("/jomcontrol/salesIncentive", (req, res) => {
  const sql =
    "SELECT salesIncentive, overrideIncentive, HalfIncentiveSqFt, vatPercent FROM jomControl LIMIT 1";
  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching company control:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
});

export { router as JomControlRouter };
