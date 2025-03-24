import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Post payment with transaction
router.post("/post-payment", verifyUser, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { payment, allocations } = req.body;
    console.log("Received payment:", payment);
    console.log("Received allocations:", allocations);

    // Start transaction
    await connection.beginTransaction();
    console.log("Transaction started");

    // Insert payment header
    const [paymentResult] = await connection.query(
      "INSERT INTO payments (amount, payType, payReference, payDate, ornum, postedDate, transactedBy) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
      [
        payment.amount,
        payment.payType,
        payment.payReference,
        payment.payDate,
        payment.ornum,
        payment.transactedBy,
      ]
    );

    const paymentId = paymentResult.insertId;
    console.log("Payment header inserted with ID:", paymentId);

    // Process each allocation
    for (const allocation of allocations) {
      // Insert payment allocation
      await connection.query(
        "INSERT INTO payment_allocation (paymentId, orderId, amount) VALUES (?, ?, ?)",
        [paymentId, allocation.orderId, allocation.amount]
      );

      // Update order table with amount paid
      await connection.query(
        "UPDATE orders SET amountPaid = amountPaid + ?, datePaid = NOW() WHERE orderId = ?",
        [allocation.amount, allocation.orderId]
      );
    }

    // Commit transaction
    await connection.commit();
    console.log("Transaction committed");

    return res.json({
      Status: true,
      Message: "Payment posted successfully",
      paymentId: paymentId,
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) await connection.rollback();
    console.error("Error posting payment:", error);
    return res.json({
      Status: false,
      Error: "Failed to post payment: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Add route to check for duplicate OR#
router.get("/check-ornum", verifyUser, async (req, res) => {
  try {
    const ornum = req.query.ornum;
    const [results] = await pool.query(
      "SELECT payId FROM payments WHERE ornum = ?",
      [ornum]
    );

    return res.json({
      Status: true,
      exists: results.length > 0,
    });
  } catch (error) {
    console.error("Error checking OR#:", error);
    return res.json({
      Status: false,
      Error: "Failed to check OR#",
    });
  }
});

// Get order payment details
router.get("/order-payment-history", verifyUser, async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ Status: false, Error: "Missing orderId" });
    }

    const [paymentDetails] = await pool.query(
      `SELECT p.payId, p.payDate, p.payType, p.payReference, p.ornum,
              p.amount AS totalPayment, pa.amountApplied, p.transactedBy, p.postedDate, p.remittedBy, p.remittedDate
       FROM paymentJoAllocation pa 
       JOIN payments p ON pa.payId = p.payId 
       WHERE pa.orderId = ?`,
      [orderId]
    );

    return res.json({
      Status: true,
      paymentDetails,
    });
  } catch (error) {
    console.error("Error getting order payment details:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to get order payment details",
    });
  }
});

// Get payment allocation
router.get("/payment-allocation", verifyUser, async (req, res) => {
  try {
    const { payId } = req.query;

    if (!payId) {
      return res.status(400).json({ Status: false, Error: "Missing payId" });
    }

    // Modified query to get payment header and all allocations
    const query = `
      SELECT 
        p.payId, p.payDate, p.amount AS totalPayment, 
        p.payType, p.payReference, p.ornum, 
        p.transactedBy, p.postedDate, p.remittedBy, p.remittedDate,
        pa.orderId, pa.amountApplied
      FROM payments p
      LEFT JOIN paymentJoAllocation pa ON p.payId = pa.payId
      WHERE p.payId = ?;
    `;

    const [results] = await pool.query(query, [payId]);

    if (!results.length) {
      return res.json({
        Status: false,
        Error: "Payment not found",
      });
    }

    // Structure the response with payment header and allocations
    const paymentHeader = {
      payId: results[0].payId,
      payDate: results[0].payDate,
      totalPayment: results[0].totalPayment,
      payType: results[0].payType,
      payReference: results[0].payReference,
      ornum: results[0].ornum,
      transactedBy: results[0].transactedBy,
      postedDate: results[0].postedDate,
      remittedBy: results[0].remittedBy,
      remittedDate: results[0].remittedDate,
    };

    const allocations = results.map((row) => ({
      orderId: row.orderId,
      amountApplied: row.amountApplied,
    }));

    return res.json({
      Status: true,
      paymentAllocation: {
        ...paymentHeader,
        allocations,
      },
    });
  } catch (error) {
    console.error("Error getting payment allocation:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to get payment allocation",
    });
  }
});

// Add route to recalculate paid amount
router.post("/recalculate-paid-amount", verifyUser, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { orderId } = req.body;

    // Start transaction
    await connection.beginTransaction();

    // Get total from paymentJoAllocation
    const [results] = await connection.query(
      `SELECT SUM(amountApplied) as totalPaid 
       FROM paymentJoAllocation 
       WHERE orderId = ?`,
      [orderId]
    );

    const totalPaid = results[0].totalPaid || 0;

    // Update orders table
    await connection.query(
      "UPDATE orders SET amountPaid = ? WHERE orderID = ?",
      [totalPaid, orderId]
    );

    await connection.commit();

    return res.json({
      Status: true,
      Message: "Amount recalculated successfully",
      Result: { amountPaid: totalPaid },
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) await connection.rollback();
    console.error("Error in recalculate-paid-amount:", error);
    return res.json({
      Status: false,
      Error: "Failed to recalculate amount",
    });
  } finally {
    if (connection) connection.release();
  }
});

export { router as PaymentRouter };
