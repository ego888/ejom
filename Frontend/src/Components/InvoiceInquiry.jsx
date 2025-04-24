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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calculate subtotals per invoice prefix
  const calculateSubtotals = (invoices) => {
    const subtotals = {};
    invoices.forEach((invoice) => {
      if (!subtotals[invoice.invoicePrefix]) {
        subtotals[invoice.invoicePrefix] = 0;
      }
      subtotals[invoice.invoicePrefix] += parseFloat(invoice.invoiceAmount);
    });
    return subtotals;
  };

  const handleExportToExcel = () => {
    const subtotals = calculateSubtotals(invoices);

    // Prepare data for export
    const exportData = invoices.map((invoice) => ({
      "Invoice #": `${invoice.invoicePrefix}${invoice.invoiceNumber}`,
      "Bill Date": new Date(invoice.billDate).toLocaleDateString(),
      Client: invoice.clientName,
      Customer: invoice.customerName,
      TIN: invoice.tinNumber,
      "Order ID": invoice.orderId,
      "Invoice Amount": parseFloat(invoice.invoiceAmount),
      "Grand Total": parseFloat(invoice.grandTotal),
    }));

    // Add subtotals
    Object.entries(subtotals).forEach(([prefix, total]) => {
      exportData.push({
        "Invoice #": `${prefix} Subtotal`,
        "Invoice Amount": total,
      });
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");

    // Generate file name with date range
    const fileName = `Invoice_Report_${dateFrom}_to_${dateTo}.xlsx`;

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
      const response = await axios.get(`${ServerIP}/auth/invoices-inquire`, {
        params: { dateFrom, dateTo },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setInvoices(response.data.Result);
      } else {
        setError(response.data.Error || "Failed to fetch invoices");
      }
    } catch (err) {
      setError("Error fetching invoices: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const subtotals = calculateSubtotals(invoices);

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
              {invoices.length > 0 && (
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

          {loading ? (
            <div className="text-center my-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : invoices.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th className="text-center">Invoice #</th>
                    <th className="text-center">Bill Date</th>
                    <th className="text-center">Client</th>
                    <th className="text-center">Customer</th>
                    <th className="text-center">TIN</th>
                    <th className="text-center">Order ID</th>
                    <th className="text-end">Invoice Amount</th>
                    <th className="text-end">Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = [];
                    let currentPrefix = null;
                    let currentGroupTotal = 0;

                    invoices.forEach((invoice, index) => {
                      // If we're starting a new prefix group, add the previous subtotal
                      if (
                        currentPrefix !== null &&
                        currentPrefix !== invoice.invoicePrefix
                      ) {
                        rows.push(
                          <tr
                            key={`subtotal-${currentPrefix}`}
                            className="table-secondary"
                          >
                            <td colSpan="6" className="text-end">
                              <strong>{currentPrefix} Subtotal:</strong>
                            </td>
                            <td className="text-end">
                              <strong>{formatPeso(currentGroupTotal)}</strong>
                            </td>
                            <td></td>
                          </tr>
                        );
                        currentGroupTotal = 0;
                      }

                      // Add the current invoice row
                      rows.push(
                        <tr
                          key={`${invoice.invoicePrefix}-${invoice.invoiceNumber}-${invoice.orderId}`}
                        >
                          <td className="text-center">
                            {invoice.invoicePrefix}
                            {invoice.invoiceNumber}
                          </td>
                          <td className="text-center">
                            {new Date(invoice.billDate).toLocaleDateString()}
                          </td>
                          <td className="text-center">{invoice.clientName}</td>
                          <td className="text-center">
                            {invoice.customerName}
                          </td>
                          <td className="text-center">{invoice.tinNumber}</td>
                          <td className="text-center">{invoice.orderId}</td>
                          <td className="text-end">
                            {formatPeso(invoice.invoiceAmount)}
                          </td>
                          <td className="text-end">
                            {formatPeso(invoice.grandTotal)}
                          </td>
                        </tr>
                      );

                      // Update current group total
                      currentGroupTotal += parseFloat(invoice.invoiceAmount);
                      currentPrefix = invoice.invoicePrefix;

                      // If this is the last invoice, add the final subtotal
                      if (index === invoices.length - 1) {
                        rows.push(
                          <tr
                            key={`subtotal-${currentPrefix}`}
                            className="table-secondary"
                          >
                            <td colSpan="6" className="text-end">
                              <strong>{currentPrefix} Subtotal:</strong>
                            </td>
                            <td className="text-end">
                              <strong>{formatPeso(currentGroupTotal)}</strong>
                            </td>
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
        </div>
      </div>
    </div>
  );
}

export default InvoiceInquiry;
