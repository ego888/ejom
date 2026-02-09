import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import ExcelJS from "exceljs";
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

// Define accepted file types (.xlsx or .csv)
const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  if (extname === ".xlsx" || extname === ".csv") {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx or .csv files are allowed"));
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

// Normalize cell value from exceljs to trimmed string
const normalizeCell = (cell) => {
  if (!cell) return "";

  if (cell.type === ExcelJS.ValueType.Date && cell.value) {
    return moment(cell.value).format("M/D/YYYY h:mm A");
  }

  const raw =
    typeof cell.text === "string"
      ? cell.text
      : cell.value !== undefined && cell.value !== null
      ? cell.value
      : "";

  return raw === undefined || raw === null ? "" : String(raw).trim();
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
      // Handle Excel files with exceljs
      const workbook = new ExcelJS.Workbook();
      const buffer = await fs.promises.readFile(filePath);
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) return [];

      const rows = [];
      const columnCount = worksheet.columnCount || 0;

      worksheet.eachRow({ includeEmpty: true }, (row) => {
        const normalizedRow = [];
        for (let i = 1; i <= columnCount; i++) {
          normalizedRow.push(normalizeCell(row.getCell(i)));
        }
        rows.push(normalizedRow);
      });

      if (rows.length > 0 && rows[0].length > 0) {
        const headers = rows[0];

        if (headers[0] === "AC-No." && headers.includes("State")) {
          // Convert arrays to objects with headers as keys (skip header row)
          const objectRows = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const obj = {};
            headers.forEach((header, index) => {
              if (header) obj[header] = row[index] || "";
            });
            objectRows.push(obj);
          }
          return objectRows;
        }
      }

      return rows;
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

// Export batch data to Excel (server-generated)
router.get("/export-xlsx/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    connection = await pool.getConnection();

    const [batchDetails] = await connection.query(
      "SELECT * FROM DTRBatches WHERE id = ?",
      [batchId]
    );
    if (batchDetails.length === 0) {
      return res.status(404).json({ Status: false, Error: "Batch not found" });
    }
    const batch = batchDetails[0];

    const [entries] = await connection.query(
      `SELECT id, empId, empName,
        DATE_FORMAT(date, '%Y-%m-%d') as date,
        DATE_FORMAT(dateOut, '%Y-%m-%d') as dateOut,
        day, time, rawState, timeIn, timeOut, state,
        hours, overtime, sundayHours, sundayOT, holidayHours, holidayOT, holidayType, nightDifferential,
        remarks, deleteRecord
       FROM DTREntries
       WHERE batchId = ?
       ORDER BY empId, date, time`,
      [batchId]
    );

    const workbook = new ExcelJS.Workbook();
    const detailSheet = workbook.addWorksheet("DTR Details");
    const summarySheet = workbook.addWorksheet("DTR Summary");

    const detailColumns = [
      { header: "ID", key: "empId", width: 12 },
      { header: "Name", key: "empName", width: 22 },
      { header: "Date", key: "date", width: 12 },
      { header: "Day", key: "day", width: 8 },
      { header: "Time In", key: "timeIn", width: 12 },
      { header: "Time Out", key: "timeOut", width: 12 },
      { header: "Hours", key: "hours", numFmt: "0.00" },
      { header: "OT", key: "overtime", numFmt: "0.00" },
      { header: "Sun Hours", key: "sundayHours", numFmt: "0.00" },
      { header: "Sun OT", key: "sundayOT", numFmt: "0.00" },
      { header: "Holiday Hours", key: "holidayHours", numFmt: "0.00" },
      { header: "Holiday OT", key: "holidayOT", numFmt: "0.00" },
      { header: "Holiday Type", key: "holidayType", width: 14 },
      { header: "Night Diff", key: "nightDifferential", numFmt: "0.00" },
      { header: "Remarks", key: "remarks", width: 24 },
    ];
    detailSheet.columns = detailColumns;

    const employeeTotals = new Map();
    for (const entry of entries) {
      detailSheet.addRow({
        empId: entry.empId,
        empName: entry.empName,
        date: entry.date,
        day: entry.day,
        timeIn: entry.timeIn,
        timeOut: entry.timeOut,
        hours: entry.hours,
        overtime: entry.overtime,
        sundayHours: entry.sundayHours,
        sundayOT: entry.sundayOT,
        holidayHours: entry.holidayHours,
        holidayOT: entry.holidayOT,
        holidayType: entry.holidayType,
        nightDifferential: entry.nightDifferential,
        remarks: entry.remarks,
      });

      if (!employeeTotals.has(entry.empId)) {
        employeeTotals.set(entry.empId, {
          empId: entry.empId,
          empName: entry.empName,
          hours: 0,
          overtime: 0,
          sundayHours: 0,
          sundayOT: 0,
          holidayHours: 0,
          holidayOT: 0,
          nightDifferential: 0,
        });
      }
      const agg = employeeTotals.get(entry.empId);
      agg.hours += Number(entry.hours || 0);
      agg.overtime += Number(entry.overtime || 0);
      agg.sundayHours += Number(entry.sundayHours || 0);
      agg.sundayOT += Number(entry.sundayOT || 0);
      agg.holidayHours += Number(entry.holidayHours || 0);
      agg.holidayOT += Number(entry.holidayOT || 0);
      agg.nightDifferential += Number(entry.nightDifferential || 0);
    }

    const workDaysBetween = (start, end) => {
      const s = new Date(start);
      const e = new Date(end);
      let count = 0;
      for (
        let d = new Date(s);
        d <= e;
        d.setDate(d.getDate() + 1)
      ) {
        if (d.getDay() !== 0) count += 1; // exclude Sundays
      }
      return count;
    };
    const periodHours =
      workDaysBetween(batch.periodStart, batch.periodEnd) * 8;

    const summaryColumns = [
      { header: "ID", key: "empId", width: 12 },
      { header: "Name", key: "empName", width: 22 },
      { header: "Hours", key: "hours", numFmt: "0.00" },
      { header: "OT", key: "overtime", numFmt: "0.00" },
      { header: "Sun Hours", key: "sundayHours", numFmt: "0.00" },
      { header: "Sun OT", key: "sundayOT", numFmt: "0.00" },
      { header: "Holiday Hours", key: "holidayHours", numFmt: "0.00" },
      { header: "Holiday OT", key: "holidayOT", numFmt: "0.00" },
      { header: "Night Diff", key: "nightDifferential", numFmt: "0.00" },
      { header: "Period Hours", key: "periodHours", numFmt: "0.00" },
      { header: "Effective Hours", key: "effectiveHours", numFmt: "0.00" },
      { header: "Effective OT", key: "effectiveOT", numFmt: "0.00" },
    ];
    summarySheet.columns = summaryColumns;

    let grand = {
      hours: 0,
      overtime: 0,
      sundayHours: 0,
      sundayOT: 0,
      holidayHours: 0,
      holidayOT: 0,
      nightDifferential: 0,
      effectiveHours: 0,
      effectiveOT: 0,
    };

    for (const agg of employeeTotals.values()) {
      const totalWorked = agg.hours + agg.overtime;
      const effectiveHours = Math.min(totalWorked, periodHours);
      const effectiveOT = Math.max(0, totalWorked - periodHours);
      summarySheet.addRow({
        ...agg,
        periodHours,
        effectiveHours,
        effectiveOT,
      });

      grand.hours += agg.hours;
      grand.overtime += agg.overtime;
      grand.sundayHours += agg.sundayHours;
      grand.sundayOT += agg.sundayOT;
      grand.holidayHours += agg.holidayHours;
      grand.holidayOT += agg.holidayOT;
      grand.nightDifferential += agg.nightDifferential;
      grand.effectiveHours += effectiveHours;
      grand.effectiveOT += effectiveOT;
    }

    summarySheet.addRow({
      empName: "GRAND TOTAL",
      periodHours,
      ...grand,
    });

    const filename = `DTR_Batch_${batchId}_${batch.batchName}.xlsx`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${filename}\"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting DTR Excel:", error);
    res.status(500).json({ Status: false, Error: "Failed to export Excel" });
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

// Analyze time in/out and auto-process entries (backend optimized)
router.post("/analyze-time/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [entries] = await connection.query(
      `SELECT id, batchId, empId, empName,
       DATE_FORMAT(date, '%Y-%m-%d') as date,
       DATE_FORMAT(dateOut, '%Y-%m-%d') as dateOut,
       day, time, timeIn, timeOut, processed, deleteRecord, editedIn, editedOut, remarks
       FROM DTREntries
       WHERE batchId = ?
       ORDER BY empId, date, time`,
      [batchId]
    );

    const parseDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return null;
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const getHours = (timeString) => {
      if (!timeString) return null;
      const [hours] = timeString.split(":").map(Number);
      return Number.isNaN(hours) ? null : hours;
    };

    const updateEntry = async (entry, updates) => {
      const {
        dateOut,
        timeIn,
        timeOut,
        editedIn,
        editedOut,
        processed,
        deleteRecord,
        remarks,
      } = updates;

      await connection.query(
        `
        UPDATE DTREntries
        SET
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
          dateOut ?? null,
          timeIn ?? null,
          timeOut ?? null,
          editedIn ?? 0,
          editedOut ?? 0,
          processed ?? 0,
          deleteRecord ?? 0,
          remarks ?? null,
          entry.id,
          batchId,
        ]
      );
    };

    for (let i = 0; i < entries.length - 1; i++) {
      const current = entries[i];

      if (!current || current.deleteRecord || current.processed) {
        continue;
      }

      let nextIndex = i + 1;
      let next = entries[nextIndex];
      while (nextIndex < entries.length && next?.deleteRecord) {
        nextIndex += 1;
        next = entries[nextIndex];
      }

      if (!next || next.empId !== current.empId) {
        const hours = getHours(current.time);
        await updateEntry(current, {
          dateOut: current.date,
          timeIn: hours !== null && hours < 12 ? current.time : null,
          timeOut: hours !== null && hours >= 12 ? current.time : null,
          editedIn: hours !== null && hours < 12 ? 0 : 1,
          editedOut: hours !== null && hours < 12 ? 1 : 0,
          processed: 0,
          deleteRecord: 0,
          remarks: `LACK1, ${current.remarks || ""}`.trim(),
        });

        if (!next) break;
        continue;
      }

      const currentDate = parseDate(current.date);
      const nextDate = parseDate(next.date);
      const isNextDay =
        currentDate &&
        nextDate &&
        nextDate.getTime() - currentDate.getTime() === 24 * 60 * 60 * 1000;

      if (isNextDay) {
        const nextHours = getHours(next.time);

        if (nextHours !== null && nextHours < 5) {
          await updateEntry(current, {
            dateOut: next.date,
            timeIn: current.time,
            timeOut: next.time,
            processed: 1,
            deleteRecord: 0,
            remarks: `PROC1, ${current.remarks || ""}`.trim(),
            editedIn: current.editedIn ?? 0,
            editedOut: current.editedOut ?? 0,
          });

          await updateEntry(next, {
            dateOut: next.dateOut ?? null,
            timeIn: next.timeIn ?? null,
            timeOut: next.timeOut ?? null,
            processed: 1,
            deleteRecord: 1,
            remarks: next.remarks ?? null,
            editedIn: next.editedIn ?? 0,
            editedOut: next.editedOut ?? 0,
          });
          i = nextIndex;
        } else if (nextHours !== null && nextHours >= 5 && nextHours < 7) {
          await connection.commit();
          return res.json({
            Status: true,
            NeedsConfirmation: true,
            Current: current,
            Next: next,
          });
        } else {
          const hours = getHours(current.time);
          await updateEntry(current, {
            dateOut: current.date,
            timeIn: hours !== null && hours > 12 ? null : current.time,
            timeOut: hours !== null && hours > 12 ? current.time : null,
            editedIn: hours !== null && hours > 12 ? 1 : 0,
            editedOut: hours !== null && hours > 12 ? 0 : 1,
            processed: 0,
            deleteRecord: 0,
            remarks: `LACK2, ${current.remarks || ""}`.trim(),
          });
        }
      } else if (current.date === next.date) {
        await updateEntry(current, {
          dateOut: next.date,
          timeIn: current.time,
          timeOut: next.time,
          processed: 1,
          deleteRecord: 0,
          remarks: `PROC2, ${current.remarks || ""}`.trim(),
          editedIn: current.editedIn ?? 0,
          editedOut: current.editedOut ?? 0,
        });

        await updateEntry(next, {
          dateOut: next.dateOut ?? null,
          timeIn: next.timeIn ?? null,
          timeOut: next.timeOut ?? null,
          processed: 1,
          deleteRecord: 1,
          remarks: next.remarks ?? null,
          editedIn: next.editedIn ?? 0,
          editedOut: next.editedOut ?? 0,
        });

        i = nextIndex;
      }
    }

    if (entries.length > 0) {
      const lastRecord = entries[entries.length - 1];
      if (!lastRecord.deleteRecord && !lastRecord.processed) {
        const hours = getHours(lastRecord.time);
        await updateEntry(lastRecord, {
          dateOut: lastRecord.date,
          timeIn: hours !== null && hours < 12 ? lastRecord.time : null,
          timeOut: hours !== null && hours >= 12 ? lastRecord.time : null,
          editedIn: hours !== null && hours < 12 ? 0 : 1,
          editedOut: hours !== null && hours < 12 ? 1 : 0,
          processed: 0,
          deleteRecord: 0,
          remarks: `LACK3, ${lastRecord.remarks || ""}`.trim(),
        });
      }
    }

    const [unprocessedEntries] = await connection.query(
      `SELECT id, batchId, empId, empName,
       DATE_FORMAT(date, '%Y-%m-%d') as date,
       DATE_FORMAT(dateOut, '%Y-%m-%d') as dateOut,
       day, time, timeIn, timeOut, processed, deleteRecord, editedIn, editedOut, remarks
       FROM DTREntries
       WHERE batchId = ?
         AND processed = 0
         AND deleteRecord = 0
         AND timeIn IS NULL
         AND timeOut IS NULL`,
      [batchId]
    );

    for (const entry of unprocessedEntries) {
      const hours = getHours(entry.time);
      await updateEntry(entry, {
        dateOut: entry.date,
        timeIn: hours !== null && hours < 12 ? entry.time : null,
        timeOut: hours !== null && hours >= 12 ? entry.time : null,
        editedIn: hours !== null && hours < 12 ? 0 : 1,
        editedOut: hours !== null && hours < 12 ? 1 : 0,
        processed: 0,
        deleteRecord: 0,
        remarks: `LACK4, ${entry.remarks || ""}`.trim(),
      });
    }

    await connection.commit();

    res.json({
      Status: true,
      NeedsConfirmation: false,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error analyzing time in/out:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to analyze time in/out: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Delete repeated records in batch (backend optimized)
router.post("/delete-repeat/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [batchRows] = await connection.query(
      "SELECT periodStart, periodEnd FROM DTRBatches WHERE id = ?",
      [batchId]
    );

    if (batchRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        Status: false,
        Error: "Batch not found",
      });
    }

    const periodStart = new Date(batchRows[0].periodStart);
    const periodEnd = new Date(batchRows[0].periodEnd);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(0, 0, 0, 0);

    const [entries] = await connection.query(
      `SELECT id, batchId, empId,
       DATE_FORMAT(date, '%Y-%m-%d') as date,
       time, deleteRecord, remarks
       FROM DTREntries
       WHERE batchId = ?
       ORDER BY empId, date, time`,
      [batchId]
    );

    const toMinutes = (timeString) => {
      if (!timeString) return null;
      const [hours, minutes] = timeString.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
      }
      return hours * 60 + minutes;
    };

    const buildRemark = (prefix, existing) => {
      const trimmed = existing?.trim();
      return trimmed ? `${prefix} ${trimmed}` : prefix;
    };

    let lastSeenEntry = null;
    let updatedCount = 0;

    for (const entry of entries) {
      if (!entry || entry.deleteRecord) continue;

      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      const isOutsidePeriod =
        entryDate < periodStart || entryDate > periodEnd;

      if (isOutsidePeriod) {
        await connection.query(
          `UPDATE DTREntries
           SET processed = 0,
               deleteRecord = 1,
               remarks = ?
           WHERE id = ? AND batchId = ?`,
          [buildRemark("OUTSIDE PERIOD", entry.remarks), entry.id, batchId]
        );
        updatedCount += 1;
        continue;
      }

      const currentMinutes = toMinutes(entry.time);
      const sameGroup =
        lastSeenEntry &&
        lastSeenEntry.empId === entry.empId &&
        lastSeenEntry.date === entry.date;
      const isDuplicate =
        sameGroup &&
        currentMinutes !== null &&
        lastSeenEntry.minutes !== null &&
        Math.abs(currentMinutes - lastSeenEntry.minutes) <= 3;

      if (isDuplicate) {
        await connection.query(
          `UPDATE DTREntries
           SET processed = 0,
               deleteRecord = 1,
               remarks = ?
           WHERE id = ? AND batchId = ?`,
          [buildRemark("REPEAT", entry.remarks), entry.id, batchId]
        );
        updatedCount += 1;
      }

      lastSeenEntry = {
        empId: entry.empId,
        date: entry.date,
        minutes: currentMinutes,
      };
    }

    await connection.commit();
    res.json({
      Status: true,
      Message: "Repeating records processed",
      UpdatedCount: updatedCount,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error deleting repeat records:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to delete repeats: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Calculate hours and overtime for batch (backend optimized)
router.post("/calculate-hours/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [entries] = await connection.query(
      `SELECT id, timeIn, timeOut
       FROM DTREntries
       WHERE batchId = ?
         AND processed = 1
         AND deleteRecord = 0
         AND timeIn IS NOT NULL
         AND timeOut IS NOT NULL`,
      [batchId]
    );

    const parseMinutes = (timeString) => {
      if (!timeString) return null;
      const parts = timeString.split(":").map(Number);
      if (parts.length < 2) return null;
      const hours = parts[0];
      const minutes = parts[1];
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    for (const entry of entries) {
      let timeInMinutes = parseMinutes(entry.timeIn);
      let timeOutMinutes = parseMinutes(entry.timeOut);
      if (timeInMinutes === null || timeOutMinutes === null) continue;

      if (timeOutMinutes < timeInMinutes) {
        timeOutMinutes += 24 * 60;
      }

      let totalMinutes = timeOutMinutes - timeInMinutes;

      if (timeInMinutes < 13 * 60 && timeOutMinutes > 12 * 60) {
        totalMinutes -= 60;
      }

      if (timeInMinutes < 19 * 60 && timeOutMinutes > 20 * 60) {
        totalMinutes -= 60;
      }

      const totalHours = totalMinutes / 60;
      const regularHours = totalHours > 8 ? 8 : totalHours;
      const overtimeHours = totalHours > 8 ? totalHours - 8 : 0;

      await connection.query(
        `
        UPDATE DTREntries
        SET
          hours = ?,
          overtime = ?,
          remarks = IF(
            INSTR(remarks, 'HOURS') = 0,
            CONCAT('HOURS, ', COALESCE(remarks, '')),
            remarks
          )
        WHERE id = ? AND batchId = ?
      `,
        [
          Number(regularHours.toFixed(2)),
          Number(overtimeHours.toFixed(2)),
          entry.id,
          batchId,
        ]
      );
    }

    await connection.commit();
    res.json({
      Status: true,
      Message: "Hours calculated successfully",
      UpdatedCount: entries.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error calculating hours:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to calculate hours: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Process Sunday/Holiday hours (backend optimized)
router.post("/check-sun-hol/:batchId", async (req, res) => {
  let connection;
  try {
    const { batchId } = req.params;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [holidayRows] = await connection.query(
      "SELECT DATE_FORMAT(holidayDate, '%Y-%m-%d') as holidayDate, holidayType FROM DTRHolidays"
    );
    const holidayMap = new Map(
      holidayRows.map((row) => [row.holidayDate, row.holidayType || ""])
    );

    const [entries] = await connection.query(
      `SELECT id, day, DATE_FORMAT(date, '%Y-%m-%d') as date,
       hours, overtime
       FROM DTREntries
       WHERE batchId = ?
         AND deleteRecord = 0
         AND timeIn IS NOT NULL
         AND timeOut IS NOT NULL`,
      [batchId]
    );

    let updatedCount = 0;

    for (const entry of entries) {
      const isSunday = entry.day?.toLowerCase() === "sun";
      const holidayType = holidayMap.get(entry.date);
      const isHoliday = !!holidayType;

      if (!isSunday && !isHoliday) continue;

      let sundayHours = 0;
      let sundayOT = 0;
      let holidayHours = 0;
      let holidayOT = 0;
      let finalHolidayType = "";

      if (isSunday) {
        if (isHoliday) {
          holidayHours = Number(entry.hours || 0);
          holidayOT = Number(entry.overtime || 0);
          finalHolidayType = `Sunday ${holidayType}`.trim();
        } else {
          sundayHours = Number(entry.hours || 0);
          sundayOT = Number(entry.overtime || 0);
        }
      } else if (isHoliday) {
        holidayHours = Number(entry.hours || 0);
        holidayOT = Number(entry.overtime || 0);
        finalHolidayType = holidayType || "";
      }

      await connection.query(
        `
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
      `,
        [
          Number(sundayHours.toFixed(2)),
          Number(sundayOT.toFixed(2)),
          Number(holidayHours.toFixed(2)),
          Number(holidayOT.toFixed(2)),
          finalHolidayType,
          0,
          0,
          0,
          entry.id,
          batchId,
        ]
      );
      updatedCount += 1;
    }

    await connection.commit();
    res.json({
      Status: true,
      Message: "Sunday/Holiday hours processed successfully",
      UpdatedCount: updatedCount,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error processing Sunday/Holiday hours:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to process Sunday/Holiday hours: ${error.message}`,
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

  const calculateWorkingDays = (year, holidaySet, monthEndDays = {}) => {
    const workingDays = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const date = new Date(year, month, 1);
      const limitDay = monthEndDays[month + 1];

      while (date.getMonth() === month) {
        if (
          typeof limitDay === "number" &&
          !Number.isNaN(limitDay) &&
          date.getDate() > limitDay
        ) {
          break;
        }

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

    const [latestEntryRows] = await connection.query(
      `SELECT MAX(date) AS latestDate
       FROM DTREntries
       WHERE YEAR(date) = ? AND deleteRecord = 0`,
      [year]
    );

    let monthEndDays = {};
    if (latestEntryRows[0]?.latestDate) {
      const latestDate = new Date(latestEntryRows[0].latestDate);
      monthEndDays = {
        [latestDate.getMonth() + 1]: latestDate.getDate(),
      };
    }

    const workingDays = calculateWorkingDays(year, holidaySet, monthEndDays);

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

    const employees = employeeRows.map((employee) => {
      const monthlyAbsences = [];
      let totalAbsence = 0;

      activeMonths.forEach((monthNumber, index) => {
        const expectedHours = workingDays[monthNumber - 1] * 8;
        const actualKey = `${employee.empId}__${monthNumber}`;
        const actualHours = hoursMap.get(actualKey) || 0;

        let deficitHours = 0;
        if (actualHours > 0) {
          deficitHours = Math.max(0, expectedHours - actualHours);
        }
        const absenceDays = Math.max(
          0,
          parseFloat((deficitHours / 8).toFixed(2))
        );

        monthlyAbsences.push(absenceDays);
        totalAbsence += absenceDays;
        monthlyTotals[index] += absenceDays;
      });

      return {
        empId: employee.empId,
        empName: employee.empName,
        monthlyAbsences,
        totalAbsence: parseFloat(totalAbsence.toFixed(2)),
      };
    });

    const response = {
      year,
      workingDays,
      activeMonths,
      monthlyTotals: monthlyTotals.map((total) => parseFloat(total.toFixed(2))),
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

// DTR monthly daily hours report
router.get("/monthly", verifyUser, async (req, res) => {
  let connection;

  const toDateKey = (year, month, day) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  };

  try {
    const currentYear = new Date().getFullYear();
    const year = Number.parseInt(req.query.year, 10) || currentYear;
    const rawMonthFrom = Number.parseInt(req.query.monthFrom, 10) || 1;
    const rawMonthTo =
      Number.parseInt(req.query.monthTo, 10) || rawMonthFrom || 1;
    const monthFrom = Math.min(Math.max(rawMonthFrom, 1), 12);
    const monthTo = Math.min(Math.max(rawMonthTo, monthFrom), 12);
    const requestedEmployeeId = req.query.employeeId;

    connection = await pool.getConnection();

    const [employeeRows] = await connection.query(
      `SELECT DISTINCT empId, empName
       FROM DTREntries
       WHERE YEAR(date) = ? AND deleteRecord = 0
       ORDER BY empName, empId`,
      [year]
    );

    if (!employeeRows || employeeRows.length === 0) {
      return res.json({
        Status: true,
        Result: {
          year,
          monthFrom,
          monthTo,
          employeeId: null,
          employees: [],
          months: [],
        },
      });
    }

    const employeeId =
      requestedEmployeeId && requestedEmployeeId !== "all"
        ? requestedEmployeeId
        : employeeRows[0].empId;

    const [holidayRows] = await connection.query(
      `SELECT holidayDate, holidayType
       FROM DTRHolidays
       WHERE YEAR(holidayDate) = ?`,
      [year]
    );

    const holidayMap = new Map();
    holidayRows.forEach((holiday) => {
      if (holiday.holidayDate) {
        const dateObj = new Date(holiday.holidayDate);
        const dateKey = toDateKey(
          dateObj.getFullYear(),
          dateObj.getMonth() + 1,
          dateObj.getDate()
        );
        holidayMap.set(dateKey, holiday.holidayType || true);
      }
    });

    const params = [year, monthFrom, monthTo, employeeId];
    const [entries] = await connection.query(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date,
              COALESCE(hours, 0) + COALESCE(overtime, 0) + COALESCE(specialHours, 0) +
              COALESCE(sundayHours, 0) + COALESCE(sundayOT, 0) +
              COALESCE(holidayHours, 0) + COALESCE(holidayOT, 0) AS totalHours
       FROM DTREntries
       WHERE YEAR(date) = ?
         AND MONTH(date) BETWEEN ? AND ?
         AND deleteRecord = 0
         AND empId = ?
       ORDER BY date`,
      params
    );

    const totalsByDate = new Map();
    entries.forEach((entry) => {
      if (!entry.date) return;
      const currentTotal = totalsByDate.get(entry.date) || 0;
      totalsByDate.set(
        entry.date,
        parseFloat(
          (currentTotal + (Number(entry.totalHours) || 0)).toFixed(2)
        )
      );
    });

    const months = [];
    for (let month = monthFrom; month <= monthTo; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = toDateKey(year, month, day);
        const dateObj = new Date(year, month - 1, day);
        const isSunday = dateObj.getDay() === 0;
        const holidayType = holidayMap.get(dateKey);

        days.push({
          day,
          date: dateKey,
          totalHours: totalsByDate.get(dateKey) || 0,
          isSunday,
          isHoliday: !!holidayType,
          holidayType: holidayType || null,
        });
      }

      months.push({ month, days });
    }

    res.json({
      Status: true,
      Result: {
        year,
        monthFrom,
        monthTo,
        employeeId,
        employees: employeeRows,
        months,
      },
    });
  } catch (error) {
    console.error("Error generating DTR monthly report:", error);
    res.status(500).json({
      Status: false,
      Error: `Failed to generate DTR monthly report: ${error.message}`,
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
