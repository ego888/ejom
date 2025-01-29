import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get all orders with pagination, sorting, filtering and search
router.get("/orders", async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "orderID",
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
                o.orderID LIKE ? OR 
                c.clientName LIKE ? OR 
                o.projectName LIKE ? OR 
                o.orderedBy LIKE ? OR 
                o.drnum LIKE ? OR 
                o.invoiceNum LIKE ? OR 
                o.ornum LIKE ? OR 
                e.name LIKE ? OR 
                o.orderReference LIKE ?
            )`;
      const searchTerm = `%${search}%`;
      params = [...params, ...Array(9).fill(searchTerm)];
    }

    if (statusArray.length > 0) {
      whereClause += ` AND o.status IN (${statusArray
        .map(() => "?")
        .join(",")})`;
      params = [...params, ...statusArray];
    }

    // Count total records query
    const countSql = `
            SELECT COUNT(DISTINCT o.orderID) as total
            FROM orders o
            LEFT JOIN client c ON o.clientId = c.id
            LEFT JOIN employee e ON o.preparedBy = e.id
            WHERE ${whereClause}
        `;

    // Main data query
    const dataSql = `
            SELECT 
                o.orderID as id, 
                o.clientId, 
                c.clientName, 
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
                o.ornum, 
                o.amountPaid, 
                o.datePaid,
                e.name as salesName, 
                o.orderReference
            FROM orders o
            LEFT JOIN client c ON o.clientId = c.id
            LEFT JOIN employee e ON o.preparedBy = e.id
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
    const orders = await new Promise((resolve, reject) => {
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
        orders,
        total: countResult.total,
        page: Number(page),
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    console.error("Error in orders route:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch orders",
      Details: err.message,
    });
  }
});

// Get sales employees (where sales = true)
router.get("/sales_employees", (req, res) => {
  const sql =
    "SELECT id, name FROM employee WHERE sales = true AND active = true ORDER BY name";
  con.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Get artists (where artist = true)
router.get("/artists", (req, res) => {
  const sql =
    "SELECT id, name FROM employee WHERE artist = true AND active = true ORDER BY name";
  con.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Get single order
router.get("/order/:id", (req, res) => {
  const sql = `
    SELECT 
      o.*,
      DATE_FORMAT(o.orderDate, '%Y-%m-%d') as orderDate,
      DATE_FORMAT(o.dueDate, '%Y-%m-%d') as dueDate,
      DATE_FORMAT(o.lastEdited, '%Y-%m-%d %H:%i:%s') as lastedited,
      c.clientName,
      e.name as preparedByName
    FROM orders o
    LEFT JOIN client c ON o.clientId = c.id
    LEFT JOIN employee e ON o.preparedBy = e.id
    WHERE o.orderID = ?
  `;

  con.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
});

// Get order details
router.get("/order_details/:orderId", (req, res) => {
  const sql = `
    SELECT * 
    FROM order_details 
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

// Add order
router.post("/add_order", verifyUser, (req, res) => {
  const sql = `
    INSERT INTO orders (
      clientId, projectName, preparedBy, orderDate, 
      orderedBy, orderReference, cellNumber, specialInst, 
      deliveryInst, graphicsBy, dueDate, dueTime, 
      sample, reprint, totalAmount, amountDisc, 
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

// Update order
router.put("/update_order/:id", (req, res) => {
  const sql = `
    UPDATE orders 
    SET 
      clientId = ?,
      projectName = ?,
      preparedBy = ?,
      orderDate = ?,
      orderedBy = ?,
      orderReference = ?,
      cellNumber = ?,
      specialInst = ?,
      deliveryInst = ?,
      graphicsBy = ?,
      dueDate = ?,
      dueTime = ?,
      sample = ?,
      reprint = ?,
      totalAmount = ?,
      amountDisc = ?,
      percentDisc = ?,
      grandTotal = ?,
      terms = ?,
      editedBy = ?,
      lastEdited = CURRENT_TIMESTAMP
    WHERE orderID = ?
  `;

  const values = [
    req.body.clientId,
    req.body.projectName,
    req.body.preparedBy,
    req.body.orderDate || null,
    req.body.orderedBy || null,
    req.body.orderReference || null,
    req.body.cellNumber || null,
    req.body.specialInst || null,
    req.body.deliveryInst || null,
    req.body.graphicsBy,
    req.body.dueDate || null,
    req.body.dueTime || null,
    req.body.sample ? 1 : 0,
    req.body.reprint ? 1 : 0,
    req.body.totalAmount || 0,
    req.body.amountDisc || 0,
    req.body.percentDisc || 0,
    req.body.grandTotal || 0,
    req.body.terms || null,
    req.body.editedBy,
    req.params.id,
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log("Update Error:", err);
      return res.json({ Status: false, Error: "Failed to update order" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Add order detail
router.post("/add_order_detail", (req, res) => {
  console.log("Inserting data:", req.body);

  // Create a new object without printHrs first
  const { printHrs, ...otherData } = req.body;

  // Then add printHrs explicitly as a number
  const data = {
    ...otherData,
    printHrs: Number(printHrs || 0), // Explicitly convert to number
    noPrint: 0, // Default value for new order details
  };

  console.log("Data being inserted (after transformation):", data);
  console.log("printHrs value:", data.printHrs);

  const sql = "INSERT INTO order_details SET ?";

  con.query(sql, data, (err, result) => {
    if (err) {
      console.log("SQL Error:", err);
      return res.json({ Status: false, Error: "Failed to add order detail" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Update order detail
router.put("/order_details/:orderId/:displayOrder", (req, res) => {
  const { printHrs, ...otherData } = req.body;
  const data = {
    ...otherData,
    printHrs: Number(printHrs || 0),
  };

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

// Update noPrint status
router.put("/order_detail_noprint/:orderId/:displayOrder", (req, res) => {
  const { orderId, displayOrder } = req.params;
  const { noPrint } = req.body;

  const sql = `
    UPDATE order_details 
    SET noPrint = ? 
    WHERE orderId = ? AND displayOrder = ?
  `;

  con.query(sql, [noPrint, orderId, displayOrder], (err, result) => {
    if (err) {
      console.log("Update Error:", err);
      return res.json({
        Status: false,
        Error: "Failed to update noPrint status",
      });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Update order's edited info and total hours
router.put("/orders/:orderId/update_edited_info", (req, res) => {
  const sql = `
    UPDATE orders 
    SET lastEdited = ?,
        editedBy = ?,
        totalHrs = ?
    WHERE orderID = ?
  `;

  con.query(
    sql,
    [
      req.body.lastEdited,
      req.body.editedBy,
      req.body.totalHrs,
      req.params.orderId,
    ],
    (err, result) => {
      if (err) {
        console.log("Error updating order edited info:", err);
        return res.json({
          Status: false,
          Error: "Failed to update order edited info",
        });
      }
      return res.json({ Status: true });
    }
  );
});

// Get units
router.get("/units", (req, res) => {
  const sql = "SELECT * FROM units ORDER BY unit";
  con.query(sql, (err, result) => {
    if (err) {
      console.log("Error fetching units:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Get next display order number for order details
router.get("/next_display_order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const sql =
    "SELECT COALESCE(MAX(displayOrder), 0) as maxOrder FROM order_details WHERE orderId = ?";

  console.log("Order ID:", orderId);
  con.query(sql, [orderId], (err, result) => {
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

export { router as OrderRouter };
