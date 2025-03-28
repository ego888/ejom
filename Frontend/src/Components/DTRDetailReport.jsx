import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";

const DTRDetailReport = ({ batch, employeeId, onBackToSummary }) => {
  const [detailData, setDetailData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (batch?.id && employeeId) {
      fetchDetailData(batch.id, employeeId);
    }
  }, [batch?.id, employeeId]);

  const fetchDetailData = async (batchId, empId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${ServerIP}/dtr/detail/${batchId}/${empId}`
      );
      if (response.data.Status) {
        setDetailData(response.data.Detail);
      } else {
        setError(response.data.Error || "Failed to fetch detail data");
      }
    } catch (err) {
      console.error("Error fetching detail data:", err);
      setError("Failed to load DTR details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    // If it's already in HH:MM format, return as is
    if (timeString.includes(":")) return timeString;

    // Otherwise, format it
    const hours = Math.floor(timeString / 100);
    const minutes = timeString % 100;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const getDayName = (dayValue) => {
    // If dayValue is already a string (e.g., "Mon"), return it
    if (typeof dayValue === "string" && dayValue.length === 3) {
      return dayValue;
    }

    // If dayValue is a number, convert it to day name
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Try to parse as a number if it's a string
    let dayNum = dayValue;
    if (typeof dayValue === "string") {
      dayNum = parseInt(dayValue, 10);
    }

    // Check if we have a valid number
    if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
      return days[dayNum];
    }

    // Default fallback
    return dayValue || "-";
  };

  const calculateTotals = () => {
    if (!detailData || detailData.length === 0) {
      return { hours: 0, overtime: 0, specHrs: 0 };
    }

    return detailData.reduce(
      (totals, entry) => {
        return {
          hours: totals.hours + (entry.hours || 0),
          overtime: totals.overtime + (entry.overtime || 0),
          specHrs: totals.specHrs + (entry.specialHours || 0),
        };
      },
      { hours: 0, overtime: 0, specHrs: 0 }
    );
  };

  const totals = calculateTotals();

  if (!batch) {
    return null; // Don't render anything if batch is null
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

  const employeeName =
    detailData && detailData.length > 0 ? detailData[0].empName : "Employee";

  return (
    <div className="dtr-detail-report">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h3>DTR Detail Report</h3>
          <div>
            <strong>Employee:</strong> {employeeName}
            <br />
            <strong>Period:</strong> {formatDate(batch.periodStart)} -{" "}
            {formatDate(batch.periodEnd)}
          </div>
        </div>
        <Button variant="secondary" onClick={onBackToSummary} className="mt-2">
          <i className="bi bi-arrow-left"></i> Back to Summary
        </Button>
      </div>

      {detailData.length === 0 ? (
        <div className="alert alert-info mt-3">
          No attendance records found for this employee.
        </div>
      ) : (
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th className="text-center">Day</th>
                <th className="text-center">Date</th>
                <th className="text-center">Time In</th>
                <th className="text-center">Time Out</th>
                <th className="text-center">State</th>
                <th className="text-center">Hours</th>
                <th className="text-center">OT</th>
                <th className="text-center">SpecHrs</th>
              </tr>
            </thead>
            <tbody>
              {detailData.map((entry, index) => (
                <tr key={index}>
                  <td className="text-center">{getDayName(entry.day)}</td>
                  <td className="text-center">{formatDate(entry.date)}</td>
                  <td className="text-center">{formatTime(entry.timeIn)}</td>
                  <td className="text-center">{formatTime(entry.timeOut)}</td>
                  <td className="text-center">{entry.state || "-"}</td>
                  <td className="text-center">
                    {entry.hours?.toFixed(2) || "0.00"}
                  </td>
                  <td className="text-center">
                    {entry.overtime?.toFixed(2) || "0.00"}
                  </td>
                  <td className="text-center">
                    {entry.specialHours?.toFixed(2) || "0.00"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-light">
              <tr>
                <th colSpan="5" className="text-end">
                  Totals:
                </th>
                <th className="text-center">{totals.hours.toFixed(2)}</th>
                <th className="text-center">{totals.overtime.toFixed(2)}</th>
                <th className="text-center">{totals.specHrs.toFixed(2)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default DTRDetailReport;
