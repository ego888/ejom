import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Material Usage Report
router.get("/material-usage", verifyUser, async (req, res) => {
  const { dateFrom, dateTo, groupBy } = req.query;

  let groupByClause, selectClause;
  switch (groupBy) {
    case "material":
      groupByClause = "m.id, m.Material";
      selectClause = "m.Material";
      break;
    case "materialType":
      groupByClause = "m.materialType";
      selectClause = "m.materialType";
      break;
    case "machineType":
      groupByClause = "m.machineType";
      selectClause = "m.machineType";
      break;
    default:
      groupByClause = "m.id, m.materialName";
      selectClause = "m.materialName";
  }

  try {
    const query = `
      SELECT 
        ${selectClause},
        m.material AS materialName,
        SUM(od.quantity) AS totalQuantity,
        SUM(od.materialUsage) AS totalUsage,
        SUM(od.amount) AS totalAmount
        FROM orders o
        JOIN order_details od ON o.orderId = od.orderId
        JOIN material m ON od.material = m.material
        WHERE o.orderDate BETWEEN ? AND ?
        GROUP BY ${groupByClause}
        ORDER BY ${
          groupByClause === "m.id, m.materialName"
            ? "m.materialName"
            : selectClause
        }`;

    const [results] = await pool.query(query, [dateFrom, dateTo]);

    res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in material usage report:", error);
    res.json({
      Status: false,
      Error: "Failed to fetch material usage data",
    });
  }
});

export const ReportProductionRouter = router;
