import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Post payment with transaction
router.post("/post-payment", verifyUser, async (req, res) => {
  try {
    const { payment, allocations } = req.body;
    console.log('Received payment:', payment);
    console.log('Received allocations:', allocations);

    // Start transaction
    await con.query('START TRANSACTION');
    console.log('Transaction started');

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
          payment.transactedBy
        ],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    const payId = paymentResult.insertId;
    console.log('Payment inserted with ID:', payId);

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

    await con.query('COMMIT');
    return res.json({ Status: true, Message: "Payment posted successfully" });

  } catch (error) {
    console.error("Error in post-payment:", error);
    await con.query('ROLLBACK');
    return res.json({ 
      Status: false, 
      Error: "Failed to post payment. " + error.message 
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
      exists: !!existingOR
    });
  } catch (error) {
    console.error("Error checking OR#:", error);
    return res.json({ 
      Status: false, 
      Error: "Failed to check OR#" 
    });
  }
});

// Add route to recalculate paid amount
router.post("/recalculate-paid-amount", verifyUser, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Start transaction
    await con.query('START TRANSACTION');

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

    await con.query('COMMIT');
    
    return res.json({ 
      Status: true, 
      Message: "Amount recalculated successfully",
      Result: { amountPaid: totalPaid }
    });

  } catch (error) {
    console.error("Error in recalculate-paid-amount:", error);
    await con.query('ROLLBACK');
    return res.json({ 
      Status: false, 
      Error: "Failed to recalculate amount" 
    });
  }
});

export { router as PaymentRouter }; 