import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// ============= GET Routes =============

// Get all quotes with pagination, sorting, filtering and search
router.get("/quotes", async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "quoteId",
    sortDirection = "DESC",
    search = "",
    statuses = "",
    clients = "",
  } = req.query;

  const offset = (page - 1) * limit;
  const statusArray = statuses ? statuses.split(",") : [];
  const clientArray = clients ? clients.split(",") : [];

  try {
    let whereClause = "1 = 1";
    let params = [];

    if (search) {
      whereClause += ` AND (
                q.quoteId LIKE ? OR 
                c.clientId LIKE ? OR 
                q.projectName LIKE ? OR 
                q.preparedBy LIKE ? OR 
                q.status LIKE ? OR 
                q.refId LIKE ?
            )`;
      const searchTerm = `%${search}%`;
      params = [...params, ...Array(6).fill(searchTerm)];
    }

    if (statusArray.length > 0) {
      whereClause += ` AND q.status IN (${statusArray
        .map(() => "?")
        .join(",")})`;
      params = [...params, ...statusArray];
    }

    if (clientArray.length > 0) {
      whereClause += ` AND c.clientName IN (${clientArray
        .map(() => "?")
        .join(",")})`;
      params = [...params, ...clientArray];
    }

    const countSql = `
            SELECT COUNT(DISTINCT q.quoteId) as total
            FROM quotes q
            LEFT JOIN client c ON q.clientId = c.id
            WHERE ${whereClause}
        `;

    const dataSql = `
            SELECT 
                q.quoteId as id, 
                q.clientId, 
                c.clientName as clientName, 
                q.projectName, 
                q.preparedBy, 
                DATE_FORMAT(q.quoteDate, '%Y-%m-%d') as quoteDate,
                DATE_FORMAT(q.dueDate, '%Y-%m-%d') as dueDate,
                q.status, 
                q.totalAmount,
                q.amountDiscount,
                q.percentDisc,
                q.grandTotal,
                q.totalHrs,
                q.telNum,
                q.email,
                q.cellNumber,
                q.statusRem,
                q.refId,
                q.editedBy,
                q.terms,
                DATE_FORMAT(q.lastEdited, '%Y-%m-%d %H:%i:%s') as lastedited
            FROM quotes q
            LEFT JOIN client c ON q.clientId = c.id
            WHERE ${whereClause}
            ORDER BY ${sortBy} ${sortDirection}
            LIMIT ? OFFSET ?
        `;

    const [countResult] = await new Promise((resolve, reject) => {
      con.query(countSql, params, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    const quotes = await new Promise((resolve, reject) => {
      con.query(
        dataSql,
        [...params, Number(limit), Number(offset)],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    return res.json({
      Status: true,
      Result: {
        quotes,
        total: countResult.total,
        page: Number(page),
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    console.error("Error in quotes route:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch quotes",
      Details: err.message,
    });
  }
});

// Get single quote
router.get("/quote/:id", (req, res) => {
  const sql = `
    SELECT 
      q.*,
      DATE_FORMAT(q.quoteDate, '%Y-%m-%d') as quoteDate,
      DATE_FORMAT(q.dueDate, '%Y-%m-%d') as dueDate,
      DATE_FORMAT(q.lastEdited, '%Y-%m-%d %H:%i:%s') as lastedited,
      c.clientName,
      e.name as preparedByName
    FROM quotes q
    LEFT JOIN client c ON q.clientId = c.id
    LEFT JOIN employee e ON q.preparedBy = e.id
    WHERE q.quoteId = ?
  `;

  con.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }

    if (result.length === 0) {
      return res.json({ Status: false, Error: "Quote not found" });
    }

    // Convert decimal fields to float
    const quote = result[0];
    const parsedQuote = {
      ...quote,
      totalAmount: parseFloat(quote.totalAmount) || 0,
      amountDiscount: parseFloat(quote.amountDiscount) || 0,
      percentDisc: parseFloat(quote.percentDisc) || 0,
      grandTotal: parseFloat(quote.grandTotal) || 0,
      totalHrs: parseFloat(quote.totalHrs) || 0,
    };

    console.log("Processed Quote:", parsedQuote); // Debug log

    return res.json({ Status: true, Result: parsedQuote });
  });
});

// Get next display order for quote details
router.get("/next_display_quote/:quoteId", (req, res) => {
  const { quoteId } = req.params;
  const sql =
    "SELECT COALESCE(MAX(displayOrder), 0) as maxOrder FROM quote_details WHERE quoteId = ?";

  con.query(sql, [quoteId], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    const maxOrder = result[0].maxOrder;
    const nextDisplayOrder = maxOrder === 0 ? 5 : maxOrder + 5;
    return res.json({ Status: true, Result: nextDisplayOrder });
  });
});

// Get quote details
router.get("/quote_details/:quoteId", (req, res) => {
  const sql = `
    SELECT * FROM quote_details 
    WHERE quoteId = ? 
    ORDER BY displayOrder
  `;

  con.query(sql, [req.params.quoteId], (err, result) => {
    if (err) {
      console.log("Select Error:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Get quote statuses
router.get("/quote-statuses", (req, res) => {
  const sql = `
    SELECT 
      statusId,
      step
    FROM quoteStatus 
    ORDER BY step ASC
  `;

  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching status options:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// ============= PUT Routes =============

// Update quote's last edited info and total hours
router.put("/quotes/:quoteId/update_edited_info", (req, res) => {
  const sql = `
    UPDATE quotes 
    SET last_edited = ?,
        edited_by = ?,
        total_hrs = ?
    WHERE quote_id = ?
  `;

  con.query(
    sql,
    [
      req.body.lastEdited,
      req.body.editedBy,
      req.body.totalHrs,
      req.params.quoteId,
    ],
    (err, result) => {
      if (err) {
        console.log("Error updating quote edited info:", err);
        return res.json({
          Status: false,
          Error: "Failed to update quote edited info",
        });
      }
      return res.json({ Status: true });
    }
  );
});

// Update quote all fields
router.put("/update_quote/:id", (req, res) => {
  const sql = `
    UPDATE quotes 
    SET 
        clientId = ?,
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
        lastEdited = CURRENT_TIMESTAMP
    WHERE quoteId = ?
  `;

  const values = [
    req.body.clientId,
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
    req.params.id,
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log("Update Error:", err);
      return res.json({ Status: false, Error: "Failed to update quote" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Update quote totals
router.put("/quotes/update_totals/:id", (req, res) => {
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

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log("Update Totals Error:", err);
      return res.json({
        Status: false,
        Error: "Failed to update quote totals",
      });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Update quote detail display order. Updates a single detail's order
router.put("/quote_detail_display_order/:quoteId/:detailId", (req, res) => {
  const { quoteId, detailId } = req.params;
  const { displayOrder } = req.body;

  if (!quoteId || !displayOrder || !detailId) {
    return res.json({ Status: false, Error: "Missing required parameters" });
  }

  const sql = `
    UPDATE quote_details 
    SET displayOrder = ? 
    WHERE quoteId = ? 
    AND id = ?
  `;

  con.query(sql, [displayOrder, quoteId, detailId], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true });
  });
});

// Reorder quote details. Updates multiple details' orders at once
router.put("/quote_details_reorder/:quoteId", async (req, res) => {
  const quoteId = req.params.quoteId;
  const items = req.body.items;

  try {
    await new Promise((resolve, reject) => {
      con.beginTransaction((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    for (const item of items) {
      await new Promise((resolve, reject) => {
        const sql =
          "UPDATE quote_details SET displayOrder = ? WHERE quoteId = ? AND id = ?";
        con.query(sql, [item.displayOrder, quoteId, item.id], (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
    }

    await new Promise((resolve, reject) => {
      con.commit((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    res.json({ Status: true });
  } catch (err) {
    await new Promise((resolve) => {
      con.rollback(() => resolve());
    });
    console.log(err);
    res.json({ Status: false, Error: "Failed to reorder items" });
  }
});

// Update quote details
router.put("/quote_details/:quoteId/:displayOrder", (req, res) => {
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

  const sql = `
    UPDATE quote_details 
    SET ? 
    WHERE quoteId = ? AND displayOrder = ?
  `;

  con.query(
    sql,
    [data, req.params.quoteId, req.params.displayOrder],
    (err, result) => {
      if (err) {
        console.log("Error updating quote detail:", err);
        return res.json({
          Status: false,
          Error: "Failed to update quote detail",
        });
      }
      return res.json({ Status: true });
    }
  );
});

// Update quote status
router.put("/quote/status/:id", (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  console.log("quoteId:", id, "Status:", status);
  const sql = "UPDATE quotes SET status = ? WHERE quoteId = ?";
  con.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error("Error updating quote status:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// ============= POST Routes =============

// Add quote
router.post("/add_quote", verifyUser, (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.json({ Status: false, Error: "No token provided" });
    }

    const decoded = jwt.verify(token, "jwt_secret_key");
    const editedBy = decoded.id;

    const sql = `
      INSERT INTO quotes (
        clientId, projectName, preparedBy,
        quoteDate, orderedBy, refId, email, 
        cellNumber, telNum, statusRem, dueDate, 
        totalAmount, amountDiscount, percentDisc, 
        grandTotal, totalHrs, editedBy, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      req.body.clientId,
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
      editedBy,
      req.body.terms || null,
    ];

    con.query(sql, values, (err, result) => {
      if (err) {
        console.log(err);
        return res.json({ Status: false, Error: "Query Error" });
      }
      return res.json({
        Status: true,
        Result: result,
        QuoteID: result.insertId,
      });
    });
  } catch (error) {
    console.log("Token Error:", error);
    return res.json({ Status: false, Error: "Invalid token" });
  }
});

// Add quote detail
router.post("/add_quote_detail", (req, res) => {
  const data = {
    quoteId: req.body.quoteId,
    displayOrder: req.body.displayOrder,
    quantity: req.body.quantity || 0,
    width: req.body.width || 0,
    height: req.body.height || 0,
    unit: req.body.unit || "",
    material: req.body.material || "",
    itemDescription: req.body.itemDescription || "",
    unitPrice: req.body.unitPrice || 0,
    discount: req.body.discount || 0,
    amount: req.body.amount || 0,
    squareFeet: req.body.squareFeet || 0,
    materialUsage: req.body.materialUsage || 0,
    perSqFt: req.body.perSqFt || 0,
    printHours: req.body.printHours || 0,
  };

  const sql = "INSERT INTO quote_details SET ?";
  con.query(sql, data, (err, result) => {
    if (err) {
      console.error("Error adding quote detail:", err);
      return res.json({ Status: false, Error: "Failed to add quote detail" });
    }
    return res.json({ Status: true });
  });
});

// ============= DELETE Routes =============

// Delete quote detail
router.delete("/quote_detail/:quoteId/:displayOrder", (req, res) => {
  const sql =
    "DELETE FROM quote_details WHERE quoteId = ? AND displayOrder = ?";

  con.query(
    sql,
    [req.params.quoteId, req.params.displayOrder],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.json({ Status: false, Error: "Query Error" });
      }
      return res.json({ Status: true });
    }
  );
});

export { router as QuoteRouter };
