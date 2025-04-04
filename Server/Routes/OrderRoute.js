import express from "express";
import pool from "../utils/db.js";
import { verifyUser, authorize, logUserAction } from "../middleware.js";

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
        "(o.orderID LIKE ? OR c.clientName LIKE ? OR c.customerName LIKE ? OR o.projectName LIKE ? OR o.orderedBy LIKE ? OR o.drnum LIKE ? OR o.invoiceNum LIKE ? OR e.name LIKE ? OR o.grandTotal LIKE ? OR o.orderReference LIKE ?)"
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
        c.customerName,
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
    const [orders] = await pool.query(dataSql, [...params, limit, offset]);

    // Count query
    const countSql = `
            SELECT COUNT(DISTINCT o.orderID) as total
            FROM orders o
            LEFT JOIN client c ON o.clientId = c.id
            LEFT JOIN employee e ON o.preparedBy = e.id
            WHERE ${whereClause}
        `;

    // Execute count query
    const [countResults] = await pool.query(countSql, params);
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
        "(o.orderID LIKE ? OR c.clientName LIKE ? OR c.customerName LIKE ? OR o.projectName LIKE ? OR o.orderedBy LIKE ? OR o.drnum LIKE ? OR o.invoiceNum LIKE ? OR e.name LIKE ? OR o.grandTotal LIKE ? OR o.orderReference LIKE ?)"
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
      whereConditions.push(`c.clientName IN (?)`);
      params.push(clients);
    }

    const whereClause = whereConditions.join(" AND ");

    // Main data query
    const dataSql1 = `
            SELECT 
                o.orderID as id, 
                o.revision,
                o.clientId, 
                c.clientName, 
                c.customerName,
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
                o.forBill
            FROM orders o
            LEFT JOIN client c ON o.clientId = c.id
            LEFT JOIN employee e ON o.preparedBy = e.id
            WHERE ${whereClause}
            ORDER BY ${sortBy} ${sortDirection}
            LIMIT ? OFFSET ?
        `;

    const dataSql = `
        SELECT 
            o.orderID as id, 
            o.revision,
            o.clientId, 
            c.clientName, 
            c.customerName,
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
            GROUP_CONCAT(p.orNum SEPARATOR ', ') AS orNums
        FROM orders o
        LEFT JOIN client c ON o.clientId = c.id
        LEFT JOIN employee e ON o.preparedBy = e.id
        LEFT JOIN paymentJoAllocation pja ON pja.orderId = o.orderId
        LEFT JOIN payments p ON p.payId = pja.payId
        WHERE ${whereClause}
        GROUP BY o.orderId
        ORDER BY ${sortBy} ${sortDirection}
        LIMIT ? OFFSET ?
    `;

    // Execute data query with proper parameter order
    const [orders] = await pool.query(dataSql, [...params, limit, offset]);

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT o.orderID) as total
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN employee e ON o.preparedBy = e.id
      WHERE ${whereClause}
    `;

    // Execute count query
    const [countResults] = await pool.query(countSql, params);
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
    console.error("Error in orders route:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch orders",
      Details: err.message,
    });
  }
});

// Get single order
router.get("/order/:id", async (req, res) => {
  try {
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

    const [result] = await pool.query(sql, [req.params.id]);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
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
    let whereConditions = ["c.clientName LIKE ? OR c.customerName LIKE ?"];
    let params = [`%${clientName}%`, `%${clientName}%`]; // Match orderID as a string

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

    console.log("WHERE CLAUSE", whereClause);
    // Main data query - using same fields as regular order search
    const ordersSql = `
      SELECT 
        o.orderID as id,
        o.revisionNumber,
        o.clientId,
        c.clientName, 
        c.customerName,
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
    const [countResult] = await pool.query(countSql, params);

    // Execute orders query
    const [orders] = await pool.query(ordersSql, [
      ...params,
      Number(limit),
      Number(offset),
    ]);
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

// Add this route to update forProd checkbox
router.put("/update-forprod/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { forProd } = req.body;

    const sql = "UPDATE orders SET forProd = ? WHERE orderID = ?";
    const [result] = await pool.query(sql, [forProd, orderId]);

    if (result.affectedRows > 0) {
      return res.json({
        Status: true,
        Message: "Order forProd status updated successfully",
      });
    } else {
      return res.json({ Status: false, Message: "Order not found" });
    }
  } catch (err) {
    console.error("Error updating forProd status:", err);
    return res.json({
      Status: false,
      Error: "Error updating forProd status",
    });
  }
});

// Update orders to change status to 'Prod' and productionDate to NOW() where forProd is 1 and status is 'Open'
router.put("/update_orders_to_prod", async (req, res) => {
  try {
    const sql = `
      UPDATE orders
      SET status = 'Prod',
          productionDate = NOW(),
          forProd = 0
      WHERE forProd = 1
        AND (status = 'Open' OR status = 'Printed');
    `;
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Update Error:", err);
    return res.json({ Status: false, Error: "Failed to update orders" });
  }
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
        c.customerName,
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

    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (error) {
    console.log(error);
    return res.json({ Status: false, Error: "Query Error" + error });
  }
});

// Update orders status with corresponding dates and logging
router.put("/update_order_status", verifyUser, async (req, res) => {
  const { orderId, newStatus } = req.body;
  const employeeName = req.user.name;

  try {
    // First check current status
    const [currentOrderResults] = await pool.query(
      "SELECT status, log FROM orders WHERE orderID = ?",
      [orderId]
    );

    const currentOrder = currentOrderResults[0];

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
    console.log("statusToSet", statusToSet);

    // Handle status change rules
    if (
      newStatus === "Printed" &&
      (currentOrder.status === "Prod" ||
        currentOrder.status === "Finish" ||
        currentOrder.status === "Delivered")
    ) {
      statusToSet = currentOrder.status;
    } else if (
      currentOrder.status === "Billed" ||
      currentOrder.status === "Closed"
    ) {
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

    // Prepare update query
    const values = [];
    const updateFields = [];

    // Build update query
    let sql = `
      UPDATE orders SET status = ?
    `;
    values.push(statusToSet);

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
      values.push(logMessage);
    }

    // Finalize SQL
    sql += " WHERE orderID = ?";
    values.push(orderId);

    // Execute the update
    await pool.query(sql, values);

    return res.json({
      Status: true,
      Result: { status: newStatus },
      Message: "Status updated successfully",
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    return res.json({
      Status: false,
      Error: "Failed to update order status",
    });
  }
});

// Update orders with DR number, update jomcontrol with lastDR number, with transaction rollback feature.
router.put("/update_orders_drnum", async (req, res) => {
  const updates = req.body; // Expecting an array of { orderID, drnum, drDate }

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.json({ Status: false, Error: "Invalid input data" });
  }

  // Prepare data outside of transaction
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

  const connection = await pool.getConnection();

  try {
    // 1. First get the current lastDRNumber from jomcontrol
    const [currentDRResult] = await connection.query(
      "SELECT lastDRNumber FROM jomControl WHERE controlId = 1"
    );

    const currentLastDRNumber = currentDRResult[0].lastDRNumber;
    const finalDRNumber = Math.max(lastDRNumber, currentLastDRNumber);

    console.log("dateCases", dateCases);
    const sqlUpdateOrders = `
      UPDATE orders
      SET drnum = CASE ${cases} END,
          drDate = CASE ${dateCases} END
      WHERE orderID IN (${orderIDs})
    `;

    const sqlUpdateJomControl = `
      UPDATE jomControl
      SET lastDRNumber = ${finalDRNumber}
      WHERE controlId = 1
    `;

    // Start MySQL transaction
    await connection.beginTransaction();

    // 2. Update `orders` table
    await connection.query(sqlUpdateOrders);

    // 3. Update `jomcontrol` table with last DR number
    await connection.query(sqlUpdateJomControl);

    // 4. Commit the transaction
    await connection.commit();

    return res.json({
      Status: true,
      Message: "Orders and JomControl updated successfully",
    });
  } catch (error) {
    // Rollback on error
    await connection.rollback();
    console.error("Transaction Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update DR numbers: " + error.message,
    });
  } finally {
    // Always release connection
    connection.release();
  }
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
        c.customerName,
        o.deliveryInst,
        o.drnum,
        o.drDate,
        o.totalAmount,
        o.amountDisc,
        o.grandTotal,
        od.quantity,
        od.width,
        od.height,
        od.unit,
        od.material,
        od.itemDescription,
        od.unitPrice,
        od.discount,
        od.amount,
        od.displayOrder
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      LEFT JOIN order_details od ON o.orderID = od.orderId AND od.noPrint = 0 AND od.perSqFt > 0
      WHERE !o.drnum 
        AND (o.status = 'Prod' OR o.status = 'Finish' OR o.status = 'Delivered')
      ORDER BY o.orderID ASC, od.displayOrder ASC;
`;

    const [result] = await pool.query(sql);
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
          customerName: row.customerName,
          deliveryInst: row.deliveryInst,
          drnum: row.drnum,
          drDate: row.drDate,
          totalAmount: row.totalAmount,
          amountDisc: row.amountDisc,
          grandTotal: row.grandTotal,
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
        unitPrice: row.unitPrice,
        discount: row.discount,
        amount: row.amount,
        displayOrder: row.displayOrder,
      });
    });

    // Convert map to array
    const orders = Array.from(ordersMap.values());

    return res.json({ Status: true, Result: orders });
  } catch (error) {
    console.log(error);
    return res.json({ Status: false, Error: "Query Error" + error });
  }
});

// Get order details
router.get("/order_details/:orderId", async (req, res) => {
  try {
    const sql = `
    SELECT * 
    FROM order_details 
    WHERE orderId = ? 
    ORDER BY displayOrder
  `;

    const [result] = await pool.query(sql, [req.params.orderId]);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Select Error:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get next display order number for order details
router.get("/next_display_order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const sql =
      "SELECT COALESCE(MAX(displayOrder), 0) as maxOrder FROM order_details WHERE orderId = ?";

    const [result] = await pool.query(sql, [orderId]);

    // If maxOrder is 0, it means no records exist yet
    const maxOrder = result[0].maxOrder;
    const nextDisplayOrder = maxOrder === 0 ? 5 : maxOrder + 5;

    return res.json({
      Status: true,
      Result: nextDisplayOrder,
    });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Add order
router.post(
  "/add_order",
  verifyUser,
  authorize("admin", "sales"),
  logUserAction("created new order"),
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Set the preparedBy to the current user's ID
      const preparedBy = req.user.id;

      const sql = `
    INSERT INTO orders (
      clientId, projectName, preparedBy, orderDate, 
      orderedBy, orderReference, cellNumber, specialInst, 
      deliveryInst, graphicsBy, dueDate, dueTime, 
      sample, reprint, totalAmount, amountDisc, 
      percentDisc, grandTotal, terms, status, totalHrs, editedBy, lastEdited
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

      const values = [
        req.body.clientId,
        req.body.projectName,
        preparedBy, // Always use the authenticated user's ID
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
        req.user.name, // Always use the authenticated user's name
        new Date().toLocaleString("sv-SE").replace(",", ""),
      ];

      const [result] = await connection.query(sql, values);
      await connection.commit();

      return res.json({ Status: true, Result: result.insertId });
    } catch (err) {
      await connection.rollback();
      console.log("Insert Error:", err);
      return res.json({ Status: false, Error: "Failed to create order" });
    } finally {
      connection.release();
    }
  }
);

// Update order
router.put(
  "/update_order/:id",
  verifyUser,
  authorize("admin", "sales"),
  logUserAction("updated order"),
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify the user has permission to edit this order
      const [orderCheck] = await connection.query(
        "SELECT preparedBy FROM orders WHERE orderID = ?",
        [req.params.id]
      );

      // Only allow admin users or the original creator to edit the order
      if (orderCheck.length === 0) {
        return res.json({ Status: false, Error: "Order not found" });
      }

      // Check if user is admin or the original creator
      const isAdmin = req.user.categoryId === 1;
      const isCreator = orderCheck[0].preparedBy === req.user.id;

      if (!isAdmin && !isCreator) {
        return res.json({
          Status: false,
          Error: "You can only edit orders you created",
        });
      }

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

      // Ensure we don't allow changing the preparedBy except for admins
      let preparedBy = isAdmin ? req.body.preparedBy : orderCheck[0].preparedBy;

      const values = [
        req.body.clientId,
        req.body.projectName,
        preparedBy,
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
        req.user.name, // Always use the current user as editedBy
        req.params.id,
      ];

      const [result] = await connection.query(sql, values);
      await connection.commit();

      return res.json({ Status: true, Result: result });
    } catch (err) {
      await connection.rollback();
      console.log("Update Error:", err);
      return res.json({ Status: false, Error: "Failed to update order" });
    } finally {
      connection.release();
    }
  }
);

// Update order's edited info and total hours
router.put("/orders/:orderId/update_edited_info", async (req, res) => {
  try {
    const sql = `
    UPDATE orders 
    SET lastEdited = ?,
        editedBy = ?,
          totalHrs = ?,
          totalAmount = ?,
          amountDisc = ?,
          percentDisc = ?,
          grandTotal = ?
    WHERE orderID = ?
  `;

    const [result] = await pool.query(sql, [
      req.body.lastEdited,
      req.body.editedBy,
      req.body.totalHrs,
      req.body.totalAmount,
      req.body.amountDisc,
      req.body.percentDisc,
      req.body.grandTotal,
      req.params.orderId,
    ]);

    return res.json({ Status: true });
  } catch (err) {
    console.log("Error updating order edited info:", err);
    return res.json({
      Status: false,
      Error: "Failed to update order edited info",
    });
  }
});

// Update order detail artist major and minor
router.put("/order_details/update_incentives", async (req, res) => {
  try {
    const updates = req.body;

    // Process each update with a single connection
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Process all updates
      for (const update of updates) {
        const sql = `
          UPDATE order_details 
          SET 
            artistIncentive = ?,
            major = ?,
            minor = ?
          WHERE Id = ?
        `;

        await connection.query(sql, [
          update.artistIncentive,
          update.major,
          update.minor,
          update.Id,
        ]);
      }

      await connection.commit();

      return res.json({
        Status: true,
        Message: "Updates completed successfully",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error updating artist incentives:", err);
    return res.json({
      Status: false,
      Error: "Failed to update artist incentives",
    });
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
        c.customerName,
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
      LEFT JOIN order_details od ON o.orderID = od.orderId AND od.amount > 0
      LEFT JOIN material m ON od.material = m.material
      WHERE o.status = 'Prod' 
        AND (o.productionDate IS NOT NULL AND o.productionDate + INTERVAL 48 HOUR > NOW())
        AND (m.noIncentive = 0)
      ORDER BY o.orderID ASC, od.displayOrder ASC`;

    const [results] = await pool.query(sql);
    return res.json({ Status: true, Result: results });
  } catch (err) {
    console.error("Error fetching artist incentive details:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch artist incentive details",
    });
  }
});

// Update order detail calculatertist incentives
router.put(
  "/order_details/update_incentives_calculation",
  verifyUser,
  async (req, res) => {
    try {
      const updates = req.body;

      // Use a single connection for all updates
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // Process each update
        for (const update of updates) {
          const sql = `
            UPDATE order_details 
            SET artistIncentiveAmount = ?
            WHERE Id = ?
          `;

          await connection.query(sql, [update.artistIncentive, update.Id]);
        }

        await connection.commit();

        return res.json({
          Status: true,
          Message: "Updates completed successfully",
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
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

      // Use a single connection for all updates
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // Process each update
        for (const update of updates) {
          const sql = `
            UPDATE order_details 
            SET salesIncentive = ?,
                overideIncentive = ?
            WHERE Id = ?
          `;

          await connection.query(sql, [
            update.salesIncentive,
            update.overideIncentive,
            update.Id,
          ]);
        }

        await connection.commit();

        return res.json({
          Status: true,
          Message: "Updates completed successfully",
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error("Error updating sales incentives:", err);
      return res.json({
        Status: false,
        Error: "Failed to update sales incentives: " + err.message,
      });
    }
  }
);

// Add new route to update order detail by ID
router.put("/order_details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { printHrs, ...otherData } = req.body;
    const data = {
      ...otherData,
      printHrs: Number(printHrs || 0),
    };
    console.log("Data being updated:", data);
    console.log("ID:", id);
    const sql = "UPDATE order_details SET ? WHERE Id = ?";

    const [result] = await pool.query(sql, [data, id]);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Update Error:", err);
    return res.json({
      Status: false,
      Error: "Failed to update order detail",
    });
  }
});

// Update display order by detail ID
router.put("/order_details-displayOrder/:detailId", async (req, res) => {
  try {
    const { detailId } = req.params;
    const { displayOrder } = req.body;

    if (!displayOrder || isNaN(displayOrder)) {
      return res.json({
        Status: false,
        Error: "Invalid display order value",
      });
    }

    const sql = "UPDATE order_details SET displayOrder = ? WHERE Id = ?";
    const [result] = await pool.query(sql, [displayOrder, detailId]);

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
  } catch (err) {
    console.log("Update Error:", err);
    return res.json({
      Status: false,
      Error: "Failed to update display order",
    });
  }
});

// Add new route to update noPrint status by detail ID
router.put("/order_detail_noprint/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { noPrint } = req.body;

    const sql = `
    UPDATE order_details 
    SET noPrint = ? 
      WHERE Id = ?
  `;

    const [result] = await pool.query(sql, [noPrint, id]);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Update Error:", err);
    return res.json({
      Status: false,
      Error: "Failed to update noPrint status",
    });
  }
});

// Add order detail
router.post(
  "/add_order_detail",
  verifyUser,
  authorize("admin", "sales"),
  logUserAction("added order detail"),
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Extract `printHrs` and `noPrint`, ensuring they are numbers and default to 0 if empty or null
      const { printHrs, noPrint, ...otherData } = req.body;

      const data = {
        ...otherData,
        printHrs: Number(printHrs) || 0, // Convert to number, default to 0
        noPrint: Number(noPrint) || 0, // Convert to number, default to 0
      };

      // Verify user has permission to add detail to this order
      const [orderCheck] = await connection.query(
        "SELECT preparedBy FROM orders WHERE orderID = ?",
        [data.orderId]
      );

      if (orderCheck.length === 0) {
        return res.json({ Status: false, Error: "Order not found" });
      }

      // Check if user is admin or the original creator of the order
      const isAdmin = req.user.categoryId === 1;
      const isCreator = orderCheck[0].preparedBy === req.user.id;

      if (!isAdmin && !isCreator) {
        return res.json({
          Status: false,
          Error: "You can only add details to orders you created",
        });
      }

      const sql = "INSERT INTO order_details SET ?";
      const [result] = await connection.query(sql, data);

      await connection.commit();
      return res.json({ Status: true, Result: result });
    } catch (err) {
      await connection.rollback();
      console.log("SQL Error:", err);
      return res.json({ Status: false, Error: "Failed to add order detail" });
    } finally {
      connection.release();
    }
  }
);

// Add new route to delete order detail by ID
router.delete("/order_detail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM order_details WHERE Id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.json({
        Status: false,
        Error: "Order detail not found",
      });
    }

    return res.json({ Status: true });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Add route to get WTax types
router.get("/wtax-types", async (req, res) => {
  try {
    const sql = "SELECT * FROM WTax";
    const [wtaxTypes] = await pool.query(sql);

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
    const connection = await pool.getConnection();

    try {
      // Start a transaction
      await connection.beginTransaction();

      // Get current revision number
      const [orderResults] = await connection.query(
        "SELECT revision FROM orders WHERE orderId = ?",
        [orderId]
      );

      if (orderResults.length === 0) {
        return res.json({
          Status: false,
          Error: "Order not found",
        });
      }

      const currentRevision = orderResults[0].revision || 0;
      const newRevision = currentRevision + 1;

      // Update order with new revision number and status
      await connection.query(
        "UPDATE orders SET revision = ?, status = 'Open' WHERE orderId = ?",
        [newRevision, orderId]
      );

      // Commit the transaction
      await connection.commit();

      return res.json({
        Status: true,
        revision: newRevision,
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
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
  const connection = await pool.getConnection();

  try {
    // First check current status
    const [currentOrderResults] = await connection.query(
      "SELECT status FROM orders WHERE orderID = ?",
      [orderId]
    );

    if (!currentOrderResults.length) {
      return res.json({
        Status: false,
        Error: "Order not found",
      });
    }

    const currentOrder = currentOrderResults[0];

    const billableStatuses = [
      "Open",
      "Printed",
      "Prod",
      "Finished",
      "Delivered",
      "Billed",
    ];
    if (!billableStatuses.includes(currentOrder.status)) {
      return res.json({
        Status: false,
        Error: `${currentOrder.status} order cannot be billed anymore.`,
      });
    }

    // Start transaction
    await connection.beginTransaction();

    // Update order
    await connection.query(
      `UPDATE orders 
       SET invoiceNum = IF(invoiceNum = '' OR invoiceNum IS NULL, ?, CONCAT(invoiceNum, ', ', ?)),
           billDate = NOW()
       WHERE orderID = ?`,
      [invNumber, invNumber, orderId]
    );

    // Commit transaction
    await connection.commit();

    return res.json({
      Status: true,
      Message: "Invoice updated and order marked as billed",
    });
  } catch (error) {
    // Rollback on error
    if (connection) await connection.rollback();
    console.error("Update Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update invoice",
      Details: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Admin status update route
router.put("/admin-status-update", verifyUser, async (req, res) => {
  const { orderId, newStatus } = req.body;
  const employeeName = req.user.name;

  try {
    // First check current status
    const [currentOrderResults] = await pool.query(
      "SELECT status, log FROM orders WHERE orderID = ?",
      [orderId]
    );

    const currentOrder = currentOrderResults[0];

    if (!currentOrder) {
      return res.json({
        Status: false,
        Error: "Order not found",
      });
    }

    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const logMessage = `\n${employeeName}:${currentOrder.status}-${newStatus} ${now}`;

      // Update order with new status and log
      await connection.query(
        `UPDATE orders 
         SET status = ?,
             log = RIGHT(CONCAT(IFNULL(log, ''), ?), 255)
         WHERE orderID = ?`,
        [newStatus, logMessage, orderId]
      );

      // Commit transaction
      await connection.commit();

      return res.json({
        Status: true,
        Message: "Status updated successfully",
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to update status",
    });
  }
});

// Create a new order based on an existing one (reorder)
router.post("/order-reorder", verifyUser, async (req, res) => {
  console.log("REORDER: req.body", req.body);
  const { orderId } = req.body;
  const userName = req.body.userName || req.user.name;
  const userId = req.body.userId || req.user.id;

  try {
    const connection = await pool.getConnection();

    try {
      // 1. Get the original order
      const [originalOrders] = await connection.query(
        `SELECT * FROM orders WHERE orderID = ?`,
        [orderId]
      );

      if (!originalOrders.length) {
        return res.json({
          Status: false,
          Error: "Original order not found",
        });
      }
      const originalOrder = originalOrders[0];

      // 2. Get all details from original order
      const [originalDetails] = await connection.query(
        `SELECT * FROM order_details WHERE orderId = ?`,
        [orderId]
      );

      // 3. Prepare new order data
      const currentDate = new Date().toISOString().slice(0, 10);
      const currentDateTime = new Date();
      // Check if project name already has "(Reorder)" suffix
      const projectName = originalOrder.projectName.includes(" (Reorder)")
        ? originalOrder.projectName
        : originalOrder.projectName + " (Reorder)";

      // 4. Start transaction
      await connection.beginTransaction();

      // 5. Insert new order
      const newOrderSql = `
        INSERT INTO orders (
          clientId, projectName, preparedBy, orderDate, 
          orderedBy, orderReference, cellNumber, specialInst, 
          deliveryInst, graphicsBy, dueDate, dueTime, 
          sample, reprint, totalAmount, amountDisc, 
          percentDisc, grandTotal, terms, status, totalHrs, editedBy, lastEdited
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        originalOrder.clientId,
        projectName,
        originalOrder.preparedBy,
        currentDate, // New current date
        originalOrder.orderedBy,
        originalOrder.orderReference,
        originalOrder.cellNumber,
        originalOrder.specialInst,
        originalOrder.deliveryInst,
        originalOrder.graphicsBy,
        originalOrder.dueDate,
        originalOrder.dueTime,
        originalOrder.sample,
        originalOrder.reprint,
        originalOrder.totalAmount,
        originalOrder.amountDisc,
        originalOrder.percentDisc,
        originalOrder.grandTotal,
        originalOrder.terms,
        "Open", // Always open for new orders
        originalOrder.totalHrs,
        userName,
        currentDateTime,
      ];

      const [insertOrderResult] = await connection.query(newOrderSql, values);
      const newOrderId = insertOrderResult.insertId;

      // 6. Copy details to new order if there are any
      if (originalDetails.length > 0) {
        // Prepare batch insert for better performance
        const detailValues = [];

        // Prepare values for each detail
        originalDetails.forEach((detail) => {
          detailValues.push([
            newOrderId,
            detail.displayOrder,
            detail.quantity,
            detail.width,
            detail.height,
            detail.unit,
            detail.material,
            detail.itemDescription,
            detail.unitPrice,
            detail.perSqFt,
            detail.discount,
            detail.amount,
            detail.squareFeet,
            detail.materialUsage,
            detail.printHrs,
            detail.remarks,
            detail.top,
            detail.bottom,
            detail.allowanceLeft,
            detail.allowanceRight,
            detail.noPrint,
          ]);
        });

        // Insert all details in a single query for efficiency
        const detailFields = [
          "orderId",
          "displayOrder",
          "quantity",
          "width",
          "height",
          "unit",
          "material",
          "itemDescription",
          "unitPrice",
          "perSqFt",
          "discount",
          "amount",
          "squareFeet",
          "materialUsage",
          "printHrs",
          "remarks",
          "top",
          "bottom",
          "allowanceLeft",
          "allowanceRight",
          "noPrint",
        ];

        const insertDetailsSql = `
          INSERT INTO order_details (${detailFields.join(", ")})
          VALUES ?
        `;

        await connection.query(insertDetailsSql, [detailValues]);
      }

      // 7. Commit transaction
      await connection.commit();

      return res.json({
        Status: true,
        Result: newOrderId,
        Message: "Order reordered successfully",
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Reorder Error:", error);
    return res.json({
      Status: false,
      Error: "Failed to reorder: " + error.message,
    });
  }
});

// Add dashboard statistics routes
router.get("/order_stats", async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'Printed' THEN 1 END) as printed,
        COUNT(CASE WHEN status = 'Prod' THEN 1 END) as prod,
        COUNT(CASE WHEN status = 'Ready' THEN 1 END) as finished,
        COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'Billed' THEN 1 END) as billed
      FROM orders
    `;

    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.log("Query Error:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch order statistics",
    });
  }
});

// Route to get monthly sales data for user and total
router.get("/monthly_sales", verifyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const formattedFirstDay = firstDayOfMonth.toISOString().split("T")[0];
    const formattedLastDay = lastDayOfMonth.toISOString().split("T")[0];

    const sql = `
      SELECT 
        (SELECT COALESCE(SUM(grandTotal), 0) 
         FROM orders 
         WHERE preparedBy = ? 
           AND orderDate BETWEEN ? AND ?) as userMonthlySales,
        (SELECT COALESCE(SUM(grandTotal), 0) 
         FROM orders 
         WHERE orderDate BETWEEN ? AND ?) as totalMonthlySales
    `;

    const [result] = await pool.query(sql, [
      userId,
      formattedFirstDay,
      formattedLastDay,
      formattedFirstDay,
      formattedLastDay,
    ]);

    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.log("Query Error:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch monthly sales data",
    });
  }
});

router.get("/recent_orders", async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.orderID, 
        c.clientName, 
        o.projectName, 
        o.status, 
        DATE_FORMAT(o.orderDate, '%Y-%m-%d') as orderDate
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      ORDER BY o.orderDate DESC
      LIMIT 10
    `;

    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Query Error:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch recent orders",
    });
  }
});

router.get("/overdue_orders", async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.orderID, 
        c.clientName, 
        o.projectName,
        o.status,
        DATE_FORMAT(o.dueDate, '%Y-%m-%d') as dueDate,
        DATEDIFF(CURDATE(), o.dueDate) as daysLate
      FROM orders o
      LEFT JOIN client c ON o.clientId = c.id
      WHERE o.dueDate < CURDATE() AND o.status IN ('Prod', 'Finished')
      ORDER BY o.dueDate ASC
      LIMIT 10
    `;

    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Query Error:", err);
    return res.json({
      Status: false,
      Error: "Failed to fetch overdue orders",
    });
  }
});

// Check if invoice number already exists
router.get(
  "/check-invoice-exists/:invoiceNum",
  verifyUser,
  async (req, res) => {
    const invoiceNum = req.params.invoiceNum;

    try {
      const sql =
        "SELECT orderID, clientId, projectName FROM orders WHERE invoiceNum = ?";

      const [existingOrders] = await pool.query(sql, [invoiceNum]);

      return res.json({
        Status: true,
        exists: existingOrders.length > 0,
        orders: existingOrders,
      });
    } catch (error) {
      console.error("Error checking invoice number:", error);
      return res.json({
        Status: false,
        Error: "Failed to check invoice number",
        Details: error.message,
      });
    }
  }
);

// Update special instructions, delivery instructions, and order reference
router.put(
  "/update-special-delivery-reference",
  verifyUser,
  async (req, res) => {
    const { orderId, specialInst, deliveryInst, orderReference } = req.body;
    const userName = req.user.name;

    try {
      const sql = `
      UPDATE orders 
      SET specialInst = ?, 
          deliveryInst = ?, 
          orderReference = ?,
          lastEdited = NOW(),
          editedBy = ?
      WHERE orderID = ?
    `;

      await pool.query(sql, [
        specialInst,
        deliveryInst,
        orderReference,
        userName,
        orderId,
      ]);

      res.json({ Status: true, Message: "Order details updated successfully" });
    } catch (error) {
      console.error("Error updating order details:", error);
      res.json({ Status: false, Error: "Failed to update order details" });
    }
  }
);

export { router as OrderRouter };
