import React, { useState, useEffect } from "react";
import axios from "axios";
import { ServerIP } from "../config";
import { formatPeso } from "../utils/orderUtils";
import Button from "./UI/Button";
import DateFromTo from "./UI/DateFromTo";
import "./style.css";
import * as XLSX from "xlsx";

function InvoiceInquiry() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [cashInvoices, setCashInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("charge");

  // Calculate subtotals per invoice prefix
  const calculateSubtotals = (invoices) => {
    const subtotals = {};
    invoices.forEach((invoice) => {
      let prefix;
      if (activeTab === "charge") {
        prefix = invoice.invoicePrefix;
      } else {
        // For cash invoices, use first two letters of OR number
        prefix = invoice.ornum ? invoice.ornum.substring(0, 2) : "";
      }

      if (!subtotals[prefix]) {
        subtotals[prefix] = 0;
      }
      subtotals[prefix] += parseFloat(
        activeTab === "charge" ? invoice.invoiceAmount : invoice.amount
      );
    });
    return subtotals;
  };

  const formatAmount = (amount, forExcel = false) => {
    const num = parseFloat(amount);
    if (forExcel) {
      return num;
    }
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleExportToExcel = () => {
    const data = activeTab === "charge" ? invoices : cashInvoices;
    const subtotals = calculateSubtotals(data);
    const processedPayIds = new Set();
    const amountAppliedTotals = {};

    // Prepare data for export
    const exportData = data.map((item) => {
      if (activeTab === "charge") {
        return {
          "Invoice #": `${item.invoicePrefix}${item.invoiceNumber}`,
          "Bill Date": new Date(item.billDate).toLocaleDateString(),
          Customer: item.customerName,
          TIN: item.tinNumber,
          "Invoice Amount": formatAmount(item.invoiceAmount, true),
          "Order ID": item.orderId,
          "Order Total": formatAmount(item.grandTotal, true),
          Client: item.clientName,
        };
      } else {
        // For cash invoices, only show amount on first occurrence of payId
        const isFirstOccurrence = !processedPayIds.has(item.payId);
        if (isFirstOccurrence) {
          processedPayIds.add(item.payId);
        }

        // Track amount applied totals by prefix
        const prefix = item.ornum ? item.ornum.substring(0, 2) : "";
        if (!amountAppliedTotals[prefix]) {
          amountAppliedTotals[prefix] = 0;
        }
        amountAppliedTotals[prefix] += parseFloat(item.amountApplied);

        return {
          "OR #": item.ornum,
          "Payment Date": new Date(item.payDate).toLocaleDateString(),
          Customer: item.customerName,
          TIN: item.tinNumber,
          "Paid Amount": isFirstOccurrence
            ? formatAmount(item.amount, true)
            : "",
          "Order ID": item.orderId,
          "Amount Applied": formatAmount(item.amountApplied, true),
          "Order Total": formatAmount(item.grandTotal, true),
          Client: item.clientName,
        };
      }
    });

    // Add subtotals
    // Object.entries(subtotals).forEach(([prefix, total]) => {
    //   if (activeTab === "charge") {
    //     exportData.push({
    //       "Invoice #": `${prefix} Subtotal`,
    //       "Invoice Amount": formatAmount(total, true),
    //     });
    //   } else {
    //     exportData.push({
    //       "OR #": `${prefix} Subtotal`,
    //       "Paid Amount": formatAmount(total, true),
    //       "Amount Applied": formatAmount(
    //         amountAppliedTotals[prefix] || 0,
    //         true
    //       ),
    //     });
    //   }
    // });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set number format for amount columns
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const header = XLSX.utils.encode_col(C) + "1";
      const cell = ws[header];
      if (
        cell &&
        (cell.v === "Invoice Amount" ||
          cell.v === "Order Total" ||
          cell.v === "Paid Amount" ||
          cell.v === "Amount Applied")
      ) {
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellRef] && typeof ws[cellRef].v === "number") {
            ws[cellRef].z = "#,##0.00";
          }
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Charge-Invoice");

    // Generate file name with date range
    const fileName = `${
      activeTab === "charge" ? "Charge-Invoice" : "Cash-Invoice"
    }_${dateFrom}-${dateTo}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);
  };

  const handleDateChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (activeTab === "charge") {
        const response = await axios.get(`${ServerIP}/auth/invoices-inquire`, {
          params: { dateFrom, dateTo },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.Status) {
          setInvoices(response.data.Result);
        } else {
          setError(response.data.Error || "Failed to fetch invoices");
        }
      } else {
        const response = await axios.get(
          `${ServerIP}/auth/cash-invoices-inquire`,
          {
            params: { dateFrom, dateTo },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.Status) {
          setCashInvoices(response.data.Result);
        } else {
          setError(response.data.Error || "Failed to fetch cash invoices");
        }
      }
    } catch (err) {
      setError("Error fetching invoices: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const subtotals = calculateSubtotals(
    activeTab === "charge" ? invoices : cashInvoices
  );

  return (
    <div className="container-fluid p-4">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Invoice Inquiry</h3>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
              <DateFromTo onDateChange={handleDateChange} />
            </div>
            <div className="col-md-4 d-flex align-items-end gap-2">
              <Button variant="view" onClick={handleSearch}>
                Search
              </Button>{" "}
              {(invoices.length > 0 || cashInvoices.length > 0) && (
                <Button variant="print" onClick={handleExportToExcel}>
                  Save as XLS
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "charge" ? "active" : ""}`}
                onClick={() => setActiveTab("charge")}
              >
                Charge Invoice
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "cash" ? "active" : ""}`}
                onClick={() => setActiveTab("cash")}
              >
                Cash Invoice
              </button>
            </li>
          </ul>

          {loading ? (
            <div className="text-center my-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "charge" && (
                <>
                  {invoices.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped">
                        <thead>
                          <tr>
                            <th className="text-center">Invoice #</th>
                            <th className="text-center">Bill Date</th>
                            <th className="text-center">Customer</th>
                            <th className="text-center">TIN</th>
                            <th className="text-end">Invoice Amount</th>
                            <th
                              className="text-center"
                              style={{ backgroundColor: "#ff9999" }}
                            >
                              Order ID
                            </th>
                            <th
                              className="text-end"
                              style={{ backgroundColor: "#ff9999" }}
                            >
                              Order Total
                            </th>
                            <th
                              className="text-center"
                              style={{ backgroundColor: "#ff9999" }}
                            >
                              Client
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const rows = [];
                            let currentPrefix = null;
                            let currentGroupTotal = 0;
                            let lastInvoiceNumber = null;

                            invoices.forEach((item, index) => {
                              const prefix = item.invoicePrefix;
                              const currentInvoiceNumber = `${item.invoicePrefix}${item.invoiceNumber}`;

                              // If we're starting a new prefix group, add the previous subtotal
                              if (
                                currentPrefix !== null &&
                                currentPrefix !== prefix
                              ) {
                                rows.push(
                                  <tr
                                    key={`subtotal-${currentPrefix}-${index}`}
                                    className="table-secondary"
                                  >
                                    <td colSpan="4" className="text-end">
                                      <strong>{currentPrefix} Subtotal:</strong>
                                    </td>
                                    <td className="text-end">
                                      <strong>
                                        {formatPeso(currentGroupTotal)}
                                      </strong>
                                    </td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                  </tr>
                                );
                                currentGroupTotal = 0;
                              }

                              // Add the current row
                              rows.push(
                                <tr
                                  key={`row-${item.invoicePrefix}-${item.orderId}-${index}`}
                                >
                                  <td className="text-center">
                                    {lastInvoiceNumber !== currentInvoiceNumber
                                      ? currentInvoiceNumber
                                      : ""}
                                  </td>
                                  <td className="text-center">
                                    {lastInvoiceNumber !== currentInvoiceNumber
                                      ? new Date(
                                          item.billDate
                                        ).toLocaleDateString()
                                      : ""}
                                  </td>
                                  <td className="text-center">
                                    {lastInvoiceNumber !== currentInvoiceNumber
                                      ? item.customerName
                                      : ""}
                                  </td>
                                  <td className="text-center">
                                    {lastInvoiceNumber !== currentInvoiceNumber
                                      ? item.tinNumber
                                      : ""}
                                  </td>
                                  <td className="text-end">
                                    {formatPeso(item.invoiceAmount)}
                                  </td>
                                  <td className="text-center">
                                    {item.orderId}
                                  </td>
                                  <td className="text-end">
                                    {formatPeso(item.grandTotal)}
                                  </td>
                                  <td className="text-center">
                                    {lastInvoiceNumber !== currentInvoiceNumber
                                      ? item.clientName
                                      : ""}
                                  </td>
                                </tr>
                              );

                              // Update current group total
                              currentGroupTotal += parseFloat(
                                item.invoiceAmount
                              );
                              currentPrefix = prefix;
                              lastInvoiceNumber = currentInvoiceNumber;

                              // If this is the last item, add the final subtotal
                              if (index === invoices.length - 1) {
                                rows.push(
                                  <tr
                                    key={`subtotal-${currentPrefix}-${index}`}
                                    className="table-secondary"
                                  >
                                    <td colSpan="4" className="text-end">
                                      <strong>{currentPrefix} Subtotal:</strong>
                                    </td>
                                    <td className="text-end">
                                      <strong>
                                        {formatPeso(currentGroupTotal)}
                                      </strong>
                                    </td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                  </tr>
                                );
                              }
                            });

                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-info" role="alert">
                      No invoices found for the selected date range
                    </div>
                  )}
                </>
              )}

              {activeTab === "cash" && (
                <>
                  {cashInvoices.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped">
                        <thead>
                          <tr>
                            <th className="text-center">OR #</th>
                            <th className="text-center">Payment Date</th>
                            <th className="text-center">Customer</th>
                            <th className="text-center">TIN</th>
                            <th className="text-end">Paid Amount</th>
                            <th
                              className="text-center"
                              style={{ backgroundColor: "#ff9999" }}
                            >
                              Order ID
                            </th>
                            <th
                              className="text-center"
                              style={{ backgroundColor: "#ff9999" }}
                            >
                              Amount Applied
                            </th>
                            <th
                              className="text-center"
                              style={{ backgroundColor: "#ff9999" }}
                            >
                              Order Total
                            </th>
                            <th
                              className="text-center"
                              style={{ backgroundColor: "#ff9999" }}
                            >
                              Client
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const rows = [];
                            let currentPrefix = null;
                            let currentGroupTotal = 0;
                            let currentAmountAppliedTotal = 0;
                            let lastPayId = null;
                            const processedPayIds = new Set();

                            cashInvoices.forEach((item, index) => {
                              const prefix = item.ornum
                                ? item.ornum.substring(0, 2)
                                : "";

                              // If we're starting a new prefix group, add the previous subtotal
                              if (
                                currentPrefix !== null &&
                                currentPrefix !== prefix
                              ) {
                                rows.push(
                                  <tr
                                    key={`subtotal-${currentPrefix}-${index}`}
                                    className="table-secondary"
                                  >
                                    <td colSpan="4" className="text-end">
                                      <strong>{currentPrefix} Subtotal:</strong>
                                    </td>
                                    <td className="text-end">
                                      <strong>
                                        {formatPeso(currentGroupTotal)}
                                      </strong>
                                    </td>
                                    <td></td>
                                    <td className="text-end">
                                      <strong>
                                        {formatPeso(currentAmountAppliedTotal)}
                                      </strong>
                                    </td>
                                    <td></td>
                                    <td></td>
                                  </tr>
                                );
                                currentGroupTotal = 0;
                                currentAmountAppliedTotal = 0;
                                processedPayIds.clear(); // Clear the set when starting a new prefix
                              }

                              // Add the current row
                              rows.push(
                                <tr
                                  key={`row-${prefix}-${item.orderId}-${index}`}
                                >
                                  <td className="text-center">
                                    {lastPayId !== item.payId ? item.ornum : ""}
                                  </td>
                                  <td className="text-center">
                                    {lastPayId !== item.payId
                                      ? new Date(
                                          item.payDate
                                        ).toLocaleDateString()
                                      : ""}
                                  </td>
                                  <td className="text-center">
                                    {lastPayId !== item.payId
                                      ? item.customerName
                                      : ""}
                                  </td>
                                  <td className="text-center">
                                    {lastPayId !== item.payId
                                      ? item.tinNumber
                                      : ""}
                                  </td>
                                  <td className="text-end">
                                    {lastPayId !== item.payId
                                      ? formatPeso(item.amount)
                                      : ""}
                                  </td>
                                  <td className="text-center">
                                    {item.orderId}
                                  </td>
                                  <td className="text-end">
                                    {formatPeso(item.amountApplied)}
                                  </td>
                                  <td className="text-end">
                                    {formatPeso(item.grandTotal)}
                                  </td>
                                  <td className="text-center">
                                    {lastPayId !== item.payId
                                      ? item.clientName
                                      : ""}
                                  </td>
                                </tr>
                              );

                              // Update current group total only if this payId hasn't been processed yet
                              if (!processedPayIds.has(item.payId)) {
                                currentGroupTotal += parseFloat(item.amount);
                                processedPayIds.add(item.payId);
                              }
                              // Always add to amount applied total
                              currentAmountAppliedTotal += parseFloat(
                                item.amountApplied
                              );
                              currentPrefix = prefix;
                              lastPayId = item.payId;

                              // If this is the last item, add the final subtotal
                              if (index === cashInvoices.length - 1) {
                                rows.push(
                                  <tr
                                    key={`subtotal-${currentPrefix}-${index}`}
                                    className="table-secondary"
                                  >
                                    <td colSpan="4" className="text-end">
                                      <strong>{currentPrefix} Subtotal:</strong>
                                    </td>
                                    <td className="text-end">
                                      <strong>
                                        {formatPeso(currentGroupTotal)}
                                      </strong>
                                    </td>
                                    <td></td>
                                    <td className="text-end">
                                      <strong>
                                        {formatPeso(currentAmountAppliedTotal)}
                                      </strong>
                                    </td>
                                    <td></td>
                                    <td></td>
                                  </tr>
                                );
                              }
                            });

                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-info" role="alert">
                      No cash invoices found for the selected date range
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoiceInquiry;
