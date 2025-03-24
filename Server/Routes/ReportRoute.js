import express from "express";
import pool from "../utils/db.js";
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

    // ✅ Check if groupBy parameter is valid
    const groupByField = validGroupOptions[groupBy] || validGroupOptions.sales;

    // ✅ Prepare SQL Query
    const query = `
      SELECT 
        ${groupByField} as groupName,
        SUM(IFNULL(o.totalAmount, 0)) as totalAmount,
        SUM(IFNULL(o.amountDiscount, 0)) as totalDiscount,
        SUM(IFNULL(o.grandTotal, 0)) as grandTotal,
        COUNT(DISTINCT o.orderId) as orderCount
      FROM 
        orders o
        LEFT JOIN employee e ON o.preparedBy = e.username
        LEFT JOIN client c ON o.clientId = c.id
      WHERE 
        o.productionDate BETWEEN ? AND ?
      GROUP BY 
        ${groupByField}
      ORDER BY 
        grandTotal DESC
    `;

    // ✅ Execute SQL Query
    const [results] = await pool.query(query, [dateFrom, dateTo]);

    if (!results.length) {
      return res.json({
        Status: false,
        Error: "No sales data found for the selected period",
      });
    }

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in /sales-summary route:", error);
    return res.json({ Status: false, Error: error.message });
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

    const result = await pool.query(query, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: result,
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

    const result = await pool.query(query, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: result,
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
router.get("/artist-incentive", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    const query = `
      SELECT 
        o.orderId,
        o.productionDate,
        c.clientName AS clientName,
        o.grandTotal,
        od.id,
        od.artistIncentive,
        od.quantity,
        od.amount,
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
        AND TRIM(o.status) IN ('Delivered', 'Billed', 'Closed')
        AND m.noIncentive = 0 AND od.perSqFt > 0
      ORDER BY o.orderId
    `;

    const [results] = await pool.query(query, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in /artist-incentive route:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Get Sales by Type
router.get("/sales-by-type", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    const query = `
      SELECT 
        od.category,
        COUNT(DISTINCT o.orderId) as orderCount,
        SUM(od.totalAmount) as totalSales
      FROM 
        orders o
        JOIN order_details od ON o.orderId = od.orderId
      WHERE 
        o.productionDate BETWEEN ? AND ?
      GROUP BY 
        od.category
      ORDER BY 
        totalSales DESC
    `;

    const [results] = await pool.query(query, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in /sales-by-type route:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Detailed sales incentive route
router.get("/sales-incentive", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    const sql = `
      SELECT 
        o.orderId,
        o.productionDate,
        c.clientName AS clientName,
        o.percentDisc,
        o.grandTotal,
        e.name AS preparedBy,
        od.id,
        od.width,
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
        AND TRIM(o.status) IN ('Delivered', 'Billed', 'Closed')
        AND m.noIncentive = 0 AND od.amount > 0
      ORDER BY o.orderId
    `;

    const [results] = await pool.query(sql, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in /sales-incentive route:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// // Detailed sales incentive route
// router.get("/sales-incentive", verifyUser, async (req, res) => {
//   try {
//     const { dateFrom, dateTo } = req.query;

//     if (!dateFrom || !dateTo) {
//       return res.json({ Status: false, Error: "Date range is required" });
//     }

//     const sql = `
//       SELECT
//         o.orderId,
//         o.productionDate,
//         e.name as salesName,
//         c.clientName,
//         o.projectName,
//         o.totalAmount,
//         o.grandTotal,
//         o.salesIncentivePerc,
//         o.salesIncentiveAmount
//       FROM
//         orders o
//         LEFT JOIN employee e ON o.preparedBy = e.username
//         LEFT JOIN client c ON o.clientId = c.id
//       WHERE
//         o.productionDate BETWEEN ? AND ?
//         AND o.salesIncentiveAmount > 0
//       ORDER BY
//         e.name, o.productionDate
//     `;

//     const [results] = await pool.query(sql, [dateFrom, dateTo]);

//     return res.json({
//       Status: true,
//       Result: results,
//     });
//   } catch (error) {
//     console.error("Error in /sales-incentive route:", error);
//     return res.json({ Status: false, Error: error.message });
//   }
// });

// Statement of Account Report
router.get("/statement-of-account", verifyUser, async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.id AS clientId,
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

    const [results] = await pool.query(sql);

    console.log("SOA:", results);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in /statement-of-account route:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// SOA Details
router.get("/soa-details", verifyUser, async (req, res) => {
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

    const [results] = await pool.query(sql, [clientId]);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in /soa-details route:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

export { router as ReportRouter };
