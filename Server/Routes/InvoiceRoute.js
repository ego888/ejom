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

    // Start transaction
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

    // Update order status and invoice amount
    await connection.query(
      `UPDATE orders o 
       SET o.status = 'Billed', 
           o.billDate = NOW(),
           o.invoiceNum = (
             SELECT SUM(invoiceAmount) 
             FROM invoice 
             WHERE orderId = o.orderID
           )
       WHERE o.orderID = ?`,
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

export default router;
