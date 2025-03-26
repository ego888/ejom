import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Post payment with transaction
router.post("/post-payment", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payment, allocations } = req.body;

    // 1. Input Validation
    if (
      !payment ||
      !allocations ||
      !Array.isArray(allocations) ||
      allocations.length === 0
    ) {
      return res.status(400).json({
        Status: false,
        Error: "Invalid payment data. Payment and allocations are required.",
      });
    }

    // 2. Format and validate payment data
    const formattedPayment = {
      amount: parseFloat(payment.amount || 0).toFixed(2),
      payType: payment.payType?.trim(),
      payReference: payment.payReference?.trim(),
      payDate: payment.payDate,
      ornum: payment.ornum?.trim(),
      transactedBy: payment.transactedBy,
    };

    // Validate required payment fields
    if (
      !formattedPayment.amount ||
      !formattedPayment.payType ||
      !formattedPayment.payDate
    ) {
      return res.status(400).json({
        Status: false,
        Error: "Payment amount, type, and date are required",
      });
    }

    // 3. Format and validate allocations
    const formattedAllocations = allocations.map((allocation) => ({
      orderId: parseInt(allocation.orderId),
      amount: parseFloat(allocation.amount || 0).toFixed(2),
    }));

    // Validate allocation amounts - ensure they don't exceed payment amount
    const totalAllocations = formattedAllocations.reduce(
      (sum, allocation) => sum + parseFloat(allocation.amount),
      0
    );

    const paymentAmount = parseFloat(formattedPayment.amount);
    if (totalAllocations > paymentAmount + 0.01) {
      // Allow small float difference
      return res.status(400).json({
        Status: false,
        Error: `Total allocations (${totalAllocations.toFixed(
          2
        )}) cannot exceed payment amount (${paymentAmount.toFixed(2)})`,
      });
    }

    // Get connection from pool
    connection = await pool.getConnection();

    // 4. Verify all orders exist before starting transaction
    const orderIds = formattedAllocations.map((a) => a.orderId);
    const [existingOrders] = await connection.query(
      `SELECT orderId, grandTotal, amountPaid 
       FROM orders 
       WHERE orderId IN (${orderIds.map(() => "?").join(",")})`,
      orderIds
    );

    if (existingOrders.length !== orderIds.length) {
      return res.status(404).json({
        Status: false,
        Error: "One or more orders not found",
      });
    }

    // Create order balances map
    const orderBalances = new Map(
      existingOrders.map((order) => [
        order.orderId,
        {
          remaining:
            parseFloat(order.grandTotal) - parseFloat(order.amountPaid || 0),
        },
      ])
    );

    // Validate payment amounts don't exceed remaining balance
    const overPaidOrders = formattedAllocations.filter((allocation) => {
      const orderBalance = orderBalances.get(allocation.orderId);
      return parseFloat(allocation.amount) > orderBalance?.remaining + 0.01; // Allow small float difference
    });

    if (overPaidOrders.length > 0) {
      return res.status(400).json({
        Status: false,
        Error: `Payment amount exceeds remaining balance for order(s): ${overPaidOrders
          .map((a) => a.orderId)
          .join(", ")}`,
      });
    }

    // 5. Start transaction
    await connection.beginTransaction();

    // Insert payment header
    const [paymentResult] = await connection.query(
      `INSERT INTO payments 
       (amount, payType, payReference, payDate, ornum, postedDate, transactedBy) 
       VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
      [
        formattedPayment.amount,
        formattedPayment.payType,
        formattedPayment.payReference,
        formattedPayment.payDate,
        formattedPayment.ornum,
        formattedPayment.transactedBy,
      ]
    );

    const paymentId = paymentResult.insertId;

    // Process each allocation
    for (const allocation of formattedAllocations) {
      // Insert payment allocation
      await connection.query(
        `INSERT INTO paymentJoAllocation 
         (payId, orderId, amountApplied) 
         VALUES (?, ?, ?)`,
        [paymentId, allocation.orderId, allocation.amount]
      );

      // Update order table with amount paid and datePaid
      await connection.query(
        `UPDATE orders 
         SET amountPaid = COALESCE(amountPaid, 0) + ?,
             datePaid = COALESCE(datePaid, NOW())
         WHERE orderId = ?`,
        [allocation.amount, allocation.orderId]
      );
    }

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Message: "Payment posted successfully",
      Result: {
        paymentId,
        amount: formattedPayment.amount,
        allocations: formattedAllocations,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error posting payment:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to post payment: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Add route to check for duplicate OR#
router.get("/check-ornum", verifyUser, async (req, res) => {
  let connection;
  try {
    const ornum = req.query.ornum;

    // Get connection from pool
    connection = await pool.getConnection();

    const [results] = await connection.query(
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
      Error: "Failed to check OR#: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get order payment details
router.get("/order-payment-history", verifyUser, async (req, res) => {
  let connection;
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ Status: false, Error: "Missing orderId" });
    }

    // Get connection from pool
    connection = await pool.getConnection();

    const [paymentDetails] = await connection.query(
      `SELECT p.payId, 
              DATE_FORMAT(p.payDate, '%Y-%m-%d') as payDate,
              p.payType, 
              p.payReference, 
              p.ornum,
              p.amount AS totalPayment, 
              pa.amountApplied, 
              p.transactedBy, 
              DATE_FORMAT(p.postedDate, '%Y-%m-%d %H:%i:%s') as postedDate,
              p.remittedBy, 
              DATE_FORMAT(p.remittedDate, '%Y-%m-%d %H:%i:%s') as remittedDate
       FROM paymentJoAllocation pa 
       JOIN payments p ON pa.payId = p.payId 
       WHERE pa.orderId = ?
       ORDER BY p.postedDate DESC`,
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
      Error: "Failed to get order payment details: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get payment allocation
router.get("/payment-allocation", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId } = req.query;

    if (!payId) {
      return res.status(400).json({ Status: false, Error: "Missing payId" });
    }

    // Get connection from pool
    connection = await pool.getConnection();

    // Modified query to get payment header and all allocations
    const [results] = await connection.query(
      `SELECT 
        p.payId,
        DATE_FORMAT(p.payDate, '%Y-%m-%d') as payDate,
        p.amount AS totalPayment, 
        p.payType,
        p.payReference,
        p.ornum, 
        p.transactedBy,
        DATE_FORMAT(p.postedDate, '%Y-%m-%d %H:%i:%s') as postedDate,
        p.remittedBy,
        DATE_FORMAT(p.remittedDate, '%Y-%m-%d %H:%i:%s') as remittedDate,
        pa.orderId,
        pa.amountApplied,
        o.projectName,
        o.grandTotal as orderTotal,
        o.amountPaid as orderAmountPaid
      FROM payments p
      LEFT JOIN paymentJoAllocation pa ON p.payId = pa.payId
      LEFT JOIN orders o ON pa.orderId = o.orderId
      WHERE p.payId = ?
      ORDER BY pa.orderId ASC`,
      [payId]
    );

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
      totalPayment: parseFloat(results[0].totalPayment) || 0,
      payType: results[0].payType,
      payReference: results[0].payReference,
      ornum: results[0].ornum,
      transactedBy: results[0].transactedBy,
      postedDate: results[0].postedDate,
      remittedBy: results[0].remittedBy,
      remittedDate: results[0].remittedDate,
    };

    const allocations = results
      .filter((row) => row.orderId) // Filter out null orderId rows
      .map((row) => ({
        orderId: row.orderId,
        amountApplied: parseFloat(row.amountApplied) || 0,
        projectName: row.projectName,
        orderTotal: parseFloat(row.orderTotal) || 0,
        orderAmountPaid: parseFloat(row.orderAmountPaid) || 0,
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
      Error: "Failed to get payment allocation: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Add route to recalculate paid amount
router.post("/recalculate-paid-amount", verifyUser, async (req, res) => {
  let connection;
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        Status: false,
        Error: "Missing orderId",
      });
    }

    // Get connection from pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // First check if order exists
    const [orderExists] = await connection.query(
      "SELECT orderId FROM orders WHERE orderId = ?",
      [orderId]
    );

    if (orderExists.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        Status: false,
        Error: "Order not found",
      });
    }

    // Get total from paymentJoAllocation
    const [results] = await connection.query(
      `SELECT COALESCE(SUM(amountApplied), 0) as totalPaid 
       FROM paymentJoAllocation 
       WHERE orderId = ?`,
      [orderId]
    );

    const totalPaid = parseFloat(results[0].totalPaid) || 0;
    const formattedTotalPaid = parseFloat(totalPaid.toFixed(2));

    // Update orders table
    await connection.query(
      `UPDATE orders 
       SET amountPaid = ?,
           datePaid = CASE 
             WHEN ? > 0 THEN COALESCE(datePaid, NOW()) 
             ELSE NULL 
           END
       WHERE orderId = ?`,
      [formattedTotalPaid, formattedTotalPaid, orderId]
    );

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Message: "Amount recalculated successfully",
      Result: {
        orderId,
        amountPaid: formattedTotalPaid,
      },
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error in recalculate-paid-amount:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to recalculate amount: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export { router as PaymentRouter };
