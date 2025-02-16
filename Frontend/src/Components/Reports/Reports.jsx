import React, { useState, useEffect } from "react";
import "./Reports.css";
import ReportArtistIncentives from "./ReportArtistIncentives";
import ReportSales from "./ReportSales";
import ReportSalesIncentives from "./ReportSalesIncentives";
import SOA from "./SOA";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState("sales-report");

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

  const renderReport = () => {
    switch (selectedReport) {
      case "sales-report":
        return <ReportSales />;
      case "artist-incentives":
        return <ReportArtistIncentives />;
      case "sales-incentives":
        return <ReportSalesIncentives />;
      case "soa":
        return <SOA />;
      // Add other report types here
      default:
        return <div>Select a report type</div>;
    }
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
          {renderReport()}
        </div>
      </div>
    </div>
  );
};

export default Reports;
