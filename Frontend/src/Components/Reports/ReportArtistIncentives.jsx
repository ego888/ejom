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

  const toCents = (value) => Math.round((Number(value) || 0) * 100);

  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem("token");
      const requestConfig = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const [artistIncentiveResponse, ordersResponse] = await Promise.all([
        axios.get(`${ServerIP}/auth/jomcontrol/artistIncentive`, requestConfig),
        axios.get(`${ServerIP}/auth/artist-incentive`, {
          ...requestConfig,
          params: { dateFrom, dateTo },
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

      const calculatedOrders = calculateArtistIncentive(
        ordersResponse.data.Result,
        artistIncentiveResponse.data.Result
      );

      const existingById = new Map(
        (ordersResponse.data.Result || []).map((order) => [order.id, order])
      );

      const updates = calculatedOrders
        .filter((order) => {
          const existingOrder = existingById.get(order.id);
          if (!existingOrder) return true;
          return (
            toCents(order.totalIncentive) !==
            toCents(existingOrder.artistIncentiveAmount)
          );
        })
        .map((order) => ({
          Id: order.id,
          artistIncentive: order.totalIncentive,
        }));

      if (updates.length > 0) {
        const saveResponse = await axios.put(
          `${ServerIP}/auth/order_details/update_incentives_calculation`,
          updates,
          requestConfig
        );

        if (!saveResponse.data.Status) {
          throw new Error(saveResponse.data.Error || "Failed to save incentives");
        }
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
    if (!reportData) {
      setAlert({
        show: true,
        title: "Info",
        message: "Please click Calculate first before exporting.",
        type: "warning",
      });
      return;
    }

    if (!Array.isArray(reportData.orders) || reportData.orders.length === 0) {
      setAlert({
        show: true,
        title: "Info",
        message: "No records found to export for the selected date range.",
        type: "warning",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${ServerIP}/auth/artist-incentive/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orders: reportData.orders,
          dateFrom,
          dateTo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to export artist incentives.");
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        throw new Error(
          json?.Error || json?.message || "Failed to export artist incentives."
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
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
      alert(error.message || "Failed to export artist incentives.");
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
