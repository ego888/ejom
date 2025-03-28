import pool from "./db.js";

const createTempTables = `
  CREATE TABLE IF NOT EXISTS tempPayments (
    payId INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    payType VARCHAR(50) NOT NULL,
    payReference VARCHAR(100),
    payDate DATE NOT NULL,
    ornum VARCHAR(50),
    postedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    transactedBy VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tempPaymentAllocation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payId INT NOT NULL,
    orderId INT NOT NULL,
    amountApplied DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payId) REFERENCES tempPayments(payId) ON DELETE CASCADE,
    FOREIGN KEY (orderId) REFERENCES orders(orderId)
  );
`;

const createDTRTables = `
  CREATE TABLE IF NOT EXISTS DTREmployees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employeeId VARCHAR(50) NOT NULL UNIQUE,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS DTREntries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employeeId VARCHAR(50) NOT NULL,
    timeIn DATETIME,
    timeOut DATETIME,
    state VARCHAR(10) COMMENT 'C/In, C/Out, or other states',
    dayOfWeek INT,
    hours DECIMAL(10, 2),
    overtime DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES DTREmployees(employeeId)
  );

  CREATE TABLE IF NOT EXISTS DTRBatches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batchName VARCHAR(100) NOT NULL,
    periodStart DATE NOT NULL,
    periodEnd DATE NOT NULL,
    uploadedBy VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entryCount INT DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS DTRUploadLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batchId INT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    fileSize INT NOT NULL,
    fileType VARCHAR(50) NOT NULL,
    uploadedBy VARCHAR(100),
    uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Completed',
    rowCount INT DEFAULT 0,
    FOREIGN KEY (batchId) REFERENCES DTRBatches(id)
  );
`;

const runMigrations = async () => {
  let connection;
  try {
    console.log("Running database migrations...");
    connection = await pool.getConnection();

    // Run temp tables migrations
    await connection.query(createTempTables);
    console.log("Temp payment tables created successfully");

    // Run DTR tables migrations
    await connection.query(createDTRTables);
    console.log("DTR tables created successfully");

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export { runMigrations };
