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
      SELECT vatPercent, major, minor, ArtistMaxPercent, ArtistMinAmount, HalfIncentiveSqFt 
      FROM jomcontrol 
      LIMIT 1
    `;

    // Create a function to calculate incentives
    const incentiveCalcQuery = `
      WITH OrderMaxIncentives AS (
        SELECT 
          o.orderId,
          (o.grandTotal / j.vatPercent) * (j.ArtistMaxPercent / 100) as maxOrderIncentive
        FROM orders o
        CROSS JOIN jomcontrol j
        WHERE o.productionDate BETWEEN ? AND ?
        AND o.status != 'Cancel'
      ),
      IncentiveCalcs AS (
        SELECT 
          o.orderId,
          od.artistIncentive,
          o.grandTotal,
          od.quantity,
          od.perSqFt,
          od.major,
          od.minor,
          m.noIncentive,
          j.minor as minorRate,
          j.major as majorRate,
          j.HalfIncentiveSqFt,
          j.ArtistMinAmount,
          omi.maxOrderIncentive,
          CASE 
            -- No incentive conditions
            WHEN m.noIncentive = 1 OR o.grandTotal < j.ArtistMinAmount THEN 0
            -- Quantity overflow adjustment
            WHEN (od.minor + od.major) > od.quantity THEN
              CASE 
                WHEN od.major >= ((od.minor + od.major) - od.quantity) 
                THEN od.major - ((od.minor + od.major) - od.quantity)
                ELSE 0
              END
            ELSE od.major
          END as adjustedMajor,
          CASE 
            -- No incentive conditions
            WHEN m.noIncentive = 1 OR o.grandTotal < j.ArtistMinAmount THEN 0
            -- Quantity overflow adjustment for minor
            WHEN (od.minor + od.major) > od.quantity THEN
              CASE
                WHEN od.major >= ((od.minor + od.major) - od.quantity) 
                THEN od.minor
                ELSE GREATEST(od.minor - (((od.minor + od.major) - od.quantity) - od.major), 0)
              END
            ELSE od.minor
          END as adjustedMinor
        FROM orders o
        JOIN order_details od ON o.orderId = od.orderId
        JOIN material m ON od.material = m.Material
        CROSS JOIN jomcontrol j
        JOIN OrderMaxIncentives omi ON o.orderId = omi.orderId
        WHERE o.productionDate BETWEEN ? AND ?
        AND TRIM(o.status) IN ('Finish', 'Delivered', 'Billed', 'Closed')
      )
      SELECT 
        COUNT(DISTINCT i.orderId) AS orderCount,
        i.artistIncentive AS category,
        SUM(i.adjustedMajor) AS major,
        SUM(i.adjustedMinor) AS minor,
        SUM(
          CASE 
            WHEN i.perSqFt < i.HalfIncentiveSqFt 
            THEN i.adjustedMajor * i.majorRate * 0.5
            ELSE i.adjustedMajor * i.majorRate
          END
        ) as majorAmount,
        SUM(
          CASE 
            WHEN i.perSqFt < i.HalfIncentiveSqFt 
            THEN i.adjustedMinor * i.minorRate * 0.5
            ELSE i.adjustedMinor * i.minorRate
          END
        ) as minorAmount,
        SUM(
          LEAST(
            CASE 
              WHEN i.perSqFt < i.HalfIncentiveSqFt 
              THEN (i.adjustedMajor * i.majorRate * 0.5) + (i.adjustedMinor * i.minorRate * 0.5)
              ELSE (i.adjustedMajor * i.majorRate) + (i.adjustedMinor * i.minorRate)
            END,
            i.maxOrderIncentive
          )
        ) as totalIncentive,
        SUM(i.grandTotal) as totalAmount,
        SUM(i.grandTotal * (i.quantity / i.quantity)) as amountPaid
      FROM IncentiveCalcs i
      GROUP BY i.artistIncentive
      ORDER BY i.artistIncentive ASC
    `;

    // Execute queries
    con.query(ratesQuery, (err, ratesResult) => {
      if (err) {
        console.error("Database error (rates):", err);
        return res.json({
          Status: false,
          Error: "Database error: " + err.message,
        });
      }

      con.query(
        incentiveCalcQuery,
        [dateFrom, dateTo, dateFrom, dateTo],
        (err, summaryResult) => {
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
        }
      );
    });
  } catch (error) {
    console.error("Error in artist incentive summary:", error.message);
    return res.json({
      Status: false,
      Error: "Failed to generate artist incentive summary: " + error.message,
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
      ORDER BY od.artistIncentive, o.orderId
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

export { router as ReportRouter };
