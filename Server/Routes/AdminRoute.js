import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";

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

        const insertSql = "INSERT INTO employee (email, password, active, admin) VALUES (?, ?, 1, 1)";
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

// router.get("/category", (req, res) => {
//   const sql = "SELECT * FROM category";
//   con.query(sql, (err, result) => {
//     if (err) return res.json({ Status: false, Error: "Query Error" });
//     return res.json({ Status: true, Result: result });
//   });
// });

router.post("/add_category", (req, res) => {
  const sql = "INSERT INTO category (`name`) VALUES (?)";
  con.query(sql, [req.body.category], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true });
  });
});

// Route to get a specific category by ID
router.get("/category/:id", (req, res) => {
  const id = req.params.id;  // Get the ID from the URL
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


router.put("/edit_category/:id", (req, res) => {
  const id = req.params.id;
  const sql = "UPDATE category SET name = ? WHERE id = ?";
  con.query(sql, [req.body.name, id], (err, result) => {
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

router.post("/add_employee", upload.single("image"), (req, res) => {
  const { name, email, password, address, category_id } = req.body;
  const salary = req.body.salary || 0;  // Use 0 if salary is empty
  const sales = req.body.sales === 'true' ? 1 : 0;
  const accounting = req.body.accounting === 'true' ? 1 : 0;
  const artist = req.body.artist === 'true' ? 1 : 0;
  const production = req.body.production === 'true' ? 1 : 0;
  const operator = req.body.operator === 'true' ? 1 : 0;

  bcrypt.hash(password, 10, (err, hash) => {
    if(err) {
      return res.json({Status: false, Error: "Query Error"});
    }
    
    const sql = `
    INSERT INTO employee 
    (name, email, password, address, salary, category_id, active, sales, accounting, artist, production, operator, image) 
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`;

    const values = [
      name, 
      email, 
      hash, 
      address || '', 
      salary,  // Now using the default 0 if empty
      category_id, 
      sales, 
      accounting, 
      artist, 
      production, 
      operator, 
      req.file ? req.file.filename : null
    ];

    con.query(sql, values, (err, result) => {
      if(err) {
        console.log("Insert Error:", err);
        return res.json({Status: false, Error: "Failed to add employee"});
      }
      return res.json({Status: true, Result: result});
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

router.put("/edit_employee/:id", (req, res) => {
  const id = req.params.id;
  let sql, values;

  // Check if password is provided and not empty
  if (req.body.password && req.body.password.trim() !== '') {
    bcrypt.hash(req.body.password, 10, (err, hash) => {
      if(err) {
        console.log("Hashing error:", err);
        return res.json({Status: false, Error: "Hashing Error"});
      }
      
      sql = `UPDATE employee 
             SET name = ?, email = ?, password = ?, salary = ?, 
                 category_id = ?, active = ?, sales = ?, accounting = ?, 
                 artist = ?, production = ?, operator = ?, admin = ?
             WHERE id = ?`;
      
      values = [
        req.body.name,
        req.body.email,
        hash,  // Use the hashed password
        req.body.salary,
        req.body.category_id,
        req.body.active,
        req.body.sales,
        req.body.accounting,
        req.body.artist,
        req.body.production,
        req.body.operator,
        req.body.admin,
        id
      ];

      con.query(sql, values, (err, result) => {
        if(err) {
          console.log("Query error:", err);
          return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true, Result: result});
      });
    });
  } else {
    // If no password provided, update without password
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
      id
    ];

    con.query(sql, values, (err, result) => {
      if(err) {
        console.log("Query error:", err);
        return res.json({Status: false, Error: "Query Error"});
      }
      return res.json({Status: true, Result: result});
    });
  }
});

router.delete("/delete_employee/:id", (req, res) => {
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
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
    });
});

router.get("/employee_count", (req, res) => {
    const sql = "SELECT COUNT(id) as employee FROM employee WHERE admin = false";
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
    });
});

router.get("/salary_count", (req, res) => {
    const sql = "SELECT SUM(salary) as sumOfSalary FROM employee";
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
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

// Material Routes
router.get("/material", (req, res) => {
    const sql = "SELECT * FROM material";
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
    });
});

router.get("/material/:id", (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM material WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result[0]});
    });
});

router.post("/add_material", (req, res) => {
    const sql = `INSERT INTO material 
        (Material, Description, SqFtPerHour, MinimumPrice, FixWidth, FixHeight, Cost, NoIncentive) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        req.body.material,
        req.body.description,
        req.body.sqFtPerHour,
        req.body.minimumPrice,
        req.body.fixWidth,
        req.body.fixHeight,
        req.body.cost,
        req.body.noIncentive ? 1 : 0
    ];

    con.query(sql, values, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true});
    });
});

router.put("/edit_material/:id", (req, res) => {
    const id = req.params.id;
    const sql = `UPDATE material 
        SET Material = ?, 
            Description = ?, 
            SqFtPerHour = ?, 
            MinimumPrice = ?, 
            FixWidth = ?, 
            FixHeight = ?, 
            Cost = ?, 
            NoIncentive = ?
        WHERE id = ?`;
    
    const values = [
        req.body.material,
        req.body.description,
        req.body.sqFtPerHour,
        req.body.minimumPrice,
        req.body.fixWidth,
        req.body.fixHeight,
        req.body.cost,
        req.body.noIncentive ? 1 : 0,
        id
    ];

    con.query(sql, values, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true});
    });
});

router.delete("/delete_material/:id", (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM material WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true});
    });
});

// Add these new routes for client management

// Get all clients with sales person name
router.get("/client", (req, res) => {
    const sql = `
        SELECT c.*, e.name as salesName 
        FROM client c 
        LEFT JOIN employee e ON c.salesId = e.id
    `;
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
    });
});

// Get sales employees (active and sales only)
router.get("/sales_employees", (req, res) => {
    const sql = "SELECT id, name FROM employee WHERE active = true AND sales = true ORDER BY name";
    con.query(sql, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Get single client
router.get("/client/:id", (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM client WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result[0]});
    });
});

// Add new client
router.post("/add_client", (req, res) => {
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
        req.body.telNo || '',
        req.body.faxNo || '',
        req.body.celNo || '',
        req.body.email || '',
        req.body.arContact || '',
        req.body.arTelNo || '',
        req.body.arFaxNo || '',
        req.body.tinNumber || '',
        req.body.notes || '',
        req.body.terms || '',
        req.body.salesId || null,  // Convert empty string to null
        req.body.creditLimit || 0
    ];

    con.query(sql, values, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true});
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
        id
    ];

    con.query(sql, values, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true});
    });
});

// Delete client
router.delete("/delete_client/:id", (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM client WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true});
    });
});

router.post('/login', (req, res) => {
    const sql = "SELECT * FROM employee WHERE name = ? AND active = true";
    con.query(sql, [req.body.name], (err, result) => {
        if(err) {
            console.log("Query Error:", err);
            return res.json({loginStatus: false, Error: "Query Error"});
        }
        if(result.length > 0) {
            bcrypt.compare(req.body.password, result[0].password, (err, response) => {
                if(response) {
                    const token = jwt.sign(
                        {
                            name: result[0].name,
                            id: result[0].id,
                            isAdmin: result[0].admin,
                        },
                        "jwt_secret_key",
                        {expiresIn: '1d'}
                    );
                    return res.json({
                        loginStatus: true,
                        isAdmin: result[0].admin,
                        token: token
                    });
                }
                return res.json({loginStatus: false, Error: "Wrong Password"});
            });
        } else {
            return res.json({loginStatus: false, Error: "Wrong Username or inactive account"});
        }
    });
});

router.get('/get_employee/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM employee WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
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
                admin: result[0].admin === 1
            };
            return res.json({Status: true, Result: [employee]});
        }
        return res.json({Status: false, Error: "Employee not found"});
    });
});

// Add name check for AddEmployee
router.post('/add_employee', (req, res) => {
    // First check if name already exists
    const checkSql = "SELECT * FROM employee WHERE name = ?";
    con.query(checkSql, [req.body.name], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        if(result.length > 0) {
            return res.json({Status: false, Error: "Username already exists"});
        }
        // Continue with existing add employee logic if name is unique
        // ... rest of your add_employee code ...
    });
});

// Add name check for EditEmployee
router.put('/edit_employee/:id', (req, res) => {
    const id = req.params.id;
    // First check if name already exists for different employee
    const checkSql = "SELECT * FROM employee WHERE name = ? AND id != ?";
    con.query(checkSql, [req.body.name, id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"});
        if(result.length > 0) {
            return res.json({Status: false, Error: "Username already exists"});
        }
        // Continue with existing edit employee logic if name is unique
        // ... rest of your edit_employee code ...
    });
});

// Update the orders route to handle pagination, sorting, filtering and search
router.get('/orders', async (req, res) => {
    const {
        page = 1,
        limit = 10,
        sortBy = 'orderID',
        sortDirection = 'DESC',
        search = '',
        statuses = ''
    } = req.query;

    const offset = (page - 1) * limit;
    const statusArray = statuses ? statuses.split(',') : [];

    try {
        // Build the WHERE clause for search and status filtering
        let whereClause = '1 = 1'; // Always true condition to start
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
            whereClause += ` AND o.status IN (${statusArray.map(() => '?').join(',')})`;
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
            con.query(dataSql, [...params, Number(limit), Number(offset)], (err, result) => {
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
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (err) {
        console.error('Error in orders route:', err);
        return res.json({
            Status: false,
            Error: "Failed to fetch orders",
            Details: err.message
        });
    }
});

// Get sales employees (where sales = true)
router.get('/sales_employees', (req, res) => {
    const sql = "SELECT id, name FROM employee WHERE sales = true AND active = true ORDER BY name";
    con.query(sql, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Get artists (where artist = true)
router.get('/artists', (req, res) => {
    const sql = "SELECT id, name FROM employee WHERE artist = true AND active = true ORDER BY name";
    con.query(sql, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Update the verifyUser middleware with proper error response
const verifyUser = (req, res, next) => {
    console.log('Verifying token...');
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ 
            Status: false, 
            Error: "Token not provided", 
            Code: "NO_TOKEN" 
        });
    }

    console.log('Token received:', token);
    
    try {
        const decoded = jwt.verify(token, "jwt-secret-key");
        console.log('Token decoded:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Token verification error:', error.name, error.message);
        
        // Send proper error response based on error type
        if (error.name === 'TokenExpiredError') {
            console.log('Token expired at:', error.expiredAt);
            return res.status(401).json({ 
                Status: false, 
                Error: "Session expired. Please login again.", 
                Code: "TOKEN_EXPIRED",
                expiredAt: error.expiredAt
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                Status: false, 
                Error: "Invalid token format", 
                Code: "INVALID_TOKEN"
            });
        }

        // Generic token error
        return res.status(401).json({ 
            Status: false, 
            Error: "Authentication failed", 
            Code: "AUTH_FAILED",
            details: error.message
        });
    }
};

// Use the middleware in your routes
router.post('/add_order', verifyUser, (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]
        if (!token) {
            return res.json({Status: false, Error: "No token provided"})
        }

        const decoded = jwt.verify(token, "jwt_secret_key")
        const editedBy = decoded.id

        // Get the names from the database based on IDs
        const getNames = (callback) => {
            const clientSql = "SELECT clientName FROM client WHERE id = ?"
            const preparedBySql = "SELECT name FROM employee WHERE id = ?"
            const graphicsBySql = "SELECT name FROM employee WHERE id = ?"

            con.query(clientSql, [req.body.clientId], (err, clientResult) => {
                if (err) return callback(err)
                
                con.query(preparedBySql, [req.body.preparedBy], (err, preparedByResult) => {
                    if (err) return callback(err)
                    
                    con.query(graphicsBySql, [req.body.graphicsBy], (err, graphicsByResult) => {
                        if (err) return callback(err)
                        
                        callback(null, {
                            clientName: clientResult[0]?.clientName || '',
                            preparedByName: preparedByResult[0]?.name || '',
                            graphicsByName: graphicsByResult[0]?.name || ''
                        })
                    })
                })
            })
        }

        getNames((err, names) => {
            if (err) {
                console.log("Name Query Error:", err)
                return res.json({Status: false, Error: "Query Error"})
            }

            const sql = `
                INSERT INTO orders (
                    clientId, projectName, preparedBy,
                    orderDate, orderedBy, orderReference, cellNumber, specialInst, 
                    deliveryInst, graphicsBy, dueDate, dueTime, 
                    sample, reprint
                ) VALUES (?)
            `

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
                req.body.reprint ? 1 : 0
            ]

            con.query(sql, [values], (err, result) => {
                if(err) {
                    console.log(err)
                    return res.json({Status: false, Error: "Query Error"})
                }
                return res.json({
                    Status: true, 
                    Result: result,
                    OrderID: result.insertId
                })
            })
        })
    } catch (error) {
        console.log("Token Error:", error)
        return res.json({Status: false, Error: "Invalid token"})
    }
})

// Get clients (if not already exists)
router.get('/clients', (req, res) => {
    const sql = "SELECT id, clientName, terms FROM client"
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"})
        return res.json({Status: true, Result: result})
    })
})

// Add order detail
router.post('/add_order_detail', (req, res) => {
    console.log('Insertfdsfsdafdsing data:', req.body);

    // Create a new object without printHrs first
    const { printHrs, ...otherData } = req.body;
    
    // Then add printHrs explicitly as a number
    const data = {
        ...otherData,
        printHrs: Number(printHrs || 0)  // Explicitly convert to number
    };

    console.log('Data being inserted (after transformation):', data);
    console.log('printHrs value:', data.printHrs);  // Log the specific value

    const sql = "INSERT INTO order_details SET ?";

    con.query(sql, data, (err, result) => {
        if(err) {
            console.log("SQL Error:", err);
            return res.json({Status: false, Error: "Failed to add order detail"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Get order details
router.get('/order_details/:orderId', (req, res) => {
    const sql = `
        SELECT * FROM order_details 
        WHERE orderId = ? 
        ORDER BY displayOrder
    `
    
    con.query(sql, [req.params.orderId], (err, result) => {
        if(err) {
            console.log("Select Error:", err)
            return res.json({Status: false, Error: "Query Error"})
        }
        return res.json({Status: true, Result: result})
    })
})

// Delete order detail
router.delete('/order_detail/:orderId/:displayOrder', (req, res) => {
    const orderId = req.params.orderId;
    const displayOrder = req.params.displayOrder;

    const sql = "DELETE FROM order_details WHERE orderId = ? AND displayOrder = ?";
    
    con.query(sql, [orderId, displayOrder], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true});
    });
});

// Get units
router.get('/units', (req, res) => {
    const sql = "SELECT * FROM units ORDER BY unit";
    con.query(sql, (err, result) => {
        if(err) {
            console.log("Error fetching units:", err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Get materials
router.get('/materials', (req, res) => {
    const sql = "SELECT * FROM material ORDER BY Material";
    con.query(sql, (err, result) => {
        if(err) {
            console.log("Error fetching materials:", err);
            return res.json({Status: false, Error: "Query Error"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Update order
router.put('/update_order/:id', (req, res) => {
    const id = req.params.id;
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
            reprint = ?
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
        id
    ];

    con.query(sql, values, (err, result) => {
        if(err) {
            console.log("Update Error:", err);
            return res.json({Status: false, Error: "Failed to update order"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Get single order
router.get('/order/:id', (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT o.*, 
               c.clientName,
               e.name as preparedByName,
               DATE_FORMAT(o.orderDate, '%Y-%m-%d') as orderDate,
               DATE_FORMAT(o.dueDate, '%Y-%m-%d') as dueDate
        FROM orders o
        LEFT JOIN client c ON o.clientId = c.id
        LEFT JOIN employee e ON o.preparedBy = e.id
        WHERE o.orderID = ?
    `;
    
    con.query(sql, [id], (err, result) => {
        if(err) {
            console.log("Query Error:", err);
            return res.json({Status: false, Error: "Query Error"});
        }
        if(result.length === 0) {
            return res.json({Status: false, Error: "Order not found"});
        }

        // Convert boolean values but keep dates as is
        const order = {
            ...result[0],
            sample: result[0].sample === 1,
            reprint: result[0].reprint === 1
        };

        return res.json({Status: true, Result: order});
    });
});

// Add this route for updating order details
router.put('/order_details/:orderId/:displayOrder', (req, res) => {
    // Destructure printHrs and other data
    const { printHrs, ...otherData } = req.body;
    
    // Create data object with printHrs as a number
    const data = {
        ...otherData,
        printHrs: Number(printHrs || 0)  // Explicitly convert to number
    };

    console.log('Data being updated:', data);
    console.log('printHrs value:', data.printHrs);

    const sql = "UPDATE order_details SET ? WHERE orderId = ? AND displayOrder = ?";
    
    con.query(sql, [data, req.params.orderId, req.params.displayOrder], (err, result) => {
        if(err) {
            console.log("Update Error:", err);
            return res.json({Status: false, Error: "Failed to update order detail"});
        }
        return res.json({Status: true, Result: result});
    });
});

// Add this route for updating orders
router.put('/orders/:orderId', (req, res) => {
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
        req.body.terms || '',
        req.body.lastEdited,
        req.body.editedBy,
        req.params.orderId
    ];

    con.query(sql, values, (err, result) => {
        if(err) {
            console.log("Update Error:", err);
            return res.json({Status: false, Error: "Failed to update order"});
        }
        return res.json({Status: true, Result: result});
    });
});

router.post('/orders', (req, res) => {
    const sql = `
        INSERT INTO orders (
            clientId, projectName, preparedBy,
            orderDate, orderedBy, orderReference, cellNumber, 
            specialInst, deliveryInst, graphicsBy, dueDate, 
            dueTime, sample, reprint, totalAmount, amountDisc,
            percentDisc, grandTotal, terms, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
    `;
    
    const values = [
        req.body.clientId,
        req.body.projectName,
        req.body.preparedBy,
        req.body.orderDate || null,
        req.body.orderedBy || '',
        req.body.orderReference || '',
        req.body.cellNumber || '',
        req.body.specialInst || '',
        req.body.deliveryInst || '',
        req.body.graphicsBy,
        req.body.dueDate || null,
        req.body.dueTime || null,
        req.body.sample ? 1 : 0,
        req.body.reprint ? 1 : 0,
        req.body.subtotal || 0,
        req.body.amountDisc || 0,
        req.body.percentDisc || 0,
        req.body.grandTotal || 0,
        req.body.terms || '',
    ];

    con.query(sql, values, (err, result) => {
        if(err) {
            console.log("Insert Error:", err);
            return res.json({Status: false, Error: "Failed to create order"});
        }
        return res.json({Status: true, Result: result.insertId});
    });
});

// Reorder order details
router.put('/order_details_reorder/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    const items = req.body.items;

    try {
        // Use a transaction to ensure all updates succeed or none do
        await new Promise((resolve, reject) => {
            con.beginTransaction(err => {
                if (err) reject(err);
                resolve();
            });
        });

        // Update each item's display order
        for (const item of items) {
            await new Promise((resolve, reject) => {
                const sql = "UPDATE order_details SET displayOrder = ? WHERE orderId = ? AND id = ?";
                con.query(sql, [item.displayOrder, orderId, item.id], (err, result) => {
                    if (err) reject(err);
                    resolve(result);
                });
            });
        }

        // Commit the transaction
        await new Promise((resolve, reject) => {
            con.commit(err => {
                if (err) reject(err);
                resolve();
            });
        });

        res.json({ Status: true });
    } catch (err) {
        // Rollback on error
        await new Promise(resolve => {
            con.rollback(() => resolve());
        });
        console.log(err);
        res.json({ Status: false, Error: "Failed to reorder items" });
    }
});

// Update single detail's display order
router.put('/order_detail_display_order/:orderId/:detailId/:oldDisplayOrder', (req, res) => {
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

    con.query(sql, [displayOrder, orderId, detailId, oldDisplayOrder], (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ Status: false, Error: "Query Error" });
        }
        return res.json({ Status: true });
    });
});

// Renumber all details with odd numbers
router.put('/renumber_order_details/:orderId', (req, res) => {
    // First get all details ordered by display_order
    const selectSql = "SELECT id FROM order_details WHERE orderId = ? ORDER BY displayOrder ASC";
    con.query(selectSql, [req.params.orderId], (err, details) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }

        // Update order's last edited info
        const orderUpdateSql = "UPDATE orders SET lastEdited = ?, editedBy = ? WHERE orderId = ?";
        con.query(orderUpdateSql, 
            [req.body.lastEdited, req.body.editedBy, req.params.orderId], 
            (err) => {
                if(err) {
                    console.log(err);
                    return res.json({Status: false, Error: "Query Error"});
                }

                // Now update each detail with new odd numbers
                let updateCount = 0;
                details.forEach((detail, index) => {
                    const newDisplayOrder = index * 2 + 1; // 1, 3, 5, ...
                    const updateSql = "UPDATE order_details SET displayOrder = ? WHERE id = ?";
                    con.query(updateSql, [newDisplayOrder, detail.id], (err) => {
                        if(err) {
                            console.log(err);
                            return res.json({Status: false, Error: "Query Error"});
                        }
                        updateCount++;
                        if(updateCount === details.length) {
                            return res.json({Status: true});
                        }
                    });
                });
            }
        );
    });
});

// Update order detail display order
router.put('/order_detail_display_order/:orderId/:detailId', (req, res) => {
    const { orderId, detailId } = req.params;
    const { displayOrder } = req.body;

    // Validate inputs
    if (!orderId || !displayOrder || !detailId) {
        return res.json({ Status: false, Error: "Missing required parameters" });
    }

    const sql = `
        UPDATE order_details 
        SET displayOrder = ? 
        WHERE orderId = ? 
        AND id = ?
    `;

    con.query(sql, [displayOrder, orderId, detailId], (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ Status: false, Error: "Query Error" });
        }
        return res.json({ Status: true });
    });
});

// Add this error handling middleware after all your routes
router.use((err, req, res, next) => {
    console.error('Router Error:', err);
    res.status(500).json({
        Status: false,
        Error: "Internal server error",
        Code: "SERVER_ERROR",
        details: err.message
    });
});

// Get next display order number
router.get('/next_display_order/:orderId', (req, res) => {
    const sql = "SELECT COALESCE(MAX(displayOrder), 0) as maxOrder FROM order_details WHERE orderId = ?";
    con.query(sql, [req.params.orderId], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: false, Error: "Query Error"});
        }
        // If maxOrder is 0, it means no records exist yet
        const maxOrder = result[0].maxOrder;
        const nextDisplayOrder = maxOrder === 0 ? 5 : maxOrder + 5;
        
        console.log('Current max order:', maxOrder); // Debug log
        console.log('Next display order:', nextDisplayOrder); // Debug log
        
        return res.json({
            Status: true,
            nextDisplayOrder: nextDisplayOrder
        });
    });
});

// Get order statuses
router.get('/order-statuses', (req, res) => {
    const sql = "SELECT statusId, step FROM orderStatus ORDER BY step";
    con.query(sql, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({ Status: false, Error: "Query Error" });
        }
        return res.json({ Status: true, Result: result });
    });
});

router.get('/payment_terms', (req, res) => {
    const sql = "SELECT * FROM paymentTerms ORDER BY days ASC"
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"})
        return res.json({Status: true, Result: result})
    })
}) 

// Add a route to get unique status options
router.get('/order-statuses', (req, res) => {
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
        FROM orders 
        WHERE status IS NOT NULL
        ORDER BY step
    `;

    con.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching status options:', err);
            return res.json({ Status: false, Error: "Query Error" });
        }
        return res.json({ Status: true, Result: result });
    });
});

export { router as adminRouter };
