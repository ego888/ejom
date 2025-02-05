import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { verifyUser } from "../middleware.js";

const router = express.Router();

// Function to check if admin exists and insert a default one if not
const checkAndInsertAdmin = () => {
  const sql = "SELECT COUNT(*) AS adminCount FROM employee";
  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error checking admin count:", err);
      return;
    }

    const adminCount = result[0].adminCount;

    // If no admin exists, insert one
    if (adminCount === 0) {
      const defaultEmail = "ergo888@yahoo.com";
      const defaultPassword = "admin"; // Default password for admin
      bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Error hashing password:", err);
          return;
        }

        const insertSql =
          "INSERT INTO employee (email, password, active, admin) VALUES (?, ?, 1, 1)";
        con.query(insertSql, [defaultEmail, hashedPassword], (err, result) => {
          if (err) {
            console.error("Error inserting default admin:", err);
            return;
          }
          console.log("Default admin inserted!");
        });
      });
    }
  });
};

// Call the function to check and insert admin if needed
checkAndInsertAdmin();

router.post("/adminlogin", (req, res) => {
  const sql = "SELECT * from admin WHERE email = ?";
  con.query(sql, [req.body.email], (err, result) => {
    if (err) return res.json({ loginStatus: false, Error: "Query error" });
    if (result.length > 0) {
      // Compare the hashed password with the entered password
      bcrypt.compare(req.body.password, result[0].password, (err, match) => {
        if (err)
          return res.json({
            loginStatus: false,
            Error: "Password comparison error",
          });

        if (match) {
          const email = result[0].email;
          const token = jwt.sign(
            { role: "admin", email: email, id: result[0].id },
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
      });
    } else {
      return res.json({ loginStatus: false, Error: "Wrong email or password" });
    }
  });
});

router.get("/category", (req, res) => {
  const sql = "SELECT * FROM category";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});
// Route to get a specific category by ID
router.get("/category/:id", (req, res) => {
  const id = req.params.id; // Get the ID from the URL
  const sql = "SELECT * FROM category WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error" });
    }
    if (result.length === 0) {
      return res.json({ Status: false, Error: "Category not found" });
    }
    return res.json({ Status: true, Result: result });
  });
});

router.put("/category/edit/:id", (req, res) => {
  const id = req.params.id;
  const sql = "UPDATE category SET name = ? WHERE id = ?";
  con.query(sql, [req.body.name, id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true });
  });
});

router.post("/category/add", (req, res) => {
  const sql = "INSERT INTO category (`name`) VALUES (?)";
  con.query(sql, [req.body.category], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true });
  });
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

router.post("/employee/add", upload.single("image"), (req, res) => {
  const { name, email, password, address, category_id } = req.body;
  const salary = req.body.salary || 0; // Use 0 if salary is empty
  const sales = req.body.sales === "true" ? 1 : 0;
  const accounting = req.body.accounting === "true" ? 1 : 0;
  const artist = req.body.artist === "true" ? 1 : 0;
  const production = req.body.production === "true" ? 1 : 0;
  const operator = req.body.operator === "true" ? 1 : 0;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error" });
    }

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

    con.query(sql, values, (err, result) => {
      if (err) {
        console.log("Insert Error:", err);
        return res.json({ Status: false, Error: "Failed to add employee" });
      }
      return res.json({ Status: true, Result: result });
    });
  });
});

router.get("/employee", (req, res) => {
  const sql = "SELECT * FROM employee";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/employee/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
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

      con.query(sql, values, (err, result) => {
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

    con.query(sql, values, (err, result) => {
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
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" + err });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/admin_count", (req, res) => {
  const sql = "SELECT COUNT(id) as admin FROM employee WHERE admin = true";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/employee_count", (req, res) => {
  const sql = "SELECT COUNT(id) as employee FROM employee WHERE admin = false";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/salary_count", (req, res) => {
  const sql = "SELECT SUM(salary) as sumOfSalary FROM employee";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/admin_records", (req, res) => {
  const sql = "select * from employee where admin = true";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" + err });
    return res.json({ Status: true, Result: result });
  });
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ Status: true });
});

router.post("/login", (req, res) => {
  const sql = "SELECT * FROM employee WHERE name = ? AND active = true";
  con.query(sql, [req.body.name], (err, result) => {
    if (err) {
      console.log("Query Error:", err);
      return res.json({ loginStatus: false, Error: "Query Error" });
    }
    if (result.length > 0) {
      bcrypt.compare(req.body.password, result[0].password, (err, response) => {
        if (response) {
          const token = jwt.sign(
            {
              name: result[0].name,
              id: result[0].id,
              isAdmin: result[0].admin,
            },
            "jwt_secret_key",
            { expiresIn: "1d" }
          );
          return res.json({
            loginStatus: true,
            isAdmin: result[0].admin,
            token: token,
          });
        }
        return res.json({ loginStatus: false, Error: "Wrong Password" });
      });
    } else {
      return res.json({
        loginStatus: false,
        Error: "Wrong Username or inactive account",
      });
    }
  });
});

router.get("/get_employee/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    // Convert numeric boolean values to actual booleans
    if (result.length > 0) {
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
  });
});

// Add name check for AddEmployee
router.post("/add_employee", (req, res) => {
  // First check if name already exists
  const checkSql = "SELECT * FROM employee WHERE name = ?";
  con.query(checkSql, [req.body.name], (err, result) => {
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
  con.query(checkSql, [req.body.name, id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) {
      return res.json({ Status: false, Error: "Username already exists" });
    }
    // Continue with existing edit employee logic if name is unique
    // ... rest of your edit_employee code ...
  });
});

router.get("/payment_terms", (req, res) => {
  const sql = "SELECT * FROM paymentTerms ORDER BY days ASC";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

// Get company control info
router.get("/company-control", (req, res) => {
  const sql = "SELECT * FROM jomControl LIMIT 1";
  con.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching company control:", err);
      return res.json({ Status: false, Error: "Query Error" });
    }
    return res.json({ Status: true, Result: result[0] });
  });
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

// Add this route to update forProd checkbox
router.put("/update-for-prod/:id", (req, res) => {
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

export { router as AdminRouter };
