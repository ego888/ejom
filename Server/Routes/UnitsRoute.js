import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get units
router.get("/units", (req, res) => {
  const sql = "SELECT * FROM units ORDER BY unit";
  con.query(sql, (err, result) => {
    if (err) {
      console.log("Error fetching units:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

export { router as UnitsRouter };
