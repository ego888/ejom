import express from "express";
import con from "../utils/db.js";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Add client search route
router.get("/clients/search", verifyUser, (req, res) => {
  const { query } = req.query;
  const sql =
    "SELECT DISTINCT clientName, customerName FROM client WHERE clientName LIKE ? ORDER BY clientName LIMIT 10";

  con.query(sql, [`%${query}%`], (err, result) => {
    if (err) {
      console.error("Error searching clients:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({
      Status: true,
      Result: result.map((client) => client.clientName),
    });
  });
});

// Get all clients with sales person name
router.get("/client", (req, res) => {
  const sql = `
        SELECT c.*, e.name as salesName 
        FROM client c 
        LEFT JOIN employee e ON c.salesId = e.id
    `;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

// Get clients id, clientName, terms
router.get("/clients", (req, res) => {
  const sql = "SELECT id, clientName, customerName, terms FROM client";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

// Get single client
router.get("/client/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM client WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0] });
  });
});

router.get("/client-list", (req, res) => {
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

  con.query(countSql, countParams, (err, countResult) => {
    if (err) return res.json({ Status: false, Error: "Count Query Error" });

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

    con.query(sql, params, (err, result) => {
      if (err) return res.json({ Status: false, Error: "Query Error" });
      return res.json({
        Status: true,
        Result: result,
        totalCount: countResult[0].total,
      });
    });
  });
});

// Add new client
router.post("/client/add", (req, res) => {
  const sql = `
        INSERT INTO client 
        (clientName, contact, telNo, faxNo, celNo, email, 
         arContact, arTelNo, arFaxNo, tinNumber, notes, 
         terms, salesId, creditLimit) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    req.body.clientName,
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

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true });
  });
});

// Update client
router.put("/edit_client/:id", (req, res) => {
  const id = req.params.id;
  const sql = `
        UPDATE client 
        SET clientName = ?, 
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

  con.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true });
  });
});

// Delete client
router.delete("/client/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM client WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true });
  });
});

// Get clients with combined client and customer names
router.get("/client-customer", (req, res) => {
  const sql = `
    SELECT c.*, e.name as salesName,
    CONCAT(c.clientName, ' - ', c.customerName) as clientCustomer
    FROM client c 
    LEFT JOIN employee e ON c.salesId = e.id
  `;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

export { router as ClientRouter };
