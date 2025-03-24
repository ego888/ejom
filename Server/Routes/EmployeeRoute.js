import express from "express";
import pool from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();

// Get sales employees (active and sales only)
router.get("/sales_employees", async (req, res) => {
  try {
    const sql =
      "SELECT id, name FROM employee WHERE active = true AND sales = true ORDER BY name";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/detail/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = "SELECT * FROM employee where id = ?";
    const [result] = await pool.query(sql, [id]);
    return res.json(result);
  } catch (err) {
    console.log(err);
    return res.json({ Status: false });
  }
});

export { router as EmployeeRouter };
