import express from "express";
import pool from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Add client search route
router.get("/clients/search", verifyUser, async (req, res) => {
  try {
    const { query } = req.query;
    const sql =
      "SELECT DISTINCT clientName, customerName FROM client WHERE clientName LIKE ? ORDER BY clientName LIMIT 10";

    const result = await pool.query(sql, [`%${query}%`]);
    const clients = result[0];

    return res.json({
      Status: true,
      Result: clients.map((client) => client.clientName),
    });
  } catch (err) {
    console.error("Error searching clients:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get all clients with sales person name
router.get("/client", verifyUser, async (req, res) => {
  try {
    const sql = `
        SELECT c.*, e.name as salesName 
        FROM client c 
        LEFT JOIN employee e ON c.salesId = e.id
    `;
    const result = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching clients:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get clients id, clientName, terms
router.get("/clients", verifyUser, async (req, res) => {
  try {
    const sql = "SELECT id, clientName, customerName, terms FROM client";
    const result = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.log(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get single client
router.get("/client/:id", verifyUser, async (req, res) => {
  try {
    const id = req.params.id;
    const sql = `
      SELECT 
        c.id,
        c.clientName,
        c.customerName,
        c.contact,
        c.telNo,
        c.faxNo,
        c.celNo,
        c.email,
        c.arContact,
        c.arTelNo,
        c.arFaxNo,
        c.tinNumber,
        c.notes,
        c.terms,
        c.salesId,
        c.creditLimit,
        c.over30,
        c.over60,
        c.over90,
        c.lastTransaction,
        c.hold,
        c.overdue,
        c.lastUpdated,
        c.lastPaymentDate,
        c.lastPaymentAmount,
        e.name as salesName
      FROM client c 
      LEFT JOIN employee e ON c.salesId = e.id
      WHERE c.id = ?
    `;
    const result = await pool.query(sql, [id]);
    const clients = result[0];

    if (clients.length === 0) {
      return res.json({ Status: false, Error: "Client not found" });
    }

    return res.json({ Status: true, Result: clients[0] });
  } catch (err) {
    console.error("Error fetching client:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/client-list", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "clientName";
    const sortDirection = req.query.sortDirection || "ascending";

    // Validate sortBy to prevent SQL injection
    const allowedSortColumns = [
      "clientName",
      "customerName",
      "salesName",
      "terms",
      "creditLimit",
      "over30",
      "over60",
      "over90",
      "overdue",
      "hold",
    ];

    const validSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "clientName";
    const validSortDirection = sortDirection === "descending" ? "DESC" : "ASC";

    // Map sort columns to their proper table references
    const sortColumnMap = {
      clientName: "c.clientName",
      customerName: "c.customerName",
      salesName: "e.name",
      terms: "c.terms",
      creditLimit: "c.creditLimit",
      over30: "c.over30",
      over60: "c.over60",
      over90: "c.over90",
      overdue: "c.overdue",
      hold: "c.hold",
    };

    const sortColumn = sortColumnMap[validSortBy] || "c.clientName";

    // Get total count for pagination
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM client c
       LEFT JOIN employee e ON c.salesId = e.id
       WHERE c.clientName LIKE ? OR c.customerName LIKE ?`,
      [`%${search}%`, `%${search}%`]
    );
    const totalCount = countResult[0].total;

    // Get paginated and sorted results
    const [result] = await pool.query(
      `SELECT c.*, e.name as salesName
       FROM client c
       LEFT JOIN employee e ON c.salesId = e.id
       WHERE c.clientName LIKE ? OR c.customerName LIKE ?
       ORDER BY ${sortColumn} ${validSortDirection}
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, limit, offset]
    );

    return res.json({
      Status: true,
      Result: result,
      totalCount: totalCount,
    });
  } catch (err) {
    console.error("Error fetching clients:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Add new client
router.post("/client/add", async (req, res) => {
  try {
    const sql = `
          INSERT INTO client 
          (clientName, customerName, contact, telNo, faxNo, celNo, email, 
           arContact, arTelNo, arFaxNo, tinNumber, notes, 
           terms, salesId, creditLimit) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

    const values = [
      req.body.clientName,
      req.body.customerName,
      req.body.contact,
      req.body.telNo || "",
      req.body.faxNo || "",
      req.body.celNo || "",
      req.body.email || "",
      req.body.arContact || "",
      req.body.arTelNo || "",
      req.body.arFaxNo || "",
      req.body.tinNumber || "",
      req.body.notes || "",
      req.body.terms || "",
      req.body.salesId || null, // Convert empty string to null
      req.body.creditLimit || 0,
    ];

    const result = await pool.query(sql, values);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error adding client:", err);
    return res.json({ Status: false, Error: "Query Error: " + err.message });
  }
});

// Update client
router.put("/edit_client/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // Convert empty string to null for hold
    if (req.body.hold === "") req.body.hold = null;
    const sql = `
          UPDATE client 
          SET clientName = ?, 
              customerName = ?,
              contact = ?, 
              telNo = ?, 
              faxNo = ?, 
              celNo = ?, 
              email = ?,
              arContact = ?, 
              arTelNo = ?, 
              arFaxNo = ?, 
              tinNumber = ?, 
              notes = ?,
              terms = ?, 
              salesId = ?, 
              creditLimit = ?,
              hold = ?
          WHERE id = ?
      `;

    const values = [
      req.body.clientName,
      req.body.customerName,
      req.body.contact,
      req.body.telNo,
      req.body.faxNo,
      req.body.celNo,
      req.body.email,
      req.body.arContact,
      req.body.arTelNo,
      req.body.arFaxNo,
      req.body.tinNumber,
      req.body.notes,
      req.body.terms,
      req.body.salesId,
      req.body.creditLimit,
      req.body.hold,
      id,
    ];

    const result = await pool.query(sql, values);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error updating client:", err);
    return res.json({ Status: false, Error: "Query Error: " + err.message });
  }
});

// Delete client
router.delete("/client/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = "DELETE FROM client WHERE id = ?";
    const result = await pool.query(sql, [id]);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error deleting client:", err);
    return res.json({ Status: false, Error: "Query Error: " + err.message });
  }
});

// Get clients with combined client and customer names
router.get("/client-customer", async (req, res) => {
  try {
    const sql = `
      SELECT c.*, e.name as salesName,
      CONCAT(c.clientName, ' - ', c.customerName) as clientCustomer
      FROM client c 
      LEFT JOIN employee e ON c.salesId = e.id
    `;
    const result = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error("Error fetching client-customer data:", err);
    return res.json({ Status: false, Error: "Query Error: " + err.message });
  }
});

// Add 1 week to hold date if not null
router.put("/addWeek/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // Get current hold value
    const [rows] = await pool.query("SELECT hold FROM client WHERE id = ?", [
      id,
    ]);
    if (!rows.length) {
      return res.json({ Status: false, Error: "Client not found" });
    }
    const hold = rows[0].hold;
    if (!hold) {
      return res.json({
        Status: false,
        Error: "Hold date is NULL. Nothing to update.",
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let newHold;
    const holdDate = new Date(hold);
    holdDate.setHours(0, 0, 0, 0);
    if (holdDate < today) {
      // If hold is in the past, set to today + 1 day
      newHold = new Date(today);
      newHold.setDate(today.getDate() + 1);
    } else {
      // Else, add 1 week to hold
      newHold = new Date(holdDate);
      newHold.setDate(holdDate.getDate() + 7);
    }
    // Format as yyyy-mm-dd
    const yyyy = newHold.getFullYear();
    const mm = String(newHold.getMonth() + 1).padStart(2, "0");
    const dd = String(newHold.getDate()).padStart(2, "0");
    const newHoldStr = `${yyyy}-${mm}-${dd}`;
    await pool.query("UPDATE client SET hold = ? WHERE id = ?", [
      newHoldStr,
      id,
    ]);
    return res.json({ Status: true, newHold: newHoldStr });
  } catch (err) {
    console.error("Error in addWeek:", err);
    return res.json({ Status: false, Error: "Query Error: " + err.message });
  }
});

export { router as ClientRouter };
