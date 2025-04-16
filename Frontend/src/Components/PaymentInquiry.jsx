import React, { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import {
  formatPeso,
  formatDate,
  formatDateTime,
  formatNumberZ,
} from "../utils/orderUtils";
import ModalAlert from "./UI/ModalAlert";
import DisplayPage from "./UI/DisplayPage";
import Pagination from "./UI/Pagination";
import { handleApiError } from "../utils/handleApiError";

function PaymentInquiry() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "payId",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [includeReceived, setIncludeReceived] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [currentPage, recordsPerPage, sortConfig, searchTerm, includeReceived]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${ServerIP}/auth/all-payments?page=${currentPage}&limit=${recordsPerPage}&sortBy=${sortConfig.key}&sortDirection=${sortConfig.direction}&search=${searchTerm}&includeReceived=${includeReceived}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.Status) {
        setPayments(response.data.Result.payments);
        setTotalCount(response.data.Result.total);
        setTotalPages(response.data.Result.totalPages);
      } else {
        throw new Error(response.data.Error);
      }
    } catch (error) {
      handleApiError(error, setAlert);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleIncludeReceivedChange = (e) => {
    setIncludeReceived(e.target.checked);
    setCurrentPage(1);
  };

  // Add this function to group payments by payId
  const groupPaymentsByPayId = (payments) => {
    const grouped = {};
    payments.forEach((payment) => {
      if (!grouped[payment.payId]) {
        grouped[payment.payId] = {
          ...payment,
          orders: [],
        };
      }
      grouped[payment.payId].orders.push({
        orderId: payment.orderId,
        projectName: payment.projectName,
        orderReference: payment.orderReference,
        grandTotal: payment.grandTotal,
        amountPaid: payment.amountPaid,
        orderDate: payment.orderDate,
        invnum: payment.invnum,
        clientName: payment.clientName,
        customerName: payment.customerName,
      });
    });
    return Object.values(grouped);
  };

  return (
    <div className="payment-theme">
      <div className="payment-page-background px-5">
        <div className="payment-header d-flex justify-content-center">
          <h3>Payment Inquiry</h3>
        </div>
        <div className="card-body">
          <div className="d-flex justify-content-between mb-3">
            <div className="d-flex gap-2 align-items-center">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="includeReceived"
                  checked={includeReceived}
                  onChange={handleIncludeReceivedChange}
                />
                <label className="form-check-label" htmlFor="includeReceived">
                  Include received
                </label>
              </div>
            </div>
            <div className="search-container">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by payId, OR#, reference, transacted by..."
                onChange={handleSearch}
                value={searchTerm}
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
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th
                      className="text-center"
                      onClick={() => handleSort("payId")}
                      style={{ cursor: "pointer" }}
                    >
                      Payment ID{" "}
                      {sortConfig.key === "payId" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("payDate")}
                      style={{ cursor: "pointer" }}
                    >
                      Payment Date{" "}
                      {sortConfig.key === "payDate" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("amount")}
                      style={{ cursor: "pointer" }}
                    >
                      Amount{" "}
                      {sortConfig.key === "amount" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("payType")}
                      style={{ cursor: "pointer" }}
                    >
                      Payment Method{" "}
                      {sortConfig.key === "payType" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("ornum")}
                      style={{ cursor: "pointer" }}
                    >
                      OR #{" "}
                      {sortConfig.key === "ornum" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("payReference")}
                      style={{ cursor: "pointer" }}
                    >
                      Reference No.{" "}
                      {sortConfig.key === "payReference" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("transactedBy")}
                      style={{ cursor: "pointer" }}
                    >
                      Transacted By{" "}
                      {sortConfig.key === "transactedBy" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("receivedBy")}
                      style={{ cursor: "pointer" }}
                    >
                      Received By{" "}
                      {sortConfig.key === "receivedBy" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-center"
                      onClick={() => handleSort("receivedDate")}
                      style={{ cursor: "pointer" }}
                    >
                      Received Date{" "}
                      {sortConfig.key === "receivedDate" &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="text-center">Job #</th>
                    <th className="text-center">Customer</th>
                    <th className="text-center">Grand Total</th>
                    <th className="text-center">Amount Paid</th>
                    <th className="text-center">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {groupPaymentsByPayId(payments).map((payment) => (
                    <>
                      {payment.orders.map((order, index) => (
                        <tr key={`${payment.payId}-${order.orderId}`}>
                          {index === 0 && (
                            <>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.payId}
                              </td>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.payDate
                                  ? formatDate(payment.payDate)
                                  : ""}
                              </td>
                              <td
                                className="text-end"
                                rowSpan={payment.orders.length}
                              >
                                {formatPeso(payment.amount)}
                              </td>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.payType}
                              </td>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.ornum}
                              </td>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.payReference || ""}
                              </td>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.transactedBy}
                              </td>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.receivedBy || "-"}
                              </td>
                              <td
                                className="text-center"
                                rowSpan={payment.orders.length}
                              >
                                {payment.receivedDate
                                  ? formatDateTime(payment.receivedDate)
                                  : ""}
                              </td>
                            </>
                          )}
                          <td className="text-center">{order.orderId}</td>
                          <td className="text-center">{order.customerName}</td>
                          <td className="text-end">
                            {formatPeso(order.grandTotal)}
                          </td>
                          <td className="text-end">
                            {formatPeso(order.amountPaid)}
                          </td>
                          <td className="text-end">
                            {formatNumberZ(order.grandTotal - order.amountPaid)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
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
}

export default PaymentInquiry;
