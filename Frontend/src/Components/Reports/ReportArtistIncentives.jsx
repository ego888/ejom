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
        throw new Error(artistIncentiveResponse.data.Error);
      }

      if (!ordersResponse.data.Status) {
        throw new Error(
          ordersResponse.data.Error || "Failed to fetch artist incentives"
        );
      }

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

  return (
    <div className="reports-content">
      <div className="reports-header d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Artist Incentives Report</h4>
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
