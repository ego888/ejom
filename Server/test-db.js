import pool from "./utils/db.js";

async function testDatabaseAndSetupTables() {
  let connection;
  try {
    // Test connection
    connection = await pool.getConnection();
    console.log("✅ Database connection successful!");

    // Check which database we're connected to
    const [dbResult] = await connection.query("SELECT DATABASE() as dbname");
    console.log(`Connected to database: ${dbResult[0].dbname}`);

    // Show all tables
    const [tablesResult] = await connection.query("SHOW TABLES");
    console.log("Existing tables:");
    console.log(tablesResult);

    // Create DTR tables
    console.log("\nCreating or verifying DTR tables...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dtrBatches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batchName VARCHAR(100) NOT NULL,
        periodStart DATE NOT NULL,
        periodEnd DATE NOT NULL,
        fileCount INT DEFAULT 0,
        entryCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ dtrBatches table created or verified");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS dtrEntries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batchId INT NOT NULL,
        empId VARCHAR(50) NOT NULL,
        empName VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        day VARCHAR(10) NOT NULL,
        timeIn VARCHAR(20),
        timeOut VARCHAR(20),
        state VARCHAR(50),
        hours DECIMAL(10,2) DEFAULT 0,
        overtime DECIMAL(10,2) DEFAULT 0,
        specialHours DECIMAL(10,2) DEFAULT 0,
        remarks VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batchId) REFERENCES dtrBatches(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ dtrEntries table created or verified");

    // Verify the tables were created
    const [updatedTablesResult] = await connection.query("SHOW TABLES");
    console.log("\nUpdated tables list:");
    console.log(updatedTablesResult);

    console.log("\n✅ Database setup complete!");
  } catch (error) {
    console.error("❌ Database test failed:", error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

async function fixDTRTable() {
  let connection;
  try {
    // Test connection
    connection = await pool.getConnection();
    console.log("✅ Database connection successful!");

    // Change the 'day' column type from INT to VARCHAR
    console.log("Altering DTREntries table to change 'day' column type...");

    // First, check if the column exists and get its type
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DTREntries' AND COLUMN_NAME = 'day'
    `);

    if (columns.length > 0) {
      console.log(`Current 'day' column type: ${columns[0].DATA_TYPE}`);

      // Alter the column only if it's not already VARCHAR
      if (columns[0].DATA_TYPE.toLowerCase() !== "varchar") {
        await connection.query(`
          ALTER TABLE DTREntries MODIFY COLUMN day VARCHAR(10) NOT NULL
        `);
        console.log("✅ Successfully changed 'day' column type to VARCHAR(10)");
      } else {
        console.log(
          "✅ 'day' column is already VARCHAR type - no change needed"
        );
      }
    } else {
      console.log("❌ 'day' column not found in DTREntries table");
    }

    console.log("\n✅ Database fix complete!");
  } catch (error) {
    console.error("❌ Database fix failed:", error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

testDatabaseAndSetupTables();
fixDTRTable();
