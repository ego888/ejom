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

router.put("/jomcontrol/lastDR/:id", (req, res) => {
  const sql = "UPDATE jomControl SET lastDrNumber = ? WHERE id = 1";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error("Error fetching company control:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
});

export { router as JomControlRouter };
