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

// Ensure upload directory exists with proper permissions
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    console.log("Created upload directory:", uploadDir);
  } catch (err) {
    console.error("Error creating upload directory:", err);
  }
}

// Log upload directory status
try {
  const stats = fs.statSync(uploadDir);
} catch (err) {
  console.error("Error checking upload directory:", err);
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

          if (containsTabs) {
            // For tab-delimited files, manually parse the lines
            const lines = fileContent.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              // Split by tab and clean each field
              const fields = line.split("\t").map((field) => field.trim());
              results.push(fields);
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
function processDTRData(data, existingEmployees = new Map()) {
  // Merge existing employees with any new ones found in the data
  const employeeNames = new Map(existingEmployees);

  const isFormatType1 =
    data.length > 0 &&
    !Array.isArray(data[0]) &&
    typeof data[0] === "object" &&
    "AC-No." in data[0] &&
    "State" in data[0];

  const isFormatType2 = data.length > 0 && Array.isArray(data[0]);

  if (data.length > 0) {
    if (typeof data[0] === "object" && !Array.isArray(data[0])) {
    } else if (Array.isArray(data[0])) {
    }
  }

  let processedEntries = [];

  if (isFormatType1) {
    data.forEach((row) => {
      try {
        const empId = row["AC-No."]?.toString().trim();
        const empName = row["Name"]?.toString().trim();
        const dateTimeStr = row["Time"]?.toString().trim();
        const state = row["State"]?.toString().trim();

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
          state: state || null,
          remarks: "Type 1",
        });

        if (empId && empName) {
          employeeNames.set(empId, empName);
        }
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

        if (!empId || !dateTimeStr || isNaN(empId)) {
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

        if (!employeeTimeRecords[empId]) {
          employeeTimeRecords[empId] = {};
        }

        if (!employeeTimeRecords[empId][dateFormatted]) {
          employeeTimeRecords[empId][dateFormatted] = {
            empId,
            empName:
              employeeNames.get(empId) ||
              existingEmployees.get(empId) ||
              `Employee ${empId}`,
            date: dateFormatted,
            day: dayOfWeek,
            records: [],
          };
        }

        employeeTimeRecords[empId][dateFormatted].records.push({
          time: timeFormatted,
        });
      } catch (error) {
        console.error("Error processing row:", error, row);
      }
    });

    // Second pass: Create entries from the collected records
    Object.values(employeeTimeRecords).forEach((empDates) => {
      Object.values(empDates).forEach((dayData) => {
        const { empId, empName, date, day, records } = dayData;

        // Sort records by time
        records.sort((a, b) => a.time.localeCompare(b.time));

        // Filter out records based on rules
        const filteredRecords = [];
        for (let i = 0; i < records.length; i++) {
          const currentTime = moment(`${date} ${records[i].time}`);

          // Skip if this record was already processed
          if (records[i].processed) continue;

          // Check if there's a next record to compare
          if (i + 1 < records.length) {
            const nextTime = moment(`${date} ${records[i + 1].time}`);

            // Calculate minutes difference
            const minutesDiff = nextTime.diff(currentTime, "minutes");

            // Get hours for time range checks
            const currentHour = currentTime.hours();
            const nextHour = nextTime.hours();
            const currentMinute = currentTime.minutes();
            const nextMinute = nextTime.minutes();

            // Rule 1: Skip both records if they're within 15 minutes
            if (minutesDiff <= 15) {
              records[i].processed = true;
              records[i + 1].processed = true;
              continue;
            }

            // Rule 2: Skip both records if they're between 12:00-13:00
            if (
              (currentHour === 12 ||
                (currentHour === 13 && currentMinute === 0)) &&
              (nextHour === 12 || (nextHour === 13 && nextMinute === 0))
            ) {
              records[i].processed = true;
              records[i + 1].processed = true;
              continue;
            }

            // Rule 3: Skip both records if they're between 19:00-20:00
            if (
              (currentHour === 19 ||
                (currentHour === 20 && currentMinute === 0)) &&
              (nextHour === 19 || (nextHour === 20 && nextMinute === 0))
            ) {
              records[i].processed = true;
              records[i + 1].processed = true;
              continue;
            }
          }

          // If record wasn't filtered out, add it
          if (!records[i].processed) {
            filteredRecords.push(records[i]);
          }
        }

        // Process remaining records
        filteredRecords.forEach((record) => {
          // Create raw state by combining date and time
          const rawState = `${date} ${record.time}`;

          processedEntries.push({
            empId,
            empName,
            date,
            day,
            time: record.time,
            rawState: rawState,
            remarks: "Type 2",
          });
        });
      });
    });
  } else {
    console.warn("Unknown data format received");
    return [];
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

// Route to upload DTR files
router.post("/upload", upload.array("dtrFiles", 10), async (req, res) => {
  let connection;
  const uploadedFiles = req.files || [];

  try {
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        Status: false,
        Error: "No files uploaded",
      });
    }

    const { batchName, periodStart, periodEnd } = req.body;

    if (!batchName || !periodStart || !periodEnd) {
      console.log("Error: Missing required fields");
      return res.status(400).json({
        Status: false,
        Error: "Batch name and period dates are required",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Create a new batch record - use uppercase table names
    const [batchResult] = await connection.query(
      "INSERT INTO DTRBatches (batchName, periodStart, periodEnd, fileCount) VALUES (?, ?, ?, ?)",
      [batchName, periodStart, periodEnd, uploadedFiles.length]
    );

    const batchId = batchResult.insertId;

    // Get existing employee names
    const existingEmployees = await getExistingEmployeeNames(connection);

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
        // Parse the file
        const rawData = await parseFile(filePath, fileType);

        // Process the data
        const processedData = processDTRData(rawData, existingEmployees);

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

    // Insert processed entries in bulk - use uppercase table names
    if (entriesData.length > 0) {
      await connection.query(
        `INSERT INTO DTREntries 
         (batchId, empId, empName, date, day, time, rawState, timeIn, timeOut, state, hours, overtime, specialHours, remarks) 
         VALUES ?`,
        [entriesData]
      );
    }

    // Update batch with entry count - use uppercase table names
    await connection.query(
      "UPDATE DTRBatches SET entryCount = ? WHERE id = ?",
      [totalEntries, batchId]
    );

    await connection.commit();

    // Fetch the created batch to return to client - use uppercase table names
    const [createdBatch] = await connection.query(
      "SELECT * FROM DTRBatches WHERE id = ?",
      [batchId]
    );

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
    connection = await pool.getConnection();

    // Use uppercase table names
    const [batches] = await connection.query(
      "SELECT * FROM DTRBatches ORDER BY createdAt DESC"
    );

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

    // Get all entries for this batch - format date and dateOut as strings
    const [entries] = await connection.query(
      `SELECT id, batchId, empId, empName, 
       DATE_FORMAT(date, '%Y-%m-%d') as date, 
       DATE_FORMAT(dateOut, '%Y-%m-%d') as dateOut, 
       day, time, rawState, timeIn, timeOut, state, 
       hours, overtime, sundayHours, sundayOT, holidayHours, holidayOT, holidayType, nightDifferential,
       processed, deleteRecord, editedIn, editedOut, remarks
       FROM DTREntries 
       WHERE batchId = ? 
       ORDER BY empId, date, time`,
      [batchId]
    );

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
router.delete("/DTRdelete/:batchId", async (req, res) => {
  let connection;

  try {
    const { batchId } = req.params;

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

    // Then delete the batch
    await connection.query("DELETE FROM DTRBatches WHERE id = ?", [batchId]);

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
      // Validate files
      if (!uploadedFiles || uploadedFiles.length === 0) {
        console.log("No files received in request");
        return res.status(400).json({
          Status: false,
          Error: "No files uploaded",
          Debug: {
            files: req.files,
            body: req.body,
          },
        });
      }

      // Validate batch ID
      if (!batchId || isNaN(batchId)) {
        console.log("Invalid batch ID:", batchId);
        return res.status(400).json({
          Status: false,
          Error: "Invalid batch ID",
          Debug: { batchId },
        });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Add this line to get existing employee names
      const existingEmployees = await getExistingEmployeeNames(connection);

      // Verify batch exists
      const [batchDetails] = await connection.query(
        "SELECT * FROM DTRBatches WHERE id = ?",
        [batchId]
      );

      if (batchDetails.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          Status: false,
          Error: "Batch not found",
        });
      }

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
          // Parse the file
          const rawData = await parseFile(filePath, fileType);

          // Pass existingEmployees to processDTRData
          const processedData = processDTRData(rawData, existingEmployees);

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
      if (entriesData.length > 0) {
        await connection.query(
          `INSERT INTO DTREntries 
       (batchId, empId, empName, date, day, time, rawState, timeIn, timeOut, state, hours, overtime, specialHours, remarks) 
       VALUES ?`,
          [entriesData]
        );
      }

      // Update batch with new total files and entries
      const [currentBatch] = await connection.query(
        "SELECT fileCount, entryCount FROM DTRBatches WHERE id = ?",
        [batchId]
      );

      const newFileCount = currentBatch[0].fileCount + uploadedFiles.length;
      const newEntryCount = currentBatch[0].entryCount + totalEntries;

      await connection.query(
        "UPDATE DTRBatches SET fileCount = ?, entryCount = ? WHERE id = ?",
        [newFileCount, newEntryCount, batchId]
      );

      await connection.commit();

      // Get updated batch details
      const [updatedBatch] = await connection.query(
        "SELECT * FROM DTRBatches WHERE id = ?",
        [batchId]
      );

      res.json({
        Status: true,
        Message: `Successfully added ${totalEntries} entries from ${uploadedFiles.length} files`,
        Files: fileProcessingResults,
        Batch: updatedBatch[0],
      });
    } catch (error) {
      console.error("Error in add-to-batch:", error);
      if (connection) await connection.rollback();
      return res.status(500).json({
        Status: false,
        Error: error.message,
        Stack: error.stack,
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

// Add this test route
router.post(
  "/test-upload/:batchId",
  upload.array("dtrFiles", 10),
  (req, res) => {
    res.json({
      Status: true,
      message: "Test upload received",
      filesCount: req.files.length,
      batchId: req.params.batchId,
    });
  }
);

// Add this new route to get employee names
router.get("/DTRemployees", async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    // Get unique employee IDs and names
    const [employees] = await connection.query(`
      SELECT DISTINCT empId, empName 
      FROM DTREntries 
      ORDER BY empName
    `);

    res.json({
      Status: true,
      Employees: employees,
    });
  } catch (error) {
    console.error("Error fetching employee list:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to fetch employee list: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Add this function to get employee names before processing new files
async function getExistingEmployeeNames(connection) {
  try {
    const [employees] = await connection.query(`
      SELECT DISTINCT empId, empName 
      FROM DTREntries
    `);

    const employeeMap = new Map();
    employees.forEach((emp) => {
      employeeMap.set(emp.empId, emp.empName);
    });

    return employeeMap;
  } catch (error) {
    console.error("Error fetching existing employee names:", error);
    return new Map();
  }
}

// Add route to update entries
router.post("/update-entries/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({
        Status: false,
        Error: "Invalid entries data",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update each entry
    for (const entry of entries) {
      // Format the date to YYYY-MM-DD
      const formattedDate = entry.date
        ? moment(entry.date).format("YYYY-MM-DD")
        : null;
      const formattedDateOut = entry.dateOut
        ? moment(entry.dateOut).format("YYYY-MM-DD")
        : null;

      await connection.query(
        `
        UPDATE DTREntries 
        SET 
            date = ?,
            dateOut = ?,
            timeIn = ?,
            timeOut = ?,
            editedIn = ?,
            editedOut = ?,
            processed = ?,
            deleteRecord = ?,
            remarks = ?
        WHERE id = ? AND batchId = ?
      `,
        [
          formattedDate,
          formattedDateOut,
          entry.timeIn,
          entry.timeOut,
          entry.editedIn,
          entry.editedOut,
          entry.processed || 0,
          entry.deleteRecord || 0,
          entry.remarks || null,
          entry.id,
          batchId,
        ]
      );
    }

    await connection.commit();

    res.json({
      Status: true,
      Message: "Successfully updated entries",
      UpdatedCount: entries.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating entries:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to update entries: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Add route to update hours
router.post("/update-hours/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({
        Status: false,
        Error: "Invalid entries data",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update each entry
    for (const entry of entries) {
      await connection.query(
        `
        UPDATE DTREntries 
        SET 
          hours = ?,
          overtime = ?,
          remarks = IF(
            INSTR(remarks, 'HOURS') = 0,
            CONCAT('HOURS, ', remarks),
            remarks
          )
        WHERE id = ? AND batchId = ? AND processed = 1 AND deleteRecord = 0
      `,
        [entry.hours, entry.overtime, entry.id, batchId]
      );
    }

    await connection.commit();

    res.json({
      Status: true,
      Message: "Successfully updated hours",
      UpdatedCount: entries.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating hours:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to update hours: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Route to update timeIn
router.post("/update-time-in/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    const { id, timeIn, processed, date } = req.body;

    if (!id || !timeIn) {
      return res.status(400).json({
        Status: false,
        Error: "Missing required fields: id and timeIn",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE DTREntries 
      SET 
        timeIn = ?,
        processed = ?,
        editedIn = 1,
        ${date ? "date = ?," : ""}
        remarks = CONCAT('MANUAL IN, ', COALESCE(remarks, ''))
      WHERE id = ? AND batchId = ?
    `,
      date
        ? [timeIn, processed || 0, date, id, batchId]
        : [timeIn, processed || 0, id, batchId]
    );

    await connection.commit();

    res.json({
      Status: true,
      Message: "Successfully updated time in",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating time in:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to update time in: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Route to update timeOut
router.post("/update-time-out/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    const { id, timeOut, processed, dateOut } = req.body;

    if (!id || !timeOut) {
      return res.status(400).json({
        Status: false,
        Error: "Missing required fields: id and timeOut",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE DTREntries 
      SET 
        timeOut = ?,
        processed = ?,
        editedOut = 1,
        ${dateOut ? "dateOut = ?," : ""}
        remarks = CONCAT('MANUAL OUT, ', COALESCE(remarks, ''))
      WHERE id = ? AND batchId = ?
    `,
      dateOut
        ? [timeOut, processed || 0, dateOut, id, batchId]
        : [timeOut, processed || 0, id, batchId]
    );

    await connection.commit();

    res.json({
      Status: true,
      Message: "Successfully updated time out",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating time out:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to update time out: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Route to add a new entry
router.post("/add-entry/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    const { entry } = req.body;

    if (!entry) {
      return res.status(400).json({
        Status: false,
        Error: "Entry data is required",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert the new entry
    await connection.query(
      `INSERT INTO DTREntries 
       (batchId, empId, empName, date, day, timeIn, timeOut, 
        processed, editedIn, editedOut, remarks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batchId,
        entry.empId,
        entry.empName,
        entry.date,
        entry.day,
        entry.timeIn,
        entry.timeOut,
        entry.processed,
        entry.editedIn,
        entry.editedOut,
        entry.remarks,
      ]
    );

    await connection.commit();

    res.json({
      Status: true,
      Message: "Successfully added new entry",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error adding new entry:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to add new entry: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Add this new route for deleting individual entries
router.delete("/delete-entry/:batchId/:entryId", async (req, res) => {
  let connection;
  try {
    const { batchId, entryId } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update the entry to mark it as deleted
    await connection.query(`DELETE FROM DTREntries WHERE id = ?`, [entryId]);

    await connection.commit();

    res.json({
      Status: true,
      Message: "Entry successfully deleted",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error deleting entry:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to delete entry: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Add these new routes
router.post("/update-time-in-only/:batchId", async (req, res) => {
  try {
    const { id, time } = req.body;
    const { batchId } = req.params;

    const sql = `
      UPDATE DTREntries 
      SET timeIn = ?
      WHERE id = ?
    `;

    const [result] = await pool.query(sql, [time, id, batchId]);

    if (result.affectedRows > 0) {
      res.json({ Status: true, Message: "Time in updated successfully" });
    } else {
      res.json({ Status: false, Error: "Failed to update time in" });
    }
  } catch (error) {
    console.error("Error updating time in:", error);
    res.json({ Status: false, Error: "Server error while updating time in" });
  }
});

router.post("/update-time-out-only/:batchId", async (req, res) => {
  try {
    const { id, time } = req.body;
    const { batchId } = req.params;

    const sql = `
      UPDATE DTREntries 
      SET timeOut = ?
      WHERE id = ?
    `;

    const [result] = await pool.query(sql, [time, id, batchId]);

    if (result.affectedRows > 0) {
      res.json({ Status: true, Message: "Time out updated successfully" });
    } else {
      res.json({ Status: false, Error: "Failed to update time out" });
    }
  } catch (error) {
    console.error("Error updating time out:", error);
    res.json({ Status: false, Error: "Server error while updating time out" });
  }
});

// Add this new route for updating both timeIn and timeOut
router.post("/update-time-in-out/:batchId", async (req, res) => {
  let connection;
  try {
    // const { batchId } = req.params;
    const { id, timeIn, timeOut, editedIn, editedOut, date, dateOut } =
      req.body;

    if (!id || !timeIn || !timeOut) {
      return res.status(400).json({
        Status: false,
        Error: "Missing required fields: id, timeIn, and timeOut",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const updateFields = [
      "timeIn = ?",
      "timeOut = ?",
      "editedIn = ?",
      "editedOut = ?",
      "processed = 1",
    ];

    const updateValues = [timeIn, timeOut, editedIn, editedOut];

    if (date) {
      updateFields.push("date = ?");
      updateValues.push(date);
    }

    if (dateOut) {
      updateFields.push("dateOut = ?");
      updateValues.push(dateOut);
    }

    // Add ID at the end of values array
    updateValues.push(id);

    await connection.query(
      `
      UPDATE DTREntries 
      SET 
        ${updateFields.join(", ")}
      WHERE id = ?
    `,
      updateValues
    );

    await connection.commit();

    res.json({
      Status: true,
      Message: "Successfully updated time in and out",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating time in and out:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to update time in and out: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
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

// Add this new route to update special hours
router.post("/update-special-hours/:batchId", async (req, res) => {
  try {
    const { entry } = req.body;
    const { batchId } = req.params;

    if (!entry || !entry.id) {
      return res.status(400).json({
        Status: false,
        Error: "Invalid entry data",
      });
    }

    const sql = `
      UPDATE DTREntries 
      SET 
        sundayHours = ?,
        sundayOT = ?,
        holidayHours = ?,
        holidayOT = ?,
        holidayType = ?,
        nightDifferential = ?,
        hours = ?,
        overtime = ?
      WHERE id = ? AND batchId = ?
    `;

    const [result] = await pool.query(sql, [
      entry.sundayHours || 0,
      entry.sundayOT || 0,
      entry.holidayHours || 0,
      entry.holidayOT || 0,
      entry.holidayType || "",
      entry.nightDifferential || 0,
      entry.hours || 0,
      entry.overtime || 0,
      entry.id,
      batchId,
    ]);

    if (result.affectedRows > 0) {
      res.json({
        Status: true,
        Message: "Special hours updated successfully for entry " + entry.id,
      });
    } else {
      res.json({
        Status: false,
        Error: "Failed to update entry " + entry.id,
      });
    }
  } catch (error) {
    console.error("Error updating special hours:", error);
    res.status(500).json({
      Status: false,
      Error: "Server error while updating special hours: " + error.message,
    });
  }
});

// Add this route to handle period date updates
router.post("/dtr/update-period/:batchId", async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body;
    const batchId = req.params.batchId;

    const sql =
      "UPDATE dtr_batches SET periodStart = ?, periodEnd = ? WHERE id = ?";
    const values = [periodStart, periodEnd, batchId];

    await pool.query(sql, values);
    return res.json({ Status: true });
  } catch (error) {
    console.error("Error in update-period route:", error);
    return res.json({ Status: false, Error: "Server error" });
  }
});

// Add this new route for changing employee names
router.post("/change-name/:batchId", async (req, res) => {
  const { batchId } = req.params;
  const { entries } = req.body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.json({
      Status: false,
      Error: "No entries provided for name change",
    });
  }

  try {
    // Group entries by empId to get unique employees
    const uniqueEmployees = entries.reduce((acc, entry) => {
      if (!acc[entry.empId]) {
        acc[entry.empId] = entry.empName;
      }
      return acc;
    }, {});

    // Update each unique employee's name
    for (const [empId, newName] of Object.entries(uniqueEmployees)) {
      const [result] = await pool.query(
        `UPDATE DTREntries 
         SET empName = ?
         WHERE batchId = ? AND empId = ?`,
        [newName, batchId, empId]
      );

      if (result.affectedRows === 0) {
        console.warn(
          `No entries updated for employee ${empId} in batch ${batchId}`
        );
      }
    }

    res.json({
      Status: true,
      Message: "Employee names updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee names:", error);
    res.json({
      Status: false,
      Error: "Failed to update employee names",
    });
  }
});

// Update route: reset-entries
router.post("/reset-entries/:batchId", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { batchId } = req.params;

    await connection.beginTransaction();
    await connection.query(
      `UPDATE DTREntries SET processed = 0, deleteRecord = 0, timeOut = NULL, timeIn = NULL, dateOut = NULL, remarks = '', hours = 0, overtime = 0, sundayHours = 0, sundayOT = 0, holidayHours = 0, holidayOT = 0, holidayType = '', nightDifferential = 0, editedIn = 0, editedOut = 0 WHERE batchId = ?`,
      [batchId]
    );
    await connection.commit();

    return res.json({ Status: true });
  } catch (error) {
    await connection.rollback();
    console.error("Error resetting entries:", error);
    return res.json({ Status: false, Error: "Failed to reset entries" });
  } finally {
    connection.release();
  }
});

// Get holidays API endpoint
router.get("/holidays", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [holidays] = await connection.query(
      "SELECT * FROM DTRHolidays ORDER BY holidayDate"
    );

    // Convert UTC to local timezone
    const formattedHolidays = holidays.map((holiday) => {
      // Create date from MySQL date
      const date = new Date(holiday.holidayDate);

      // Format as YYYY-MM-DD in local timezone
      const localYear = date.getFullYear();
      const localMonth = String(date.getMonth() + 1).padStart(2, "0");
      const localDay = String(date.getDate()).padStart(2, "0");

      return {
        ...holiday,
        holidayDate: `${localYear}-${localMonth}-${localDay}`,
      };
    });

    res.json({
      Status: true,
      Holidays: formattedHolidays,
    });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to fetch holidays: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// DTR absences report
router.get("/absences", verifyUser, async (req, res) => {
  let connection;

  const parseDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calculateWorkingDays = (year, holidaySet) => {
    const workingDays = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const date = new Date(year, month, 1);

      while (date.getMonth() === month) {
        const isSunday = date.getDay() === 0;
        const dateKey = parseDateKey(date);

        if (!isSunday && !holidaySet.has(dateKey)) {
          workingDays[month] += 1;
        }

        date.setDate(date.getDate() + 1);
      }
    }

    return workingDays;
  };

  try {
    const requestedYear = parseInt(req.query.year, 10);
    const year = Number.isNaN(requestedYear)
      ? new Date().getFullYear()
      : requestedYear;

    connection = await pool.getConnection();

    const [holidayRows] = await connection.query(
      "SELECT holidayDate FROM DTRHolidays WHERE YEAR(holidayDate) = ?",
      [year]
    );

    const holidaySet = new Set(
      holidayRows.map((row) => parseDateKey(new Date(row.holidayDate)))
    );

    const workingDays = calculateWorkingDays(year, holidaySet);

    const [employeeRows] = await connection.query(
      `SELECT DISTINCT empId, empName
       FROM DTREntries
       WHERE YEAR(date) = ? AND deleteRecord = 0
       ORDER BY empName, empId`,
      [year]
    );

    const [hourRows] = await connection.query(
      `SELECT empId, empName, MONTH(date) AS month,
              SUM(COALESCE(hours, 0) + COALESCE(overtime, 0)) AS totalHours
       FROM DTREntries
       WHERE YEAR(date) = ? AND deleteRecord = 0
       GROUP BY empId, empName, MONTH(date)
       ORDER BY empName, empId, month`,
      [year]
    );

    const monthSet = new Set();
    hourRows.forEach((row) => {
      if (row.totalHours && row.totalHours > 0) {
        monthSet.add(row.month);
      }
    });

    if (monthSet.size === 0) {
      return res.json({
        Status: true,
        Result: {
          year,
          workingDays,
          activeMonths: [],
          monthlyTotals: [],
          grandTotal: 0,
          employees: [],
        },
      });
    }

    const activeMonths = Array.from(monthSet).sort((a, b) => a - b);

    const hoursMap = new Map();
    hourRows.forEach((row) => {
      const key = `${row.empId}__${row.month}`;
      hoursMap.set(key, Number(row.totalHours) || 0);
    });

    const monthlyTotals = Array(activeMonths.length).fill(0);

    const employees = employeeRows
      .map((employee) => {
        const monthlyAbsences = [];
        let totalAbsence = 0;

        activeMonths.forEach((monthNumber, index) => {
          const expectedHours = workingDays[monthNumber - 1] * 8;
          const actualKey = `${employee.empId}__${monthNumber}`;
          const actualHours = hoursMap.get(actualKey) || 0;

          const deficitHours = Math.max(0, expectedHours - actualHours);
          const absenceDays = Math.max(
            0,
            parseFloat((deficitHours / 8).toFixed(2))
          );

          monthlyAbsences.push(absenceDays);
          totalAbsence += absenceDays;
          monthlyTotals[index] += absenceDays;
        });

        const roundedTotal = parseFloat(totalAbsence.toFixed(2));

        if (roundedTotal === 0) {
          return null;
        }

        return {
          empId: employee.empId,
          empName: employee.empName,
          monthlyAbsences,
          totalAbsence: roundedTotal,
        };
      })
      .filter(Boolean);

    const response = {
      year,
      workingDays,
      activeMonths,
      monthlyTotals: monthlyTotals.map((total) =>
        parseFloat(total.toFixed(2))
      ),
      grandTotal: parseFloat(
        monthlyTotals.reduce((sum, value) => sum + value, 0).toFixed(2)
      ),
      employees,
    };

    res.json({ Status: true, Result: response });
  } catch (error) {
    console.error("Error generating DTR absence report:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to generate DTR absence report: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Add holiday API endpoint
router.post("/add-holiday", async (req, res) => {
  let connection;
  try {
    const { holidayDate, holidayType } = req.body;

    if (!holidayDate || !holidayType) {
      return res.json({
        Status: false,
        Error: "Holiday date and type are required",
      });
    }

    if (!["Regular", "Special"].includes(holidayType)) {
      return res.json({
        Status: false,
        Error: "Holiday type must be either Regular or Special",
      });
    }

    connection = await pool.getConnection();

    // Convert local date to UTC
    const [year, month, day] = holidayDate.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    const utcDate = new Date(
      Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate()
      )
    );
    const formattedDate = utcDate.toISOString().split("T")[0];

    // Check if holiday already exists
    const [existingHoliday] = await connection.query(
      "SELECT * FROM DTRHolidays WHERE holidayDate = ?",
      [formattedDate]
    );

    if (existingHoliday.length > 0) {
      // Update existing holiday instead of returning error
      await connection.query("DELETE FROM DTRHolidays WHERE holidayDate = ?", [
        formattedDate,
      ]);

      return res.json({
        Status: true,
        Message: "Holiday updated successfully",
      });
    }

    // Add the new holiday
    await connection.query(
      "INSERT INTO DTRHolidays (holidayDate, holidayType) VALUES (?, ?)",
      [formattedDate, holidayType]
    );

    res.json({
      Status: true,
      Message: "Holiday added successfully",
    });
  } catch (error) {
    console.error("Error adding/updating holiday:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to add/update holiday: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

export const DTRRouter = router;
