import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Add client search route
router.get("/clients/search", verifyUser, (req, res) => {
  const { query } = req.query;
  const sql =
    "SELECT DISTINCT clientName FROM client WHERE clientName LIKE ? ORDER BY clientName LIMIT 10";

  con.query(sql, [`%${query}%`], (err, result) => {
    if (err) {
      console.error("Error searching clients:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({
      Status: true,
      Result: result.map((client) => client.clientName),
    });
  });
});

export { router as ClientRouter };
