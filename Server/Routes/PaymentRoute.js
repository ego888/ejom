import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Post payment with transaction
router.post("/post-payment", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId, transactedBy } = req.body;

    if (!payId || !transactedBy) {
      return res.status(400).json({
        Status: false,
        Error: "Missing required fields: payId and transactedBy",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Copy payment from tempPayments to payments
    const [paymentResult] = await connection.query(
      `INSERT INTO payments 
       (amount, payType, payReference, payDate, ornum, postedDate, transactedBy) 
       SELECT amount, payType, payReference, payDate, ornum, NOW(), ?
       FROM tempPayments 
       WHERE payId = ?`,
      [transactedBy, payId]
    );

    const newPayId = paymentResult.insertId;

    // 2. Copy allocations from tempPaymentAllocation to paymentJoAllocation
    await connection.query(
      `INSERT INTO paymentJoAllocation 
       (payId, orderId, amountApplied) 
       SELECT ?, orderId, amountApplied 
       FROM tempPaymentAllocation 
       WHERE payId = ?`,
      [newPayId, payId]
    );

    // 3. Update orders.amountPaid and datePaid for each affected order
    const [affectedOrders] = await connection.query(
      `SELECT DISTINCT orderId 
       FROM tempPaymentAllocation 
       WHERE payId = ?`,
      [payId]
    );

    for (const order of affectedOrders) {
      // Get total paid amount for this order
      const [results] = await connection.query(
        `SELECT COALESCE(SUM(amountApplied), 0) as totalPaid 
         FROM paymentJoAllocation 
         WHERE orderId = ?`,
        [order.orderId]
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
        [formattedTotalPaid, formattedTotalPaid, order.orderId]
      );
    }

    // 4. Update client last payment info
    const [[paymentRow]] = await connection.query(
      `SELECT payDate 
       FROM payments 
       WHERE payId = ?`,
      [newPayId]
    );

    if (paymentRow?.payDate) {
      const paymentDate = paymentRow.payDate;

      const [clientAllocations] = await connection.query(
        `SELECT o.clientId, SUM(pja.amountApplied) AS amountApplied
         FROM paymentJoAllocation pja
         JOIN orders o ON pja.orderId = o.orderId
         WHERE pja.payId = ?
         GROUP BY o.clientId`,
        [newPayId]
      );

      for (const allocation of clientAllocations) {
        const clientId = allocation.clientId;
        const amountApplied = parseFloat(allocation.amountApplied) || 0;

        if (!clientId || amountApplied <= 0) {
          continue;
        }

        await connection.query(
          `UPDATE client
           SET
             lastPaymentAmount = CASE
               WHEN lastPaymentDate = DATE(?) THEN COALESCE(lastPaymentAmount, 0) + ?
               ELSE ?
             END,
             lastPaymentDate = DATE(?)
           WHERE id = ?`,
          [paymentDate, amountApplied, amountApplied, paymentDate, clientId]
        );
      }
    }

    // 5. Delete temp records
    await connection.query(
      `DELETE FROM tempPaymentAllocation WHERE payId = ?`,
      [payId]
    );
    await connection.query(`DELETE FROM tempPayments WHERE payId = ?`, [payId]);

    await connection.commit();

    return res.json({
      Status: true,
      Message: "Payment posted successfully",
      Result: {
        payId: newPayId,
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

// Get payment allocation
router.get("/payments", verifyUser, async (req, res) => {
  let connection;
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "postedDate",
      sortDirection = "desc",
      search = "",
      includeReceived = "false",
      remittedDate = "",
    } = req.query;
    const offset = (page - 1) * limit;

    connection = await pool.getConnection();

    // Build where clause
    let whereConditions = ["1=1"]; // Always true condition to start
    let params = [];

    if (includeReceived === "false") {
      whereConditions.push("p.receivedBy IS NULL");
    }

    if (search) {
      whereConditions.push(
        "(p.ornum LIKE ? OR p.payReference LIKE ? OR p.transactedBy LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (remittedDate) {
      whereConditions.push("DATE(p.remittedDate) = ?");
      params.push(remittedDate);
    }

    const whereClause = whereConditions.join(" AND ");

    // Main data query
    const dataSql = `
      SELECT 
        p.payId,
        p.amount,
        p.payType,
        p.ornum,
        p.payReference,
        DATE_FORMAT(p.payDate, '%Y-%m-%d') as payDate,
        DATE_FORMAT(p.postedDate, '%Y-%m-%d %H:%i:%s') as postedDate,
        DATE_FORMAT(p.remittedDate, '%Y-%m-%d %H:%i:%s') as remittedDate,
        p.transactedBy,
        p.remittedBy,
        p.received,
        p.receivedBy,
        DATE_FORMAT(p.receivedDate, '%Y-%m-%d %H:%i:%s') as receivedDate
      FROM payments p
      WHERE ${whereClause}
      ORDER BY p.${sortBy} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM payments p
      WHERE ${whereClause}
    `;

    // Execute queries
    const [payments] = await connection.query(dataSql, [
      ...params,
      parseInt(limit),
      parseInt(offset),
    ]);
    const [totalResult] = await connection.query(countSql, params);

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      Status: true,
      Result: {
        payments,
        total,
        totalPages,
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to fetch payments: " + error.message,
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

// View allocation details from temp tables
router.get("/view-allocation", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId } = req.query;

    if (!payId) {
      return res.status(400).json({ Status: false, Error: "Missing payId" });
    }

    connection = await pool.getConnection();

    // First get the payment header
    const [paymentHeader] = await connection.query(
      `SELECT 
        p.payId,
        DATE_FORMAT(p.payDate, '%Y-%m-%d') as payDate,
        p.amount AS totalPayment, 
        p.payType,
        p.payReference,
        p.ornum, 
        p.transactedBy,
        DATE_FORMAT(p.postedDate, '%Y-%m-%d %H:%i:%s') as postedDate
      FROM tempPayments p
      WHERE p.payId = ?`,
      [payId]
    );

    if (!paymentHeader.length) {
      return res.json({
        Status: false,
        Error: "Payment not found",
      });
    }

    // Then get all allocations with complete order details
    const [allocations] = await connection.query(
      `SELECT 
        pa.id,
        pa.payId,
        pa.orderId,
        pa.amountApplied,
        o.projectName,
        o.grandTotal as orderTotal,
        o.amountPaid as orderAmountPaid,
        c.clientName,
        c.customerName,
        o.status
      FROM tempPaymentAllocation pa
      JOIN orders o ON pa.orderId = o.orderId
      JOIN client c ON o.clientId = c.id
      WHERE pa.payId = ?
      ORDER BY pa.orderId ASC`,
      [payId]
    );

    // Get allocation count
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as count
       FROM tempPaymentAllocation
       WHERE payId = ?`,
      [payId]
    );

    // Format the response
    const formattedResponse = {
      ...paymentHeader[0],
      allocations: allocations.map((allocation) => ({
        orderId: allocation.orderId,
        amountApplied: parseFloat(allocation.amountApplied) || 0,
        projectName: allocation.projectName || "",
        orderTotal: parseFloat(allocation.orderTotal) || 0,
        orderAmountPaid: parseFloat(allocation.orderAmountPaid) || 0,
        clientName: allocation.clientName || "",
        customerName: allocation.customerName || "",
        status: allocation.status,
      })),
      count: parseInt(countResult[0].count) || 0,
    };

    return res.json({
      Status: true,
      paymentAllocation: formattedResponse,
    });
  } catch (error) {
    console.error("Error getting allocation details:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to get allocation details: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Check for existing temp payments
router.get("/check-temp-payments", verifyUser, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Check for existing temp payments
    const [tempPayments] = await connection.query(
      `SELECT p.*, 
              COUNT(pa.orderId) as allocationCount,
              GROUP_CONCAT(pa.orderId) as orderIds
       FROM tempPayments p
       LEFT JOIN tempPaymentAllocation pa ON p.payId = pa.payId
       GROUP BY p.payId`
    );

    return res.json({
      Status: true,
      hasTempPayments: tempPayments.length > 0,
      tempPayments,
    });
  } catch (error) {
    console.error("Error checking temp payments:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to check temp payments: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Save payment to temp tables (header only)
router.post("/save-temp-payment", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payment } = req.body;

    // Input validation
    if (!payment) {
      return res.status(400).json({
        Status: false,
        Error: "Payment data is required",
      });
    }

    // Validate required payment fields
    const requiredFields = ["payDate", "payType", "amount", "transactedBy"];
    const missingFields = requiredFields.filter((field) => !payment[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        Status: false,
        Error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate amount is a positive number
    const amount = parseFloat(payment.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        Status: false,
        Error: "Payment amount must be a positive number",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if there's already a temp payment
    const [existingPayments] = await connection.query(
      `SELECT payId FROM tempPayments`
    );

    let payId;

    if (existingPayments.length > 0) {
      // Update existing payment
      payId = existingPayments[0].payId;
      await connection.query(
        `UPDATE tempPayments 
         SET amount = ?, 
             payType = ?, 
             payReference = ?, 
             payDate = ?, 
             ornum = ?, 
             transactedBy = ?
         WHERE payId = ?`,
        [
          amount,
          payment.payType,
          payment.payReference || null,
          payment.payDate,
          payment.ornum || null,
          payment.transactedBy,
          payId,
        ]
      );
    } else {
      // Insert new payment
      const [paymentResult] = await connection.query(
        `INSERT INTO tempPayments 
         (amount, payType, payReference, payDate, ornum, postedDate, transactedBy) 
         VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
        [
          amount,
          payment.payType,
          payment.payReference || null,
          payment.payDate,
          payment.ornum || null,
          payment.transactedBy,
        ]
      );

      payId = paymentResult.insertId;
    }

    await connection.commit();

    return res.json({
      Status: true,
      Message: "Payment saved to temp tables",
      Result: { payId },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error saving temp payment:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to save temp payment: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Save allocation to temp tables
router.post("/save-temp-allocation", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId, allocation } = req.body;

    // Input validation
    if (!payId) {
      return res.status(400).json({
        Status: false,
        Error: "Payment ID is required",
      });
    }

    if (!allocation || !allocation.orderId || !allocation.amount) {
      return res.status(400).json({
        Status: false,
        Error: "Allocation data is required (orderId and amount)",
      });
    }

    // Validate amount is a positive number
    const amount = parseFloat(allocation.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        Status: false,
        Error: "Allocation amount must be a positive number",
      });
    }

    // Get database connection first
    connection = await pool.getConnection();

    // Check if payment exists
    const [existingPayment] = await connection.query(
      `SELECT payId FROM tempPayments WHERE payId = ?`,
      [payId]
    );

    if (existingPayment.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        Status: false,
        Error: "Temp payment not found",
      });
    }

    // Check if order exists
    const [existingOrder] = await connection.query(
      `SELECT orderId FROM orders WHERE orderId = ?`,
      [allocation.orderId]
    );

    if (existingOrder.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        Status: false,
        Error: "Order not found",
      });
    }

    await connection.beginTransaction();
    // Insert allocation
    await connection.query(
      `INSERT INTO tempPaymentAllocation 
       (payId, orderId, amountApplied) 
       VALUES (?, ?, ?)`,
      [payId, allocation.orderId, amount]
    );

    // Get updated allocation count and total allocated amount
    const [result] = await connection.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amountApplied), 0) as totalAllocated
       FROM tempPaymentAllocation
       WHERE payId = ?`,
      [payId]
    );

    await connection.commit();

    return res.json({
      Status: true,
      Message: "Allocation saved to temp tables",
      Result: {
        count: parseInt(result[0].count) || 0,
        totalAllocated: parseFloat(result[0].totalAllocated) || 0,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error saving temp allocation:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to save temp allocation: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Delete allocation from temp tables
router.post("/delete-temp-allocation", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId, orderId } = req.body;

    // Input validation
    if (!payId || !orderId) {
      return res.status(400).json({
        Status: false,
        Error: "Payment ID and Order ID are required",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Delete allocation
    await connection.query(
      `DELETE FROM tempPaymentAllocation 
       WHERE payId = ? AND orderId = ?`,
      [payId, orderId]
    );

    // Get updated allocation count and total allocated amount
    const [result] = await connection.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amountApplied), 0) as totalAllocated
       FROM tempPaymentAllocation
       WHERE payId = ?`,
      [payId]
    );

    await connection.commit();

    return res.json({
      Status: true,
      Message: "Allocation deleted from temp tables",
      Result: {
        count: parseInt(result[0].count) || 0,
        totalAllocated: parseFloat(result[0].totalAllocated) || 0,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error deleting temp allocation:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to delete temp allocation: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Post payment from temp tables
// router.post("/post-temp-payment", verifyUser, async (req, res) => {
//   let connection;
//   try {
//     const { payId } = req.body;

//     if (!payId) {
//       return res.status(400).json({ Status: false, Error: "Missing payId" });
//     }

//     connection = await pool.getConnection();
//     await connection.beginTransaction();

//     // 1. Get temp payment data
//     const [tempPayment] = await connection.query(
//       `SELECT * FROM tempPayments WHERE payId = ?`,
//       [payId]
//     );

//     if (!tempPayment.length) {
//       await connection.rollback();
//       return res.status(404).json({
//         Status: false,
//         Error: "Temp payment not found",
//       });
//     }

//     // 2. Insert into actual payments table
//     const [paymentResult] = await connection.query(
//       `INSERT INTO payments
//        (amount, payType, payReference, payDate, ornum, postedDate, transactedBy)
//        VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
//       [
//         tempPayment[0].amount,
//         tempPayment[0].payType,
//         tempPayment[0].payReference,
//         tempPayment[0].payDate,
//         tempPayment[0].ornum,
//         tempPayment[0].transactedBy,
//       ]
//     );

//     const newPayId = paymentResult.insertId;

//     // 3. Get temp allocations
//     const [tempAllocations] = await connection.query(
//       `SELECT * FROM tempPaymentAllocation WHERE payId = ?`,
//       [payId]
//     );

//     // 4. Process each allocation
//     for (const allocation of tempAllocations) {
//       // Insert into paymentJoAllocation
//       await connection.query(
//         `INSERT INTO paymentJoAllocation
//          (payId, orderId, amountApplied)
//          VALUES (?, ?, ?)`,
//         [newPayId, allocation.orderId, allocation.amount]
//       );

//       // Update order amountPaid
//       await connection.query(
//         `UPDATE orders
//          SET amountPaid = COALESCE(amountPaid, 0) + ?,
//              datePaid = COALESCE(datePaid, NOW())
//          WHERE orderId = ?`,
//         [allocation.amount, allocation.orderId]
//       );
//     }

//     // 5. Delete temp records
//     // await connection.query(
//     //   `DELETE FROM tempPaymentAllocation WHERE payId = ?`,
//     //   [payId]
//     // );
//     await connection.query(`DELETE FROM tempPayments WHERE payId = ?`, [payId]);

//     await connection.commit();

//     return res.json({
//       Status: true,
//       Message: "Payment posted successfully",
//       Result: {
//         payId: newPayId,
//         amount: tempPayment[0].amount,
//       },
//     });
//   } catch (error) {
//     if (connection) await connection.rollback();
//     console.error("Error posting temp payment:", error);
//     return res.status(500).json({
//       Status: false,
//       Error: "Failed to post payment: " + error.message,
//     });
//   } finally {
//     if (connection) connection.release();
//   }
// });

// Cancel temp payment
router.post("/cancel-temp-payment", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId } = req.body;

    if (!payId) {
      return res.status(400).json({ Status: false, Error: "Missing payId" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Delete temp records
    await connection.query(
      `DELETE FROM tempPaymentAllocation WHERE payId = ?`,
      [payId]
    );
    await connection.query(`DELETE FROM tempPayments WHERE payId = ?`, [payId]);

    await connection.commit();

    return res.json({
      Status: true,
      Message: "Temp payment cancelled successfully",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error cancelling temp payment:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to cancel temp payment: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get unremitted payments
router.get("/unremitted-payments", verifyUser, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [payments] = await connection.query(
      `SELECT 
        p.payId,
        o.orderId,
        c.clientName,
        o.grandTotal,
        pa.amountApplied,
        p.ornum,
        p.payType,
        DATE_FORMAT(p.payDate, '%Y-%m-%d') as payDate,
        p.payReference,
        p.amount,
        p.transactedBy,
        DATE_FORMAT(p.postedDate, '%Y-%m-%d') as postedDate
      FROM payments p
      JOIN paymentJoAllocation pa ON p.payId = pa.payId
      JOIN orders o ON pa.orderId = o.orderId
      JOIN client c ON o.clientId = c.id
      WHERE p.remittedBy IS NULL
      ORDER BY p.payType ASC, p.payId ASC`
    );

    return res.json({
      Status: true,
      Result: payments,
    });
  } catch (error) {
    console.error("Error fetching unremitted payments:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to fetch unremitted payments: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Remit payment
router.post("/remit-payment", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payIds, remittedBy } = req.body;

    if (
      !payIds ||
      !Array.isArray(payIds) ||
      payIds.length === 0 ||
      !remittedBy
    ) {
      return res.status(400).json({
        Status: false,
        Error: "Payment IDs array and remittedBy are required",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update all payments with remittance details
    await connection.query(
      `UPDATE payments 
       SET remittedBy = ?, 
           remittedDate = NOW() 
       WHERE payId IN (${payIds.map(() => "?").join(",")})`,
      [remittedBy, ...payIds]
    );

    await connection.commit();

    return res.json({
      Status: true,
      Message: `${payIds.length} payment(s) remitted successfully`,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error remitting payments:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to remit payments: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Toggle payment received status
router.post("/toggle-payment-received", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId, received } = req.body;

    if (!payId || received === undefined) {
      return res.status(400).json({
        Status: false,
        Error: "Missing required fields: payId, received",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update payment received status
    await connection.query(
      `UPDATE payments 
       SET received = ? 
       WHERE payId = ?`,
      [received ? 1 : 0, payId]
    );

    await connection.commit();

    return res.json({
      Status: true,
      Message: `Payment marked as ${received ? "received" : "not received"}`,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error toggling payment received status:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to update payment received status: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/total-per-payment-type", verifyUser, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT 
        p.payType,
        COUNT(p.payId) as count,
        SUM(p.amount) as totalAmount
       FROM payments p
       WHERE p.received = 1
       GROUP BY p.payType
       ORDER BY p.payType ASC`
    );

    return res.json({
      Status: true,
      Result: results,
    });
  } catch (error) {
    console.error("Error fetching payment type totals:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to fetch payment type totals: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Confirm payment receipts
router.post("/confirm-payment-receipt", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payIds, receivedBy } = req.body;

    if (
      !payIds ||
      !Array.isArray(payIds) ||
      payIds.length === 0 ||
      !receivedBy
    ) {
      return res.status(400).json({
        Status: false,
        Error: "Payment IDs array and receivedBy are required",
      });
    }

    connection = await pool.getConnection();

    // Get all orders associated with these payments before starting transaction
    const [orders] = await connection.query(
      `SELECT DISTINCT o.orderId, o.grandTotal, o.amountPaid
       FROM orders o
       JOIN paymentJoAllocation pa ON o.orderId = pa.orderId
       WHERE pa.payId IN (${payIds.map(() => "?").join(",")})`,
      [...payIds]
    );

    await connection.beginTransaction();

    try {
      // Update all payments with receipt details
      const updateQuery = `UPDATE payments 
                          SET received = 0, 
                              receivedBy = ?, 
                              receivedDate = NOW() 
                          WHERE payId IN (${payIds.map(() => "?").join(",")})`;

      await connection.query(updateQuery, [receivedBy, ...payIds]);

      // Check each order and update status if fully paid
      for (const order of orders) {
        if (parseFloat(order.grandTotal) <= parseFloat(order.amountPaid)) {
          await connection.query(
            `UPDATE orders 
             SET status = 'Closed',
                 closeDate = NOW()
             WHERE orderId = ?`,
            [order.orderId]
          );
        }
      }

      await connection.commit();

      return res.json({
        Status: true,
        Message: `${payIds.length} payment(s) confirmed as received`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Transaction error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error confirming payment receipts:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to confirm payment receipts: " + error.message,
      Details: error.sqlMessage || "No SQL error details available",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get checked payments
router.get("/checked-payments", verifyUser, async (req, res) => {
  try {
    const sql = `
      SELECT payId 
      FROM payments 
      WHERE received = 1 
      AND receivedBy IS NULL
    `;

    const [results] = await pool.query(sql);

    return res.json({
      Status: true,
      Result: results.map((row) => row.payId),
    });
  } catch (error) {
    console.error("Error in checked-payments:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Get all payments
router.get("/all-payments", verifyUser, async (req, res) => {
  let connection;
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "payId",
      sortDirection = "desc",
      search = "",
      includeReceived = "false",
    } = req.query;
    const offset = (page - 1) * limit;

    connection = await pool.getConnection();

    // Build where clause
    let whereConditions = ["1=1"]; // Always true condition to start
    let params = [];

    if (includeReceived === "false") {
      whereConditions.push("p.receivedBy IS NULL");
    }

    if (search) {
      whereConditions.push(
        "(p.payId LIKE ? OR p.ornum LIKE ? OR p.payReference LIKE ? OR p.transactedBy LIKE ? OR o.projectName LIKE ? OR c.clientName LIKE ? OR c.customerName LIKE ?)"
      );
      const searchParam = `%${search}%`;
      params.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam
      );
    }

    const whereClause = whereConditions.join(" AND ");

    // Main data query
    const sortColumn = sortBy === "payId" ? "" : `, p.${sortBy}`;

    const dataSql = `
      SELECT 
        p.payId,
        p.amount,
        p.payType,
        p.ornum,
        p.payReference,
        DATE_FORMAT(p.payDate, '%Y-%m-%d') as payDate,
        DATE_FORMAT(p.postedDate, '%Y-%m-%d %H:%i:%s') as postedDate,
        DATE_FORMAT(p.remittedDate, '%Y-%m-%d %H:%i:%s') as remittedDate,
        p.transactedBy,
        p.remittedBy,
        p.receivedBy,
        DATE_FORMAT(p.receivedDate, '%Y-%m-%d %H:%i:%s') as receivedDate,
        o.orderId,
        o.projectName,
        o.orderReference,
        o.grandTotal,
        o.amountPaid,
        DATE_FORMAT(o.orderDate, '%Y-%m-%d') as orderDate,
        o.invoiceNum,
        c.clientName,
        c.customerName,
        e.name as preparedBy
      FROM (
        SELECT DISTINCT p.payId${sortColumn}
        FROM payments p
        JOIN paymentJoAllocation pa ON p.payId = pa.payId
        JOIN orders o ON pa.orderId = o.orderId
        LEFT JOIN client c ON o.clientId = c.id
        LEFT JOIN employee e ON o.preparedBy = e.id
        WHERE ${whereClause}
        ORDER BY p.${sortBy} ${sortDirection}
        LIMIT ? OFFSET ?
      ) sorted
      JOIN payments p ON p.payId = sorted.payId
      JOIN paymentJoAllocation pa ON p.payId = pa.payId
      JOIN orders o ON pa.orderId = o.orderId
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      ORDER BY p.${sortBy} ${sortDirection}
    `;

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT p.payId) as total
      FROM payments p
      JOIN paymentJoAllocation pa ON p.payId = pa.payId
      JOIN orders o ON pa.orderId = o.orderId
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE ${whereClause}
    `;

    // Execute queries
    const [payments] = await connection.query(dataSql, [
      ...params,
      parseInt(limit),
      parseInt(offset),
    ]);
    const [totalResult] = await connection.query(countSql, params);

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      Status: true,
      Result: {
        payments,
        total,
        totalPages,
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to fetch payments: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update allocation in temp tables
router.post("/update-temp-allocation", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId, allocation } = req.body;

    // Input validation
    if (!payId) {
      return res.status(400).json({
        Status: false,
        Error: "Payment ID is required",
      });
    }

    if (!allocation || !allocation.orderId || !allocation.amount) {
      return res.status(400).json({
        Status: false,
        Error: "Allocation data is required (orderId and amount)",
      });
    }

    // Validate amount is a positive number
    const amount = parseFloat(allocation.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        Status: false,
        Error: "Allocation amount must be a positive number",
      });
    }

    // Get database connection first
    connection = await pool.getConnection();

    // Check if payment exists
    const [existingPayment] = await connection.query(
      `SELECT payId FROM tempPayments WHERE payId = ?`,
      [payId]
    );

    if (existingPayment.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        Status: false,
        Error: "Temp payment not found",
      });
    }

    // Check if order exists
    const [existingOrder] = await connection.query(
      `SELECT orderId FROM orders WHERE orderId = ?`,
      [allocation.orderId]
    );

    if (existingOrder.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        Status: false,
        Error: "Order not found",
      });
    }

    await connection.beginTransaction();

    // Update allocation if exists, otherwise insert
    await connection.query(
      `UPDATE tempPaymentAllocation 
       SET amountApplied = ?
       WHERE payId = ? AND orderId = ?`,
      [amount, payId, allocation.orderId]
    );

    await connection.commit();

    return res.json({
      Status: true,
      Message: "Allocation updated in temp tables",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating temp allocation:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to update temp allocation: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get orders with temp payment allocations
router.get("/get-order-tempPaymentAllocation", verifyUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const statuses = req.query.statuses ? req.query.statuses.split(",") : [];
    const sales = req.query.sales ? req.query.sales.split(",") : [];
    const clients = req.query.clients ? req.query.clients.split(",") : [];
    let sortBy = req.query.sortBy || "orderID";
    let sortDirection = req.query.sortDirection || "desc";

    // Build where clause
    let whereConditions = ["1=1"]; // Always true condition to start
    let params = [];
    let havingClause = "";
    const havingParams = [];

    if (search) {
      const searchParam = `%${search}%`;
      havingClause = `
        HAVING (
          o.orderID LIKE ? OR
          c.clientName LIKE ? OR
          c.customerName LIKE ? OR
          o.projectName LIKE ? OR
          o.orderedBy LIKE ? OR
          o.drnum LIKE ? OR
          o.invoiceNum LIKE ? OR
          e.name LIKE ? OR
          o.grandTotal LIKE ? OR
          o.orderReference LIKE ? OR
          orNums LIKE ?
        )
      `;
      havingParams.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam // orNums
      );
    }

    if (statuses.length) {
      whereConditions.push(`o.status IN (?)`);
      params.push(statuses);
    }

    if (sales.length) {
      whereConditions.push(`o.preparedBy IN (?)`);
      params.push(sales);
    }

    if (clients.length) {
      whereConditions.push(`c.clientName IN (?)`);
      params.push(clients);
    }

    const whereClause = whereConditions.join(" AND ");

    // Main data query with temp allocations - Fixed GROUP BY issue
    const dataSql = `
      SELECT 
        o.orderID as id, 
        o.revision,
        o.clientId, 
        c.clientName, 
        c.customerName,
        c.hold AS holdDate,
        c.overdue AS warningDate,
        o.projectName, 
        o.orderedBy, 
        o.orderDate, 
        o.dueDate, 
        o.dueTime,
        o.status, 
        o.drnum, 
        o.invoiceNum as invnum, 
        o.totalAmount,
        o.amountDisc,
        o.percentDisc,
        o.grandTotal,
        o.amountPaid,
        o.datePaid,
        e.name as salesName, 
        o.orderReference,
        o.forProd,
        o.forBill,
        o.productionDate,
        COALESCE(pmt.orNums, '') as orNums,
        tpa.amountApplied as tempPayment,
        tpa.orderId as tempPaymentOrderId,
        CASE WHEN tpa.amountApplied IS NOT NULL THEN 1 ELSE 0 END as isChecked
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      LEFT JOIN (
        SELECT 
          pja.orderId,
          GROUP_CONCAT(DISTINCT p.orNum SEPARATOR ', ') AS orNums
        FROM paymentJoAllocation pja 
        JOIN payments p ON p.payId = pja.payId
        GROUP BY pja.orderId
      ) pmt ON pmt.orderId = o.orderId
      LEFT JOIN tempPaymentAllocation tpa ON tpa.orderId = o.orderId
      WHERE ${whereClause}
      GROUP BY 
        o.orderID,
        o.revision,
        o.clientId,
        c.clientName,
        c.customerName,
        c.hold,
        c.overdue,
        o.projectName,
        o.orderedBy,
        o.orderDate,
        o.dueDate,
        o.dueTime,
        o.status,
        o.drnum,
        o.invoiceNum,
        o.totalAmount,
        o.amountDisc,
        o.percentDisc,
        o.grandTotal,
        o.amountPaid,
        o.datePaid,
        e.name,
        o.orderReference,
        o.forProd,
        o.forBill,
        o.productionDate,
        pmt.orNums,
        tpa.amountApplied,
        tpa.orderId
        ${havingClause}
      ORDER BY ${sortBy} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    // Count query
    const countSql = `
    SELECT COUNT(*) AS total FROM (
      SELECT o.orderID,
        c.clientName,
        c.customerName,
        o.projectName,
        o.orderedBy,
        o.drnum,
        o.invoiceNum,
        e.name AS salesName,
        o.grandTotal,
        o.orderReference,
        GROUP_CONCAT(DISTINCT p.orNum SEPARATOR ', ') AS orNums
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      LEFT JOIN paymentJoAllocation pja ON pja.orderId = o.orderId
      LEFT JOIN payments p ON p.payId = pja.payId
      WHERE ${whereClause}
      GROUP BY o.orderID
      ${havingClause}
    ) AS countResult
  `;

    // Execute queries
    const [orders] = await pool.query(dataSql, [
      ...params,
      ...havingParams,
      limit,
      offset,
    ]);
    const [countResults] = await pool.query(countSql, [
      ...params,
      ...havingParams,
    ]);
    const countResult = countResults[0];

    return res.json({
      Status: true,
      Result: {
        orders,
        total: countResult.total,
        page: Number(page),
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    console.error("Error in get-order-tempPaymentAllocation route:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch orders with temp allocations",
      Details: err.message,
    });
  }
});

// Get total allocated amount for a payment
router.get("/get-total-tempPaymentAllocated", verifyUser, async (req, res) => {
  let connection;
  try {
    const { payId } = req.query;

    if (!payId) {
      return res.status(400).json({
        Status: false,
        Error: "Payment ID is required",
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `SELECT COALESCE(SUM(amountApplied), 0) as totalAllocated
       FROM tempPaymentAllocation
       WHERE payId = ?`,
      [payId]
    );

    return res.json({
      Status: true,
      Result: {
        totalAllocated: parseFloat(result[0].totalAllocated) || 0,
      },
    });
  } catch (error) {
    console.error("Error getting total allocated amount:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to get total allocated amount: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/cash-invoices-inquire", verifyUser, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.json({ Status: false, Error: "Date range is required" });
    }

    const query = `
            SELECT 
                p.payId,
                p.ornum,
                p.payDate,
                c.clientName,
                c.customerName,
                c.tinNumber,
                p.amount,
                o.orderId,
                pja.amountApplied,
                o.grandTotal
            FROM payments p
            JOIN paymentJoAllocation pja ON p.payId = pja.payId
            JOIN orders o ON pja.orderId = o.orderId
            JOIN client c ON o.clientId = c.id
            WHERE p.payDate >= ? AND p.payDate <= DATE_ADD(?, INTERVAL 1 DAY)
            ORDER BY p.ornum, p.payDate
        `;

    const [result] = await pool.query(query, [dateFrom, dateTo]);

    return res.json({ Status: true, Result: result });
  } catch (error) {
    console.error("Error in cash-invoices-inquire:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Delete payment
router.delete("/delete-payment/:payId", verifyUser, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if payment exists
    const [paymentCheck] = await connection.query(
      "SELECT * FROM payments WHERE payId = ?",
      [req.params.payId]
    );

    if (paymentCheck.length === 0) {
      return res.json({ Status: false, Error: "Payment not found" });
    }

    // Delete payment details first
    await connection.query("DELETE FROM payments WHERE payId = ?", [
      req.params.payId,
    ]);

    await connection.commit();
    return res.json({ Status: true, Message: "Payment deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting payment:", err);
    return res.json({ Status: false, Error: "Error deleting payment" });
  } finally {
    connection.release();
  }
});

export { router as PaymentRouter };
