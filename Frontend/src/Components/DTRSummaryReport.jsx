import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";

const DTRSummaryReport = ({ batch, onEmployeeSelect }) => {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "empName",
    direction: "ascending",
  });

  useEffect(() => {
    if (batch?.id) {
      fetchSummaryData(batch.id);
    }
  }, [batch?.id]);

  const fetchSummaryData = async (batchId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${ServerIP}/auth/dtr/summary/${batchId}`
      );
      if (response.data.Status) {
        setSummaryData(response.data.Summary);
      } else {
        setError(response.data.Error || "Failed to fetch summary data");
      }
    } catch (err) {
      console.error("Error fetching summary data:", err);
      setError("Failed to load DTR summary. Please try again later.");
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

  const sortedData = React.useMemo(() => {
    if (!summaryData) return [];

    const sortableData = [...summaryData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
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
    return sortableData;
  }, [summaryData, sortConfig]);

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

  const calculateTotals = () => {
    if (!summaryData || summaryData.length === 0) {
      return { count: 0, hours: 0, overtime: 0 };
    }

    return summaryData.reduce(
      (totals, employee) => {
        return {
          count: totals.count + (employee.entryCount || 0),
          hours: totals.hours + (employee.totalHours || 0),
          overtime: totals.overtime + (employee.totalOvertime || 0),
        };
      },
      { count: 0, hours: 0, overtime: 0 }
    );
  };

  const totals = calculateTotals();

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
    <div className="dtr-summary-report">
      <h3>DTR Summary Report</h3>
      <div className="mb-3">
        <strong>Batch:</strong> {batch.batchName}
        <br />
        <strong>Period:</strong> {formatDate(batch.periodStart)} -{" "}
        {formatDate(batch.periodEnd)}
      </div>

      {summaryData.length === 0 ? (
        <div className="alert alert-info mt-3">
          No data available for this batch.
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
                  onClick={() => handleSort("entryCount")}
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  Count {getSortIndicator("entryCount")}
                </th>
                <th
                  onClick={() => handleSort("totalHours")}
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  Hrs {getSortIndicator("totalHours")}
                </th>
                <th
                  onClick={() => handleSort("totalOvertime")}
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  OT {getSortIndicator("totalOvertime")}
                </th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((employee) => (
                <tr key={employee.empId}>
                  <td>{employee.empId}</td>
                  <td>{employee.empName}</td>
                  <td className="text-center">{employee.entryCount || 0}</td>
                  <td className="text-center">
                    {employee.totalHours?.toFixed(2) || "0.00"}
                  </td>
                  <td className="text-center">
                    {employee.totalOvertime?.toFixed(2) || "0.00"}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="view"
                      size="sm"
                      onClick={() => onEmployeeSelect(employee.empId)}
                    >
                      <i className="bi bi-eye"></i> View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-light">
              <tr>
                <th colSpan="2" className="text-end">
                  Totals:
                </th>
                <th className="text-center">{totals.count}</th>
                <th className="text-center">{totals.hours.toFixed(2)}</th>
                <th className="text-center">{totals.overtime.toFixed(2)}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default DTRSummaryReport;
