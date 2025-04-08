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
      client: "c.customerName", // Group by client
      month: "DATE_FORMAT(o.productionDate, '%Y-%m')", // Group by month
    };

    // ✅ Validate groupBy parameter
    const groupByColumn = validGroupOptions[groupBy] || null;
    const groupNameAlias = groupBy === "month" ? "month" : "name";

    // ✅ Construct SQL only if grouping is valid
    const sql = `
      SELECT 
        COUNT(DISTINCT o.orderId) AS orderCount,
        ${groupByColumn ? `${groupByColumn} AS ${groupNameAlias},` : ""}
        SUM(o.grandTotal) AS totalSales,
        SUM(o.amountPaid) AS amountPaid
      FROM orders o
      LEFT JOIN employee e ON o.preparedBy = e.id
      LEFT JOIN client c ON o.clientId = c.id
      WHERE o.status IN ('Prod', 'Finished', 'Delivered', 'Billed', 'Closed')
        AND o.productionDate >= ? AND o.productionDate < DATE_ADD(?, INTERVAL 1 DAY)
      ${groupByColumn ? `GROUP BY ${groupByColumn}` : ""}
      ORDER BY ${groupByColumn} ASC
    `;

    console.log("SQL", sql);
    const [results] = await pool.query(sql, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in sales-summary:", error);
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

    const sql = `
      SELECT 
        COUNT(DISTINCT o.orderId) AS orderCount,
        od.material AS materialName,
        SUM(od.amount) AS totalAmount,
        SUM(o.amountPaid * (od.amount / o.grandTotal)) AS totalPaid
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      WHERE  o.status IN ('Prod', 'Finished', 'Delivered', 'Billed', 'Closed')
        AND o.productionDate >= ? AND o.productionDate < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY od.material
      ORDER BY od.material ASC
    `;

    const [results] = await pool.query(sql, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in sales-material-summary:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Get Sales Summary Report by Machine
router.get("/sales-machine-summary", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    const sql = `
      SELECT 
        COUNT(DISTINCT o.orderId) AS orderCount,
        m.machineType AS machineType,
        SUM(od.amount) AS totalAmount,
        SUM(o.amountPaid * (od.amount / NULLIF(o.grandTotal, 0))) AS totalPaid
      FROM orders o
      JOIN order_details od ON o.orderId = od.orderId
      JOIN material m ON od.material = m.Material
      WHERE  o.status IN ('Prod', 'Finished', 'Delivered', 'Billed', 'Closed')
        AND o.productionDate >= ? AND o.productionDate < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY m.machineType
      ORDER BY m.machineType ASC
    `;

    const [results] = await pool.query(sql, [dateFrom, dateTo]);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in sales-machine-summary:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Detailed artist incentive route
router.get("/artist-incentive", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    // Calculate incentives per order
    const sql = `
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
      WHERE o.productionDate >= ? AND o.productionDate < DATE_ADD(?, INTERVAL 1 DAY)
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
    console.error("Error in artist-incentive:", error);
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
        o.productionDate >= ? AND o.productionDate < DATE_ADD(?, INTERVAL 1 DAY)
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

    console.log("Date From", dateFrom);
    console.log("Date To", dateTo);
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
      WHERE o.productionDate >= ? AND o.productionDate < DATE_ADD(?, INTERVAL 1 DAY)
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
    console.error("Error in sales-incentive:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Statement of Account Report
router.get("/statement-of-account", verifyUser, async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.id AS clientId,
        c.clientName,
        c.customerName,
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
        AND (o.grandTotal - o.amountPaid) > 0
      GROUP BY c.id, c.clientName
      HAVING production > 0 OR total_ar > 0
      ORDER BY c.clientName
    `;

    const [results] = await pool.query(sql);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in statement-of-account:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// SOA Details
router.get("/soa-details", verifyUser, async (req, res) => {
  try {
    const { clientId, category } = req.query;

    if (!clientId || !category) {
      return res.json({
        Status: false,
        Error: "Client ID and category are required",
      });
    }

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
      case "total":
        statusCondition = "o.status IN ('Delivered', 'Billed')";
        dateCondition = "1=1";
        break;
      default:
        return res.json({ Status: false, Error: "Invalid category" });
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
    console.error("Error in soa-details:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Check Order Totals
router.get("/check-order-total", verifyUser, async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.orderId AS order_id,
        o.totalAmount AS total_in_orders,
        IFNULL(SUM(od.amount), 0) AS total_in_details
      FROM 
        orders o
      LEFT JOIN 
        order_details od ON o.orderId = od.orderId
      GROUP BY 
        o.orderId, o.totalAmount
      HAVING 
        total_in_orders != total_in_details
    `;

    const [results] = await pool.query(sql);

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error in check-order-total:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

export { router as ReportRouter };
