import express from "express";
import con from "../utils/db.js";

const router = express.Router();

// Get sales employees (where sales = true)
router.get("/sales_employees", (req, res) => {
  const sql =
    "SELECT id, name FROM employee WHERE sales = true AND active = true ORDER BY name";
  con.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Get artists (where artist = true)
router.get("/artists", (req, res) => {
  const sql =
    "SELECT id, name FROM employee WHERE artist = true AND active = true ORDER BY name";
  con.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

export { router as UsersRouter };
