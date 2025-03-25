import express from "express";
import pool from "../utils/db.js";

const router = express.Router();

// Get sales employees (where sales = true)
router.get("/sales_employees", async (req, res) => {
  try {
    const sql =
      "SELECT id, name FROM employee WHERE sales = true AND active = true ORDER BY name";
    const result = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get artists (where artist = true)
router.get("/artists", async (req, res) => {
  try {
    const sql =
      "SELECT id, name FROM employee WHERE artist = true AND active = true ORDER BY name";
    const result = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

export { router as UsersRouter };
