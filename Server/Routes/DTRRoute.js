import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import xlsx from "xlsx";
import csv from "csv-parser";
import { verifyUser } from "../middleware.js";
import pool from "../utils/db.js";
import moment from "moment";

// Setup directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads/dtr");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Define accepted file types
const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  if (extname === ".csv" || extname === ".xlsx" || extname === ".xls") {
    cb(null, true);
  } else {
    cb(new Error("Only CSV, XLSX, and XLS files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = express.Router();

// Helper function to parse date from various formats
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  // Try different date formats
  const formats = [
    // MM/DD/YY
    (str) => {
      const parts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
      if (parts) {
        const year =
          parseInt(parts[3]) + (parseInt(parts[3]) < 50 ? 2000 : 1900);
        return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return null;
    },
    // MM/DD/YYYY
    (str) => {
      const parts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (parts) {
        return new Date(
          parseInt(parts[3]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2])
        );
      }
      return null;
    },
    // YYYY-MM-DD
    (str) => {
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    },
  ];

  for (const format of formats) {
    const date = format(dateStr);
    if (date) return date;
  }

  return null;
};

// Helper function to parse time (convert to HH:MM:SS format)
const parseTime = (timeStr) => {
  if (!timeStr) return null;

  // Remove any non-digit, non-colon characters
  timeStr = timeStr.toString().replace(/[^\d:]/g, "");

  // Try different time formats
  const formats = [
    // HH:MM:SS
    /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
    // HH:MM
    /^(\d{1,2}):(\d{1,2})$/,
    // HHMM (military time)
    /^(\d{2})(\d{2})$/,
  ];

  for (const format of formats) {
    const match = timeStr.match(format);
    if (match) {
      let hours,
        minutes,
        seconds = 0;

      if (match.length === 4) {
        // HH:MM:SS
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
        seconds = parseInt(match[3]);
      } else if (match.length === 3) {
        // HH:MM
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
      } else if (match.length === 3) {
        // HHMM
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
      }

      // Validate hours and minutes
      if (
        hours >= 0 &&
        hours < 24 &&
        minutes >= 0 &&
        minutes < 60 &&
        seconds >= 0 &&
        seconds < 60
      ) {
        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
    }
  }

  return null;
};

// Function to detect state (C/In or other) from string or pattern
const detectState = (stateStr, timeStr) => {
  if (!stateStr && !timeStr) return null;

  // Check for explicit state
  if (stateStr) {
    if (/c\s*\/\s*in/i.test(stateStr)) return "C/In";
    if (/c\s*\/\s*out/i.test(stateStr)) return "C/Out";
    if (/</i.test(stateStr)) return "<-";
  }

  // If no explicit state and timeStr exists, infer from time
  if (timeStr) {
    const timeNum = parseInt(timeStr.replace(/[^0-9]/g, ""));
    // Assuming morning times (before noon) are usually check ins
    if (timeNum < 1200) return "C/In";
    // Assuming afternoon/evening times are usually check outs
    else return "C/Out";
  }

  return null;
};

// Calculate hours between time in and time out
const calculateHours = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;

  const diff = (timeOut - timeIn) / (1000 * 60 * 60); // difference in hours
  return Math.round(diff * 100) / 100; // round to 2 decimal places
};

// Helper function to parse CSV/Excel files
async function parseFile(filePath, fileType) {
  console.log(`Parsing file: ${filePath} (${fileType})`);

  try {
    if (fileType === "csv") {
      return new Promise((resolve, reject) => {
        const results = [];

        // Read the file as text first to determine format
        fs.readFile(filePath, "utf8", (err, fileContent) => {
          if (err) {
            reject(err);
            return;
          }

          // Check if file contains tabs (common in Type 2)
          const containsTabs = fileContent.includes("\t");
          const delimiter = containsTabs ? "\t" : ",";

          console.log(`Detected delimiter: ${containsTabs ? "tab" : "comma"}`);

          if (containsTabs) {
            // For tab-delimited files, manually parse the lines
            const lines = fileContent.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              // Split by tab and clean each field
              const fields = line.split("\t").map((field) => field.trim());
              results.push(fields);
            }

            console.log(
              `Manually parsed ${results.length} rows from tab-delimited file`
            );
            if (results.length > 0) {
              console.log(`First row sample: ${JSON.stringify(results[0])}`);
            }

            resolve(results);
          } else {
            // Use csv-parser for standard CSV files
            fs.createReadStream(filePath)
              .pipe(
                csv({
                  headers: false, // Don't use first row as headers automatically
                  skipLines: 0,
                })
              )
              .on("data", (data) => {
                // Convert underscore keys (_0, _1, etc.) to array
                const rowArray = Object.values(data);
                results.push(rowArray);
              })
              .on("end", () => {
                // Process the raw CSV data
                if (results.length > 0) {
                  // Get headers from first row
                  const headers = results[0];

                  // Check if this looks like our expected format (has "AC-No." and "State")
                  if (headers[0] === "AC-No." && headers.includes("State")) {
                    console.log(
                      "Found Type 1 format with headers: AC-No., Name, Time, State"
                    );

                    // Convert the rows to objects with proper keys
                    const objectRows = [];
                    for (let i = 1; i < results.length; i++) {
                      const row = results[i];
                      const obj = {};
                      headers.forEach((header, index) => {
                        if (header) obj[header] = row[index] || "";
                      });
                      objectRows.push(obj);
                    }
                    resolve(objectRows);
                  } else {
                    // This is Type 2 (no headers) or unknown format
                    console.log("Treating as Type 2 format (no headers)");
                    resolve(results);
                  }
                } else {
                  resolve([]);
                }
              })
              .on("error", (err) => reject(err));
          }
        });
      });
    } else {
      // Handle Excel files
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      });

      // Process similar to CSV - check if first row has headers
      if (rawData.length > 0 && rawData[0].length > 0) {
        const headers = rawData[0];

        if (headers[0] === "AC-No." && headers.includes("State")) {
          console.log("Found Type 1 Excel format with headers");
          // Convert arrays to objects with headers as keys
          const objectRows = [];
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            const obj = {};
            headers.forEach((header, index) => {
              if (header) obj[header] = row[index] || "";
            });
            objectRows.push(obj);
          }
          return objectRows;
        } else {
          console.log("Treating Excel as Type 2 format (no headers)");
          return rawData;
        }
      }

      return rawData;
    }
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    throw error;
  }
}

// Process DTR data and standardize format
function processDTRData(data) {
  console.log(`Processing ${data.length} entries`);

  const isFormatType1 =
    data.length > 0 &&
    !Array.isArray(data[0]) &&
    typeof data[0] === "object" &&
    "AC-No." in data[0] &&
    "State" in data[0];

  const isFormatType2 = data.length > 0 && Array.isArray(data[0]);

  console.log(
    `Detected format: ${
      isFormatType1
        ? "Type 1 (with headers)"
        : isFormatType2
        ? "Type 2 (without headers)"
        : "Unknown"
    }`
  );

  if (data.length > 0) {
    console.log("First row data structure:", typeof data[0]);
    if (typeof data[0] === "object" && !Array.isArray(data[0])) {
      console.log("First row keys:", Object.keys(data[0]));
    } else if (Array.isArray(data[0])) {
      console.log("First row values:", data[0]);
    }
    console.log(
      "First row sample:",
      JSON.stringify(data[0]).substring(0, 100) + "..."
    );
  }

  let processedEntries = [];

  if (isFormatType1) {
    data.forEach((row) => {
      try {
        console.log("ROW:", row);
        const empId = row["AC-No."]?.toString().trim();
        const empName = row["Name"]?.toString().trim();
        const dateTimeStr = row["Time"]?.toString().trim();

        if (!empId || !dateTimeStr) {
          return; // Skip invalid rows
        }

        const dateTime = moment(dateTimeStr, "M/D/YYYY h:mm A");
        if (!dateTime.isValid()) {
          console.warn(`Invalid datetime format: ${dateTimeStr}`);
          return;
        }

        const date = dateTime.format("YYYY-MM-DD");
        const time = dateTime.format("HH:mm:ss");
        const day = dateTime.format("ddd");

        processedEntries.push({
          empId,
          empName,
          date,
          day,
          time,
          rawState: dateTimeStr,
        });
      } catch (error) {
        console.error("Error processing row:", error, row);
      }
    });
  } else if (isFormatType2) {
    // Format 2: Process headerless data with only employee ID and datetime
    const employeeTimeRecords = {};

    // First pass: Collect all time records
    data.forEach((row) => {
      try {
        if (!row || row.length < 2) {
          console.log("Skipping invalid row:", row);
          return; // Skip invalid rows
        }

        // Clean and extract data from the row
        let empId = row[0]?.toString().trim();
        let dateTimeStr = "";

        // If the first field contains both ID and datetime (tab separated but parsed as one)
        if (empId.includes(" ") && !row[1]) {
          const parts = empId.split(/\s+/);
          empId = parts[0].trim();
          dateTimeStr = parts.slice(1).join(" ").trim();
        } else {
          dateTimeStr = row[1]?.toString().trim();
        }

        // Clean empId - remove any non-numeric characters
        empId = empId.replace(/\D/g, "");

        console.log(`Processing row: EmpID=${empId}, DateTime=${dateTimeStr}`);

        if (!empId || !dateTimeStr || isNaN(empId)) {
          console.log(
            `Skipping row with invalid data: EmpID=${empId}, DateTime=${dateTimeStr}`
          );
          return; // Skip invalid rows
        }

        // Parse date and time - try multiple formats
        let dateTime;
        const formats = [
          "YYYY-MM-DD HH:mm:ss",
          "MM/DD/YYYY HH:mm:ss",
          "DD/MM/YYYY HH:mm:ss",
        ];

        for (const format of formats) {
          dateTime = moment(dateTimeStr, format);
          if (dateTime.isValid()) break;
        }

        if (!dateTime || !dateTime.isValid()) {
          console.warn(`Invalid datetime format: ${dateTimeStr}`);
          return;
        }

        const dateFormatted = dateTime.format("YYYY-MM-DD");
        const timeFormatted = dateTime.format("HH:mm:ss");
        const dayOfWeek = dateTime.format("ddd");

        console.log(
          `Parsed date=${dateFormatted}, time=${timeFormatted}, day=${dayOfWeek}`
        );

        if (!employeeTimeRecords[empId]) {
          employeeTimeRecords[empId] = {};
        }

        if (!employeeTimeRecords[empId][dateFormatted]) {
          employeeTimeRecords[empId][dateFormatted] = {
            empId,
            empName: `Employee ${empId}`, // Default name when not provided
            date: dateFormatted,
            day: dayOfWeek,
            records: [],
          };
        }

        employeeTimeRecords[empId][dateFormatted].records.push({
          time: timeFormatted,
        });

        console.log(`Added record for employee ${empId} on ${dateFormatted}`);
      } catch (error) {
        console.error("Error processing row:", error, row);
      }
    });

    // Log the collected records for debugging
    console.log(
      `Collected records for ${
        Object.keys(employeeTimeRecords).length
      } employees`
    );

    // Second pass: Create entries from the collected records HOLD THIS PROCESS FOR NOW
    Object.values(employeeTimeRecords).forEach((empDates) => {
      Object.values(empDates).forEach((dayData) => {
        const { empId, empName, date, day, records } = dayData;

        // Sort records by time
        records.sort((a, b) => a.time.localeCompare(b.time));

        // Assume first record is timeIn and last record is timeOut if multiple records exist
        // let timeIn = records.length > 0 ? records[0].time : null;
        // let timeOut =
        //   records.length > 1 ? records[records.length - 1].time : null;

        // console.log(
        //   `Employee ${empId} on ${date}: timeIn=${timeIn}, timeOut=${timeOut}`
        // );

        // // Calculate hours worked
        // let hours = 0;
        // let overtime = 0;

        // if (timeIn && timeOut) {
        //   const startTime = moment(`${date} ${timeIn}`, "YYYY-MM-DD HH:mm:ss");
        //   const endTime = moment(`${date} ${timeOut}`, "YYYY-MM-DD HH:mm:ss");

        //   // Calculate total hours worked
        //   const duration = moment.duration(endTime.diff(startTime));
        //   hours = duration.asHours();

        //   // Calculate overtime (over 8 hours)
        //   if (hours > 8) {
        //     overtime = hours - 8;
        //     hours = 8;
        //   }

        //   // Round to 2 decimal places
        //   hours = Math.round(hours * 100) / 100;
        //   overtime = Math.round(overtime * 100) / 100;

        //   console.log(`Calculated: hours=${hours}, overtime=${overtime}`);
        // }

        console.log("EMPLOYEE TIME RECORDS:", empId, empName, date, day, state);
        processedEntries.push({
          empId,
          empName,
          date,
          day,
          timeIn: timeIn || "",
          timeOut: timeOut || "",
          state,
        });

        console.log(`Added processed entry for employee ${empId} on ${date}`);
      });
    });
  } else {
    console.warn("Unknown data format received");
    return [];
  }

  // Log processed entries summary
  console.log(`Processed ${processedEntries.length} entries`);

  if (processedEntries.length > 0) {
    console.log("First processed entry:", JSON.stringify(processedEntries[0]));
  }

  // Sort processed entries by empId and rawState
  processedEntries.sort((a, b) => {
    if (a.empId !== b.empId) {
      return a.empId.localeCompare(b.empId);
    }
    return a.rawState.localeCompare(b.rawState);
  });

  return processedEntries;
}

// Create tables if they don't exist
async function setupDTRTables() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Setting up DTR tables...");

    // Create DTR Batches table - use uppercase table names to match existing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS DTRBatches (
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
    console.log("DTRBatches table created or verified");

    // Create DTR Entries table - use uppercase table names to match existing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS DTREntries (
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
        FOREIGN KEY (batchId) REFERENCES DTRBatches(id) ON DELETE CASCADE
      )
    `);
    console.log("DTREntries table created or verified");

    return true;
  } catch (error) {
    console.error("Error setting up DTR tables:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Call setupDTRTables immediately when this module is loaded
(async () => {
  try {
    await setupDTRTables();
    console.log("DTR database setup complete");
  } catch (err) {
    console.error("Failed to set up DTR database:", err);
  }
})();

// Route to upload DTR files
router.post("/upload", upload.array("dtrFiles", 10), async (req, res) => {
  let connection;
  const uploadedFiles = req.files || [];

  try {
    console.log("=========== DTR UPLOAD REQUEST ===========");
    console.log(`Received ${uploadedFiles.length} files for processing`);

    if (uploadedFiles.length === 0) {
      console.log("Error: No files uploaded");
      return res.status(400).json({
        Status: false,
        Error: "No files uploaded",
      });
    }

    const { batchName, periodStart, periodEnd } = req.body;
    console.log("Upload request details:", {
      batchName,
      periodStart,
      periodEnd,
      fileCount: uploadedFiles.length,
    });

    if (!batchName || !periodStart || !periodEnd) {
      console.log("Error: Missing required fields");
      return res.status(400).json({
        Status: false,
        Error: "Batch name and period dates are required",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log("Database transaction started");

    // Create a new batch record - use uppercase table names
    const [batchResult] = await connection.query(
      "INSERT INTO DTRBatches (batchName, periodStart, periodEnd, fileCount) VALUES (?, ?, ?, ?)",
      [batchName, periodStart, periodEnd, uploadedFiles.length]
    );

    const batchId = batchResult.insertId;
    console.log("Created batch with ID:", batchId);

    // Process each uploaded file
    let totalEntries = 0;
    let allProcessedData = [];
    let fileProcessingResults = [];

    for (const file of uploadedFiles) {
      const filePath = file.path;
      const fileType = path
        .extname(file.originalname)
        .toLowerCase()
        .substring(1);

      try {
        console.log(`Processing file: ${file.originalname} (${fileType})`);

        // Parse the file
        const rawData = await parseFile(filePath, fileType);
        console.log(
          `Parsed ${rawData.length} rows from file ${file.originalname}`
        );
        console.log("RAWDATA", rawData);

        // Debug sample of rawData
        if (rawData.length > 0) {
          console.log("First entry type:", typeof rawData[0]);
          if (typeof rawData[0] === "object" && !Array.isArray(rawData[0])) {
            console.log("First entry keys:", Object.keys(rawData[0]));
          } else if (Array.isArray(rawData[0])) {
            console.log(
              "First entry is array, first few values:",
              rawData[0].slice(0, 5)
            );
          }
        }

        // Process the data
        const processedData = processDTRData(rawData);
        console.log(
          `Processed ${processedData.length} entries from ${file.originalname}`
        );

        // Debug sample of processed data
        if (processedData.length > 0) {
          console.log(
            "First processed entry:",
            JSON.stringify(processedData[0])
          );
        }

        // Add to all processed data
        allProcessedData = [...allProcessedData, ...processedData];

        fileProcessingResults.push({
          fileName: file.originalname,
          rowCount: rawData.length,
          entriesProcessed: processedData.length,
        });

        totalEntries += processedData.length;
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        fileProcessingResults.push({
          fileName: file.originalname,
          error: error.message,
        });
      }
    }

    console.log(`Total entries to insert: ${allProcessedData.length}`);

    // Prepare data for database insertion - convert to correct format
    const entriesData = allProcessedData.map((entry) => [
      batchId,
      entry.empId,
      entry.empName,
      entry.date,
      entry.day || "NA",
      entry.time || null,
      entry.rawState || null,
      entry.timeIn || null,
      entry.timeOut || null,
      entry.state || null,
      entry.hours || 0,
      entry.overtime || 0,
      entry.specialHours || 0,
      entry.remarks || null,
    ]);

    console.log("ENTRIES DATA", entriesData);
    // Insert processed entries in bulk - use uppercase table names
    if (entriesData.length > 0) {
      console.log(
        `Inserting ${entriesData.length} entries into DTREntries table`
      );
      await connection.query(
        `INSERT INTO DTREntries 
         (batchId, empId, empName, date, day, time, rawState, timeIn, timeOut, state, hours, overtime, specialHours, remarks) 
         VALUES ?`,
        [entriesData]
      );
      console.log("Bulk insert completed successfully");
    } else {
      console.log("No valid entries found to insert");
    }

    // Update batch with entry count - use uppercase table names
    await connection.query(
      "UPDATE DTRBatches SET entryCount = ? WHERE id = ?",
      [totalEntries, batchId]
    );
    console.log(`Updated batch ${batchId} with entry count: ${totalEntries}`);

    await connection.commit();
    console.log("Database transaction committed");

    // Fetch the created batch to return to client - use uppercase table names
    const [createdBatch] = await connection.query(
      "SELECT * FROM DTRBatches WHERE id = ?",
      [batchId]
    );
    console.log("Fetched created batch for response");

    console.log("Sending success response to client");
    res.status(200).json({
      Status: true,
      Message: `Successfully processed ${totalEntries} DTR entries from ${uploadedFiles.length} files`,
      BatchId: batchId,
      Files: fileProcessingResults,
      Batch: createdBatch[0],
    });
    console.log("=========== DTR UPLOAD COMPLETE ===========");
  } catch (error) {
    console.error("Error processing DTR files:", error);
    if (connection) {
      await connection.rollback();
      console.log("Database transaction rolled back due to error");
    }

    res.status(500).json({
      Status: false,
      Error: `Failed to process upload: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get DTR batches
router.get("/batches", async (req, res) => {
  let connection;

  try {
    console.log("Fetching DTR batches...");
    connection = await pool.getConnection();

    // Use uppercase table names
    const [batches] = await connection.query(
      "SELECT * FROM DTRBatches ORDER BY createdAt DESC"
    );

    console.log(`Found ${batches.length} batches`);

    // Always return in a consistent format
    res.status(200).json({
      Status: true,
      Result: batches,
    });
  } catch (error) {
    console.error("Error fetching DTR batches:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to fetch DTR batches: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get DTR summary report
router.get("/summary/:batchId", async (req, res) => {
  let connection;

  try {
    const { batchId } = req.params;
    console.log(`Fetching summary report for batch ${batchId}`);

    connection = await pool.getConnection();

    // Get batch details - use uppercase table names
    const [batchDetails] = await connection.query(
      "SELECT * FROM DTRBatches WHERE id = ?",
      [batchId]
    );

    if (batchDetails.length === 0) {
      console.log(`Batch ${batchId} not found`);
      return res.status(404).json({
        Status: false,
        Error: "Batch not found",
      });
    }

    // Get employee summary - use uppercase table names
    const [summaryData] = await connection.query(
      `SELECT 
        empId, 
        empName, 
        COUNT(*) as entryCount, 
        SUM(hours) as totalHours, 
        SUM(overtime) as totalOvertime,
        SUM(specialHours) as totalSpecialHours
       FROM DTREntries 
       WHERE batchId = ? 
       GROUP BY empId, empName
       ORDER BY empName`,
      [batchId]
    );

    console.log(`Found summary data for ${summaryData.length} employees`);

    res.json({
      Status: true,
      BatchDetails: batchDetails[0],
      Summary: summaryData,
    });
  } catch (error) {
    console.error("Error fetching DTR summary:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to fetch DTR summary: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get DTR detail report
router.get("/detail/:batchId/:empId", async (req, res) => {
  let connection;

  try {
    const { batchId, empId } = req.params;
    console.log(
      `Fetching detail report for batch ${batchId}, employee ${empId}`
    );

    connection = await pool.getConnection();

    // Get batch details - use uppercase table names
    const [batchDetails] = await connection.query(
      "SELECT * FROM DTRBatches WHERE id = ?",
      [batchId]
    );

    if (batchDetails.length === 0) {
      console.log(`Batch ${batchId} not found`);
      return res.status(404).json({
        Status: false,
        Error: "Batch not found",
      });
    }

    // Get employee details - use uppercase table names
    const [details] = await connection.query(
      `SELECT * FROM DTREntries 
       WHERE batchId = ? AND empId = ? 
       ORDER BY date, timeIn`,
      [batchId, empId]
    );

    if (details.length === 0) {
      console.log(`No entries found for employee ${empId} in batch ${batchId}`);
      return res.status(404).json({
        Status: false,
        Error: "No DTR entries found for this employee",
      });
    }

    console.log(`Found ${details.length} entries for employee ${empId}`);

    res.json({
      Status: true,
      BatchDetails: batchDetails[0],
      Detail: details,
    });
  } catch (error) {
    console.error("Error fetching DTR details:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to fetch DTR details: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Export batch data
router.get("/export/:batchId", async (req, res) => {
  let connection;

  try {
    const { batchId } = req.params;
    console.log(`Exporting data for batch ${batchId}`);

    connection = await pool.getConnection();

    // Get batch details
    const [batchDetails] = await connection.query(
      "SELECT * FROM DTRBatches WHERE id = ?",
      [batchId]
    );

    if (batchDetails.length === 0) {
      console.log(`Batch ${batchId} not found`);
      return res.status(404).json({
        Status: false,
        Error: "Batch not found",
      });
    }

    // Get all entries for this batch
    const [entries] = await connection.query(
      `SELECT * FROM DTREntries 
       WHERE batchId = ? 
       ORDER BY empId, date, timeIn`,
      [batchId]
    );

    console.log(`Found ${entries.length} entries for export`);

    res.json({
      Status: true,
      BatchDetails: batchDetails[0],
      Entries: entries,
    });
  } catch (error) {
    console.error("Error exporting batch data:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to export batch data: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Delete batch
router.delete("/batch/:batchId", async (req, res) => {
  let connection;

  try {
    const { batchId } = req.params;
    console.log(`Deleting batch ${batchId}`);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get batch details first (for confirmation)
    const [batchDetails] = await connection.query(
      "SELECT * FROM DTRBatches WHERE id = ?",
      [batchId]
    );

    if (batchDetails.length === 0) {
      console.log(`Batch ${batchId} not found`);
      return res.status(404).json({
        Status: false,
        Error: "Batch not found",
      });
    }

    // Delete entries first (cascade should handle this, but just to be safe)
    await connection.query("DELETE FROM DTREntries WHERE batchId = ?", [
      batchId,
    ]);
    console.log(`Deleted entries for batch ${batchId}`);

    // Then delete the batch
    await connection.query("DELETE FROM DTRBatches WHERE id = ?", [batchId]);
    console.log(`Deleted batch ${batchId}`);

    await connection.commit();

    res.json({
      Status: true,
      Message: `Batch ${batchId} successfully deleted`,
      DeletedBatch: batchDetails[0],
    });
  } catch (error) {
    console.error("Error deleting batch:", error);
    if (connection) await connection.rollback();

    res.status(500).json({
      Status: false,
      Error: `Failed to delete batch: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Add files to existing batch
router.post(
  "/add-to-batch/:batchId",
  upload.array("dtrFiles", 10),
  async (req, res) => {
    let connection;
    const uploadedFiles = req.files || [];
    const { batchId } = req.params;

    try {
      console.log("=========== DTR ADD TO BATCH REQUEST ===========");
      console.log(`Adding ${uploadedFiles.length} files to batch ${batchId}`);

      if (uploadedFiles.length === 0) {
        console.log("Error: No files uploaded");
        return res.status(400).json({
          Status: false,
          Error: "No files uploaded",
        });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();
      console.log("Database transaction started");

      // Get the existing batch
      const [batchDetails] = await connection.query(
        "SELECT * FROM DTRBatches WHERE id = ?",
        [batchId]
      );

      if (batchDetails.length === 0) {
        console.log(`Batch ${batchId} not found`);
        return res.status(404).json({
          Status: false,
          Error: "Batch not found",
        });
      }

      const existingBatch = batchDetails[0];
      console.log("Found existing batch:", existingBatch);

      // Process each uploaded file
      let totalEntries = 0;
      let allProcessedData = [];
      let fileProcessingResults = [];

      for (const file of uploadedFiles) {
        const filePath = file.path;
        const fileType = path
          .extname(file.originalname)
          .toLowerCase()
          .substring(1);

        try {
          console.log(`Processing file: ${file.originalname} (${fileType})`);
          // Parse the file
          const rawData = await parseFile(filePath, fileType);
          console.log(
            `Parsed ${rawData.length} rows from file ${file.originalname}`
          );

          // Debug sample of rawData
          if (rawData.length > 0) {
            console.log("First entry type:", typeof rawData[0]);
            if (typeof rawData[0] === "object" && !Array.isArray(rawData[0])) {
              console.log("First entry keys:", Object.keys(rawData[0]));
            } else if (Array.isArray(rawData[0])) {
              console.log(
                "First entry is array, first few values:",
                rawData[0].slice(0, 5)
              );
            }
          }

          // Process the data
          const processedData = processDTRData(rawData);
          console.log(
            `Processed ${processedData.length} entries from ${file.originalname}`
          );

          // Debug sample of processed data
          if (processedData.length > 0) {
            console.log(
              "First processed entry:",
              JSON.stringify(processedData[0])
            );
          }

          // Add to all processed data
          allProcessedData = [...allProcessedData, ...processedData];

          fileProcessingResults.push({
            fileName: file.originalname,
            rowCount: rawData.length,
            entriesProcessed: processedData.length,
          });

          totalEntries += processedData.length;
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          fileProcessingResults.push({
            fileName: file.originalname,
            error: error.message,
          });
        }
      }

      console.log(`Total entries to insert 1: ${allProcessedData.length}`);

      if (allProcessedData.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          Status: false,
          Error: "No valid data found in the uploaded files",
        });
      }

      // Prepare data for database insertion
      const entriesData = allProcessedData.map((entry) => [
        batchId,
        entry.empId,
        entry.empName,
        entry.date,
        entry.day || "NA",
        entry.time || null,
        entry.rawState || null,
        entry.timeIn || null,
        entry.timeOut || null,
        entry.state || null,
        entry.hours || 0,
        entry.overtime || 0,
        entry.specialHours || 0,
        entry.remarks || null,
      ]);

      // Insert processed entries in bulk
      console.log(
        `Inserting ${entriesData.length} entries into DTREntries table`
      );
      await connection.query(
        `INSERT INTO DTREntries 
       (batchId, empId, empName, date, day, time, rawState, timeIn, timeOut, state, hours, overtime, specialHours, remarks) 
       VALUES ?`,
        [entriesData]
      );
      console.log("Bulk insert completed successfully");

      // Update batch with total files and entries
      const newFileCount = existingBatch.fileCount + uploadedFiles.length;
      const newEntryCount = existingBatch.entryCount + totalEntries;

      await connection.query(
        "UPDATE DTRBatches SET fileCount = ?, entryCount = ? WHERE id = ?",
        [newFileCount, newEntryCount, batchId]
      );
      console.log(
        `Updated batch ${batchId} with new file count: ${newFileCount}, entry count: ${newEntryCount}`
      );

      await connection.commit();
      console.log("Database transaction committed");

      // Fetch the updated batch
      const [updatedBatch] = await connection.query(
        "SELECT * FROM DTRBatches WHERE id = ?",
        [batchId]
      );
      console.log("Fetched updated batch for response");

      console.log("Sending success response to client");
      res.status(200).json({
        Status: true,
        Message: `Successfully added ${totalEntries} DTR entries from ${uploadedFiles.length} files to batch ${batchId}`,
        BatchId: batchId,
        Files: fileProcessingResults,
        Batch: updatedBatch[0],
      });
      console.log("=========== DTR ADD TO BATCH COMPLETE ===========");
    } catch (error) {
      console.error("Error adding files to batch:", error);
      if (connection) {
        await connection.rollback();
        console.log("Database transaction rolled back due to error");
      }

      res.status(500).json({
        Status: false,
        Error: `Failed to add files to batch: ${error.message}`,
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

export const DTRRouter = router;
