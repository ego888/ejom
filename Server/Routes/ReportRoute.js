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

// Detailed artist incentive route
router.get("/artist-incentive", verifyUser, (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    // Simplified query to get raw data
    const sql = `
      SELECT 
        o.orderId,
        o.productionDate,
        c.clientName AS clientName,
        o.grandTotal,
        od.id,
        od.artistIncentive,
        od.quantity,
        od.perSqFt,
        od.major,
        od.minor,
        m.noIncentive,
        m.Material as materialName
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      JOIN material m ON od.material = m.Material
      JOIN client c ON o.clientId = c.id
      WHERE o.productionDate BETWEEN ? AND ?
      AND TRIM(o.status) IN ('Prod', 'Finish', 'Delivered', 'Billed', 'Closed')
      ORDER BY o.orderId
    `;

    con.query(sql, [dateFrom, dateTo], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      return res.json({
        Status: true,
        Result: results,
      });
    });
  } catch (error) {
    console.error("Error in artist incentive details:", error);
    return res.json({
      Status: false,
      Error: "Failed to generate artist incentive details: " + error.message,
    });
  }
});

// Detailed artist incentive route
router.get("/sales-incentive", verifyUser, (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    // Simplified query to get raw data
    const sql = `
      SELECT 
        o.orderId,
        o.productionDate,
        c.clientName AS clientName,
        o.percentDisc,
        o.grandTotal,
        e.name AS preparedBy,
        od.id,
        od.salesIncentive,
        od.overideIncentive,
        od.perSqFt,
        od.amount,
        m.noIncentive,
        m.Material as materialName
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      JOIN material m ON od.material = m.Material
      JOIN client c ON o.clientId = c.id
      JOIN employee e ON o.preparedBy = e.id
      WHERE o.productionDate BETWEEN ? AND ?
      AND TRIM(o.status) IN ('Prod', 'Finish', 'Delivered', 'Billed', 'Closed')
      ORDER BY o.orderId
    `;

    con.query(sql, [dateFrom, dateTo], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      return res.json({
        Status: true,
        Result: results,
      });
    });
  } catch (error) {
    console.error("Error in artist incentive details:", error);
    return res.json({
      Status: false,
      Error: "Failed to generate artist incentive details: " + error.message,
    });
  }
});

// Statement of Account Report
router.get("/statement-of-account", verifyUser, (req, res) => {
  try {
    const sql = `
      SELECT 
        c.id as clientId,
        c.clientName,
        SUM(CASE 
          WHEN o.status IN ('Prod', 'Finished') 
          THEN o.grandTotal - o.amountPaid 
          ELSE 0 
        END) as production,
        SUM(CASE 
          WHEN o.status IN ('Delivered', 'Billed') 
          AND DATEDIFF(CURRENT_DATE, o.productionDate) <= 30 
          THEN o.grandTotal - o.amountPaid 
          ELSE 0 
        END) as days_0_30,
        SUM(CASE 
          WHEN o.status IN ('Delivered', 'Billed') 
          AND DATEDIFF(CURRENT_DATE, o.productionDate) > 30 
          AND DATEDIFF(CURRENT_DATE, o.productionDate) <= 60 
          THEN o.grandTotal - o.amountPaid 
          ELSE 0 
        END) as days_31_60,
        SUM(CASE 
          WHEN o.status IN ('Delivered', 'Billed') 
          AND DATEDIFF(CURRENT_DATE, o.productionDate) > 60 
          AND DATEDIFF(CURRENT_DATE, o.productionDate) <= 90 
          THEN o.grandTotal - o.amountPaid 
          ELSE 0 
        END) as days_61_90,
        SUM(CASE 
          WHEN o.status IN ('Delivered', 'Billed') 
          AND DATEDIFF(CURRENT_DATE, o.productionDate) > 90 
          THEN o.grandTotal - o.amountPaid 
          ELSE 0 
        END) as days_over_90,
        SUM(CASE 
          WHEN o.status IN ('Delivered', 'Billed') 
          THEN o.grandTotal - o.amountPaid 
          ELSE 0 
        END) as total_ar
      FROM client c
      LEFT JOIN orders o ON c.id = o.clientId 
        AND o.status != 'Cancel'
        AND (o.grandTotal - o.amountPaid) > 0
      GROUP BY c.id, c.clientName
      HAVING production > 0 OR total_ar > 0
      ORDER BY c.clientName
    `;

    con.query(sql, (err, results) => {
      console.log("SOA:", results);
      if (err) {
        console.error("Database error:", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      return res.json({
        Status: true,
        Result: results,
      });
    });
  } catch (error) {
    console.error("Error in statement of account:", error);
    return res.json({
      Status: false,
      Error: "Failed to generate statement of account: " + error.message,
    });
  }
});

// SOA Details
router.get("/soa-details", verifyUser, (req, res) => {
  try {
    const { clientId, category } = req.query;

    let statusCondition = "";
    let dateCondition = "";

    switch (category) {
      case "production":
        statusCondition = "o.status IN ('Prod', 'Finished')";
        break;
      case "0-30":
        statusCondition = "o.status IN ('Delivered', 'Billed')";
        dateCondition = "DATEDIFF(CURRENT_DATE, o.productionDate) <= 30";
        break;
      case "31-60":
        statusCondition = "o.status IN ('Delivered', 'Billed')";
        dateCondition =
          "DATEDIFF(CURRENT_DATE, o.productionDate) > 30 AND DATEDIFF(CURRENT_DATE, o.productionDate) <= 60";
        break;
      case "61-90":
        statusCondition = "o.status IN ('Delivered', 'Billed')";
        dateCondition =
          "DATEDIFF(CURRENT_DATE, o.productionDate) > 60 AND DATEDIFF(CURRENT_DATE, o.productionDate) <= 90";
        break;
      case "over90":
        statusCondition = "o.status IN ('Delivered', 'Billed')";
        dateCondition = "DATEDIFF(CURRENT_DATE, o.productionDate) > 90";
        break;
      case "total":
        statusCondition = "o.status IN ('Delivered', 'Billed')";
        break;
    }

    const sql = `
      SELECT 
        o.orderId,
        c.clientName,
        o.terms,
        o.orderReference,
        o.projectName,
        e.name as preparedBy,
        o.totalAmount,
        o.percentDisc,
        o.amountDisc,
        o.grandTotal,
        o.amountPaid,
        (o.grandTotal - o.amountPaid) as balance,
        o.datePaid,
        o.productionDate,
        o.status
      FROM orders o
      JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE o.clientId = ?
        AND ${statusCondition}
        ${dateCondition ? `AND ${dateCondition}` : ""}
        AND o.status != 'Cancel'
        AND (o.grandTotal - o.amountPaid) > 0
      ORDER BY o.productionDate
    `;

    con.query(sql, [clientId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      return res.json({
        Status: true,
        Result: results,
      });
    });
  } catch (error) {
    console.error("Error in SOA details:", error);
    return res.json({
      Status: false,
      Error: "Failed to get SOA details: " + error.message,
    });
  }
});

export { router as ReportRouter };
