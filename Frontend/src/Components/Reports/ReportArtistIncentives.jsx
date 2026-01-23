import React, { useState } from "react";
import axios from "axios";
import { ServerIP } from "../../config";
import DateFromTo from "../UI/DateFromTo";
import Button from "../UI/Button";
import ReportArtistIncentiveDetails from "./ReportArtistIncentiveDetails";
import ReportArtistIncentiveSummary from "./ReportArtistIncentiveSummary";
import { calculateArtistIncentive } from "../../utils/artistIncentiveCalculator";
import "./Reports.css";

const ReportArtistIncentives = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [alert, setAlert] = useState(null);

  const handleDateChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem("token");

      // Get settings and orders data in parallel
      const [artistIncentiveResponse, ordersResponse] = await Promise.all([
        axios.get(`${ServerIP}/auth/jomcontrol/artistIncentive`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${ServerIP}/auth/artist-incentive`, {
          params: { dateFrom, dateTo },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!artistIncentiveResponse.data.Status) {
        throw new Error(
          artistIncentiveResponse.data.Error ||
            "Failed to fetch artist incentive settings"
        );
      }

      if (!ordersResponse.data.Status) {
        throw new Error(
          ordersResponse.data.Error || "Failed to fetch artist incentive orders"
        );
      }

      console.log("Orders Response", ordersResponse.data.Result);
      // Calculate incentives
      const calculatedOrders = calculateArtistIncentive(
        ordersResponse.data.Result,
        artistIncentiveResponse.data.Result
      );

      // Save calculated incentives
      const updates = calculatedOrders.map((order) => ({
        Id: order.id,
        artistIncentive: order.totalIncentive,
      }));
      console.log("Updates", updates);

      const saveResponse = await axios.put(
        `${ServerIP}/auth/order_details/update_incentives_calculation`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!saveResponse.data.Status) {
        throw new Error(saveResponse.data.Error || "Failed to save incentives");
      }

      setReportData({
        orders: calculatedOrders,
        settings: artistIncentiveResponse.data.Result,
      });

      setAlert(null); // Clear any previous errors
    } catch (error) {
      console.error("Error generating artist incentive report:", error);
      setAlert({
        show: true,
        title: "Error",
        message: error.message || "Failed to generate artist incentive report",
        type: "error",
      });
    }
  };

  const handleExportToExcel = async () => {
    if (!reportData) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${ServerIP}/auth/report/artist-incentive/export`,
        {
          orders: reportData.orders,
          dateFrom,
          dateTo,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Artist_Incentives_${dateFrom}_to_${dateTo}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting artist incentives:", error);
      alert("Failed to export artist incentives.");
    }
  };

  return (
    <div className="reports-content">
      <div className="d-flex justify-content-center pt-4">
        <h3>Artist Incentives Report</h3>
      </div>
      <div className="d-flex justify-content-between mb-3">
        <div className="d-flex gap-2">
          <Button
            variant="add"
            onClick={handleGenerateReport}
            disabled={!dateFrom || !dateTo}
          >
            Calculate
          </Button>
          <Button
            variant="print"
            onClick={handleExportToExcel}
            disabled={!reportData}
          >
            Save as XLS
          </Button>
        </div>
      </div>

      <div className="reports-filters">
        <div className="d-flex align-items-start gap-3">
          <DateFromTo onDateChange={handleDateChange} />
          <div className="sort-options mb-3">
            <div className="form-check mt-2">
              <input
                className="form-check-input blue-checkbox"
                type="checkbox"
                id="summaryToggle"
                checked={showSummary}
                onChange={(e) => setShowSummary(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="summaryToggle">
                Summary
              </label>
            </div>
          </div>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} role="alert">
          <strong>{alert.title}: </strong>
          {alert.message}
        </div>
      )}

      {reportData && (
        <div className="report-container">
          {showSummary ? (
            <ReportArtistIncentiveSummary data={reportData} />
          ) : (
            <ReportArtistIncentiveDetails data={reportData} />
          )}
        </div>
      )}
    </div>
  );
};

export default ReportArtistIncentives;
