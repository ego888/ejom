import React, { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import DateFromTo from "../UI/DateFromTo";
import ModalAlert from "../UI/ModalAlert";
import { formatNumber } from "../../utils/orderUtils";

const MaterialUsageReport = () => {
  const [dateRange, setDateRange] = useState({
    dateFrom: "",
    dateTo: "",
  });

  // Set default dates on component mount
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setDateRange({
      dateFrom: firstDay.toISOString().slice(0, 10),
      dateTo: lastDay.toISOString().slice(0, 10),
    });
  }, []);

  const [groupBy, setGroupBy] = useState("material");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });

  const groupByOptions = [
    { id: "material", name: "By Material" },
    { id: "materialType", name: "By Material Type" },
    { id: "machineType", name: "By Machine Type" },
  ];

  const handleCalculate = async () => {
    console.log("Date Range:", dateRange); // For debugging
    if (
      !dateRange.dateFrom ||
      !dateRange.dateTo ||
      dateRange.dateFrom === "" ||
      dateRange.dateTo === ""
    ) {
      setAlert({
        show: true,
        title: "Error",
        message: "Please select both date range",
        type: "alert",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${ServerIP}/auth/material-usage`, {
        params: {
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
          groupBy: groupBy,
        },
      });

      if (response.data.Status) {
        setReportData(response.data.Result);
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
  };

  const handlePrint = () => {
    window.open(
      `/dashboard/print_material_usage?dateFrom=${dateRange.dateFrom}&dateTo=${dateRange.dateTo}&groupBy=${groupBy}`,
      "_blank"
    );
  };

  const getColumnHeaders = () => {
    switch (groupBy) {
      case "material":
        return [
          "Material",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
      case "materialType":
        return [
          "Material Type",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
      case "machineType":
        return [
          "Machine Type",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
      default:
        return [
          "Material",
          "Total Quantity",
          "Total Usage",
          "Total Amount",
          "Per Sq Ft",
        ];
    }
  };

  return (
    <div className="px-5 mt-3">
      <div className="d-flex justify-content-center">
        <h3>Material Usage Report</h3>
      </div>

      <div className="mb-3">
        <div className="d-flex align-items-start gap-5">
          <DateFromTo
            dateFrom={dateRange.dateFrom}
            dateTo={dateRange.dateTo}
            onDateChange={(dateFrom, dateTo) =>
              setDateRange({ dateFrom, dateTo })
            }
          />

          <div className="mt-5">
            {groupByOptions.map((option) => (
              <div key={option.id} className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="radio"
                  name="groupBy"
                  id={option.id}
                  value={option.id}
                  checked={groupBy === option.id}
                  onChange={(e) => setGroupBy(e.target.value)}
                />
                <label className="form-check-label" htmlFor={option.id}>
                  {option.name}
                </label>
              </div>
            ))}
          </div>

          <div className="ms-auto d-flex gap-2">
            <Button variant="save" onClick={handleCalculate}>
              Calculate
            </Button>
            <Button variant="print" onClick={handlePrint}>
              Print Report
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center my-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {reportData.length > 0 && (
        <div className="mt-3" style={{ maxWidth: "350px", margin: "0 auto" }}>
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                {getColumnHeaders().map((header, index) => (
                  <th className="text-center" key={index}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, index) => (
                <tr key={index}>
                  <td>
                    {groupBy === "material"
                      ? row.materialName
                      : groupBy === "materialType"
                      ? row.materialType
                      : row.machineType}
                  </td>
                  <td className="text-end">
                    {Number(row.totalQuantity) === 0
                      ? ""
                      : formatNumber(row.totalQuantity)}
                  </td>
                  <td className="text-end">
                    {Number(row.totalUsage) === 0
                      ? ""
                      : formatNumber(row.totalUsage)}
                  </td>
                  <td className="text-end">
                    {Number(row.totalAmount) === 0
                      ? ""
                      : formatNumber(row.totalAmount)}
                  </td>
                  <td className="text-end">
                    {Number(row.totalUsage) > 0
                      ? formatNumber(row.totalAmount / row.totalUsage)
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
};

export default MaterialUsageReport;
