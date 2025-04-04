import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import ModalCustom from "./ModalCustom";
import Button from "./Button";

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

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

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
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <div className="form-control-plaintext">
                  {clientInfo.clientName}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <div className="form-control-plaintext">
                  {clientInfo.customerName}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <div className="form-control-plaintext">
                  {clientInfo.contact}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Telephone Number</label>
                <div className="form-control-plaintext">{clientInfo.telNo}</div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Fax Number</label>
                <div className="form-control-plaintext">{clientInfo.faxNo}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Cellphone Number</label>
                <div className="form-control-plaintext">{clientInfo.celNo}</div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="form-control-plaintext">{clientInfo.email}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">AR Contact</label>
                <div className="form-control-plaintext">
                  {clientInfo.arContact}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">AR Telephone</label>
                <div className="form-control-plaintext">
                  {clientInfo.arTelNo}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">AR Fax</label>
                <div className="form-control-plaintext">
                  {clientInfo.arFaxNo}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">TIN Number</label>
                <div className="form-control-plaintext">
                  {clientInfo.tinNumber}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Terms</label>
                <div className="form-control-plaintext">{clientInfo.terms}</div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Sales ID</label>
                <div className="form-control-plaintext">
                  {clientInfo.salesId}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Credit Limit</label>
                <div className="form-control-plaintext">
                  {formatCurrency(clientInfo.creditLimit)}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Last Transaction</label>
                <div className="form-control-plaintext">
                  {formatDate(clientInfo.lastTransaction)}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Overdue Amount</label>
                <div className="form-control-plaintext">
                  {formatCurrency(clientInfo.overdue)}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Last Payment Amount</label>
                <div className="form-control-plaintext">
                  {formatCurrency(clientInfo.lastPaymentAmount)}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Last Payment Date</label>
                <div className="form-control-plaintext">
                  {formatDate(clientInfo.lastPaymentDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Status</label>
                <div className="form-control-plaintext">
                  {clientInfo.hold
                    ? "On Hold"
                    : clientInfo.active
                    ? "Active"
                    : "Inactive"}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">Last Updated</label>
                <div className="form-control-plaintext">
                  {formatDate(clientInfo.lastUpdated)}
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-12">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <div
                  className="form-control-plaintext"
                  style={{ minHeight: "100px", whiteSpace: "pre-wrap" }}
                >
                  {clientInfo.notes}
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
