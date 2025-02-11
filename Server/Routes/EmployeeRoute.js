import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();

// Get sales employees (active and sales only)
router.get("/sales_employees", (req, res) => {
  const sql =
    "SELECT id, name FROM employee WHERE active = true AND sales = true ORDER BY name";
  con.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

router.get("/detail/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee where id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false });
    return res.json(result);
  });
});

export { router as EmployeeRouter };
