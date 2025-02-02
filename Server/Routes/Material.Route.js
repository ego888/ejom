import express from "express";
import con from "../utils/db.js";

const router = express.Router();

// Get materials
router.get("/materials", (req, res) => {
  const sql = "SELECT * FROM material ORDER BY Material";
  con.query(sql, (err, result) => {
    if (err) {
      console.log("Error fetching materials:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Material Routes
router.get("/material", (req, res) => {
  const sql = "SELECT * FROM material";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/material/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM material WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0] });
  });
});

router.post("/material/add", (req, res) => {
  const sql = `INSERT INTO material 
          (Material, Description, SqFtPerHour, MinimumPrice, FixWidth, FixHeight, Cost, NoIncentive) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    req.body.material,
    req.body.description,
    req.body.sqFtPerHour,
    req.body.minimumPrice,
    req.body.fixWidth,
    req.body.fixHeight,
    req.body.cost,
    req.body.noIncentive ? 1 : 0,
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true });
  });
});

router.put("/material/edit/:id", (req, res) => {
  const id = req.params.id;
  const sql = `UPDATE material 
          SET Material = ?, 
              Description = ?, 
              SqFtPerHour = ?, 
              MinimumPrice = ?, 
              FixWidth = ?, 
              FixHeight = ?, 
              Cost = ?, 
              NoIncentive = ?
          WHERE id = ?`;

  const values = [
    req.body.material,
    req.body.description,
    req.body.sqFtPerHour,
    req.body.minimumPrice,
    req.body.fixWidth,
    req.body.fixHeight,
    req.body.cost,
    req.body.noIncentive ? 1 : 0,
    id,
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true });
  });
});

router.delete("/material/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM material WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true });
  });
});

export { router as MaterialRouter };
