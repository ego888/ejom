import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import StatusBadges from "./UI/StatusBadges";
import { formatPeso, formatNumber, formatDate } from "../utils/orderUtils";
import "./style.css";
import "./Billing.css";
import Modal from "./UI/Modal";

function Billing() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "invoiceNumber",
    direction: "desc",
  });
  const [showInvoiceTotalModal, setShowInvoiceTotalModal] = useState(false);
  const [selectedInvoiceTotal, setSelectedInvoiceTotal] = useState(null);
  const [hoverTimer, setHoverTimer] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchBilling();
  }, [currentPage, recordsPerPage, searchTerm, sortConfig]);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ServerIP}/auth/billing`, {
        params: {
          page: currentPage,
          limit: recordsPerPage,
          search: searchTerm,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction,
        },
      });

      console.log("Billing response", response.data);
      if (response.data.Status) {
        setBilling(response.data.Result.data || []);
        setTotalCount(response.data.Result.pagination.total);
        setTotalPages(response.data.Result.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      // Set empty state on error
      setBilling([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  const handleInvoiceHover = async (invoicePrefix, invoiceNumber, event) => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }

    // Get mouse position
    const rect = event.target.getBoundingClientRect();
    setTooltipPosition({
      x: event.clientX + 15,
      y: event.clientY,
    });

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(
          `${ServerIP}/auth/billing-invoice-total/${invoicePrefix}/${invoiceNumber}`
        );
        console.log("Invoice total response", response.data);
        if (response.data.Status) {
          setSelectedInvoiceTotal(response.data.Result);
          setShowInvoiceTotalModal(true);
        } else {
          console.error("Error fetching invoice total:", response.data.Error);
          setSelectedInvoiceTotal(0);
        }
      } catch (error) {
        console.error("Error fetching invoice total:", error);
        setSelectedInvoiceTotal(0);
      }
    }, 500);

    setHoverTimer(timer);
  };

  const handleInvoiceLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    setShowInvoiceTotalModal(false);
  };

  return (
    <div className="billing-page-background ">
      <div className="billing-header d-flex justify-content-center">
        <h3>Billing List</h3>
      </div>

      <div className="d-flex justify-content-between mb-3">
        <div className="search-container">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by invoice, order, client..."
            value={searchTerm}
            onChange={handleSearch}
            style={{ width: "400px" }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center my-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th
                  className="text-center"
                  onClick={() => handleSort("invoiceNumber")}
                  style={{ cursor: "pointer" }}
                >
                  Inv # {getSortIndicator("invoiceNumber")}
                </th>
                <th
                  className="text-center"
                  onClick={() => handleSort("orderID")}
                  style={{ cursor: "pointer" }}
                >
                  JO # {getSortIndicator("orderID")}
                </th>
                <th className="text-center">Amount</th>
                <th className="text-center">Remarks</th>
                <th
                  onClick={() => handleSort("clientName")}
                  style={{ cursor: "pointer" }}
                >
                  Client {getSortIndicator("clientName")}
                </th>
                <th className="text-center">Project Name</th>
                <th className="text-center">Ordered By</th>
                <th
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Status {getSortIndicator("status")}
                </th>
                <th className="text-center">DR #</th>
                <th
                  onClick={() => handleSort("grandTotal")}
                  style={{ cursor: "pointer" }}
                >
                  Grand Total {getSortIndicator("grandTotal")}
                </th>
                <th className="text-center">Amount Paid</th>
                <th className="text-center">Date Paid</th>
                <th className="text-center">Prepared By</th>
                <th className="text-center">Order Ref</th>
                <th className="text-center">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {billing.map((item, index) => {
                // Check if this is the first occurrence of this invoice number
                const isFirstOccurrence =
                  index === 0 ||
                  `${billing[index - 1].invoicePrefix}${
                    billing[index - 1].invoiceNumber
                  }` !== `${item.invoicePrefix}${item.invoiceNumber}`;

                return (
                  <tr
                    key={`${item.invoicePrefix}-${item.invoiceNumber}-${item.orderID}-${index}`}
                  >
                    <td
                      onMouseEnter={(event) =>
                        handleInvoiceHover(
                          item.invoicePrefix,
                          item.invoiceNumber,
                          event
                        )
                      }
                      onMouseLeave={handleInvoiceLeave}
                      style={{ cursor: "pointer" }}
                    >
                      {isFirstOccurrence
                        ? `${item.invoicePrefix}${item.invoiceNumber}`
                        : null}
                    </td>
                    <td>{item.orderId}</td>
                    <td className="text-end">
                      {formatNumber(item.invoiceAmount)}
                    </td>
                    <td>{item.invoiceRemarks}</td>
                    <td>
                      {item.clientName}
                      {item.customerName && (
                        <div className="small text-muted">
                          {item.customerName}
                        </div>
                      )}
                    </td>
                    <td>{item.projectName}</td>
                    <td>{item.orderedBy}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{item.drNum}</td>
                    <td className="number_right">
                      {formatPeso(item.grandTotal)}
                    </td>
                    <td className="number_right">
                      {formatPeso(item.amountPaid)}
                    </td>
                    <td>{formatDate(item.datePaid)}</td>
                    <td>{item.preparedByName}</td>
                    <td>{item.orderRef}</td>
                    <td>{item.invoiceRemarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <DisplayPage
          recordsPerPage={recordsPerPage}
          setRecordsPerPage={setRecordsPerPage}
          currentPage={currentPage}
          totalCount={totalCount}
          setCurrentPage={setCurrentPage}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <Modal
        variant="tooltip"
        show={showInvoiceTotalModal}
        onClose={() => setShowInvoiceTotalModal(false)}
        title="Invoice Total"
        position={tooltipPosition}
      >
        <div className="p-3">
          <div className="text-center">
            Total Amount: {formatPeso(selectedInvoiceTotal)}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Billing;
