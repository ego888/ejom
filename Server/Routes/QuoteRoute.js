import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Update the quotes route to handle pagination, sorting, filtering and search
router.get("/quotes", async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "quoteId",
    sortDirection = "DESC",
    search = "",
    statuses = "",
  } = req.query;

  const offset = (page - 1) * limit;
  const statusArray = statuses ? statuses.split(",") : [];

  try {
    // Build the WHERE clause for search and status filtering
    let whereClause = "1 = 1"; // Always true condition to start
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

    // Count total records query
    const countSql = `
            SELECT COUNT(DISTINCT q.quoteId) as total
            FROM quotes q
            LEFT JOIN client c ON q.clientId = c.id
            WHERE ${whereClause}
        `;

    // Main data query
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

    // Execute count query
    const [countResult] = await new Promise((resolve, reject) => {
      con.query(countSql, params, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    // Execute data query
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
    return res.json({ Status: true, Result: result[0] });
  });
});

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

// Update quote
router.put("/update_quote/:id", (req, res) => {
  console.log("Updating quote with data:", req.body);
  const id = req.params.id;

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
    id,
  ];

  console.log("Update values:", values);

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log("Update Error:", err);
      return res.json({ Status: false, Error: "Failed to update quote" });
    }
    console.log("Update result:", result);
    return res.json({ Status: true, Result: result });
  });
});

// Add order detail
router.post("/add_order_detail", (req, res) => {
  console.log("Insertfdsfsdafdsing data:", req.body);

  // Create a new object without printHrs first
  const { printHrs, ...otherData } = req.body;

  // Then add printHrs explicitly as a number
  const data = {
    ...otherData,
    printHrs: Number(printHrs || 0), // Explicitly convert to number
  };

  console.log("Data being inserted (after transformation):", data);
  console.log("printHrs value:", data.printHrs); // Log the specific value

  const sql = "INSERT INTO order_details SET ?";

  con.query(sql, data, (err, result) => {
    if (err) {
      console.log("SQL Error:", err);
      return res.json({ Status: false, Error: "Failed to add order detail" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Add this route for updating orders
router.put("/orders/:orderId", (req, res) => {
  const sql = `
        UPDATE orders 
        SET 
            orderDate = ?,
            preparedBy = ?,
            clientId = ?,
            projectName = ?,
            orderedBy = ?,
            orderReference = ?,
            cellNumber = ?,
            dueDate = ?,
            dueTime = ?,
            graphicsBy = ?,
            specialInst = ?,
            deliveryInst = ?,
            sample = ?,
            reprint = ?,
            totalAmount = ?,
            amountDisc = ?,
            percentDisc = ?,
            grandTotal = ?,
            terms = ?,
            lastEdited = ?,
            editedBy = ?
        WHERE orderID = ?
    `;

  const values = [
    req.body.orderDate,
    req.body.preparedBy,
    req.body.clientId,
    req.body.projectName,
    req.body.orderedBy,
    req.body.orderReference,
    req.body.cellNumber,
    req.body.dueDate,
    req.body.dueTime,
    req.body.graphicsBy,
    req.body.specialInst,
    req.body.deliveryInst,
    req.body.sample ? 1 : 0,
    req.body.reprint ? 1 : 0,
    req.body.totalAmount,
    req.body.amountDisc,
    req.body.percentDisc,
    req.body.grandTotal,
    req.body.terms || "",
    req.body.lastEdited,
    req.body.editedBy,
    req.params.orderId,
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log("Update Error:", err);
      return res.json({ Status: false, Error: "Failed to update order" });
    }
    return res.json({ Status: true, Result: result });
  });
});

router.post("/orders", (req, res) => {
  const sql = `
        INSERT INTO orders (
            clientId, projectName, preparedBy,
            orderDate, orderedBy, orderReference, cellNumber, 
            specialInst, deliveryInst, graphicsBy, dueDate, 
            dueTime, sample, reprint, totalAmount, amountDisc,
            percentDisc, grandTotal, terms, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    req.body.clientId,
    req.body.projectName,
    req.body.preparedBy,
    req.body.orderDate || null,
    req.body.orderedBy || "",
    req.body.orderReference || "",
    req.body.cellNumber || "",
    req.body.specialInst || "",
    req.body.deliveryInst || "",
    req.body.graphicsBy,
    req.body.dueDate || null,
    req.body.dueTime || null,
    req.body.sample ? 1 : 0,
    req.body.reprint ? 1 : 0,
    req.body.totalAmount || 0,
    req.body.amountDisc || 0,
    req.body.percentDisc || 0,
    req.body.grandTotal || 0,
    req.body.terms || "",
    "Open",
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log("Insert Error:", err);
      return res.json({ Status: false, Error: "Failed to create order" });
    }
    return res.json({ Status: true, Result: result.insertId });
  });
});

// Get order details
router.get("/order_details/:orderId", (req, res) => {
  const sql = `
        SELECT * FROM order_details 
        WHERE orderId = ? 
        ORDER BY displayOrder
    `;

  con.query(sql, [req.params.orderId], (err, result) => {
    if (err) {
      console.log("Select Error:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Delete order detail
router.delete("/order_detail/:orderId/:displayOrder", (req, res) => {
  const orderId = req.params.orderId;
  const displayOrder = req.params.displayOrder;

  const sql =
    "DELETE FROM order_details WHERE orderId = ? AND displayOrder = ?";

  con.query(sql, [orderId, displayOrder], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true });
  });
});

// Add this route for updating order details
router.put("/order_details/:orderId/:displayOrder", (req, res) => {
  // Destructure printHrs and other data
  const { printHrs, ...otherData } = req.body;

  // Create data object with printHrs as a number
  const data = {
    ...otherData,
    printHrs: Number(printHrs || 0), // Explicitly convert to number
  };

  console.log("Data being updated:", data);
  console.log("printHrs value:", data.printHrs);

  const sql =
    "UPDATE order_details SET ? WHERE orderId = ? AND displayOrder = ?";

  con.query(
    sql,
    [data, req.params.orderId, req.params.displayOrder],
    (err, result) => {
      if (err) {
        console.log("Update Error:", err);
        return res.json({
          Status: false,
          Error: "Failed to update order detail",
        });
      }
      return res.json({ Status: true, Result: result });
    }
  );
});

// Reorder order details
router.put("/order_details_reorder/:orderId", async (req, res) => {
  const orderId = req.params.orderId;
  const items = req.body.items;

  try {
    // Use a transaction to ensure all updates succeed or none do
    await new Promise((resolve, reject) => {
      con.beginTransaction((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    // Update each item's display order
    for (const item of items) {
      await new Promise((resolve, reject) => {
        const sql =
          "UPDATE order_details SET displayOrder = ? WHERE orderId = ? AND id = ?";
        con.query(sql, [item.displayOrder, orderId, item.id], (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
    }

    // Commit the transaction
    await new Promise((resolve, reject) => {
      con.commit((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    res.json({ Status: true });
  } catch (err) {
    // Rollback on error
    await new Promise((resolve) => {
      con.rollback(() => resolve());
    });
    console.log(err);
    res.json({ Status: false, Error: "Failed to reorder items" });
  }
});

// Update single detail's display order
router.put(
  "/order_detail_display_order/:orderId/:detailId/:oldDisplayOrder",
  (req, res) => {
    const { orderId, detailId, oldDisplayOrder } = req.params;
    const { displayOrder } = req.body;

    // Validate inputs
    if (!orderId || !displayOrder || !detailId || !oldDisplayOrder) {
      return res.json({ Status: false, Error: "Missing required parameters" });
    }

    const sql = `
        UPDATE order_details 
        SET displayOrder = ? 
        WHERE orderId = ? 
        AND orderId = ? 
        AND displayOrder = ?
    `;

    con.query(
      sql,
      [displayOrder, orderId, detailId, oldDisplayOrder],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.json({ Status: false, Error: "Query Error" });
        }
        return res.json({ Status: true });
      }
    );
  }
);

// Renumber all details with odd numbers
router.put("/renumber_order_details/:orderId", (req, res) => {
  // First get all details ordered by display_order
  const selectSql =
    "SELECT id FROM order_details WHERE orderId = ? ORDER BY displayOrder ASC";
  con.query(selectSql, [req.params.orderId], (err, details) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }

    // Update order's last edited info
    const orderUpdateSql =
      "UPDATE orders SET lastEdited = ?, editedBy = ? WHERE orderId = ?";
    con.query(
      orderUpdateSql,
      [req.body.lastEdited, req.body.editedBy, req.params.orderId],
      (err) => {
        if (err) {
          console.log(err);
          return res.json({ Status: false, Error: "Query Error" });
        }

        // Now update each detail with new odd numbers
        let updateCount = 0;
        details.forEach((detail, index) => {
          const newDisplayOrder = index * 2 + 1; // 1, 3, 5, ...
          const updateSql =
            "UPDATE order_details SET displayOrder = ? WHERE id = ?";
          con.query(updateSql, [newDisplayOrder, detail.id], (err) => {
            if (err) {
              console.log(err);
              return res.json({ Status: false, Error: "Query Error" });
            }
            updateCount++;
            if (updateCount === details.length) {
              return res.json({ Status: true });
            }
          });
        });
      }
    );
  });
});

// Update order detail display order
router.put("/quote_detail_display_order/:quoteId/:detailId", (req, res) => {
  const { quoteId, detailId } = req.params;
  const { displayOrder } = req.body;

  // Validate inputs
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

// Get order statuses
router.get("/quote-statuses", (req, res) => {
  const sql = "SELECT statusId, step FROM quoteStatus ORDER BY step";
  con.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});
// Add a route to get unique status options
router.get("/quote-statuses", (req, res) => {
  const sql = `
        SELECT DISTINCT status as statusId, 
        CASE 
            WHEN status = 'Open' THEN 1
            WHEN status = 'Printed' THEN 2
            WHEN status = 'Prod' THEN 3
            WHEN status = 'Finish' THEN 4
            WHEN status = 'Delivered' THEN 5
            WHEN status = 'Billed' THEN 6
            WHEN status = 'Close' THEN 7
            WHEN status = 'Cancel' THEN 8
            ELSE 9
        END as step
        FROM quoteStatus 
        WHERE status IS NOT NULL
        ORDER BY step
    `;

  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching status options:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Get quote details
router.get("/quote_details/:quoteId", (req, res) => {
  console.log("Fetching quote details for quoteId:", req.params.quoteId);

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
    console.log("Quote details result:", result);
    return res.json({ Status: true, Result: result });
  });
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

  console.log("Adding quote detail with data:", data);

  const sql = "INSERT INTO quote_details SET ?";
  con.query(sql, data, (err, result) => {
    if (err) {
      console.error("Error adding quote detail:", err);
      return res.json({ Status: false, Error: "Failed to add quote detail" });
    }
    return res.json({ Status: true });
  });
});

// Delete quote detail
router.delete("/quote_detail/:quoteId/:displayOrder", (req, res) => {
  const quoteId = req.params.quoteId;
  const displayOrder = req.params.displayOrder;

  const sql =
    "DELETE FROM quote_details WHERE quoteId = ? AND displayOrder = ?";

  con.query(sql, [quoteId, displayOrder], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true });
  });
});

// Update quote detail
router.put("/quote_details/:quoteId/:displayOrder", (req, res) => {
  console.log("Updating quote detail with data:", req.body);

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

  console.log("Formatted data for update:", data);

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
      console.log("Update result:", result);
      return res.json({ Status: true });
    }
  );
});

// Reorder quote details
router.put("/quote_details_reorder/:quoteId", async (req, res) => {
  const quoteId = req.params.quoteId;
  const items = req.body.items;

  try {
    // Use a transaction to ensure all updates succeed or none do
    await new Promise((resolve, reject) => {
      con.beginTransaction((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    // Update each item's display order
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

    // Commit the transaction
    await new Promise((resolve, reject) => {
      con.commit((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    res.json({ Status: true });
  } catch (err) {
    // Rollback on error
    await new Promise((resolve) => {
      con.rollback(() => resolve());
    });
    console.log(err);
    res.json({ Status: false, Error: "Failed to reorder items" });
  }
});

// Get next display order number for quote details
router.get("/next_display_quote/:quoteId", (req, res) => {
  const { quoteId } = req.params;
  const sql =
    "SELECT COALESCE(MAX(displayOrder), 0) as maxOrder FROM quote_details WHERE quoteId = ?";
  console.log("Quote ID:", quoteId);
  con.query(sql, [quoteId], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    // If maxOrder is 0, it means no records exist yet
    const maxOrder = result[0].maxOrder;
    const nextDisplayOrder = maxOrder === 0 ? 5 : maxOrder + 5;

    console.log("Current max order:", maxOrder);
    console.log("Next display order:", nextDisplayOrder);

    return res.json({
      Status: true,
      Result: nextDisplayOrder,
    });
  });
});

export { router as QuoteRouter };
