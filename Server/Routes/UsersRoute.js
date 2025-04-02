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

router.put("/employee/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let sql, values;

    // Check if password is provided and not empty
    if (req.body.password && req.body.password.trim() !== "") {
      const hash = await bcrypt.hash(req.body.password, 10);

      sql = `UPDATE employee 
             SET name = ?, email = ?, password = ?, salary = ?, 
                 category_id = ?, active = ?, sales = ?, accounting = ?, 
                 artist = ?, production = ?, operator = ?, admin = ?
             WHERE id = ?`;

      values = [
        req.body.name,
        req.body.email,
        hash,
        req.body.salary,
        req.body.category_id,
        req.body.active,
        req.body.sales,
        req.body.accounting,
        req.body.artist,
        req.body.production,
        req.body.operator,
        req.body.admin,
        id,
      ];
    } else {
      sql = `UPDATE employee 
             SET name = ?, email = ?, salary = ?, 
                 category_id = ?, active = ?, sales = ?, accounting = ?, 
                 artist = ?, production = ?, operator = ?, admin = ?
             WHERE id = ?`;

      values = [
        req.body.name,
        req.body.email,
        req.body.salary,
        req.body.category_id,
        req.body.active,
        req.body.sales,
        req.body.accounting,
        req.body.artist,
        req.body.production,
        req.body.operator,
        req.body.admin,
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
