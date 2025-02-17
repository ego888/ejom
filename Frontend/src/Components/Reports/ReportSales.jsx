import React, { useState } from "react";
import axios from "axios";
import { ServerIP } from "../../config";
import DateFromTo from "../UI/DateFromTo";
import Button from "../UI/Button";
import ReportSalesSummary from "./ReportSalesSummary";

const ReportSales = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [reportData, setReportData] = useState(null);
  const [alert, setAlert] = useState(null);

  const handleDateChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem("token");
      let endpoint = "/auth/sales-summary";
      if (groupBy === "material") {
        endpoint = "/auth/sales-material-summary";
      } else if (groupBy === "machine") {
        endpoint = "/auth/sales-machine-summary";
      }
      const response = await axios.get(`${ServerIP}${endpoint}`, {
        params: { dateFrom, dateTo, groupBy },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setReportData(response.data.Result);
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
  };

  const renderSortOptions = () => (
    <div className="sort-options mb-3">
      <label htmlFor="groupBy" className="form-label d-block">
        Group by:
      </label>
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

  return (
    <div className="reports-content">
      <div className="reports-header d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Sales Report</h4>
        <Button
          variant="add"
          onClick={handleGenerateReport}
          disabled={!dateFrom || !dateTo}
        >
          Calculate
        </Button>
      </div>

      <div className="reports-filters">
        <div className="d-flex align-items-start gap-3">
          <DateFromTo onDateChange={handleDateChange} />
        </div>
        {renderSortOptions()}
      </div>
      {reportData && <ReportSalesSummary data={reportData} groupBy={groupBy} />}
    </div>
  );
};

export default ReportSales;
