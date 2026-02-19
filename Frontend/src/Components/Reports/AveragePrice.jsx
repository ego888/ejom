import React, { useCallback, useEffect, useState } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import ModalAlert from "../UI/ModalAlert";
import { formatNumber } from "../../utils/orderUtils";

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];
const TODAY = new Date();
const DEFAULT_MONTH = TODAY.getMonth() + 1;
const DEFAULT_YEAR = TODAY.getFullYear();

const AveragePrice = () => {
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });

  const years = [];
  for (let year = DEFAULT_YEAR - 5; year <= DEFAULT_YEAR + 1; year++) {
    years.push(year);
  }

  const fetchReport = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const response = await axios.get(`${ServerIP}/auth/average-price-report`, {
        params: { month, year },
      });

      if (response.data.Status) {
        setReportData(response.data.Result || []);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to fetch report data",
          type: "alert",
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to fetch report data",
        type: "alert",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerate = () => fetchReport(selectedMonth, selectedYear);

  useEffect(() => {
    fetchReport(DEFAULT_MONTH, DEFAULT_YEAR);
  }, [fetchReport]);

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Average Price Report</h3>
      </div>

      <div className="d-flex flex-wrap align-items-end gap-3 mb-4 mt-3">
        <div>
          <label htmlFor="average-price-month" className="form-label mb-1">
            Month
          </label>
          <select
            id="average-price-month"
            className="form-select reports-form-control"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="average-price-year" className="form-label mb-1">
            Year
          </label>
          <select
            id="average-price-year"
            className="form-select reports-form-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="save"
          onClick={handleGenerate}
          disabled={loading}
          className="mb-1"
        >
          {loading ? "Loading..." : "Generate"}
        </Button>
      </div>

      <div className="report-table-wrapper">
        <div className="table-responsive report-table-container">
          <table className="table table-hover report-table">
            <thead>
              <tr>
                <th>Material</th>
                <th className="text-end">Item Count</th>
                <th className="text-end">Average Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-4">
                    No data found for selected month and year.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr key={row.materialName}>
                    <td>{row.materialName}</td>
                    <td className="text-end">
                      {Number(row.itemCount || 0).toLocaleString("en-US")}
                    </td>
                    <td className="text-end">{formatNumber(row.averagePrice)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default AveragePrice;
