import React, { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "../UI/Button";
import DateFromTo from "../UI/DateFromTo";
import ModalAlert from "../UI/ModalAlert";
import { formatNumber, formatDate } from "../../utils/orderUtils";
import { BiSortAlt2, BiSortUp, BiSortDown } from "react-icons/bi";

const NotYetClosed = () => {
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

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });
  const [sortConfig, setSortConfig] = useState({
    key: "orderId",
    direction: "asc",
  });

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <BiSortAlt2 />;
    }
    return sortConfig.direction === "asc" ? <BiSortUp /> : <BiSortDown />;
  };

  const sortedData = [...reportData].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    // Handle numeric values
    if (key === "grandTotal" || key === "amountPaid") {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // Handle date values
    if (key === "productionDate" || key === "datePaid") {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }

    // Handle string values
    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === "asc" ? 1 : -1;
    }
    return 0;
  });

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
      const response = await axios.get(`${ServerIP}/auth/not-closed-orders`, {
        params: {
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
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
    const printWindow = window.open("", "_blank");

    // Calculate totals
    const totals = reportData.reduce(
      (acc, curr) => ({
        totalGrandTotal: acc.totalGrandTotal + Number(curr.grandTotal || 0),
        totalAmountPaid: acc.totalAmountPaid + Number(curr.amountPaid || 0),
        totalBalance:
          acc.totalBalance +
          (Number(curr.grandTotal || 0) - Number(curr.amountPaid || 0)),
      }),
      { totalGrandTotal: 0, totalAmountPaid: 0, totalBalance: 0 }
    );

    const title = "Not Yet Closed Orders Report";

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
                  <th>Order ID</th>
                  <th>Production Date</th>
                  <th>Prepared By</th>
                  <th>Grand Total</th>
                  <th>Amount Paid</th>
                  <th>Date Paid</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                ${reportData
                  .map(
                    (row) => `
                  <tr>
                    <td>${row.orderId}</td>
                    <td>${
                      row.productionDate
                        ? formatDateForDisplay(row.productionDate)
                        : ""
                    }</td>
                    <td>${row.preparedBy || ""}</td>
                    <td class="text-end">${formatNumber(row.grandTotal)}</td>
                    <td class="text-end">${formatNumber(row.amountPaid)}</td>
                    <td>${
                      row.datePaid ? formatDateForDisplay(row.datePaid) : ""
                    }</td>
                    <td class="text-end">${formatNumber(
                      row.grandTotal - row.amountPaid
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr class="table-active">
                  <td>Total</td>
                  <td></td>
                  <td></td>
                  <td class="text-end">${formatNumber(
                    totals.totalGrandTotal
                  )}</td>
                  <td class="text-end">${formatNumber(
                    totals.totalAmountPaid
                  )}</td>
                  <td></td>
                  <td class="text-end">${formatNumber(totals.totalBalance)}</td>
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
      <style>
        {`
          .sortable-header {
            user-select: none;
            transition: background-color 0.2s;
          }
          .sortable-header:hover {
            background-color: #f8f9fa;
          }
          .sortable-header svg {
            margin-left: 5px;
            vertical-align: middle;
          }
        `}
      </style>
      <div className="d-flex justify-content-center">
        <h3>Not Yet Closed Orders Report</h3>
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
        <div className="mt-3">
          {(() => {
            // Calculate totals
            const totals = reportData.reduce(
              (acc, curr) => ({
                totalGrandTotal:
                  acc.totalGrandTotal + Number(curr.grandTotal || 0),
                totalAmountPaid:
                  acc.totalAmountPaid + Number(curr.amountPaid || 0),
                totalBalance:
                  acc.totalBalance +
                  (Number(curr.grandTotal || 0) - Number(curr.amountPaid || 0)),
              }),
              { totalGrandTotal: 0, totalAmountPaid: 0, totalBalance: 0 }
            );

            return (
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th
                      className="text-center sortable-header"
                      onClick={() => handleSort("orderId")}
                      style={{ cursor: "pointer" }}
                    >
                      Order ID {getSortIcon("orderId")}
                    </th>
                    <th
                      className="text-center sortable-header"
                      onClick={() => handleSort("productionDate")}
                      style={{ cursor: "pointer" }}
                    >
                      Production Date {getSortIcon("productionDate")}
                    </th>
                    <th
                      className="text-center sortable-header"
                      onClick={() => handleSort("preparedBy")}
                      style={{ cursor: "pointer" }}
                    >
                      Prepared By {getSortIcon("preparedBy")}
                    </th>
                    <th
                      className="text-center sortable-header"
                      onClick={() => handleSort("grandTotal")}
                      style={{ cursor: "pointer" }}
                    >
                      Grand Total {getSortIcon("grandTotal")}
                    </th>
                    <th
                      className="text-center sortable-header"
                      onClick={() => handleSort("amountPaid")}
                      style={{ cursor: "pointer" }}
                    >
                      Amount Paid {getSortIcon("amountPaid")}
                    </th>
                    <th
                      className="text-center sortable-header"
                      onClick={() => handleSort("datePaid")}
                      style={{ cursor: "pointer" }}
                    >
                      Date Paid {getSortIcon("datePaid")}
                    </th>
                    <th className="text-center">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row, index) => (
                    <tr key={index}>
                      <td className="text-center">{row.orderId}</td>
                      <td className="text-center">
                        {row.productionDate
                          ? formatDate(row.productionDate)
                          : ""}
                      </td>
                      <td className="text-center">{row.preparedBy || ""}</td>
                      <td className="text-end">
                        {formatNumber(row.grandTotal)}
                      </td>
                      <td className="text-end">
                        {formatNumber(row.amountPaid)}
                      </td>
                      <td className="text-center">
                        {row.datePaid ? formatDate(row.datePaid) : ""}
                      </td>
                      <td className="text-end">
                        {formatNumber(row.grandTotal - row.amountPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-active">
                    <td className="text-center">Total</td>
                    <td></td>
                    <td></td>
                    <td className="text-end">
                      {formatNumber(totals.totalGrandTotal)}
                    </td>
                    <td className="text-end">
                      {formatNumber(totals.totalAmountPaid)}
                    </td>
                    <td></td>
                    <td className="text-end">
                      {formatNumber(totals.totalBalance)}
                    </td>
                  </tr>
                </tfoot>
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

export default NotYetClosed;
