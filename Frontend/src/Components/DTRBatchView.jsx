import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";

const DTRBatchView = ({ batch, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "empId",
    direction: "ascending",
  });

  useEffect(() => {
    if (batch?.id) {
      fetchBatchData(batch.id);
    }
  }, [batch?.id]);

  const fetchBatchData = async (batchId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${ServerIP}/dtr/export/${batchId}`);
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

    // Filter by search term if any
    let filteredEntries = entries;
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filteredEntries = entries.filter(
        (entry) =>
          entry.empId.toString().toLowerCase().includes(lowerSearchTerm) ||
          entry.empName.toLowerCase().includes(lowerSearchTerm) ||
          entry.date.includes(lowerSearchTerm) ||
          (entry.state && entry.state.toLowerCase().includes(lowerSearchTerm))
      );
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
  }, [entries, sortConfig, searchTerm]);

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
        <Button variant="secondary" onClick={onBack} className="mt-2">
          <i className="bi bi-arrow-left"></i> Back to Batches
        </Button>
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
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => (
                <tr key={entry.id || index}>
                  <td>{entry.empId}</td>
                  <td>{entry.empName}</td>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.day}</td>
                  <td>{entry.time}</td>
                  <td>{entry.timeIn || "-"}</td>
                  <td>{entry.timeOut || "-"}</td>
                  <td>{entry.state || "-"}</td>
                  <td className="text-center">
                    {Number(entry.hours || 0).toFixed(2)}
                  </td>
                  <td className="text-center">
                    {Number(entry.overtime || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DTRBatchView;
