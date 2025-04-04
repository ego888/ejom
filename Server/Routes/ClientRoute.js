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
router.get("/client", async (req, res) => {
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
router.get("/clients", async (req, res) => {
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
router.get("/client/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = `
      SELECT c.*, e.name as salesName 
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

    // First get total count
    let countSql = `
      SELECT COUNT(*) as total 
      FROM client c
      LEFT JOIN employee e ON c.salesId = e.id
    `;
    let countParams = [];

    if (search) {
      countSql += ` WHERE c.clientName LIKE ? 
        OR c.customerName LIKE ?
        OR c.contact LIKE ? 
        OR c.email LIKE ?
        OR e.name LIKE ?`;
      const searchParam = `%${search}%`;
      countParams = [
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
      ];
    }

    const countResult = await pool.query(countSql, countParams);
    const totalCount = countResult[0][0].total;

    // Then get paginated data
    let sql = `
      SELECT c.*, e.name as salesName 
      FROM client c 
      LEFT JOIN employee e ON c.salesId = e.id
    `;
    let params = [];

    if (search) {
      sql += ` WHERE c.clientName LIKE ? 
        OR c.customerName LIKE ?
        OR c.contact LIKE ? 
        OR c.email LIKE ?
        OR e.name LIKE ?`;
      const searchParam = `%${search}%`;
      params = [
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam,
      ];
    }

    sql += " ORDER BY c.clientName LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    const clients = result[0];

    return res.json({
      Status: true,
      Result: clients,
      totalCount: totalCount,
    });
  } catch (err) {
    console.error("Error fetching client list:", err);
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
              creditLimit = ?
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

export { router as ClientRouter };
