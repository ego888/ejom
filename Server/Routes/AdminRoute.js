import express from "express";
import pool from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { verifyUser, authorize, logUserAction } from "../middleware.js";

const router = express.Router();

// Function to check if admin exists and insert a default one if not
const checkAndInsertAdmin = async () => {
  try {
    const sql = "SELECT COUNT(*) AS adminCount FROM employee";
    const result = await pool.query(sql);

    // Access the result correctly - in mysql2/promise, the result is [rows, fields]
    const rows = result[0];

    if (!rows || !rows[0]) {
      console.error("Query returned no data");
      return;
    }

    const adminCount = rows[0].adminCount;
    console.log("Admin count:", adminCount);

    // If no admin exists, insert one
    if (adminCount === 0) {
      const defaultEmail = "ergo888@yahoo.com";
      const defaultPassword = "admin"; // Default password for admin

      try {
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const insertSql =
          "INSERT INTO employee (name, email, password, category_id, active, admin) VALUES ('erwin', ?, ?, 1, 1, 1)";
        await pool.query(insertSql, [defaultEmail, hashedPassword]);

        console.log("Default ejom admin inserted!");
      } catch (err) {
        console.error("Error inserting default admin:", err);
      }
    }
  } catch (err) {
    console.error("Error checking admin count:", err);
  }
};

// Call the function to check and insert admin if needed
checkAndInsertAdmin();

router.post("/adminlogin", async (req, res) => {
  try {
    const sql = "SELECT * from admin WHERE email = ?";
    const [results] = await pool.query(sql, [req.body.email]);

    if (results.length === 0) {
      return res.json({ loginStatus: false, Error: "Wrong email or password" });
    }

    const match = await bcrypt.compare(req.body.password, results[0].password);

    if (match) {
      const email = results[0].email;
      const token = jwt.sign(
        { role: "admin", email: email, id: results[0].id },
        "jwt_secret_key",
        { expiresIn: "1d" }
      );
      res.cookie("token", token);
      return res.json({ loginStatus: true });
    } else {
      return res.json({
        loginStatus: false,
        Error: "Wrong email or password",
      });
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.json({ loginStatus: false, Error: "Query error" });
  }
});

router.get("/category", async (req, res) => {
  try {
    const sql = "SELECT * FROM category";
    const [results] = await pool.query(sql);
    return res.json({ Status: true, Result: results });
  } catch (err) {
    console.error("Error fetching categories:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Route to get a specific category by ID
router.get("/category/:id", async (req, res) => {
  try {
    const id = req.params.id; // Get the ID from the URL
    const sql = "SELECT * FROM category WHERE id = ?";
    const [results] = await pool.query(sql, [id]);

    if (results.length === 0) {
      return res.json({ Status: false, Error: "Category not found" });
    }

    return res.json({ Status: true, Result: results });
  } catch (err) {
    console.error("Error fetching category:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.put("/category/edit/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = "UPDATE category SET name = ? WHERE id = ?";
    await pool.query(sql, [req.body.name, id]);
    return res.json({ Status: true });
  } catch (err) {
    console.error("Error updating category:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.post("/category/add", async (req, res) => {
  try {
    const sql = "INSERT INTO category (`name`) VALUES (?)";
    await pool.query(sql, [req.body.category]);
    return res.json({ Status: true });
  } catch (err) {
    console.error("Error adding category:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Public/Images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage: storage,
});
// end imag eupload

router.post("/employee/add", upload.single("image"), async (req, res) => {
  try {
    const { name, email, password, address, category_id } = req.body;
    const salary = req.body.salary || 0; // Use 0 if salary is empty
    const sales = req.body.sales === "true" ? 1 : 0;
    const accounting = req.body.accounting === "true" ? 1 : 0;
    const artist = req.body.artist === "true" ? 1 : 0;
    const production = req.body.production === "true" ? 1 : 0;
    const operator = req.body.operator === "true" ? 1 : 0;

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    const sql = `
    INSERT INTO employee 
    (name, email, password, address, salary, category_id, active, sales, accounting, artist, production, operator, image) 
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`;

    const values = [
      name,
      email,
      hash,
      address || "",
      salary, // Now using the default 0 if empty
      category_id,
      sales,
      accounting,
      artist,
      production,
      operator,
      req.file ? req.file.filename : null,
    ];

    const [result] = await pool.query(sql, values);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.log("Insert Error:", err);
    return res.json({ Status: false, Error: "Failed to add employee" });
  }
});

router.get("/employee", async (req, res) => {
  try {
    const sql = "SELECT * FROM employee";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error("Error fetching employees:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/employee/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = "SELECT * FROM employee WHERE id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error("Error fetching employee:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.put("/employee/edit/:id", (req, res) => {
  const id = req.params.id;
  let sql, values;

  // Check if password is provided and not empty
  if (req.body.password && req.body.password.trim() !== "") {
    bcrypt.hash(req.body.password, 10, (err, hash) => {
      if (err) {
        console.log("Hashing error:", err);
        return res.json({ Status: false, Error: "Hashing Error" });
      }

      sql = `UPDATE employee 
             SET name = ?, email = ?, password = ?, salary = ?, 
                 category_id = ?, active = ?, sales = ?, accounting = ?, 
                 artist = ?, production = ?, operator = ?, admin = ?
             WHERE id = ?`;

      values = [
        req.body.name,
        req.body.email,
        hash,
        req.body.salary,
        req.body.category_id,
        req.body.active,
        req.body.sales,
        req.body.accounting,
        req.body.artist,
        req.body.production,
        req.body.operator,
        req.body.admin,
        id,
      ];

      pool.query(sql, values, (err, result) => {
        if (err) {
          console.log("Query error:", err);
          return res.json({ Status: false, Error: "Query Error" });
        }
        return res.json({ Status: true, Result: result });
      });
    });
  } else {
    sql = `UPDATE employee 
           SET name = ?, email = ?, salary = ?, 
               category_id = ?, active = ?, sales = ?, accounting = ?, 
               artist = ?, production = ?, operator = ?, admin = ?
           WHERE id = ?`;

    values = [
      req.body.name,
      req.body.email,
      req.body.salary,
      req.body.category_id,
      req.body.active,
      req.body.sales,
      req.body.accounting,
      req.body.artist,
      req.body.production,
      req.body.operator,
      req.body.admin,
      id,
    ];

    pool.query(sql, values, (err, result) => {
      if (err) {
        console.log("Query error:", err);
        return res.json({ Status: false, Error: "Query Error" });
      }
      return res.json({ Status: true, Result: result });
    });
  }
});

router.delete("/employee/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "delete from employee where id = ?";
  pool.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" + err });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ Status: true });
});

router.post("/login", async (req, res) => {
  try {
    const sql = "SELECT * FROM employee WHERE name = ? AND active = true";
    const [result] = await pool.query(sql, [req.body.name]);

    if (result.length > 0) {
      const employee = result[0];
      console.log("Result 2:", result);

      const response = await bcrypt.compare(
        req.body.password,
        employee.password
      );

      if (response) {
        console.log("Employee data for token:", employee); // Debug log

        const token = jwt.sign(
          {
            name: employee.name,
            id: employee.id,
            categoryId: employee.category_id,
            active: employee.active,
            sales: employee.sales,
            accounting: employee.accounting,
            production: employee.production,
            artist: employee.artist,
            operator: employee.operator,
          },
          "jwt_secret_key",
          { expiresIn: "1d" }
        );

        console.log("Generated token payload:", jwt.decode(token)); // Debug log

        return res.json({
          loginStatus: true,
          isAdmin: employee.category_id === 1,
          token: token,
        });
      }

      return res.json({ loginStatus: false, Error: "Wrong Password" });
    } else {
      return res.json({
        loginStatus: false,
        Error: "Wrong Username or inactive account",
      });
    }
  } catch (err) {
    console.log("Login Error:", err);
    return res.json({ loginStatus: false, Error: "Query Error" });
  }
});

router.get("/get_employee/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sql = "SELECT * FROM employee WHERE id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.length > 0) {
      // Convert numeric boolean values to actual booleans
      const employee = {
        ...result[0],
        active: result[0].active === 1,
        sales: result[0].sales === 1,
        accounting: result[0].accounting === 1,
        artist: result[0].artist === 1,
        production: result[0].production === 1,
        operator: result[0].operator === 1,
        admin: result[0].admin === 1,
      };
      return res.json({ Status: true, Result: [employee] });
    }
    return res.json({ Status: false, Error: "Employee not found" });
  } catch (err) {
    console.log("Error fetching employee:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Add name check for AddEmployee
router.post("/add_employee", (req, res) => {
  // First check if name already exists
  const checkSql = "SELECT * FROM employee WHERE name = ?";
  pool.query(checkSql, [req.body.name], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) {
      return res.json({ Status: false, Error: "Username already exists" });
    }
    // Continue with existing add employee logic if name is unique
    // ... rest of your add_employee code ...
  });
});

// Add name check for EditEmployee
router.put("/edit_employee/:id", (req, res) => {
  const id = req.params.id;
  // First check if name already exists for different employee
  const checkSql = "SELECT * FROM employee WHERE name = ? AND id != ?";
  pool.query(checkSql, [req.body.name, id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) {
      return res.json({ Status: false, Error: "Username already exists" });
    }
    // Continue with existing edit employee logic if name is unique
    // ... rest of your edit_employee code ...
  });
});

router.get("/payment_terms", async (req, res) => {
  try {
    const sql = "SELECT * FROM paymentTerms ORDER BY days ASC";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error("Error fetching payment terms:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/payment-types", async (req, res) => {
  try {
    const sql = "SELECT * FROM paymentTypes ORDER BY payType ASC";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error("Error fetching payment types:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get("/shipping-types", async (req, res) => {
  try {
    const sql = "SELECT * FROM shipping_types";
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error("Error fetching shipping types:", err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Add a new route for user profile updates
router.put("/employee/update_profile/:id", verifyUser, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    // Check if the user is updating their own profile or if they are an admin
    if (Number(id) !== userId && req.user.categoryId !== 1) {
      return res.status(403).json({
        Status: false,
        Error: "You can only update your own profile",
      });
    }

    // If password is included, hash it
    if (req.body.password && req.body.password.trim() !== "") {
      const hash = await bcrypt.hash(req.body.password, 10);

      const sql = `
        UPDATE employee 
        SET fullName = ?, email = ?, cellNumber = ?, password = ?
        WHERE id = ?
      `;

      const values = [
        req.body.fullName,
        req.body.email,
        req.body.cellNumber || null,
        hash,
        id,
      ];

      await pool.query(sql, values);
      return res.json({
        Status: true,
        Result: "Profile updated successfully",
      });
    } else {
      // Update without changing password
      const sql = `
        UPDATE employee 
        SET fullName = ?, email = ?, cellNumber = ?
        WHERE id = ?
      `;

      const values = [
        req.body.fullName,
        req.body.email,
        req.body.cellNumber || null,
        id,
      ];

      await pool.query(sql, values);
      return res.json({ Status: true, Result: "Profile updated successfully" });
    }
  } catch (err) {
    console.log("Profile update error:", err);
    return res.json({ Status: false, Error: "Failed to update profile" });
  }
});

// Add this error handling middleware after all your routes
router.use((err, req, res, next) => {
  console.error("Router Error:", err);
  res.status(500).json({
    Status: false,
    Error: "Internal server error",
    Code: "SERVER_ERROR",
    details: err.message,
  });
});

export { router as AdminRouter };
