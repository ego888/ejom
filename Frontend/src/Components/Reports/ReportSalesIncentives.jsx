import React, { useState } from "react";
import axios from "axios";
import { ServerIP } from "../../config";
import DateFromTo from "../UI/DateFromTo";
import Button from "../UI/Button";
import { calculateSalesIncentive } from "../../utils/salesIncentiveCalculator";
import "./Reports.css";
import ReportSalesIncentiveSummary from "./ReportSalesIncentiveSummary";
import ReportSalesIncentiveDetails from "./ReportSalesIncentiveDetails";

const ReportSalesIncentives = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showSummary, setShowSummary] = useState(true);

  const handleDateChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem("token");

      // First get the settings
      const salesIncentiveResponse = await axios.get(
        `${ServerIP}/auth/jomcontrol/salesIncentive`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!salesIncentiveResponse.data.Status) {
        throw new Error(salesIncentiveResponse.data.Error);
      }

      // Then get the orders data
      const ordersResponse = await axios.get(
        `${ServerIP}/auth/sales-incentive`,
        {
          params: { dateFrom, dateTo },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (ordersResponse.data.Status) {
        // Calculate incentives right after fetching data
        const calculatedOrders = calculateSalesIncentive(
          ordersResponse.data.Result,
          salesIncentiveResponse.data.Result
        );

        // Save calculated incentives back to database
        const updates = calculatedOrders.map((order) => ({
          Id: order.id,
          salesIncentive: order.salesIncentive,
          overideIncentive: order.overideIncentive,
        }));

        const saveResponse = await axios.put(
          `${ServerIP}/auth/order_details/update_sales_incentives_calculation`,
          updates,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!saveResponse.data.Status) {
          throw new Error(
            saveResponse.data.Error || "Failed to save incentives"
          );
        }

        setReportData({
          orders: calculatedOrders,
          settings: salesIncentiveResponse.data.Result,
        });
      } else {
        setAlert({
          show: true,
          title: "Error",
          message:
            ordersResponse.data.Error || "Failed to fetch sales incentives",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error generating sales incentive report:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to generate sales incentive report",
        type: "error",
      });
    }
  };

  return (
    <div className="reports-content">
      <div className="reports-header d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Sales Incentives Report</h4>
        <Button
          variant="add"
          onClick={handleGenerateReport}
          disabled={!dateFrom || !dateTo}
        >
          Generate Report
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
            <ReportSalesIncentiveSummary data={reportData} />
          ) : (
            <ReportSalesIncentiveDetails data={reportData} />
          )}
        </div>
      )}
    </div>
  );
};

export default ReportSalesIncentives;
