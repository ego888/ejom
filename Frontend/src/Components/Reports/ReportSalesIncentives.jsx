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

  const toCents = (value) => Math.round((Number(value) || 0) * 100);

  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem("token");
      const requestConfig = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const [salesIncentiveResponse, ordersResponse] = await Promise.all([
        axios.get(`${ServerIP}/auth/jomcontrol/salesIncentive`, requestConfig),
        axios.get(`${ServerIP}/auth/sales-incentive`, {
          ...requestConfig,
          params: { dateFrom, dateTo },
        }),
      ]);

      if (!salesIncentiveResponse.data.Status) {
        throw new Error(salesIncentiveResponse.data.Error);
      }

      if (!ordersResponse.data.Status) {
        setAlert({
          show: true,
          title: "Error",
          message:
            ordersResponse.data.Error || "Failed to fetch sales incentives",
          type: "error",
        });
        return;
      }

      // Calculate incentives right after fetching data
      const calculatedOrders = calculateSalesIncentive(
        ordersResponse.data.Result,
        salesIncentiveResponse.data.Result
      );

      const existingById = new Map(
        (ordersResponse.data.Result || []).map((order) => [order.id, order])
      );

      // Save only changed incentive values to reduce write load.
      const updates = calculatedOrders
        .filter(
          (order) => {
            const existingOrder = existingById.get(order.id);
            if (!existingOrder) return true;

            return (
              toCents(order.salesIncentive) !==
                toCents(existingOrder.salesIncentive) ||
              toCents(order.overideIncentive) !==
                toCents(existingOrder.overideIncentive)
            );
          }
        )
        .map((order) => ({
          Id: order.id,
          salesIncentive: order.salesIncentive,
          overideIncentive: order.overideIncentive,
        }));

      if (updates.length > 0) {
        const saveResponse = await axios.put(
          `${ServerIP}/auth/order_details/update_sales_incentives_calculation`,
          updates,
          requestConfig
        );

        if (!saveResponse.data.Status) {
          throw new Error(saveResponse.data.Error || "Failed to save incentives");
        }
      }

      setReportData({
        orders: calculatedOrders,
        settings: salesIncentiveResponse.data.Result,
      });
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
      <div className="d-flex justify-content-center pt-4">
        <h3>Sales Incentives Report</h3>
      </div>
      <div className="d-flex justify-content-between mb-3">
        <Button
          variant="add"
          onClick={handleGenerateReport}
          disabled={!dateFrom || !dateTo}
          aria-label="Generate sales incentives report"
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
              <label className="form-label" htmlFor="summaryToggle">
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
