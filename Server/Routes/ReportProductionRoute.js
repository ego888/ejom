import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Material Usage Report
router.get("/material-usage", verifyUser, async (req, res) => {
  const { dateFrom, dateTo, groupBy } = req.query;

  console.log("Received parameters:", { dateFrom, dateTo, groupBy });

  let groupByClause, selectClause;
  switch (groupBy) {
    case "material":
      groupByClause = "m.Material";
      selectClause = "m.Material as materialName";
      break;
    case "materialType":
      groupByClause = "m.materialType";
      selectClause = "m.materialType as materialType";
      break;
    case "machineType":
      groupByClause = "m.machineType";
      selectClause = "m.machineType as machineType";
      break;
    default:
      groupByClause = "m.Material";
      selectClause = "m.Material as materialName";
  }

  try {
    const query = `
      SELECT 
        ${selectClause},
        SUM(od.quantity) as totalQuantity,
        SUM(od.materialUsage) as totalUsage,
        SUM(od.amount) as totalAmount
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      JOIN material m ON od.material = m.Material
      WHERE o.orderDate BETWEEN ? AND ?
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause}
    `;

    console.log("Executing query:", query);
    console.log("With params:", [dateFrom, dateTo]);

    const [results] = await pool.query(query, [dateFrom, dateTo]);
    console.log("Query results:", results);

    // Check if we have any results
    if (!results || results.length === 0) {
      console.log("No results found for the given date range");
    }

    res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in material usage report:", error);
    console.error("Error details:", {
      message: error.message,
      sql: error.sql,
      code: error.code,
    });
    res.json({
      Status: false,
      Error: "Failed to fetch material usage data",
    });
  }
});

export const ReportProductionRouter = router;
