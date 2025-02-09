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
        "INSERT INTO payments (amount, payType, payReference, payDate, postedDate) VALUES (?, ?, ?, ?, NOW())",
        [payment.amount, payment.payType, payment.payReference, payment.payDate],
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

export { router as PaymentRouter }; 