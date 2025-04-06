import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Helper function to get report data
const getMaterialUsageData = async (dateFrom, dateTo, groupBy) => {
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

  const endDate = new Date(dateTo);
  endDate.setHours(23, 59, 59, 999);

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

  const [results] = await pool.query(query, [dateFrom, endDate]);
  return results;
};

// Material Usage Report
router.get("/material-usage", verifyUser, async (req, res) => {
  const { dateFrom, dateTo, groupBy } = req.query;

  try {
    const results = await getMaterialUsageData(dateFrom, dateTo, groupBy);
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

// Print Material Usage Report
router.get("/print_material_usage", verifyUser, async (req, res) => {
  const { dateFrom, dateTo, groupBy } = req.query;

  try {
    const results = await getMaterialUsageData(dateFrom, dateTo, groupBy);

    // Get report title based on groupBy
    let reportTitle;
    switch (groupBy) {
      case "material":
        reportTitle = "Material Usage Report - By Material";
        break;
      case "materialType":
        reportTitle = "Material Usage Report - By Material Type";
        break;
      case "machineType":
        reportTitle = "Material Usage Report - By Machine Type";
        break;
      default:
        reportTitle = "Material Usage Report";
    }

    // Format dates for display
    const formattedDateFrom = new Date(dateFrom).toLocaleDateString();
    const formattedDateTo = new Date(dateTo).toLocaleDateString();

    // Calculate totals
    const totals = results.reduce(
      (acc, curr) => ({
        totalQuantity: acc.totalQuantity + Number(curr.totalQuantity || 0),
        totalUsage: acc.totalUsage + Number(curr.totalUsage || 0),
        totalAmount: acc.totalAmount + Number(curr.totalAmount || 0),
      }),
      { totalQuantity: 0, totalUsage: 0, totalAmount: 0 }
    );

    res.json({
      Status: true,
      Result: {
        title: reportTitle,
        dateRange: `${formattedDateFrom} to ${formattedDateTo}`,
        data: results,
        totals: {
          totalQuantity: totals.totalQuantity,
          totalUsage: totals.totalUsage,
          totalAmount: totals.totalAmount,
          averagePerSqFt:
            totals.totalUsage > 0 ? totals.totalAmount / totals.totalUsage : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error in print material usage report:", error);
    res.json({
      Status: false,
      Error: "Failed to generate print report",
    });
  }
});

export const ReportProductionRouter = router;
