import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Post payment with transaction
router.post("/post-payment", verifyUser, async (req, res) => {
  try {
    const { payment, allocations } = req.body;
    console.log("Received payment:", payment);
    console.log("Received allocations:", allocations);

    // Start transaction
    await con.query("START TRANSACTION");
    console.log("Transaction started");

    // Insert payment header using Promise
    const paymentResult = await new Promise((resolve, reject) => {
      con.query(
        "INSERT INTO payments (amount, payType, payReference, payDate, ornum, postedDate, transactedBy) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
        [
          payment.amount,
          payment.payType,
          payment.payReference,
          payment.payDate,
          payment.ornum,
          payment.transactedBy,
        ],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    const payId = paymentResult.insertId;
    console.log("Payment inserted with ID:", payId);

    // Insert payment allocations
    for (const allocation of allocations) {
      await new Promise((resolve, reject) => {
        con.query(
          "INSERT INTO paymentJoAllocation (payId, orderId, amountApplied) VALUES (?, ?, ?)",
          [payId, allocation.orderId, allocation.amountApplied],
          (err, result) => {
            if (err) reject(err);
            resolve(result);
          }
        );
      });

      // Update order's amountPaid
      await new Promise((resolve, reject) => {
        con.query(
          "UPDATE orders SET amountPaid = COALESCE(amountPaid, 0) + ?, datePaid = NOW() WHERE orderID = ?",
          [allocation.amountApplied, allocation.orderId],
          (err, result) => {
            if (err) reject(err);
            resolve(result);
          }
        );
      });
    }

    await con.query("COMMIT");
    return res.json({ Status: true, Message: "Payment posted successfully" });
  } catch (error) {
    console.error("Error in post-payment:", error);
    await con.query("ROLLBACK");
    return res.json({
      Status: false,
      Error: "Failed to post payment. " + error.message,
    });
  }
});

// Add route to check for duplicate OR#
router.get("/check-ornum", verifyUser, async (req, res) => {
  try {
    const ornum = req.query.ornum;
    const [existingOR] = await new Promise((resolve, reject) => {
      con.query(
        "SELECT payId FROM payments WHERE ornum = ?",
        [ornum],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    return res.json({
      Status: true,
      exists: !!existingOR,
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

    // Use callback style query
    con.query(
      `SELECT p.payId, p.payDate, p.payType, p.payReference, p.ornum,
              p.amount AS totalPayment, pa.amountApplied, p.transactedBy, p.postedDate, p.remittedBy, p.remittedDate
       FROM paymentJoAllocation pa 
       JOIN payments p ON pa.payId = p.payId 
       WHERE pa.orderId = ?`,
      [orderId],
      (err, paymentDetails) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            Status: false,
            Error: "Failed to get order payment details",
          });
        }

        return res.json({
          Status: true,
          paymentDetails,
        });
      }
    );
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

    // Use Promise for cleaner async execution
    const results = await new Promise((resolve, reject) => {
      con.query(query, [payId], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return reject(err);
        }
        resolve(result);
      });
    });

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
  try {
    const { orderId } = req.body;

    // Start transaction
    await con.query("START TRANSACTION");

    // Get total from paymentJoAllocation
    const [result] = await new Promise((resolve, reject) => {
      con.query(
        `SELECT SUM(amountApplied) as totalPaid 
         FROM paymentJoAllocation 
         WHERE orderId = ?`,
        [orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    const totalPaid = result.totalPaid || 0;

    // Update orders table
    await new Promise((resolve, reject) => {
      con.query(
        "UPDATE orders SET amountPaid = ? WHERE orderID = ?",
        [totalPaid, orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    await con.query("COMMIT");

    return res.json({
      Status: true,
      Message: "Amount recalculated successfully",
      Result: { amountPaid: totalPaid },
    });
  } catch (error) {
    console.error("Error in recalculate-paid-amount:", error);
    await con.query("ROLLBACK");
    return res.json({
      Status: false,
      Error: "Failed to recalculate amount",
    });
  }
});

export { router as PaymentRouter };
