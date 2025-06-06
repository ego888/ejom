import React, { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import DateFromTo from "../UI/DateFromTo";
import ModalAlert from "../UI/ModalAlert";
import {
  formatNumber,
  formatDate,
  formatDateTime,
} from "../../utils/orderUtils";

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
      dateFrom: formatDate(firstDay),
      dateTo: formatDate(lastDay),
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
  const [isDetailed, setIsDetailed] = useState(false);

  const groupByOptions = [
    { id: "material", name: "By Material" },
    { id: "materialType", name: "By Material Type" },
    { id: "machineType", name: "By Machine Type" },
  ];

  const handleCalculate = async () => {
    console.log("Date Range:", dateRange);
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
      const endpoint = isDetailed
        ? "material-usage-detailed"
        : "material-usage";
      const response = await axios.get(`${ServerIP}/auth/${endpoint}`, {
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

  const getColumnHeaders = () => {
    if (isDetailed) {
      return [
        "Order ID",
        "Client",
        "Order Date",
        groupBy === "material"
          ? "Material"
          : groupBy === "materialType"
          ? "Material Type"
          : "Machine Type",
        "Quantity",
        "Usage",
        "Amount",
        "Per Sq Ft",
      ];
    }

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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");

    // Calculate totals
    const totals = reportData.reduce(
      (acc, curr) => ({
        totalQuantity: acc.totalQuantity + Number(curr.totalQuantity || 0),
        totalUsage: acc.totalUsage + Number(curr.totalUsage || 0),
        totalAmount: acc.totalAmount + Number(curr.totalAmount || 0),
      }),
      { totalQuantity: 0, totalUsage: 0, totalAmount: 0 }
    );

    const getReportTitle = () => {
      switch (groupBy) {
        case "material":
          return "Material Usage Report - By Material";
        case "materialType":
          return "Material Usage Report - By Material Type";
        case "machineType":
          return "Material Usage Report - By Machine Type";
        default:
          return "Material Usage Report";
      }
    };

    const headers = getColumnHeaders();
    const title = getReportTitle();

    // Format dates correctly by adjusting for timezone
    const formatDateForDisplay = (dateString) => {
      const date = new Date(dateString);
      // Adjust for timezone offset to get the correct local date
      const adjustedDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      );
      return adjustedDate.toISOString().split("T")[0];
    };

    // Generate the HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .print-report { padding: 20px; }
            .print-header { text-align: center; margin-bottom: 20px; }
            .print-table { width: 100%; border-collapse: collapse; }
            .print-table th, .print-table td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left;
            }
            .print-table th { background-color: #f2f2f2; }
            .text-end { text-align: right; }
            .table-active { background-color: #f8f9fa; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-report">
            <div class="print-header">
              <h2>${title}</h2>
              <p>Date Range: ${formatDateForDisplay(
                dateRange.dateFrom
              )} to ${formatDateForDisplay(dateRange.dateTo)}</p>
            </div>

            <table class="print-table">
              <thead>
                <tr>
                  ${headers.map((header) => `<th>${header}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${reportData
                  .map(
                    (row) => `
                  <tr>
                    <td>${
                      groupBy === "material"
                        ? row.materialName
                        : groupBy === "materialType"
                        ? row.materialType
                        : row.machineType
                    }</td>
                    <td class="text-end">${
                      Number(row.totalQuantity) === 0
                        ? ""
                        : formatNumber(row.totalQuantity)
                    }</td>
                    <td class="text-end">${
                      Number(row.totalUsage) === 0
                        ? ""
                        : formatNumber(row.totalUsage)
                    }</td>
                    <td class="text-end">${
                      Number(row.totalAmount) === 0
                        ? ""
                        : formatNumber(row.totalAmount)
                    }</td>
                    <td class="text-end">${
                      Number(row.totalUsage) > 0
                        ? formatNumber(row.totalAmount / row.totalUsage)
                        : ""
                    }</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr class="table-active">
                  <td>Total</td>
                  <td class="text-end">${formatNumber(
                    totals.totalQuantity
                  )}</td>
                  <td class="text-end">${formatNumber(totals.totalUsage)}</td>
                  <td class="text-end">${formatNumber(totals.totalAmount)}</td>
                  <td class="text-end">${
                    totals.totalUsage > 0
                      ? formatNumber(totals.totalAmount / totals.totalUsage)
                      : ""
                  }</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <script>
            // Print after a short delay to ensure rendering
            const printTimer = setTimeout(() => {
              window.print();
            }, 100);

            // Handle print completion
            const handlePrintEvent = () => {
              setTimeout(() => {
                window.close();
              }, 100);
            };

            window.addEventListener("afterprint", handlePrintEvent);

            // Cleanup
            window.onunload = function() {
              clearTimeout(printTimer);
              window.removeEventListener("afterprint", handlePrintEvent);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="detailed"
                checked={isDetailed}
                onChange={(e) => setIsDetailed(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="detailed">
                Detailed
              </label>
            </div>

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
        <div
          className="mt-3"
          style={{ maxWidth: isDetailed ? "100%" : "350px", margin: "0 auto" }}
        >
          {(() => {
            // Calculate totals only for non-detailed view
            const totals = !isDetailed
              ? reportData.reduce(
                  (acc, curr) => ({
                    totalQuantity:
                      acc.totalQuantity + Number(curr.totalQuantity || 0),
                    totalUsage: acc.totalUsage + Number(curr.totalUsage || 0),
                    totalAmount:
                      acc.totalAmount + Number(curr.totalAmount || 0),
                  }),
                  { totalQuantity: 0, totalUsage: 0, totalAmount: 0 }
                )
              : null;

            return (
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
                      {isDetailed && (
                        <>
                          <td>{row.orderId}</td>
                          <td>{row.clientName}</td>
                          <td>{formatDate(row.orderDate)}</td>
                        </>
                      )}
                      {""}
                      <td>
                        {groupBy === "material"
                          ? row.materialName
                          : groupBy === "materialType"
                          ? row.materialType
                          : row.machineType}
                      </td>
                      <td className="text-end">
                        {Number(row.quantity || row.totalQuantity) === 0
                          ? ""
                          : formatNumber(row.quantity || row.totalQuantity)}
                      </td>
                      <td className="text-end">
                        {Number(row.materialUsage || row.totalUsage) === 0
                          ? ""
                          : formatNumber(row.materialUsage || row.totalUsage)}
                      </td>
                      <td className="text-end">
                        {Number(row.amount || row.totalAmount) === 0
                          ? ""
                          : formatNumber(row.amount || row.totalAmount)}
                      </td>
                      <td className="text-end">
                        {Number(row.materialUsage || row.totalUsage) > 0
                          ? formatNumber(
                              (row.amount || row.totalAmount) /
                                (row.materialUsage || row.totalUsage)
                            )
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {!isDetailed && totals && (
                  <tfoot>
                    <tr className="table-active">
                      <td>Total</td>
                      <td className="text-end">
                        {formatNumber(totals.totalQuantity)}
                      </td>
                      <td className="text-end">
                        {formatNumber(totals.totalUsage)}
                      </td>
                      <td className="text-end">
                        {formatNumber(totals.totalAmount)}
                      </td>
                      <td className="text-end">
                        {totals.totalUsage > 0
                          ? formatNumber(totals.totalAmount / totals.totalUsage)
                          : ""}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            );
          })()}
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
