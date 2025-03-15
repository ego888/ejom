import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Get all orders w/o payment info with pagination, sorting, filtering and search
router.get("/orders-min", async (req, res) => {
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
    const forProdSort = req.query.forProdSort;

    // Handle forProd sorting
    if (forProdSort === "asc" || forProdSort === "desc") {
      sortBy = "forProd";
      sortDirection = forProdSort;
    }

    // Build where clause
    let whereConditions = ["1=1"]; // Always true condition to start
    let params = [];

    if (search) {
      whereConditions.push(
        "(o.orderID LIKE ? OR c.clientName LIKE ? OR o.projectName LIKE ? OR o.orderedBy LIKE ? OR o.drnum LIKE ? OR o.invoiceNum LIKE ? OR e.name LIKE ? OR o.grandTotal LIKE ? OR o.orderReference LIKE ?)"
      );
      const searchParam = `%${search}%`;
      params.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam
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
      whereConditions.push(`o.clientId IN (?)`);
      params.push(clients);
    }

    const whereClause = whereConditions.join(" AND ");

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
        e.name as salesName, 
        o.orderReference
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    // Execute data query with proper parameter order
    const orders = await new Promise((resolve, reject) => {
      con.query(dataSql, [...params, limit, offset], (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT o.orderID) as total
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE ${whereClause}
    `;

    // Execute count query
    const [countResult] = await new Promise((resolve, reject) => {
      con.query(countSql, params, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
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

// Get all orders with pagination, sorting, filtering and search
router.get("/orders", async (req, res) => {
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
    const forProdSort = req.query.forProdSort;

    // Handle forProd sorting
    if (forProdSort === "asc" || forProdSort === "desc") {
      sortBy = "forProd";
      sortDirection = forProdSort;
    }

    // Build where clause
    let whereConditions = ["1=1"]; // Always true condition to start
    let params = [];

    if (search) {
      whereConditions.push(
        "(o.orderID LIKE ? OR c.clientName LIKE ? OR o.projectName LIKE ? OR o.orderedBy LIKE ? OR o.drnum LIKE ? OR o.invoiceNum LIKE ? OR e.name LIKE ? OR o.grandTotal LIKE ? OR o.orderReference LIKE ?)"
      );
      const searchParam = `%${search}%`;
      params.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam
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
      whereConditions.push(`o.clientId IN (?)`);
      params.push(clients);
    }

    const whereClause = whereConditions.join(" AND ");

    // Main data query
    const dataSql = `
      SELECT 
        o.orderID as id, 
        o.revision,
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

    // Execute data query with proper parameter order
    const orders = await new Promise((resolve, reject) => {
      con.query(dataSql, [...params, limit, offset], (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT o.orderID) as total
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE ${whereClause}
    `;

    // Execute count query
    const [countResult] = await new Promise((resolve, reject) => {
      con.query(countSql, params, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
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

// Get single order
router.get("/order/:id", (req, res) => {
  const sql = `
    SELECT 
      o.*,
      DATE_FORMAT(o.orderDate, '%Y-%m-%d') as orderDate,
      DATE_FORMAT(o.dueDate, '%Y-%m-%d') as dueDate,
      DATE_FORMAT(o.lastEdited, '%Y-%m-%d %H:%i:%s') as lastedited,
      DATE_FORMAT(o.drDate, '%Y-%m-%d') as drDate,
      DATE_FORMAT(o.productionDate, '%Y-%m-%d %H:%i:%s') as productionDate,
      DATE_FORMAT(o.deliveryDate, '%Y-%m-%d %H:%i:%s') as deliveryDate,
      DATE_FORMAT(o.billDate, '%Y-%m-%d %H:%i:%s') as billDate,
      DATE_FORMAT(o.readyDate, '%Y-%m-%d %H:%i:%s') as readyDate,
      c.clientName,
      c.customerName,
      e.name as preparedByName,
      e2.name as graphicsByName
    FROM orders o
    LEFT JOIN client c ON o.clientId = c.id
    LEFT JOIN employee e ON o.preparedBy = e.id
    LEFT JOIN employee e2 ON o.graphicsBy = e2.id
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

// Get orders marked for production
router.get("/orders-details-forprod", async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.orderID as id,
        o.revision,
        o.clientId,
        o.projectName,
        o.dueDate,
        o.dueTime,
        c.clientName,
        od.quantity,
        od.width,
        od.height,
        od.unit,
        od.material,
        od.printHrs,
        od.squareFeet,
        od.displayOrder
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN order_details od ON o.orderID = od.orderId
      WHERE o.forProd = 1
      ORDER BY o.orderID ASC, od.displayOrder ASC`;

    con.query(sql, (err, result) => {
      if (err) {
        console.log(err);
        return res.json({ Status: false, Error: "Query Error" });
      }
      return res.json({ Status: true, Result: result });
    });
  } catch (error) {
    return res.json({ Status: false, Error: "Query Error" + error });
  }
});

// Get orders with artist incentive details
router.get("/orders-details-artistIncentive", async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.orderId,
        o.revision,
        o.projectName,
        o.dueDate,
        o.dueTime,
        c.clientName,
        o.productionDate,
        o.status,
        od.Id,
        od.quantity,
        od.width,
        od.height,
        od.unit,
        od.material,
        od.artistIncentive,
        od.major,
        od.minor
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.Id
      LEFT JOIN order_details od ON o.orderID = od.orderId
      LEFT JOIN material m ON od.material = m.material
      WHERE o.status = 'Prod' 
        AND (o.productionDate IS NOT NULL AND o.productionDate + INTERVAL 48 HOUR > NOW())
        AND (m.noIncentive = 0)
      ORDER BY o.orderID ASC, od.displayOrder ASC`;

    const result = await new Promise((resolve, reject) => {
      con.query(sql, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error("Error fetching artist incentive details:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch artist incentive details",
    });
  }
});

// Add this route to update forProd checkbox
router.put("/update-forprod/:id", (req, res) => {
  const orderId = req.params.id;
  const { forProd } = req.body;

  const sql = "UPDATE Orders SET forProd = ? WHERE orderID = ?";
  con.query(sql, [forProd, orderId], (err, result) => {
    if (err) {
      console.error("Error updating forProd status:", err);
      return res.json({
        Status: false,
        Error: "Error updating forProd status",
      });
    }

    if (result.affectedRows > 0) {
      return res.json({
        Status: true,
        Message: "Order forProd status updated successfully",
      });
    } else {
      return res.json({ Status: false, Message: "Order not found" });
    }
  });
});

// Update orders to change status to 'Prod' and productionDate to NOW() where forProd is 1 and status is 'Open'
router.put("/update_orders_to_prod", (req, res) => {
  const sql = `
    UPDATE orders
    SET status = 'Prod',
        productionDate = NOW(),
        forProd = 0
    WHERE forProd = 1
      AND (status = 'Open' OR status = 'Printed');
  `;
  con.query(sql, (err, result) => {
    if (err) {
      console.log("Update Error:", err);
      return res.json({ Status: false, Error: "Failed to update orders" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Update orders status with corresponding dates and logging
router.put("/update_order_status", verifyUser, async (req, res) => {
  const { orderId, newStatus } = req.body;
  const employeeName = req.user.name;

  try {
    // First check current status
    const [currentOrder] = await new Promise((resolve, reject) => {
      con.query(
        "SELECT status, log FROM orders WHERE orderID = ?",
        [orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    if (!currentOrder) {
      return res.json({
        Status: false,
        Error: "Order not found",
      });
    }

    const restrictedStatuses = ["Billed", "Closed", "Cancel"];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    let logMessage = "";
    let statusToSet = newStatus;
    let isRestricted = false;

    // Handle status change rules
    if (currentOrder.status === "Billed" || currentOrder.status === "Closed") {
      // Don't change status, but log the attempt
      statusToSet = currentOrder.status;
      logMessage = `\n${employeeName}:${currentOrder.status}-${newStatus} ${now}`;
      isRestricted = true;
    } else if (currentOrder.status === "Cancel") {
      // Allow status change from Cancel, but log it
      statusToSet = newStatus;
      logMessage = `\n${employeeName}:${currentOrder.status}-${newStatus} ${now}`;
      isRestricted = true;
    } else if (restrictedStatuses.includes(currentOrder.status)) {
      // For other restricted statuses, just log the attempt
      logMessage = `\n${employeeName}:${currentOrder.status}-${newStatus} ${now}`;
      isRestricted = true;
    }

    // Start transaction
    await new Promise((resolve, reject) => {
      con.beginTransaction((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    // Build update query
    let sql = `
      UPDATE orders 
      SET status = ?
    `;
    const params = [statusToSet];

    // Only add date updates if not restricted
    if (!isRestricted) {
      if (statusToSet === "Finished") {
        sql += `, readyDate = NOW()`;
      } else if (statusToSet === "Delivered") {
        sql += `, deliveryDate = NOW()`;
      } else if (statusToSet === "Billed") {
        sql += `, billDate = NOW()`;
      }
    }

    // Add log update if needed
    if (logMessage) {
      sql += `, log = RIGHT(CONCAT(IFNULL(log, ''), ?), 255)`;
      params.push(logMessage);
    }

    sql += ` WHERE orderID = ?`;
    params.push(orderId);

    // Execute update
    await new Promise((resolve, reject) => {
      con.query(sql, params, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      con.commit((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    return res.json({
      Status: true,
      Result: {
        updated: true,
        logged: !!logMessage,
        statusChanged: statusToSet === newStatus,
        finalStatus: statusToSet,
        datesUpdated: !isRestricted,
      },
      Message: `Order ${
        statusToSet === newStatus
          ? `status updated to ${statusToSet}`
          : `remains ${statusToSet}`
      }${logMessage ? " (with logging)" : ""}`,
    });
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      con.rollback(() => resolve());
    });

    console.error("Update Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update order status",
      Details: error.message,
    });
  }
});

// Update orders with DR number, update jomcontrol with lastDR number, with transaction rollback feature.
router.put("/update_orders_drnum", (req, res) => {
  const updates = req.body; // Expecting an array of { orderID, drnum, drDate }

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.json({ Status: false, Error: "Invalid input data" });
  }

  const lastDRNumber = updates[updates.length - 1].drnum;
  const cases = updates
    .map((order) => `WHEN orderID = ${order.orderID} THEN '${order.drnum}'`)
    .join(" ");
  const dateCases = updates
    .map((order) => `WHEN orderID = ${order.orderID} THEN '${order.drDate}'`)
    .join(" ");
  const orderIDs = updates.map((order) => order.orderID).join(", ");
  console.log("lastDRNumber", lastDRNumber);
  console.log("orderIDs", orderIDs);

  // First get the current lastDRNumber from jomcontrol
  const sqlSelectLastDRNumber = `
    SELECT lastDRNumber FROM jomcontrol WHERE controlId = 1;
  `;

  con.query(sqlSelectLastDRNumber, (err, result) => {
    if (err) {
      console.error("Error getting lastDRNumber:", err);
      return res.json({ Status: false, Error: "Failed to get lastDRNumber" });
    }

    let currentLastDRNumber = result[0].lastDRNumber;
    let finalDRNumber = Math.max(lastDRNumber, currentLastDRNumber);

    console.log("dateCases", dateCases);
    const sqlUpdateOrders = `
      UPDATE orders
      SET drnum = CASE ${cases} END,
          drDate = CASE ${dateCases} END
      WHERE orderID IN (${orderIDs});
    `;

    const sqlUpdateJomControl = `
      UPDATE jomcontrol
      SET lastDRNumber = ${finalDRNumber}
      WHERE controlId = 1;
    `;

    // Start MySQL transaction
    con.beginTransaction((err) => {
      if (err) {
        console.error("Transaction Error:", err);
        return res.json({
          Status: false,
          Error: "Failed to start transaction",
        });
      }

      // 1️⃣ Step 1: Update `orders` table
      con.query(sqlUpdateOrders, (err, result) => {
        if (err) {
          console.error("Update Orders Error:", err);
          return con.rollback(() => {
            res.json({ Status: false, Error: "Failed to update orders" });
          });
        }

        // 2️⃣ Step 2: Update `jomcontrol` table with last DR number
        con.query(sqlUpdateJomControl, [finalDRNumber], (err, result) => {
          if (err) {
            console.error("Update JomControl Error:", err);
            return con.rollback(() => {
              res.json({ Status: false, Error: "Failed to update jomcontrol" });
            });
          }

          // 3️⃣ Step 3: If both updates succeed, commit the transaction
          con.commit((err) => {
            if (err) {
              console.error("Commit Error:", err);
              return con.rollback(() => {
                res.json({
                  Status: false,
                  Error: "Failed to commit transaction",
                });
              });
            }
            res.json({
              Status: true,
              Message: "Orders and JomControl updated successfully",
            });
          });
        });
      });
    });
  });
});

// Get all orders without DR number and status is Prod, Finish or Delivered
router.get("/orders-all-DR", async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.orderID as id,
        o.clientId,
        o.projectName,
        c.clientName,
        o.deliveryInst,
        o.drnum,
        o.drDate,
        od.quantity,
        od.width,
        od.height,
        od.unit,
        od.material,
        od.itemDescription,
        od.displayOrder
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN order_details od ON o.orderID = od.orderId AND od.noPrint = 0 AND od.perSqFt > 0
      WHERE !o.drnum 
        AND (o.status = 'Prod' OR o.status = 'Finish' OR o.status = 'Delivered')
      ORDER BY o.orderID ASC, od.displayOrder ASC;
`;

    con.query(sql, (err, result) => {
      if (err) {
        console.log(err);
        return res.json({ Status: false, Error: "Query Error" });
      }
      console.log("result", result);
      // Restructure the data to group order details by order
      const ordersMap = new Map();

      result.forEach((row) => {
        if (!ordersMap.has(row.id)) {
          // Create new order entry
          ordersMap.set(row.id, {
            id: row.id,
            clientId: row.clientId,
            projectName: row.projectName,
            dueDate: row.dueDate,
            dueTime: row.dueTime,
            clientName: row.clientName,
            deliveryInst: row.deliveryInst,
            drnum: row.drnum,
            drDate: row.drDate,
            order_details: [],
          });
        }

        // Add order details if they exist

        ordersMap.get(row.id).order_details.push({
          quantity: row.quantity,
          width: row.width,
          height: row.height,
          unit: row.unit,
          material: row.material,
          itemDescription: row.itemDescription,
          displayOrder: row.displayOrder,
        });
      });

      // Convert map to array
      const orders = Array.from(ordersMap.values());

      return res.json({ Status: true, Result: orders });
    });
  } catch (error) {
    return res.json({ Status: false, Error: "Query Error" + error });
  }
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

// Add order
router.post("/add_order", verifyUser, (req, res) => {
  const sql = `
    INSERT INTO orders (
      clientId, projectName, preparedBy, orderDate, 
      orderedBy, orderReference, cellNumber, specialInst, 
      deliveryInst, graphicsBy, dueDate, dueTime, 
      sample, reprint, totalAmount, amountDisc, 
      percentDisc, grandTotal, terms, status, totalHrs, editedBy, lastEdited
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  console.log("Add order req.body", req.body);
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
    req.body.totalHrs,
    req.body.editedBy,
    new Date().toLocaleString("sv-SE").replace(",", ""),
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

// Update order detail artist incentives
router.put("/order_details/update_incentives", async (req, res) => {
  try {
    const updates = req.body;
    console.log("Received updates:", updates);

    // Process each update
    for (const update of updates) {
      const sql = `
        UPDATE order_details 
        SET 
          artistIncentive = ?,
          major = ?,
          minor = ?
        WHERE Id = ?
      `;

      await new Promise((resolve, reject) => {
        con.query(
          sql,
          [update.artistIncentive, update.major, update.minor, update.Id],
          (err, result) => {
            if (err) reject(err);
            resolve(result);
          }
        );
      });
    }

    return res.json({
      Status: true,
      Message: "Updates completed successfully",
    });
  } catch (err) {
    console.error("Error updating artist incentives:", err);
    return res.json({
      Status: false,
      Error: "Failed to update artist incentives",
    });
  }
});

// Update order detail artist incentives
router.put(
  "/order_details/update_incentives_calculation",
  verifyUser,
  async (req, res) => {
    try {
      const updates = req.body;
      console.log("Received updates:", updates);

      // Process each update
      for (const update of updates) {
        const sql = `
        UPDATE order_details 
        SET artistIncentiveAmount = ?
        WHERE Id = ?
      `;

        await new Promise((resolve, reject) => {
          con.query(sql, [update.artistIncentive, update.Id], (err, result) => {
            if (err) reject(err);
            resolve(result);
          });
        });
      }

      return res.json({
        Status: true,
        Message: "Updates completed successfully",
      });
    } catch (err) {
      console.error("Error updating artist incentives:", err);
      return res.json({
        Status: false,
        Error: "Failed to update artist incentives: " + err.message,
      });
    }
  }
);

// Update order detail sales incentives
router.put(
  "/order_details/update_sales_incentives_calculation",
  verifyUser,
  async (req, res) => {
    try {
      const updates = req.body;
      console.log("Received updates:", updates);

      // Process each update
      for (const update of updates) {
        const sql = `
        UPDATE order_details 
        SET salesIncentive = ?,
            overideIncentive = ?
        WHERE Id = ?
      `;

        await new Promise((resolve, reject) => {
          con.query(
            sql,
            [update.salesIncentive, update.overideIncentive, update.Id],
            (err, result) => {
              if (err) reject(err);
              resolve(result);
            }
          );
        });
      }

      return res.json({
        Status: true,
        Message: "Updates completed successfully",
      });
    } catch (err) {
      console.error("Error updating sales incentives:", err);
      return res.json({
        Status: false,
        Error: "Failed to update sales incentives: " + err.message,
      });
    }
  }
);

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

// Update display order by detail ID
router.put("/order_details-displayOrder/:detailId", (req, res) => {
  const { detailId } = req.params;
  const { displayOrder } = req.body;

  if (!displayOrder || isNaN(displayOrder)) {
    return res.json({
      Status: false,
      Error: "Invalid display order value",
    });
  }

  const sql = "UPDATE order_details SET displayOrder = ? WHERE Id = ?";

  con.query(sql, [displayOrder, detailId], (err, result) => {
    if (err) {
      console.log("Update Error:", err);
      return res.json({
        Status: false,
        Error: "Failed to update display order",
      });
    }

    if (result.affectedRows === 0) {
      return res.json({
        Status: false,
        Error: "Order detail not found",
      });
    }

    return res.json({
      Status: true,
      Result: result,
    });
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

// Add order detail
router.post("/add_order_detail", (req, res) => {
  console.log("Inserting data:", req.body);

  // Extract `printHrs` and `noPrint`, ensuring they are numbers and default to 0 if empty or null
  const { printHrs, noPrint, ...otherData } = req.body;

  const data = {
    ...otherData,
    printHrs: Number(printHrs) || 0, // Convert to number, default to 0
    noPrint: Number(noPrint) || 0, // Convert to number, default to 0
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

// Search orders by client name
router.get("/search-orders-by-client", async (req, res) => {
  try {
    const clientName = req.query.clientName;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;
    const statuses = req.query.statuses ? req.query.statuses.split(",") : [];
    //    const sales = req.query.sales ? req.query.sales.split(",") : [];
    let sortBy = req.query.sortBy || "orderID";
    let sortDirection = req.query.sortDirection || "desc";

    // Build where clause
    let whereConditions = ["c.clientName LIKE ?"]; // Start with client name search
    let params = [`%${clientName}%`];

    if (statuses.length) {
      whereConditions.push(`o.status IN (?)`);
      params.push(statuses);
    }

    // if (sales.length) {
    //   whereConditions.push(`o.preparedBy IN (?)`);
    //   params.push(sales);
    // }

    const whereClause = whereConditions.join(" AND ");

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT o.orderID) as total
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE ${whereClause}
    `;

    // Main data query - using same fields as regular order search
    const ordersSql = `
      SELECT 
        o.orderID as id, 
        o.revisionNumber,
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

    // Execute orders query
    const orders = await new Promise((resolve, reject) => {
      con.query(
        ordersSql,
        [...params, Number(limit), Number(offset)],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });
    console.log("orders", orders);
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
    console.error("Error in search-orders-by-client route:", err);
    return res.json({
      Status: false,
      Error: "Failed to search orders",
      Details: err.message,
    });
  }
});

// Add route to get WTax types
router.get("/wtax-types", async (req, res) => {
  try {
    const sql = "SELECT * FROM WTax";
    const wtaxTypes = await new Promise((resolve, reject) => {
      con.query(sql, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });

    return res.json({
      Status: true,
      Result: wtaxTypes,
    });
  } catch (err) {
    console.error("Error fetching WTax types:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch WTax types",
    });
  }
});

// Add this new route
router.get("/order/ReviseNumber/:id", verifyUser, async (req, res) => {
  const orderId = req.params.id;

  try {
    // Start a transaction
    await new Promise((resolve, reject) => {
      con.beginTransaction((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    // Get current revision number
    const [orderResult] = await new Promise((resolve, reject) => {
      con.query(
        "SELECT revision FROM orders WHERE orderId = ?",
        [orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    const currentRevision = orderResult.revision || 0;
    const newRevision = currentRevision + 1;

    // Update order with new revision number and status
    await new Promise((resolve, reject) => {
      con.query(
        "UPDATE orders SET revision = ?, status = 'Open' WHERE orderId = ?",
        [newRevision, orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    // Commit the transaction
    await new Promise((resolve, reject) => {
      con.commit((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    return res.json({
      Status: true,
      revision: newRevision,
    });
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      con.rollback(() => resolve());
    });

    console.error("Error revising order:", error);
    return res.json({
      Status: false,
      Error: "Failed to revise order: " + error.message,
    });
  }
});

// Update order with invoice number and set to billed
router.put("/update_order_invoice", verifyUser, async (req, res) => {
  const { orderId, invNumber } = req.body;

  try {
    // First check current status
    const [currentOrder] = await new Promise((resolve, reject) => {
      con.query(
        "SELECT status FROM orders WHERE orderID = ?",
        [orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    if (!currentOrder) {
      return res.json({
        Status: false,
        Error: "Order not found",
      });
    }

    const billableStatuses = [
      "Open",
      "Printed",
      "Prod",
      "Finished",
      "Delivered",
    ];
    if (!billableStatuses.includes(currentOrder.status)) {
      return res.json({
        Status: false,
        Error: `${currentOrder.status} order cannot be billed anymore.`,
      });
    }

    // Start transaction
    await new Promise((resolve, reject) => {
      con.beginTransaction((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    // Update order
    await new Promise((resolve, reject) => {
      con.query(
        `UPDATE orders 
         SET status = 'Billed',
             invoiceNum = ?,
             billDate = NOW()
         WHERE orderID = ?`,
        [invNumber, orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      con.commit((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    return res.json({
      Status: true,
      Message: "Invoice updated and order marked as billed",
    });
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      con.rollback(() => resolve());
    });

    console.error("Update Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update invoice",
      Details: error.message,
    });
  }
});

// Admin status update route
router.put("/admin-status-update", verifyUser, async (req, res) => {
  const { orderId, newStatus } = req.body;
  const employeeName = req.user.name;

  try {
    // First check current status
    const [currentOrder] = await new Promise((resolve, reject) => {
      con.query(
        "SELECT status, log FROM orders WHERE orderID = ?",
        [orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    if (!currentOrder) {
      return res.json({
        Status: false,
        Error: "Order not found",
      });
    }

    // Start transaction
    await new Promise((resolve, reject) => {
      con.beginTransaction((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const logMessage = `\n${employeeName}:${currentOrder.status}-${newStatus} ${now}`;

    // Update order with new status and log
    await new Promise((resolve, reject) => {
      con.query(
        `UPDATE orders 
         SET status = ?,
             log = RIGHT(CONCAT(IFNULL(log, ''), ?), 255)
         WHERE orderID = ?`,
        [newStatus, logMessage, orderId],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      con.commit((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    return res.json({
      Status: true,
      Message: "Status updated successfully",
    });
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      con.rollback(() => resolve());
    });

    console.error("Update Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update status",
      Details: error.message,
    });
  }
});

export { router as OrderRouter };
