import express from "express";
import pool from "../utils/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

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

router.put("/employee/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let sql, values;

    // Check if password is provided and not empty
    const {
      name,
      fullName,
      email,
      password,
      salary,
      address,
      cellNumber,
      category_id,
      active,
      sales,
      accounting,
      artist,
      production,
      operator,
      admin,
    } = req.body;

    if (password && password.trim() !== "") {
      const hash = await bcrypt.hash(password, 10);

      sql = `UPDATE employee 
             SET name = ?, fullName = ?, email = ?, password = ?, address = ?, cellNumber = ?, salary = ?, 
                 category_id = ?, active = ?, sales = ?, accounting = ?, 
                 artist = ?, production = ?, operator = ?, admin = ?
             WHERE id = ?`;

      values = [
        name,
        fullName || "",
        email,
        hash,
        address || "",
        cellNumber || "",
        salary,
        category_id,
        active,
        sales,
        accounting,
        artist,
        production,
        operator,
        admin,
        id,
      ];
    } else {
      sql = `UPDATE employee 
             SET name = ?, fullName = ?, email = ?, address = ?, cellNumber = ?, salary = ?, 
                 category_id = ?, active = ?, sales = ?, accounting = ?, 
                 artist = ?, production = ?, operator = ?, admin = ?
             WHERE id = ?`;

      values = [
        name,
        fullName || "",
        email,
        address || "",
        cellNumber || "",
        salary,
        category_id,
        active,
        sales,
        accounting,
        artist,
        production,
        operator,
        admin,
        id,
      ];
    }

    const [result] = await pool.query(sql, values);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error("Error updating employee:", err);
    return res.json({
      Status: false,
      Error:
        err.code === "ER_DUP_ENTRY"
          ? "Email already exists"
          : "Failed to update employee",
    });
  }
});

export { router as UsersRouter };
