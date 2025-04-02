import express from "express";
import pool from "../utils/db.js";

const router = express.Router();

// Get materials
router.get("/materials", async (req, res) => {
  try {
    const sql = "SELECT * FROM material ORDER BY Material";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Error fetching materials:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Material Routes
router.get("/material", async (req, res) => {
  try {
    const sql = "SELECT * FROM material";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/material/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = "SELECT * FROM material WHERE id = ?";
    const [result] = await pool.query(sql, [id]);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.post("/material/add", async (req, res) => {
  try {
    const sql = `
      INSERT INTO material 
      (material, description, sqFtPerHour, minimumPrice, fixWidth, fixHeight, cost, unitCost, materialType, machineType, noIncentive) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      req.body.Material,
      req.body.Description,
      req.body.SqFtPerHour,
      req.body.MinimumPrice,
      req.body.FixWidth,
      req.body.FixHeight,
      req.body.Cost,
      req.body.UnitCost,
      req.body.MaterialType,
      req.body.MachineType,
      req.body.NoIncentive,
    ];

    const [result] = await pool.query(sql, values);
    return res.json({ Status: true });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.put("/material/edit/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = `
      UPDATE material 
      SET 
        Material = ?,
        Description = ?,
        SqFtPerHour = ?,
        MinimumPrice = ?,
        FixWidth = ?,
        FixHeight = ?,
        Cost = ?,
        UnitCost = ?,
        MaterialType = ?,
        MachineType = ?,
        NoIncentive = ?
      WHERE id = ?
    `;

    const values = [
      req.body.Material,
      req.body.Description,
      req.body.SqFtPerHour || 0,
      req.body.MinimumPrice || 0,
      req.body.FixWidth || 0,
      req.body.FixHeight || 0,
      req.body.Cost || 0,
      req.body.UnitCost ? 1 : 0,
      req.body.MaterialType || "",
      req.body.MachineType || "",
      req.body.noIncentive ? 1 : 0,
      id,
    ];

    const [result] = await pool.query(sql, values);
    return res.json({ Status: true });
  } catch (err) {
    console.log("Error updating material:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.delete("/material/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = "DELETE FROM material WHERE id = ?";
    const [result] = await pool.query(sql, [id]);
    return res.json({ Status: true });
  } catch (err) {
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get distinct material types
router.get("/material-types", async (req, res) => {
  try {
    const sql =
      "SELECT DISTINCT MaterialType FROM material WHERE MaterialType != '' ORDER BY MaterialType";
    const [result] = await pool.query(sql);
    return res.json({
      Status: true,
      Result: result.map((item) => item.MaterialType),
    });
  } catch (err) {
    console.log("Error fetching material types:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get distinct machine types
router.get("/machine-types", async (req, res) => {
  try {
    const sql =
      "SELECT DISTINCT MachineType FROM material WHERE MachineType != '' ORDER BY MachineType";
    const [result] = await pool.query(sql);
    return res.json({
      Status: true,
      Result: result.map((item) => item.MachineType),
    });
  } catch (err) {
    console.log("Error fetching machine types:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

export { router as MaterialRouter };
