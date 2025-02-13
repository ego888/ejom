import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../UI/Button";
import DateFromTo from "../UI/DateFromTo";
import "./Reports.css";
import axios from "axios";
import { ServerIP } from "../../config";
import ReportSalesSummary from "./ReportSalesSummary";
import ReportArtistIncentives from "./ReportArtistIncentives";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState("sales-report");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [reportData, setReportData] = useState(null);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const reports = [
    {
      id: "sales-report",
      name: "Sales Report",
      icon: "bi-file-earmark-bar-graph",
    },
    { id: "soa", name: "Statement of Account", icon: "bi-file-text" },
    {
      id: "artist-incentives",
      name: "Artist Incentives",
      icon: "bi-file-easel",
    },
    { id: "sales-incentives", name: "Sales Incentives", icon: "bi-file-plus" },
  ];

  const handleDateChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleGenerateReport = async () => {
    if (!selectedReport || !dateFrom || !dateTo) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Please select a report type and date range",
        type: "alert",
      });
      return;
    }

    if (selectedReport === "sales-report") {
      try {
        const token = localStorage.getItem("token");
        let endpoint = "/report/sales-summary";

        if (groupBy === "material") {
          endpoint = "/report/sales-material-summary";
        } else if (groupBy === "machine") {
          endpoint = "/report/sales-machine-summary";
        }

        const response = await axios.get(`${ServerIP}${endpoint}`, {
          params: {
            dateFrom,
            dateTo,
            groupBy,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Report response:", response.data);
        if (response.data.Status) {
          setReportData(response.data.Result);
          console.log("Report data set:", response.data.Result);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: response.data.Error,
            type: "error",
          });
        }
      } catch (error) {
        console.error("Error generating report:", error);
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to generate report",
          type: "error",
        });
      }
    } else if (selectedReport === "artist-incentives") {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${ServerIP}/report/artist-incentive-summary`,
          {
            params: { dateFrom, dateTo },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("response data set:", response);
        if (response.data.Status) {
          setReportData(response.data.Result);
          console.log(
            "Report Artist Incentives data set:",
            response.data.Result
          );
        }
      } catch (error) {
        console.error("Error generating artist incentive report:", error);
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to generate artist incentive report",
          type: "error",
        });
      }
    }
    // ... handle other report types
  };

  const renderSortOptions = () => {
    if (selectedReport !== "sales-report") return null;
    return (
      <div className="sort-options mb-3">
        <label className="form-label d-block">Group by:</label>
        <div className="d-flex gap-1">
          {["Sales", "Month", "Client", "Material", "Machine", "None"].map(
            (option) => (
              <div className="form-check" key={option.toLowerCase()}>
                <input
                  className="form-check-input"
                  type="radio"
                  name="groupBy"
                  id={`groupBy-${option.toLowerCase()}`}
                  value={option.toLowerCase()}
                  checked={groupBy === option.toLowerCase()}
                  onChange={(e) => setGroupBy(e.target.value)}
                />
                <label
                  className="form-check-label"
                  htmlFor={`groupBy-${option.toLowerCase()}`}
                >
                  {option}
                </label>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="reports-theme">
      <div className="reports-page-container">
        <div className="reports-container">
          <div className="reports-sidebar">
            <h5 className="reports-sidebar-header">Reports</h5>
            <ul className="reports-menu">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className={`reports-menu-item ${
                    selectedReport === report.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <i className={`bi ${report.icon} me-2`}></i>
                  {report.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="reports-content">
            <div className="reports-header">
              <h4>
                {selectedReport
                  ? reports.find((r) => r.id === selectedReport)?.name
                  : "Select a Report"}
              </h4>
            </div>
            <div className="reports-filters">
              <div>
                <DateFromTo onDateChange={handleDateChange} />
                <Button
                  variant="add"
                  onClick={handleGenerateReport}
                  disabled={!selectedReport || !dateFrom || !dateTo}
                  className="mt-3 w-100"
                >
                  Generate Report
                </Button>
              </div>
              {renderSortOptions()}
            </div>
            {selectedReport === "sales-report" && reportData && (
              <ReportSalesSummary data={reportData} groupBy={groupBy} />
            )}
            {selectedReport === "artist-incentives" && reportData && (
              <ReportArtistIncentives data={reportData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
