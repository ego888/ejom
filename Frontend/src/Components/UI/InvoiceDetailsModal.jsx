import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import { formatNumber } from "../../utils/orderUtils";

function InvoiceDetailsModal({ show, onClose, orderId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show) {
      fetchInvoices();
    }
  }, [show, orderId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/invoices/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        setInvoices(response.data.Result);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Invoice Details"
      size="md"
      closeOnOutsideClick
      closeOnEsc
    >
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center">No invoices found</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th className="text-end">Amount</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <tr key={index}>
                  <td>
                    {invoice.invoicePrefix}
                    {invoice.invoiceNumber}
                  </td>
                  <td className="text-end">
                    {formatNumber(invoice.invoiceAmount)}
                  </td>
                  <td>{invoice.invoiceRemarks || "-"}</td>
                </tr>
              ))}
              <tr className="table-secondary">
                <td>
                  <strong>Total</strong>
                </td>
                <td className="text-end">
                  <strong>
                    {invoices
                      .reduce(
                        (sum, invoice) =>
                          sum + parseFloat(invoice.invoiceAmount),
                        0
                      )
                      .toFixed(2)}
                  </strong>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default InvoiceDetailsModal;
