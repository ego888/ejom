import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";

const router = express.Router();

// ============= GET Routes =============

// Get all quotes with client names and item counts
router.get("/quotes", verifyUser, async (req, res) => {
  let connection;
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "quoteId",
      sortDirection = "DESC",
      search = "",
      statuses = "",
      clients = "",
      sales = "",
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const statusArray = statuses ? statuses.split(",") : [];
    const clientArray = clients ? clients.split(",") : [];
    const salesArray = sales ? sales.split(",") : [];

    // Build where clause
    let whereConditions = ["1=1"]; // Always true condition to start
    let params = [];

    if (search) {
      whereConditions.push(
        "(q.quoteId LIKE ? OR q.clientName LIKE ? OR q.projectName LIKE ? OR q.refId LIKE ? OR q.orderedBy LIKE ?)"
      );
      const searchParam = `%${search}%`;
      params.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam
      );
    }

    if (statusArray.length > 0) {
      whereConditions.push(
        `q.status IN (${statusArray.map(() => "?").join(",")})`
      );
      params.push(...statusArray);
    }

    if (clientArray.length > 0) {
      whereConditions.push(
        `c.clientName IN (${clientArray.map(() => "?").join(",")})`
      );
      params.push(...clientArray);
    }

    if (salesArray.length > 0) {
      whereConditions.push(
        `q.preparedBy IN (${salesArray.map(() => "?").join(",")})`
      );
      params.push(...salesArray);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get connection from pool
    connection = await pool.getConnection();

    // Count query
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total
            FROM quotes q
            LEFT JOIN client c ON q.clientId = c.id
            LEFT JOIN employee e ON q.preparedBy = e.id
       WHERE ${whereClause}`,
      params
    );

    // Main data query with DATE_FORMAT for dates
    const [quotes] = await connection.query(
      `SELECT 
                q.quoteId as id, 
                q.clientId, 
                q.clientName, 
                q.projectName, 
                q.preparedBy, 
                q.orderedBy,
                DATE_FORMAT(q.quoteDate, '%Y-%m-%d') as quoteDate,
                DATE_FORMAT(q.dueDate, '%Y-%m-%d') as dueDate,
                q.status, 
        q.refId as quoteReference,
                q.totalAmount,
                q.amountDiscount,
                q.percentDisc,
                q.grandTotal,
                q.totalHrs,
        q.terms,
        DATE_FORMAT(q.lastEdited, '%Y-%m-%d %H:%i:%s') as lastEdited,
        q.editedBy,
        q.statusRem,
                q.email,
                q.cellNumber,
        q.telNum,
        q.status,
        e.name as salesName
            FROM quotes q
            LEFT JOIN client c ON q.clientId = c.id
            LEFT JOIN employee e ON q.preparedBy = e.id
            WHERE ${whereClause}
            ORDER BY ${sortBy} ${sortDirection}
      LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return res.json({
      Status: true,
      Result: {
        quotes,
        total: countResult[0].total,
        page: Number(page),
        totalPages: Math.ceil(countResult[0].total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error in quotes route:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch quotes",
      Details: err.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get single quote
router.get("/quote/:id", async (req, res) => {
  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT 
      q.*,
      DATE_FORMAT(q.quoteDate, '%Y-%m-%d') as quoteDate,
      DATE_FORMAT(q.dueDate, '%Y-%m-%d') as dueDate,
      DATE_FORMAT(q.lastEdited, '%Y-%m-%d %H:%i:%s') as lastEdited,
      c.clientName,
      c.hold,
      c.overdue,
      e.name as PreparedBy
    FROM quotes q
    LEFT JOIN client c ON q.clientId = c.id
    LEFT JOIN employee e ON q.preparedBy = e.id
      WHERE q.quoteId = ?`,
      [req.params.id]
    );

    if (results.length === 0) {
      return res.json({ Status: false, Error: "Quote not found" });
    }

    // Convert decimal fields to float and ensure preparedBy is a number
    const quote = results[0];
    const parsedQuote = {
      ...quote,
      preparedBy: Number(quote.preparedBy) || 0,
      totalAmount: parseFloat(quote.totalAmount) || 0,
      amountDiscount: parseFloat(quote.amountDiscount) || 0,
      percentDisc: parseFloat(quote.percentDisc) || 0,
      grandTotal: parseFloat(quote.grandTotal) || 0,
      totalHrs: parseFloat(quote.totalHrs) || 0,
    };

    return res.json({ Status: true, Result: parsedQuote });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return res.json({ Status: false, Error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get next display order for quote details
router.get("/next_display_quote/:quoteId", async (req, res) => {
  let connection;
  try {
    const { quoteId } = req.params;

    // Get connection from pool
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      "SELECT COALESCE(MAX(displayOrder), 0) as maxOrder FROM quote_details WHERE quoteId = ?",
      [quoteId]
    );

    const maxOrder = rows[0].maxOrder;
    const nextDisplayOrder = maxOrder === 0 ? 5 : maxOrder + 5;

    return res.json({ Status: true, Result: nextDisplayOrder });
  } catch (error) {
    console.error("Error getting next display order:", error);
    return res.json({ Status: false, Error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get quote details
router.get("/quote_details/:quoteId", async (req, res) => {
  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT 
      qd.*,
      q.clientName,
      c.customerName,
        e.name as PreparedByName
    FROM quote_details qd
    LEFT JOIN quotes q ON qd.quoteId = q.quoteId
    LEFT JOIN client c ON q.clientId = c.id
    LEFT JOIN employee e ON q.preparedBy = e.id
    WHERE qd.quoteId = ?
      ORDER BY qd.displayOrder`,
      [req.params.quoteId]
    );

    return res.json({ Status: true, Result: results });
  } catch (error) {
    console.error("Error fetching quote details:", error);
    return res.json({ Status: false, Error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get quote statuses
router.get("/quote-statuses", async (req, res) => {
  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT 
      statusId,
      step
    FROM quoteStatus 
      ORDER BY step ASC`
    );

    return res.json({ Status: true, Result: results });
  } catch (error) {
    console.error("Error fetching status options:", error);
    return res.json({ Status: false, Error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get quote detail
router.get("/quote-detail/:id", verifyUser, async (req, res) => {
  let connection;
  try {
    const quoteId = req.params.id;

    // Get connection from pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    const [quotes] = await connection.query(
      "SELECT * FROM quotes WHERE quoteId = ?",
      [quoteId]
    );

    if (quotes.length === 0) {
      await connection.rollback();
      return res.json({ Status: false, Error: "Quote not found" });
    }

    const [quoteDetails] = await connection.query(
      "SELECT * FROM quote_details WHERE quoteId = ?",
      [quoteId]
    );

    // Get client name
    const [clientRows] = await connection.query(
      "SELECT clientName FROM client WHERE clientId = ?",
      [quotes[0].clientId]
    );

    const clientName =
      clientRows.length > 0 ? clientRows[0].clientName : "Unknown";

    // Get employee name who prepared the quote
    const [employeeRows] = await connection.query(
      "SELECT name FROM users WHERE id = ?",
      [quotes[0].preparedBy]
    );

    const employeeName =
      employeeRows.length > 0 ? employeeRows[0].name : "Unknown";

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Quote: {
        ...quotes[0],
        clientName,
        employeeName,
      },
      Details: quoteDetails,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error in quote-detail:", error);
    return res.json({ Status: false, Error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ============= PUT Routes =============

// Update quote's last edited info and total hours
router.put("/quotes/:quoteId/update_edited_info", async (req, res) => {
  try {
    const sql = `
    UPDATE quotes 
      SET lastEdited = ?,
          editedBy = ?,
          totalHrs = ?
      WHERE quoteId = ?
    `;

    const result = await pool.query(sql, [
      req.body.lastEdited,
      req.body.editedBy,
      req.body.totalHrs,
      req.params.quoteId,
    ]);

    return res.json({ Status: true, Result: result[0] });
  } catch (error) {
    console.error("Error updating quote edited info:", error);
    return res.json({
      Status: false,
      Error: "Failed to update quote edited info: " + error.message,
    });
  }
});

// Update quote all fields
router.put("/update_quote/:id", async (req, res) => {
  try {
    const sql = `
    UPDATE quotes 
    SET 
        clientId = ?,
        clientName = ?, 
        projectName = ?,
        preparedBy = ?,
        quoteDate = ?,
        orderedBy = ?,
        refId = ?,
        email = ?,
        cellNumber = ?,
        telNum = ?,
        statusRem = ?,
        dueDate = ?,
        totalAmount = ?,
        amountDiscount = ?,
        percentDisc = ?,
        grandTotal = ?,
        totalHrs = ?,
        editedBy = ?,
        terms = ?,
        deliveryRemarks = ?,
        lastEdited = CURRENT_TIMESTAMP
    WHERE quoteId = ?
  `;

    const values = [
      req.body.clientId || 0,
      req.body.clientName ? req.body.clientName.toUpperCase() : null,
      req.body.projectName,
      req.body.preparedBy,
      req.body.quoteDate || null,
      req.body.orderedBy || null,
      req.body.refId || null,
      req.body.email || null,
      req.body.cellNumber || null,
      req.body.telNum || null,
      req.body.statusRem || null,
      req.body.dueDate || null,
      req.body.totalAmount || 0,
      req.body.amountDiscount || 0,
      req.body.percentDisc || 0,
      req.body.grandTotal || 0,
      req.body.totalHrs || 0,
      req.body.editedBy,
      req.body.terms || null,
      req.body.deliveryRemarks || null,
      req.params.id,
    ];

    const result = await pool.query(sql, values);
    return res.json({ Status: true, Result: result[0] });
  } catch (error) {
    console.error("Update Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update quote: " + error.message,
    });
  }
});

// Update quote totals
router.put("/quotes/update_totals/:id", async (req, res) => {
  try {
    const sql = `
    UPDATE quotes 
    SET 
        totalAmount = ?,
        amountDiscount = ?,
        percentDisc = ?,
        grandTotal = ?,
        totalHrs = ?,
        editedBy = ?,
        lastEdited = CURRENT_TIMESTAMP
    WHERE quoteId = ?
  `;

    const values = [
      req.body.totalAmount || 0,
      req.body.amountDiscount || 0,
      req.body.percentDisc || 0,
      req.body.grandTotal || 0,
      req.body.totalHrs || 0,
      req.body.editedBy,
      req.params.id,
    ];

    const result = await pool.query(sql, values);
    return res.json({ Status: true, Result: result[0] });
  } catch (error) {
    console.error("Update Totals Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update quote totals: " + error.message,
    });
  }
});

// Update quote detail display order. Updates a single detail's order
router.put(
  "/quote_detail_display_order/:quoteId/:detailId",
  async (req, res) => {
    try {
      const { quoteId, detailId } = req.params;
      const { displayOrder } = req.body;

      if (!quoteId || !displayOrder || !detailId) {
        return res.json({
          Status: false,
          Error: "Missing required parameters",
        });
      }

      const sql = `
    UPDATE quote_details 
    SET displayOrder = ? 
    WHERE quoteId = ? 
    AND id = ?
  `;

      const result = await pool.query(sql, [displayOrder, quoteId, detailId]);
      return res.json({ Status: true, Result: result[0] });
    } catch (error) {
      console.error("Error updating display order:", error);
      return res.json({ Status: false, Error: error.message });
    }
  }
);

// Update quote details
router.put("/quote_details/:quoteId/:displayOrder", async (req, res) => {
  let connection;
  try {
    const data = {
      Id: req.body.Id,
      quoteId: req.body.quoteId,
      displayOrder: req.body.displayOrder,
      quantity: req.body.quantity,
      width: req.body.width,
      height: req.body.height,
      unit: req.body.unit,
      material: req.body.material,
      unitPrice: req.body.unitPrice,
      discount: req.body.discount,
      amount: req.body.amount,
      persqft: req.body.persqft,
      itemDescription: req.body.itemDescription,
      squareFeet: req.body.squareFeet,
      materialUsage: req.body.materialUsage,
      printHours: req.body.printHours,
    };

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // Update the detail
    await connection.query(
      `UPDATE quote_details 
       SET ? 
       WHERE quoteId = ? AND displayOrder = ?`,
      [data, req.params.quoteId, req.params.displayOrder]
    );

    // Calculate new totals
    const [detailsResults] = await connection.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as totalAmount,
        COALESCE(SUM(printHours), 0) as totalHours
      FROM quote_details 
      WHERE quoteId = ?`,
      [req.params.quoteId]
    );

    // Get current quote data for percentage discount
    const [quoteResults] = await connection.query(
      "SELECT percentDisc FROM quotes WHERE quoteId = ?",
      [req.params.quoteId]
    );

    if (quoteResults.length === 0) {
      await connection.rollback();
      return res.json({ Status: false, Error: "Quote not found" });
    }

    // Calculate final values
    const totalAmount = parseFloat(detailsResults[0].totalAmount) || 0;
    const totalHrs = parseFloat(detailsResults[0].totalHours) || 0;
    const percentDisc = parseFloat(quoteResults[0].percentDisc) || 0;
    const amountDiscount = (totalAmount * percentDisc) / 100;
    const grandTotal = totalAmount - amountDiscount;

    // Format numbers to avoid precision issues
    const formattedTotalAmount = parseFloat(totalAmount.toFixed(2));
    const formattedAmountDiscount = parseFloat(amountDiscount.toFixed(2));
    const formattedGrandTotal = parseFloat(grandTotal.toFixed(2));
    const formattedTotalHrs = parseFloat(totalHrs.toFixed(2));

    // Update quote with new totals
    await connection.query(
      `UPDATE quotes 
       SET totalAmount = ?,
           amountDiscount = ?,
           grandTotal = ?,
           totalHrs = ?,
           lastEdited = CURRENT_TIMESTAMP
       WHERE quoteId = ?`,
      [
        formattedTotalAmount,
        formattedAmountDiscount,
        formattedGrandTotal,
        formattedTotalHrs,
        req.params.quoteId,
      ]
    );

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Result: {
        totalAmount: formattedTotalAmount,
        amountDiscount: formattedAmountDiscount,
        grandTotal: formattedGrandTotal,
        totalHrs: formattedTotalHrs,
      },
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error updating quote detail:", error);
    return res.json({
      Status: false,
      Error: "Failed to update quote detail: " + error.message,
    });
  } finally {
    // Release connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});

// Update quote status
router.put("/quote/status/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    const sql = "UPDATE quotes SET status = ? WHERE quoteId = ?";
    const result = await pool.query(sql, [status, id]);

    return res.json({ Status: true, Result: result[0] });
  } catch (error) {
    console.error("Error updating quote status:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// ============= POST Routes =============

// Create requote from existing quote
router.post("/quote-requote", verifyUser, async (req, res) => {
  const { quoteId, userId, userName } = req.body;

  if (!quoteId || !userId || !userName) {
    return res.json({
      Status: false,
      Error: "Missing required parameters (quoteId, userId, userName)",
    });
  }

  let connection;
  try {
    // Get a connection from the pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // 1. Get original quote data
    const quoteResult = await connection.query(
      "SELECT * FROM quotes WHERE quoteId = ?",
      [quoteId]
    );
    const quoteResults = quoteResult[0];

    if (!quoteResults.length) {
      throw new Error("Quote not found");
    }
    const originalQuoteData = quoteResults[0];

    // 2. Update original quote status to 'Requote'
    await connection.query(
      "UPDATE quotes SET status = 'Requote' WHERE quoteId = ?",
      [quoteId]
    );

    // 3. Prepare and insert new quote data
    const projectName = originalQuoteData.projectName.includes(" (Requote)")
      ? originalQuoteData.projectName
      : originalQuoteData.projectName + " (Requote)";

    // Use CURRENT_TIMESTAMP for the database to handle date/time in its timezone
    const currentDate = new Date().toISOString().split("T")[0];

    const newQuoteData = {
      clientId: originalQuoteData.clientId || 0,
      clientName: originalQuoteData.clientName,
      projectName: projectName,
      preparedBy: userId, // Use current user ID
      quoteDate: currentDate,
      orderedBy: originalQuoteData.orderedBy,
      refId: quoteId,
      email: originalQuoteData.email,
      cellNumber: originalQuoteData.cellNumber,
      telNum: originalQuoteData.telNum,
      statusRem: originalQuoteData.statusRem,
      dueDate: originalQuoteData.dueDate,
      totalAmount: originalQuoteData.totalAmount,
      amountDiscount: originalQuoteData.amountDiscount,
      percentDisc: originalQuoteData.percentDisc,
      grandTotal: originalQuoteData.grandTotal,
      totalHrs: originalQuoteData.totalHrs,
      editedBy: userName, // Use current user name
      lastEdited: new Date(), // Let MySQL handle the timestamp conversion
      status: "Open",
      terms: originalQuoteData.terms,
    };

    // 4. Insert new quote
    const insertResult = await connection.query(
      "INSERT INTO quotes SET ?",
      newQuoteData
    );
    const newQuoteId = insertResult[0].insertId;

    // 5. Get original quote details
    const quoteDetailsResult = await connection.query(
      "SELECT * FROM quote_details WHERE quoteId = ?",
      [quoteId]
    );
    const quoteDetails = quoteDetailsResult[0];

    // 6. Copy all details to new quote
    if (quoteDetails.length > 0) {
      const insertPromises = quoteDetails.map((detail) => {
        // Remove Id field (capital I) as it's an auto-increment primary key
        const { Id, quoteId, ...filteredDetail } = detail;
        const newDetail = {
          ...filteredDetail,
          quoteId: newQuoteId,
        };

        return connection.query("INSERT INTO quote_details SET ?", newDetail);
      });

      await Promise.all(insertPromises);
    }

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Result: newQuoteId,
      Message: "Quote successfully requoted",
    });
  } catch (error) {
    console.error("Error in quote-requote:", error);

    // Rollback transaction if something failed
    if (connection) {
      await connection.rollback();
    }

    return res.json({
      Status: false,
      Error: error.message || "Failed to create requote",
    });
  } finally {
    // Release connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});

// Convert quote to job order
router.post("/quote-makeJO", verifyUser, async (req, res) => {
  const { quoteId } = req.body;
  const employeeName = req.user.name;

  try {
    const connection = await pool.getConnection();

    try {
      // 1. Get quote data
      const quoteResult = await connection.query(
        "SELECT * FROM quotes WHERE quoteId = ?",
        [quoteId]
      );
      const quoteResults = quoteResult[0];

      if (!quoteResults.length) {
        return res.json({
          Status: false,
          Error: "Quote not found",
        });
      }

      const quoteData = quoteResults[0];

      // 2. Get quote details
      const quoteDetailsResult = await connection.query(
        "SELECT * FROM quote_details WHERE quoteId = ?",
        [quoteId]
      );
      const quoteDetails = quoteDetailsResult[0];

      // Start transaction
      await connection.beginTransaction();

      // 3. Create order data from quote
      const currentDate = new Date().toISOString().slice(0, 10);

      const orderData = {
        clientId: quoteData.clientId,
        projectName: quoteData.projectName,
        preparedBy: quoteData.preparedBy,
        orderDate: currentDate,
        orderedBy: quoteData.orderedBy,
        orderReference: quoteData.refId,
        cellNumber: quoteData.cellNumber,
        specialInst: quoteData.statusRem,
        deliveryInst: "",
        graphicsBy: quoteData.preparedBy, // Default to same as prepared by
        dueDate: quoteData.dueDate || null,
        dueTime: null,
        sample: 0,
        reprint: 0,
        totalAmount: quoteData.totalAmount,
        amountDisc: quoteData.amountDiscount,
        percentDisc: quoteData.percentDisc,
        grandTotal: quoteData.grandTotal,
        totalHrs: quoteData.totalHrs,
        terms: quoteData.terms,
        editedBy: employeeName,
        lastEdited: new Date(),
        status: "Open",
      };

      // 4. Insert order
      const orderResult = await connection.query(
        "INSERT INTO orders SET ?",
        orderData
      );
      const newOrderId = orderResult[0].insertId;

      // 5. Copy details to order
      if (quoteDetails.length > 0) {
        const orderDetailPromises = quoteDetails.map((detail) => {
          // Remove fields that shouldn't be copied
          const { id, quoteId, ...detailData } = detail;

          // Create new order detail
          const newDetail = {
            orderId: newOrderId,
            displayOrder: detailData.displayOrder,
            quantity: detailData.quantity || 0,
            width: detailData.width || 0,
            height: detailData.height || 0,
            unit: detailData.unit || "",
            material: detailData.material || "",
            itemDescription: detailData.itemDescription || "",
            squareFeet: detailData.squareFeet || 0,
            materialUsage: detailData.materialUsage || 0,
            persqft: detailData.persqft || 0,
            unitPrice: detailData.unitPrice || 0,
            discount: detailData.discount || 0,
            amount: detailData.amount || 0,
            printHrs: detailData.printHours || 0, // Map printHours from quote_details to printHrs in order_details
          };

          // Insert new order detail
          return connection.query("INSERT INTO order_details SET ?", newDetail);
        });

        await Promise.all(orderDetailPromises);
      }

      // 6. Update original quote status to Closed
      await connection.query(
        "UPDATE quotes SET status = 'Closed' WHERE quoteId = ?",
        [quoteId]
      );

      // Commit transaction
      await connection.commit();

      // Return success response with new order ID
      return res.json({
        Status: true,
        Result: newOrderId,
        Message: "Quote converted to job order successfully",
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      // Always release connection
      connection.release();
    }
  } catch (error) {
    console.error("Error in quote-makeJO:", error);
    return res.json({
      Status: false,
      Error: "Failed to convert quote to job order: " + error.message,
    });
  }
});

// Add quote
router.post("/add-quote", verifyUser, async (req, res) => {
  try {
    const {
      projectName,
      clientId,
      clientName = "", // Default empty string
      quoteDate,
      orderedBy,
      email = "", // Default empty string
      cellNumber = "", // Default empty string
      telNum = "", // Default empty string
      dueDate,
      terms,
      refId,
      statusRem,
      totalAmount,
      percentDisc,
      amountDiscount,
      grandTotal,
      totalHrs,
    } = req.body;

    // Set prepared by from user info
    const preparedBy = req.user.id;

    const quoteData = {
      projectName,
      clientId,
      clientName,
      quoteDate,
      orderedBy,
      email,
      cellNumber,
      telNum,
      dueDate,
      terms,
      refId,
      statusRem,
      totalAmount: totalAmount || 0,
      percentDisc: percentDisc || 0,
      amountDiscount: amountDiscount || 0,
      grandTotal: grandTotal || 0,
      totalHrs: totalHrs || 0,
      preparedBy,
      lastEdited: new Date(),
      status: "Open",
    };

    const result = await pool.query("INSERT INTO quotes SET ?", quoteData);
    const insertId = result[0].insertId;

    return res.json({
      Status: true,
      Message: "Quote created successfully",
      Result: {
        quoteId: insertId,
      },
    });
  } catch (error) {
    console.error("Error adding quote:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

// Add quote detail
router.post("/add-quote-detail", verifyUser, async (req, res) => {
  let connection;
  try {
    const {
      quoteId,
      displayOrder,
      itemDescription,
      quantity,
      width,
      height,
      unit,
      material,
      unitPrice,
      discount,
      amount,
      squareFeet,
      materialUsage,
      perSqFt,
      printHours,
    } = req.body;

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    const detailData = {
      quoteId,
      displayOrder,
      itemDescription,
      quantity: quantity || 0,
      width: width || 0,
      height: height || 0,
      unit: unit || "",
      material: material || "",
      unitPrice: unitPrice || 0,
      discount: discount || 0,
      amount: amount || 0,
      squareFeet: squareFeet || 0,
      materialUsage: materialUsage || 0,
      perSqFt: perSqFt || 0,
      printHours: printHours || 0,
    };

    // Insert the detail
    const result = await connection.query(
      "INSERT INTO quote_details SET ?",
      detailData
    );
    const insertId = result[0].insertId;

    // Calculate new totals
    const [detailsResults] = await connection.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as totalAmount,
        COALESCE(SUM(printHours), 0) as totalHours
      FROM quote_details 
      WHERE quoteId = ?`,
      [quoteId]
    );

    // Get current quote data for percentage discount
    const [quoteResults] = await connection.query(
      "SELECT percentDisc FROM quotes WHERE quoteId = ?",
      [quoteId]
    );

    if (quoteResults.length === 0) {
      await connection.rollback();
      return res.json({ Status: false, Error: "Quote not found" });
    }

    // Calculate final values
    const totalAmount = parseFloat(detailsResults[0].totalAmount) || 0;
    const totalHrs = parseFloat(detailsResults[0].totalHours) || 0;
    const percentDisc = parseFloat(quoteResults[0].percentDisc) || 0;
    const amountDiscount = (totalAmount * percentDisc) / 100;
    const grandTotal = totalAmount - amountDiscount;

    // Format numbers to avoid precision issues
    const formattedTotalAmount = parseFloat(totalAmount.toFixed(2));
    const formattedAmountDiscount = parseFloat(amountDiscount.toFixed(2));
    const formattedGrandTotal = parseFloat(grandTotal.toFixed(2));
    const formattedTotalHrs = parseFloat(totalHrs.toFixed(2));

    // Update quote with new totals
    await connection.query(
      `UPDATE quotes 
       SET totalAmount = ?,
           amountDiscount = ?,
           grandTotal = ?,
           totalHrs = ?,
           lastEdited = CURRENT_TIMESTAMP
       WHERE quoteId = ?`,
      [
        formattedTotalAmount,
        formattedAmountDiscount,
        formattedGrandTotal,
        formattedTotalHrs,
        quoteId,
      ]
    );

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Message: "Quote detail added successfully",
      Result: {
        id: insertId,
        totalAmount: formattedTotalAmount,
        amountDiscount: formattedAmountDiscount,
        grandTotal: formattedGrandTotal,
        totalHrs: formattedTotalHrs,
      },
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error adding quote detail:", error);
    return res.json({ Status: false, Error: error.message });
  } finally {
    // Release connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});

// Add new quote
router.post("/add_quote", verifyUser, async (req, res) => {
  let connection;
  try {
    const {
      clientId,
      clientName,
      projectName,
      preparedBy,
      quoteDate,
      orderedBy,
      refId,
      email,
      cellNumber,
      telNum,
      statusRem,
      dueDate,
      totalAmount,
      amountDiscount,
      percentDisc,
      grandTotal,
      totalHrs,
      editedBy,
      lastEdited,
      status,
      terms,
    } = req.body;

    // Get connection from pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // Insert quote
    const [result] = await connection.query(
      `INSERT INTO quotes (
        clientId, clientName, projectName, preparedBy, quoteDate,
        orderedBy, refId, email, cellNumber, telNum, statusRem,
        dueDate, totalAmount, amountDiscount, percentDisc,
        grandTotal, totalHrs, editedBy, lastEdited, status, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        clientName,
        projectName,
        preparedBy,
        quoteDate,
        orderedBy || null,
        refId || null,
        email || null,
        cellNumber || null,
        telNum || null,
        statusRem || null,
        dueDate || null,
        totalAmount || 0,
        amountDiscount || 0,
        percentDisc || 0,
        grandTotal || 0,
        totalHrs || 0,
        editedBy,
        lastEdited,
        status || "Open",
        terms || null,
      ]
    );

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Message: "Quote added successfully",
      QuoteID: result.insertId,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error adding quote:", error);
    return res.status(500).json({
      Status: false,
      Error: "Failed to add quote: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ============= DELETE Routes =============

// Delete quote detail
router.delete("/quote-detail-delete/:id", verifyUser, async (req, res) => {
  let connection;
  try {
    const detailId = req.params.id;

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // Get quoteId before deleting (for recalculation later)
    const [detailRows] = await connection.query(
      "SELECT quoteId FROM quote_details WHERE Id = ?",
      [detailId]
    );

    if (detailRows.length === 0) {
      await connection.rollback();
      return res.json({ Status: false, Error: "Quote detail not found" });
    }

    const quoteId = detailRows[0].quoteId;

    // Delete the detail
    await connection.query("DELETE FROM quote_details WHERE Id = ?", [
      detailId,
    ]);

    // Recalculate totals for the quote
    const [detailsResults] = await connection.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as totalAmount,
        COALESCE(SUM(printHours), 0) as totalHours
      FROM quote_details 
      WHERE quoteId = ?`,
      [quoteId]
    );

    // Get current quote data for percentage discount
    const [quoteResults] = await connection.query(
      "SELECT percentDisc FROM quotes WHERE quoteId = ?",
      [quoteId]
    );

    if (quoteResults.length === 0) {
      await connection.rollback();
      return res.json({ Status: false, Error: "Quote not found" });
    }

    // Calculate final values with proper number handling
    const totalAmount = parseFloat(detailsResults[0].totalAmount) || 0;
    const totalHrs = parseFloat(detailsResults[0].totalHours) || 0;
    const percentDisc = parseFloat(quoteResults[0].percentDisc) || 0;
    const amountDiscount = (totalAmount * percentDisc) / 100;
    const grandTotal = totalAmount - amountDiscount;

    // Format numbers to avoid precision issues
    const formattedTotalAmount = parseFloat(totalAmount.toFixed(2));
    const formattedAmountDiscount = parseFloat(amountDiscount.toFixed(2));
    const formattedGrandTotal = parseFloat(grandTotal.toFixed(2));
    const formattedTotalHrs = parseFloat(totalHrs.toFixed(2));

    // Update quote with new totals
    await connection.query(
      `UPDATE quotes 
       SET totalAmount = ?,
           amountDiscount = ?,
           grandTotal = ?,
           totalHrs = ?,
           lastEdited = CURRENT_TIMESTAMP
       WHERE quoteId = ?`,
      [
        formattedTotalAmount,
        formattedAmountDiscount,
        formattedGrandTotal,
        formattedTotalHrs,
        quoteId,
      ]
    );

    // Commit the transaction
    await connection.commit();

    return res.json({
      Status: true,
      Message: "Quote detail deleted successfully",
      Result: {
        totalAmount: formattedTotalAmount,
        amountDiscount: formattedAmountDiscount,
        grandTotal: formattedGrandTotal,
        totalHrs: formattedTotalHrs,
      },
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error in quote-detail-delete:", error);
    return res.json({ Status: false, Error: error.message });
  } finally {
    // Release connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});

// Delete quote and all its details
router.delete("/quote-delete/:id", verifyUser, async (req, res) => {
  try {
    const quoteId = req.params.id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Delete all quote details first
      await connection.query("DELETE FROM quote_details WHERE quoteId = ?", [
        quoteId,
      ]);

      // Then delete the quote
      const deleteResult = await connection.query(
        "DELETE FROM quotes WHERE quoteId = ?",
        [quoteId]
      );
      const deleteData = deleteResult[0];

      if (deleteData.affectedRows === 0) {
        await connection.rollback();
        return res.json({ Status: false, Error: "Quote not found" });
      }

      await connection.commit();
      return res.json({
        Status: true,
        Message: "Quote and all its details deleted successfully",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error in quote-delete:", error);
    return res.json({ Status: false, Error: error.message });
  }
});

export { router as QuoteRouter };
