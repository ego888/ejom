import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import ModalAlert from "./UI/ModalAlert";

const getDayColor = (day) => {
  switch (day?.toLowerCase()) {
    case "sun":
      return "#ffebee"; // Light red for Sunday
    case "sat":
      return "#e3f2fd"; // Light blue for Saturday
    case "mon":
      return "#f1f8e9"; // Light green for Monday
    case "tue":
      return "#fff3e0"; // Light orange for Tuesday
    case "wed":
      return "#f3e5f5"; // Light purple for Wednesday
    case "thu":
      return "#e8f5e9"; // Mint green for Thursday
    case "fri":
      return "#fff8e1"; // Light yellow for Friday
    default:
      return "transparent";
  }
};

const DTRBatchView = ({ batch, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "empId",
    direction: "ascending",
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [analyzedEntries, setAnalyzedEntries] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hideDeleted, setHideDeleted] = useState(false);

  useEffect(() => {
    if (batch?.id) {
      fetchBatchData(batch.id);
    }
  }, [batch?.id]);

  const fetchBatchData = async (batchId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${ServerIP}/auth/dtr/export/${batchId}`
      );
      if (response.data.Status) {
        setEntries(response.data.Entries);
      } else {
        setError(response.data.Error || "Failed to fetch batch data");
      }
    } catch (err) {
      console.error("Error fetching batch data:", err);
      setError("Failed to load batch details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedEntries = React.useMemo(() => {
    if (!entries) return [];

    // Filter by search term and hideDeleted if any
    let filteredEntries = entries;
    if (searchTerm.trim() || hideDeleted) {
      filteredEntries = entries.filter((entry) => {
        const matchesSearch =
          !searchTerm.trim() ||
          entry.empId
            .toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.date.includes(searchTerm) ||
          (entry.state &&
            entry.state.toLowerCase().includes(searchTerm.toLowerCase()));

        const notDeleted = !hideDeleted || !entry.deleteRecord;

        return matchesSearch && notDeleted;
      });
    }

    // Sort filtered entries
    const sortableEntries = [...filteredEntries];
    if (sortConfig.key) {
      sortableEntries.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;

        if (typeof a[sortConfig.key] === "string") {
          if (sortConfig.direction === "ascending") {
            return a[sortConfig.key].localeCompare(b[sortConfig.key]);
          } else {
            return b[sortConfig.key].localeCompare(a[sortConfig.key]);
          }
        } else {
          if (sortConfig.direction === "ascending") {
            return a[sortConfig.key] - b[sortConfig.key];
          } else {
            return b[sortConfig.key] - a[sortConfig.key];
          }
        }
      });
    }
    return sortableEntries;
  }, [entries, sortConfig, searchTerm, hideDeleted]);

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? " ↑" : " ↓";
    }
    return "";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      for (let i = 0; i < entries.length - 1; i++) {
        // Get current record
        let current = entries[i];

        // Skip if deleted or already processed
        if (current.deleteRecord || current.processed) {
          continue;
        }

        // Find next valid record
        let nextIndex = i + 1;
        let next = entries[nextIndex];
        while (nextIndex < entries.length && next.deleteRecord) {
          nextIndex++;
          next = entries[nextIndex];
        }

        // If no valid next record found, process current record based on time
        if (!next) {
          const [hours] = current.time.split(":").map(Number);
          await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
            entries: [
              {
                ...current,
                timeIn: hours < 12 ? current.time : null,
                timeOut: hours >= 12 ? current.time : null,
                processed: 1,
                remarks: "LACK " + (current.remarks || ""),
                deleteRecord: 0,
              },
            ],
          });
          break;
        }

        // If next record is for different employee or different date
        if (next.empId !== current.empId || next.date !== current.date) {
          const [hours] = current.time.split(":").map(Number);
          await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
            entries: [
              {
                ...current,
                timeIn: hours < 12 ? current.time : null,
                timeOut: hours >= 12 ? current.time : null,
                processed: 1,
                remarks: "LACK " + (current.remarks || ""),
                deleteRecord: 0,
              },
            ],
          });
          continue;
        }

        // Same employee, same date - process as pair
        const currentDate = new Date(current.date);
        const nextDate = new Date(next.date);
        const isNextDay =
          nextDate.getTime() - currentDate.getTime() === 24 * 60 * 60 * 1000;

        if (isNextDay) {
          // Next day logic
          const [hours] = next.time.split(":").map(Number);

          if (hours < 5) {
            // Before 5 AM - Auto process as timeout
            await axios.post(
              `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
              {
                entries: [
                  {
                    ...current,
                    timeIn: current.time,
                    timeOut: next.time,
                    processed: 1,
                    remarks: "PROC, " + (current.remarks || ""),
                    deleteRecord: 0,
                  },
                  {
                    ...next,
                    processed: 1,
                    deleteRecord: 1,
                  },
                ],
              }
            );
            i = nextIndex; // Skip next record
          } else if (hours >= 5 && hours < 7) {
            // Between 5-7 AM - Ask for confirmation
            setCurrentIndex(i);
            setCurrentEntry({ current, next });
            setShowConfirmModal(true);
            return; // Exit and wait for user input
          } else {
            // After 7 AM - Process current as single record based on time
            const [currentHours] = current.time.split(":").map(Number);
            await axios.post(
              `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
              {
                entries: [
                  {
                    ...current,
                    timeIn: currentHours < 12 ? current.time : null,
                    timeOut: currentHours >= 12 ? current.time : null,
                    processed: 1,
                    remarks: "LACK " + (current.remarks || ""),
                    deleteRecord: 0,
                  },
                ],
              }
            );
          }
        } else if (current.date === next.date) {
          // Same day - Process as time-in/time-out pair
          await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
            entries: [
              {
                ...current,
                timeIn: current.time,
                timeOut: next.time,
                processed: 1,
                remarks: "PROC, " + (current.remarks || ""),
                deleteRecord: 0,
              },
              {
                ...next,
                processed: 1,
                deleteRecord: 1,
              },
            ],
          });
          i = nextIndex; // Skip next record
        }
      }

      // Handle the very last record if it exists and isn't processed
      if (entries.length > 0) {
        const lastRecord = entries[entries.length - 1];
        if (!lastRecord.deleteRecord && !lastRecord.processed) {
          const [hours] = lastRecord.time.split(":").map(Number);
          await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
            entries: [
              {
                ...lastRecord,
                timeIn: hours < 12 ? lastRecord.time : null,
                timeOut: hours >= 12 ? lastRecord.time : null,
                processed: 1,
                remarks: "LACK " + (lastRecord.remarks || ""),
                deleteRecord: 0,
              },
            ],
          });
        }
      }

      // Refresh data after all processing is complete
      await fetchBatchData(batch.id);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error in analyze process:", error);
      setError("Failed to complete analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTime = async (isTimeOut) => {
    if (!currentEntry) return;
    setLoading(true);

    try {
      if (isTimeOut) {
        // Process as timeout for previous day - process both records
        const updateBatch = [
          {
            ...currentEntry.current,
            timeIn: currentEntry.current.time,
            timeOut: currentEntry.next.time,
            processed: 1,
            remarks: "PROC, " + (currentEntry.current.remarks || ""),
            deleteRecord: 0,
          },
          {
            ...currentEntry.next,
            processed: 1,
            deleteRecord: 1,
          },
        ];

        await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
          entries: updateBatch,
        });

        // Increment index by 2 since we processed both records
        setCurrentIndex(currentIndex + 2);
      } else {
        // Process only the current record as a time-in
        const updateBatch = [
          {
            ...currentEntry.current,
            timeIn: currentEntry.current.time,
            processed: 1,
            remarks: "PROC, " + (currentEntry.current.remarks || ""),
            deleteRecord: 0,
          },
        ];

        await axios.post(`${ServerIP}/auth/dtr/update-entries/${batch.id}`, {
          entries: updateBatch,
        });

        // Increment index by 1 since we only processed the current record
        setCurrentIndex(currentIndex + 1);
      }

      // Refresh the data
      await fetchBatchData(batch.id);

      // Reset modal state
      setShowConfirmModal(false);
      setCurrentEntry(null);
      setLoading(false);

      // Continue analyzing from the next record
      handleAnalyze();
    } catch (error) {
      console.error("Error updating entries:", error);
      setError("Failed to update entries. Please try again.");
      setLoading(false);
      setShowConfirmModal(false);
      setCurrentEntry(null);
    }
  };

  const handleDeleteRepeat = async () => {
    setLoading(true);
    setError(null);

    try {
      // Go through records one by one
      for (let i = 0; i < entries.length - 1; i++) {
        const current = entries[i];

        // Skip if already deleted
        if (current.deleteRecord) {
          continue;
        }

        // Convert current time to minutes for comparison
        const [currentHours, currentMinutes] = current.time
          .split(":")
          .map(Number);
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        // Check subsequent records
        for (let j = i + 1; j < entries.length; j++) {
          const next = entries[j];

          // Skip if not same person or date
          if (next.empId !== current.empId || next.date !== current.date) {
            break;
          }

          // Skip if already deleted
          if (next.deleteRecord) {
            continue;
          }

          // Convert next time to minutes
          const [nextHours, nextMinutes] = next.time.split(":").map(Number);
          const nextTotalMinutes = nextHours * 60 + nextMinutes;

          // If within 3 minutes, mark for deletion
          if (Math.abs(nextTotalMinutes - currentTotalMinutes) <= 3) {
            try {
              await axios.post(
                `${ServerIP}/auth/dtr/update-entries/${batch.id}`,
                {
                  entries: [
                    {
                      ...next,
                      processed: 0,
                      remarks: "REPEAT " + (next.remarks || ""),
                      deleteRecord: 1,
                    },
                  ],
                }
              );
            } catch (error) {
              console.error("Error updating entry:", error);
            }
          }
        }
      }

      // Refresh data after all processing is complete
      await fetchBatchData(batch.id);
    } catch (error) {
      console.error("Error in delete repeat process:", error);
      setError("Failed to process repeating records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderButtons = () => (
    <>
      <Button variant="danger" onClick={handleDeleteRepeat} className="ms-2">
        <i className="bi bi-trash"></i> Delete Repeat
      </Button>
      <Button variant="primary" onClick={handleAnalyze} className="ms-2">
        <i className="bi bi-clock-history"></i> Analyze Time In/Out
      </Button>
    </>
  );

  if (!batch) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center mt-4">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mt-3">{error}</div>;
  }

  return (
    <div className="dtr-batch-view">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h3>Batch Details: {batch.batchName}</h3>
          <div>
            <strong>Period:</strong> {formatDate(batch.periodStart)} -{" "}
            {formatDate(batch.periodEnd)}
            <br />
            <strong>Total Entries:</strong> {entries.length}
          </div>
        </div>
        <div>
          {renderButtons()}
          <Button variant="secondary" onClick={onBack} className="ms-2">
            <i className="bi bi-arrow-left"></i> Back to Batches
          </Button>
        </div>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by ID, name, date or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mb-3 form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="hideDeleted"
          checked={hideDeleted}
          onChange={(e) => setHideDeleted(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="hideDeleted">
          Hide deleted records
        </label>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="alert alert-info mt-3">
          {searchTerm
            ? "No matching records found."
            : "No records found in this batch."}
        </div>
      ) : (
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th
                  onClick={() => handleSort("empId")}
                  style={{ cursor: "pointer" }}
                >
                  ID {getSortIndicator("empId")}
                </th>
                <th
                  onClick={() => handleSort("empName")}
                  style={{ cursor: "pointer" }}
                >
                  Name {getSortIndicator("empName")}
                </th>
                <th
                  onClick={() => handleSort("date")}
                  style={{ cursor: "pointer" }}
                >
                  Date {getSortIndicator("date")}
                </th>
                <th
                  onClick={() => handleSort("day")}
                  style={{ cursor: "pointer" }}
                >
                  Day {getSortIndicator("day")}
                </th>
                <th
                  onClick={() => handleSort("time")}
                  style={{ cursor: "pointer" }}
                >
                  Time {getSortIndicator("time")}
                </th>
                <th
                  onClick={() => handleSort("timeIn")}
                  style={{ cursor: "pointer" }}
                >
                  Time In {getSortIndicator("timeIn")}
                </th>
                <th
                  onClick={() => handleSort("timeOut")}
                  style={{ cursor: "pointer" }}
                >
                  Time Out {getSortIndicator("timeOut")}
                </th>
                <th
                  onClick={() => handleSort("state")}
                  style={{ cursor: "pointer" }}
                >
                  State {getSortIndicator("state")}
                </th>
                <th
                  onClick={() => handleSort("hours")}
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  Hours {getSortIndicator("hours")}
                </th>
                <th
                  onClick={() => handleSort("overtime")}
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  OT {getSortIndicator("overtime")}
                </th>
                <th style={{ textAlign: "center" }}>Raw State</th>
                <th style={{ textAlign: "center" }}>Remarks</th>
                <th style={{ textAlign: "center" }}>Processed</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => {
                const bgColor = getDayColor(entry.day);
                const rowStyle = {
                  backgroundColor: bgColor,
                  textDecoration: entry.deleteRecord ? "line-through" : "none",
                };

                return (
                  <tr key={entry.id || index}>
                    <td style={rowStyle}>{entry.empId}</td>
                    <td style={rowStyle}>{entry.empName}</td>
                    <td style={rowStyle}>{formatDate(entry.date)}</td>
                    <td style={rowStyle}>{entry.day}</td>
                    <td style={rowStyle}>{entry.time}</td>
                    <td style={rowStyle}>{entry.timeIn || "-"}</td>
                    <td style={rowStyle}>{entry.timeOut || "-"}</td>
                    <td style={rowStyle}>{entry.state || "-"}</td>
                    <td style={rowStyle}>
                      {Number(entry.hours || 0).toFixed(2)}
                    </td>
                    <td style={rowStyle}>
                      {Number(entry.overtime || 0).toFixed(2)}
                    </td>
                    <td style={rowStyle}>{entry.rawState || ""}</td>
                    <td style={rowStyle}>{entry.remarks || ""}</td>
                    <td style={rowStyle}>{entry.processed || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalAlert
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        title="Confirm Time Entry"
        type="confirm"
        message={
          currentEntry
            ? `Previous record: ${currentEntry.current.empName} (${
                currentEntry.current.empId
              })
             Date: ${formatDate(currentEntry.current.date)}
             Time: ${currentEntry.current.time}

             Current record: ${currentEntry.next.empName} (${
                currentEntry.next.empId
              })
             Date: ${formatDate(currentEntry.next.date)}
             Time: ${currentEntry.next.time}

             Is this after-midnight time (${
               currentEntry.next.time
             }) a timeout for the previous day's record?`
            : ""
        }
        confirmText="Yes, it's a timeout for previous day"
        cancelText="No, it's a new timein"
        onConfirm={() => handleConfirmTime(true)}
        onClose={() => handleConfirmTime(false)}
      />
    </div>
  );
};

export default DTRBatchView;
