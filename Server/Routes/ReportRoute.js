import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get Sales Summary Report for Sales Rep, Client, and Month
router.get("/sales-summary", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    // ✅ Define valid group options
    const validGroupOptions = {
      sales: "e.name", // Group by sales rep
      client: "c.clientName", // Group by client
      month: "DATE_FORMAT(o.productionDate, '%Y-%m')", // Group by month
    };

    // ✅ Determine grouping column
    const groupColumn = validGroupOptions[groupBy] || null;

    // ✅ Base SQL Query
    let query = `
      SELECT 
        ${groupColumn ? `${groupColumn} AS category,` : ""}
        COUNT(DISTINCT o.orderId) AS orderCount,
        SUM(o.grandTotal) AS totalSales,
        SUM(o.amountPaid) AS amountPaid
      FROM orders o
      LEFT JOIN employee e ON o.preparedBy = e.id
      LEFT JOIN client c ON o.clientId = c.id
      WHERE o.productionDate BETWEEN ? AND ? AND o.status != 'Cancel'
    `;

    // ✅ Apply GROUP BY only if a valid group option is selected
    if (groupColumn) {
      query += ` GROUP BY ${groupColumn}`;
      query += ` ORDER BY ${groupColumn} ASC`; // Default sorting
    }

    // ✅ Execute SQL Query
    con.query(query, [dateFrom, dateTo], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      if (!result.length) {
        return res.json({
          Status: false,
          Error: "No sales data found for the selected period",
        });
      }

      return res.json({
        Status: true,
        Result: result,
      });
    });
  } catch (error) {
    console.error("Error in sales summary:", error.message);
    return res.json({
      Status: false,
      Error: "Failed to generate sales summary: " + error.message,
    });
  }
});

// Get Sales Summary Report by Material
router.get("/sales-material-summary", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    const query = `
      SELECT 
        od.material AS category,
        COUNT(DISTINCT o.orderId) AS orderCount,
        SUM(od.amount) AS totalAmount,
        SUM(o.amountPaid * (od.amount / o.grandTotal)) AS amountPaid
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      WHERE o.productionDate BETWEEN ? AND ? 
      AND o.status != 'Cancel'
      GROUP BY od.material
      ORDER BY od.material ASC
    `;

    con.query(query, [dateFrom, dateTo], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      return res.json({
        Status: true,
        Result: result,
      });
    });
  } catch (error) {
    console.error("Error in material sales summary:", error.message);
    return res.json({
      Status: false,
      Error: "Failed to generate material sales summary: " + error.message,
    });
  }
});

// Get Sales Summary Report by Machine
router.get("/sales-machine-summary", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    const query = `
      SELECT 
        m.machineType AS category,
        COUNT(DISTINCT o.orderId) AS orderCount,
        SUM(od.amount) AS totalAmount,
        SUM(o.amountPaid * (od.amount / NULLIF(o.grandTotal, 0))) AS amountPaid
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      JOIN material m ON od.material = m.Material  -- ✅ Fixed JOIN
      WHERE o.productionDate BETWEEN ? AND ? 
      AND o.status != 'Cancel'
      GROUP BY m.machineType
      ORDER BY m.machineType ASC
`;

    con.query(query, [dateFrom, dateTo], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      return res.json({
        Status: true,
        Result: result,
      });
    });
  } catch (error) {
    console.error("Error in machine sales summary:", error.message);
    return res.json({
      Status: false,
      Error: "Failed to generate machine sales summary: " + error.message,
    });
  }
});

// Get Sales Summary Report by Machine
router.get("/artist-incentive-summary", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    // First get the incentive rates from jomcontrol
    const ratesQuery = `
      SELECT VAT, major, minor, ArtistMaxPercent, ArtistMinAmount, HalfIncentiveSqFt 
      FROM jomcontrol 
      LIMIT 1
    `;

    // Then get the summary data with calculations included
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT o.orderId) AS orderCount,
        o.grandTotal as totalAmount,
        od.quantity,
        od.perSqFt,
        m.noIncentive
        SUM(o.amountPaid * (od.amount / NULLIF(o.grandTotal, 0))) AS amountPaid,
        od.artistIncentive AS category,
        SUM(od.major) AS major,
        SUM(od.minor) AS minor,
        SUM(od.major * j.major) AS majorAmount,
        SUM(od.minor * j.minor) AS minorAmount,
        SUM(od.major * j.major + od.minor * j.minor) AS totalIncentive
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      JOIN material m ON od.material = m.Material
      CROSS JOIN jomcontrol j
      WHERE o.productionDate BETWEEN ? AND ? 
      AND o.status != 'Cancel'
      GROUP BY od.artistIncentive
      ORDER BY od.artistIncentive ASC
    `;

    // Execute both queries
    con.query(ratesQuery, (err, ratesResult) => {
      if (err) {
        console.error("Database error (rates):", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      con.query(summaryQuery, [dateFrom, dateTo], (err, summaryResult) => {
        if (err) {
          console.error("Database error (summary):", err);
          return res.json({
            Status: false,
            Error: "Database error: " + err.message,
          });
        }

        return res.json({
          Status: true,
          Result: {
            summary: summaryResult,
            rates: ratesResult[0] || {
              major: 0,
              minor: 0,
              maxArtistIncentive: 0,
            },
          },
        });
      });
    });
  } catch (error) {
    console.error("Error in artist incentive summary:", error.message);
    return res.json({
      Status: false,
      Error: "Failed to generate artist incentive summary: " + error.message,
    });
  }
});

export { router as ReportRouter };
