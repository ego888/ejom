import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import ModalCustom from "./ModalCustom";
import Button from "./Button";
import { formatNumber, formatDate } from "../../utils/orderUtils";
function ViewCustomerInfo({ clientId, show, onClose }) {
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && show) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [show, onClose]);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!clientId) return;

      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${ServerIP}/auth/client/${clientId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.Status) {
          setClientInfo(response.data.Result);
        } else {
          setError(response.data.Error || "Failed to fetch client information");
        }
      } catch (err) {
        setError(err.message || "Failed to fetch client information");
      } finally {
        setLoading(false);
      }
    };

    if (show) {
      fetchClientInfo();
    }
  }, [clientId, show]);

  return (
    <ModalCustom
      show={show}
      onClose={onClose}
      title="Client Information"
      size="lg"
    >
      {loading ? (
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : clientInfo ? (
        <div className="p-3">
          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Client
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.clientName || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Customer Name
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.customerName || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Contact Person
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.contactPerson || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Cellphone Number
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.celNo || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Telephone Number
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.telNo || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Fax Number
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.faxNo || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Email
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.email || ""}
                </div>
              </div>
            </div>
            <div className="col-8">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <div
                  className="form-textarea"
                  style={{ minHeight: "100px", whiteSpace: "pre-wrap" }}
                >
                  {clientInfo.notes}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  AR Contact
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.arContact || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  AR Email
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.arFaxNo || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  AR Telephone
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.arTelNo || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  TIN Number
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.tinNumber || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Terms
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.terms || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Sales
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.salesName || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Credit Limit
                </label>
                <div id="view-client" className="form-input">
                  {formatNumber(clientInfo.creditLimit) || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Overdue Amount
                </label>
                <div id="view-client" className="form-input">
                  {formatNumber(clientInfo.overdue) || 0}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Last Payment Amount
                </label>
                <div id="view-client" className="form-input">
                  {formatNumber(clientInfo.lastPaymentAmount) || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Last Transaction
                </label>
                <div id="view-client" className="form-input">
                  {formatDate(clientInfo.lastTransaction) || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Overdue Date
                </label>
                <div id="view-client" className="form-input">
                  {formatDate(clientInfo.overdue) || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Last Payment Date
                </label>
                <div id="view-client" className="form-input">
                  {formatDate(clientInfo.lastPaymentDate) || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Status
                </label>
                <div id="view-client" className="form-input">
                  {clientInfo.status || ""}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="d-flex flex-column">
                <label htmlFor="view-client" className="form-label">
                  Last Updated
                </label>
                <div id="view-client" className="form-input">
                  {formatDate(clientInfo.lastUpdated) || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <Button variant="cancel" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </ModalCustom>
  );
}

export default ViewCustomerInfo;
