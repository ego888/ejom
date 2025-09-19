import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get all invoice prefixes
router.get("/invoice_prefixes", verifyUser, async (req, res) => {
  try {
    const [prefixes] = await pool.query(
      "SELECT invoicePrefix, lastNumberUsed FROM invoicePrefix"
    );
    return res.json({ Status: true, Result: prefixes });
  } catch (error) {
    console.error("Error fetching invoice prefixes:", error);
    return res.json({
      Status: false,
      Error: "Failed to fetch invoice prefixes",
    });
  }
});

// Check if invoice number exists
router.get("/check_invoice", verifyUser, async (req, res) => {
  try {
    const { invoicePrefix, invoiceNumber } = req.query;
    const fullInvoiceNumber = `${invoicePrefix}${invoiceNumber}`;

    const [result] = await pool.query(
      "SELECT COUNT(*) as count FROM invoice WHERE CONCAT(invoicePrefix, invoiceNumber) = ?",
      [fullInvoiceNumber]
    );

    res.json({ Status: true, exists: result[0].count > 0 });
  } catch (error) {
    console.error("Error checking invoice:", error);
    res.json({ Status: false, Error: "Failed to check invoice number" });
  }
});

// Save invoice
router.post("/save_invoice", verifyUser, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      orderId,
      invoicePrefix,
      invoiceNumber,
      invoiceAmount,
      invoiceRemarks,
    } = req.body;

    // Validate required fields
    if (!orderId || !invoicePrefix || !invoiceNumber || !invoiceAmount) {
      return res.json({
        Status: false,
        Error: "All required fields must be filled",
      });
    }

    // Validate invoice amount
    if (parseFloat(invoiceAmount) <= 0) {
      return res.json({
        Status: false,
        Error: "Invoice amount must be greater than 0",
      });
    }

    // Start transaction with READ COMMITTED isolation level
    await connection.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    await connection.beginTransaction();

    // // Check if invoice number already exists
    // const fullInvoiceNumber = `${invoicePrefix}${invoiceNumber}`;
    // const [checkResult] = await connection.query(
    //   "SELECT COUNT(*) as count FROM invoice WHERE CONCAT(invoicePrefix, invoiceNumber) = ?",
    //   [fullInvoiceNumber]
    // );

    // if (checkResult[0].count > 0) {
    //   await connection.rollback();
    //   return res.json({
    //     Status: false,
    //     Error: "Invoice number already exists",
    //   });
    // }

    // Save invoice
    await connection.query(
      "INSERT INTO invoice (orderId, invoicePrefix, invoiceNumber, invoiceAmount, invoiceRemarks) VALUES (?, ?, ?, ?, ?)",
      [
        orderId,
        invoicePrefix,
        invoiceNumber,
        invoiceAmount,
        invoiceRemarks || null,
      ]
    );

    // Update lastNumberUsed in invoicePrefix table
    await connection.query(
      "UPDATE invoicePrefix SET lastNumberUsed = ? WHERE invoicePrefix = ?",
      [invoiceNumber, invoicePrefix]
    );

    // Update order status and invoice number
    await connection.query(
      `UPDATE orders o 
       SET o.billDate = NOW(),
           o.invoiceNum = (
             SELECT SUM(invoiceAmount) 
             FROM invoice 
             WHERE orderId = o.orderID
           )
       WHERE o.orderID = ?`,
      [orderId]
    );

    // Update order status to Billed only if total invoice amount >= grand total
    await connection.query(
      `UPDATE orders o
      JOIN (
        SELECT orderId, COALESCE(SUM(invoiceAmount), 0) AS totalInvoiced
        FROM invoice
        GROUP BY orderId
      ) i ON i.orderId = o.orderId
      SET o.status = 'Billed'
      WHERE o.orderId = ?
      AND i.totalInvoiced >= o.grandTotal`,
      [orderId]
    );

    // Commit transaction
    await connection.commit();

    return res.json({ Status: true, Result: "Invoice saved successfully" });
  } catch (error) {
    // Rollback on error
    if (connection) await connection.rollback();
    console.error("Error saving invoice:", error);
    return res.json({ Status: false, Error: "Failed to save invoice" });
  } finally {
    // Always release connection
    if (connection) connection.release();
  }
});

// Get all invoices for an order
router.get("/invoice_total/:orderId", verifyUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [result] = await pool.query(
      "SELECT SUM(invoiceAmount) as totalAmount FROM invoice WHERE orderId = ?",
      [orderId]
    );

    return res.json({ Status: true, Result: result });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return res.json({
      Status: false,
      Error: "Failed to fetch invoices",
    });
  }
});

// Get all invoices for an order
router.get("/invoices/:orderId", verifyUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [result] = await pool.query(
      `SELECT 
        invoicePrefix,
        invoiceNumber,
        invoiceAmount,
        invoiceRemarks
       FROM invoice 
       WHERE orderId = ? 
       ORDER BY invoiceNumber ASC`,
      [orderId]
    );

    return res.json({ Status: true, Result: result });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return res.json({
      Status: false,
      Error: "Failed to fetch invoices",
    });
  }
});

// Get billing data with pagination and search
router.get("/billing", verifyUser, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "invoiceNumber",
      sortDirection = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    // Base query for invoices with order details
    let query = `
      SELECT 
        i.invoicePrefix,
        i.invoiceNumber,
        i.invoiceAmount,
        i.invoiceRemarks,
        o.orderId,
        o.productionDate,
        c.clientName,
        c.customerName,
        o.projectName,
        o.orderedBy,
        o.status,
        o.drNum,
        o.grandTotal,
        o.amountPaid,
        o.datePaid,
        o.preparedBy,
        o.orderReference,
        e.name as preparedByName
      FROM invoice i
      LEFT JOIN orders o ON i.orderId = o.orderID
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE 1=1
        AND (o.status IS NULL OR o.status <> 'Closed')
    `;

    // Add search conditions
    if (search) {
      query += `
        AND (
          CONCAT(i.invoicePrefix, i.invoiceNumber) LIKE ? OR
          o.orderId LIKE ? OR
          o.clientName LIKE ? OR
          o.customerName LIKE ? OR
          o.projectName LIKE ? OR
          o.orderedBy LIKE ? OR
          o.drNum LIKE ?
        )
      `;
    }

    // Add sorting
    const validSortColumns = [
      "invoiceNumber",
      "invoiceAmount",
      "orderID",
      "productionDate",
      "clientName",
      "customerName",
      "projectName",
      "orderedBy",
      "status",
      "drNum",
      "grandTotal",
      "amountPaid",
      "datePaid",
    ];

    const safeSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "invoiceNumber";
    const safeSortDirection =
      sortDirection.toUpperCase() === "ASC" ? "ASC" : "DESC";

    query += ` ORDER BY ${safeSortBy} ${safeSortDirection}`;

    // Add pagination
    query += ` LIMIT ? OFFSET ?`;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM invoice i
      LEFT JOIN orders o ON i.orderId = o.orderID
      WHERE 1=1
        AND (o.status IS NULL OR o.status <> 'Closed')
      ${
        search
          ? `
        AND (
          CONCAT(i.invoicePrefix, i.invoiceNumber) LIKE ? OR
          o.orderId LIKE ? OR
          o.clientName LIKE ? OR
          o.customerName LIKE ? OR
          o.projectName LIKE ? OR
          o.orderedBy LIKE ? OR
          o.drNum LIKE ?
        )
      `
          : ""
      }
    `;

    // Execute queries
    const [data] = await pool.query(
      query,
      search
        ? [
            searchParam,
            searchParam,
            searchParam,
            searchParam,
            searchParam,
            searchParam,
            searchParam,
            parseInt(limit),
            offset,
          ]
        : [parseInt(limit), offset]
    );

    const [countResult] = await pool.query(
      countQuery,
      search
        ? [
            searchParam,
            searchParam,
            searchParam,
            searchParam,
            searchParam,
            searchParam,
            searchParam,
          ]
        : []
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      Status: true,
      Result: {
        data,
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching billing data:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to fetch billing data",
      Details: error.message,
    });
  }
});

// Get total amount for a specific invoice number
router.get(
  "/billing-invoice-total/:invoicePrefix/:invoiceNumber",
  verifyUser,
  async (req, res) => {
    try {
      const { invoicePrefix, invoiceNumber } = req.params;
      const query = `
      SELECT SUM(invoiceAmount) as total_amount
      FROM invoice
      WHERE invoicePrefix = ? AND invoiceNumber = ?
    `;
      const [result] = await pool.query(query, [invoicePrefix, invoiceNumber]);
      res.json({ Status: true, Result: result[0]?.total_amount || 0 });
    } catch (error) {
      console.error("Error fetching invoice total:", error);
      res.json({ Status: false, Error: error.message });
    }
  }
);

router.get("/invoices-inquire", verifyUser, async (req, res) => {
  const { dateFrom, dateTo } = req.query;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({
      Status: false,
      Error: "Date range is required",
    });
  }

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(
      `SELECT 
        i.id,
        o.billDate,
        i.invoicePrefix,
        i.invoiceNumber,
        i.invoiceAmount,
        c.clientName,
        c.customerName,
        c.tinNumber,
        o.orderId, 
        o.grandTotal
      FROM invoice i
      LEFT JOIN orders o ON i.orderId = o.orderId
      LEFT JOIN client c ON o.clientId = c.id
      WHERE 
        o.billDate >= ? AND 
        o.billDate < DATE_ADD(?, INTERVAL 1 DAY)
        AND i.invoiceNumber IS NOT NULL
        AND i.invoiceNumber != 'NaN'
      ORDER BY i.invoicePrefix, i.invoiceNumber ASC`,
      [dateFrom, dateTo]
    );

    connection.release();
    return res.json({ Status: true, Result: results });
  } catch (error) {
    console.error("Error in invoice inquiry:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to fetch invoice data",
    });
  }
});

export default router;
