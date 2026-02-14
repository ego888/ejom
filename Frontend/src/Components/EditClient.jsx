import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";
import {
  formatNumber,
  formatPeso,
  formatDateInputValue,
} from "../utils/orderUtils";

const EditClient = () => {
  const [client, setClient] = useState({
    clientName: "",
    customerName: "",
    contact: "",
    telNo: "",
    faxNo: "",
    celNo: "",
    email: "",
    arContact: "",
    arTelNo: "",
    arFaxNo: "",
    tinNumber: "",
    notes: "",
    terms: "",
    salesId: "",
    creditLimit: 0,
    overdue: "",
    hold: "",
    over30: 0,
    over60: 0,
    over90: 0,
    lastTransaction: "",
    lastPaymentAmount: 0,
    lastPaymentDate: "",
    lastUpdated: "",
    log: "",
  });
  const [salesPeople, setSalesPeople] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });
  const { id } = useParams();
  const navigate = useNavigate();

  const handleCancel = useCallback(() => {
    navigate("/dashboard/client");
  }, [navigate]);

  // Auto-expand textarea function
  const autoExpandTextarea = (textarea) => {
    textarea.style.height = "auto";
    const lineHeight =
      parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;
    const maxRows = 15;
    const maxHeight = lineHeight * maxRows;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + "px";
  };

  useEffect(() => {
    // Check if user is admin
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsAdmin(decoded.categoryId === 1);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }

    // Fetch client data
    axios.get(`${ServerIP}/auth/client/${id}`).then((result) => {
      if (result.data.Status) {
        const clientData = result.data.Result;
        setClient({
          ...clientData,
          // Format dates safely for input fields (avoid timezone drift)
          overdue: clientData.overdue
            ? formatDateInputValue(clientData.overdue)
            : "",
          hold: clientData.hold ? formatDateInputValue(clientData.hold) : "",
          lastTransaction: clientData.lastTransaction
            ? formatDateInputValue(clientData.lastTransaction)
            : "",
          lastPaymentDate: clientData.lastPaymentDate
            ? formatDateInputValue(clientData.lastPaymentDate)
            : "",
          lastUpdated: clientData.lastUpdated
            ? formatDateInputValue(clientData.lastUpdated)
            : "",
        });
      }
    });

    // Fetch sales employees
    axios
      .get(`${ServerIP}/auth/sales_employees`)
      .then((result) => {
        if (result.data.Status) {
          setSalesPeople(result.data.Result);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => console.log(err));

    // Fetch payment terms
    axios
      .get(`${ServerIP}/auth/payment_terms`)
      .then((result) => {
        if (result.data.Status) {
          setPaymentTerms(result.data.Result);
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => console.log(err));
  }, [id]);

  // Auto-expand notes textarea when component loads with data
  useEffect(() => {
    const notesTextarea = document.getElementById("notes");
    if (notesTextarea && client.notes) {
      setTimeout(() => autoExpandTextarea(notesTextarea), 0);
    }
  }, [client.notes]);

  // Auto-expand log textarea when component loads with data
  useEffect(() => {
    const logTextarea = document.getElementById("log");
    if (logTextarea && client.log) {
      setTimeout(() => autoExpandTextarea(logTextarea), 0);
    }
  }, [client.log]);

  useEffect(() => {
    if (alert.show) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel, alert.show]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend validation
    if (!client.clientName.trim()) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Client Name is required",
        type: "alert",
      });
      return;
    }
    if (!client.contact.trim()) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Contact Person is required",
        type: "alert",
      });
      return;
    }

    const clientData = {
      ...client,
      holdDate: client.hold,
    };

    axios
      .put(`${ServerIP}/auth/edit_client/${id}`, clientData)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/client");
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => {
        setAlert({
          show: true,
          title: "Error",
          message: err.message,
          type: "alert",
        });
      });
  };

  return (
    <div className="d-flex justify-content-center align-items-center mt-3">
      <div className="p-3 rounded w-75 border">
        <h3 className="text-center">Edit Client</h3>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="clientName">Client Name:</label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                autoComplete="off"
                className="form-control"
                value={client.clientName}
                onChange={(e) =>
                  setClient({ ...client, clientName: e.target.value })
                }
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="customerName">Customer Name:</label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                autoComplete="off"
                className="form-control"
                value={client.customerName}
                onChange={(e) =>
                  setClient({ ...client, customerName: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="contact">Contact Person:</label>
              <input
                type="text"
                id="contact"
                name="contact"
                className="form-control"
                value={client.contact}
                onChange={(e) =>
                  setClient({ ...client, contact: e.target.value })
                }
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                autoComplete="off"
                value={client.email}
                onChange={(e) =>
                  setClient({ ...client, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="telNo">Telephone No:</label>
              <input
                type="text"
                id="telNo"
                name="telNo"
                className="form-control"
                value={client.telNo}
                onChange={(e) =>
                  setClient({ ...client, telNo: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="faxNo">Fax No:</label>
              <input
                type="text"
                id="faxNo"
                name="faxNo"
                className="form-control"
                value={client.faxNo}
                onChange={(e) =>
                  setClient({ ...client, faxNo: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="celNo">Cell No:</label>
              <input
                type="text"
                id="celNo"
                name="celNo"
                className="form-control"
                value={client.celNo}
                onChange={(e) =>
                  setClient({ ...client, celNo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="arContact">AR Contact:</label>
              <input
                type="text"
                id="arContact"
                name="arContact"
                className="form-control"
                value={client.arContact}
                onChange={(e) =>
                  setClient({ ...client, arContact: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="arTelNo">AR Tel No:</label>
              <input
                type="text"
                id="arTelNo"
                name="arTelNo"
                className="form-control"
                value={client.arTelNo}
                onChange={(e) =>
                  setClient({ ...client, arTelNo: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="arFaxNo">AR Fax No:</label>
              <input
                type="text"
                id="arFaxNo"
                name="arFaxNo"
                className="form-control"
                value={client.arFaxNo}
                onChange={(e) =>
                  setClient({ ...client, arFaxNo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="tinNumber">TIN Number:</label>
              <input
                type="text"
                id="tinNumber"
                name="tinNumber"
                className="form-control"
                value={client.tinNumber}
                onChange={(e) =>
                  setClient({ ...client, tinNumber: e.target.value })
                }
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="terms">Terms:</label>
              <Dropdown
                className="form-control"
                variant="form"
                id="terms"
                name="terms"
                value={client.terms || ""}
                onChange={(e) =>
                  setClient({ ...client, terms: e.target.value })
                }
                options={paymentTerms}
                placeholder="Select Terms"
                labelKey="terms"
                valueKey="terms"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="salesId">Sales Person:</label>
              <Dropdown
                className="form-control"
                variant="form"
                id="salesId"
                name="salesId"
                value={client.salesId || ""}
                onChange={(e) =>
                  setClient({ ...client, salesId: e.target.value })
                }
                options={salesPeople}
                placeholder="Select Sales Person"
                labelKey="name"
                valueKey="id"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="creditLimit">Credit Limit:</label>
              <input
                type="number"
                id="creditLimit"
                name="creditLimit"
                className="form-control"
                value={client.creditLimit}
                onChange={(e) =>
                  setClient({ ...client, creditLimit: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="notes">Notes:</label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              rows="3"
              value={client.notes}
              onChange={(e) => {
                setClient({ ...client, notes: e.target.value });
                autoExpandTextarea(e.target);
              }}
              onInput={(e) => autoExpandTextarea(e.target)}
              style={{
                resize: "none",
                overflow: "hidden",
              }}
            ></textarea>
          </div>

          <div className="row">
            <div className="col-md-3 mb-3">
              <label htmlFor="overdue">Overdue Date:</label>
              <input
                id="overdue"
                type="date"
                name="overdue"
                className="form-control rounded-0"
                value={client.overdue || ""}
                readOnly
                tabIndex="-1"
              />
            </div>
            <div className="col-md-3 mb-3">
              <label htmlFor="hold">Hold Date:</label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <input
                  id="hold"
                  type="date"
                  name="hold"
                  className="form-control rounded-0"
                  value={client.hold || ""}
                  onChange={(e) =>
                    setClient({ ...client, hold: e.target.value })
                  }
                  readOnly={!isAdmin}
                  tabIndex={!isAdmin ? "-1" : "0"}
                  style={{ flex: 1 }}
                />
                {isAdmin && client.hold && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    title="Clear Hold Date"
                    onClick={() => setClient({ ...client, hold: "" })}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "1rem",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-2 mb-3">
              <label htmlFor="over30">Over 30:</label>
              <input
                id="over30"
                type="text"
                name="over30"
                className="form-control rounded-0"
                value={formatPeso(client.over30) || "₱0.00"}
                readOnly
                tabIndex="-1"
              />
            </div>
            <div className="col-md-2 mb-3">
              <label htmlFor="over60">Over 60:</label>
              <input
                id="over60"
                type="text"
                name="over60"
                className="form-control rounded-0"
                value={formatPeso(client.over60) || "₱0.00"}
                readOnly
                tabIndex="-1"
              />
            </div>
            <div className="col-md-2 mb-3">
              <label htmlFor="over90">Over 90:</label>
              <input
                id="over90"
                type="text"
                name="over90"
                className="form-control rounded-0"
                value={formatPeso(client.over90) || "₱0.00"}
                readOnly
                tabIndex="-1"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-3 mb-3">
              <label htmlFor="last-transaction">Last Transaction:</label>
              <input
                id="last-transaction"
                type="date"
                name="lastTransaction"
                className="form-control rounded-0"
                value={client.lastTransaction || ""}
                readOnly
                tabIndex="-1"
              />
            </div>
            <div className="col-md-3 mb-3">
              <label htmlFor="last-payment-amount">Last Payment Amount:</label>
              <input
                id="last-payment-amount"
                type="text"
                name="lastPaymentAmount"
                className="form-control rounded-0"
                value={formatPeso(client.lastPaymentAmount) || "₱0.00"}
                readOnly
                tabIndex="-1"
              />
            </div>
            <div className="col-md-3 mb-3">
              <label htmlFor="last-payment-date">Last Payment Date:</label>
              <input
                id="last-payment-date"
                type="date"
                name="lastPaymentDate"
                className="form-control rounded-0"
                value={client.lastPaymentDate || ""}
                readOnly
                tabIndex="-1"
              />
            </div>
            <div className="col-md-3 mb-3">
              <label htmlFor="last-updated">Last Updated:</label>
              <input
                id="last-updated"
                type="date"
                name="lastUpdated"
                className="form-control rounded-0"
                value={client.lastUpdated || ""}
                readOnly
                tabIndex="-1"
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="log">Log:</label>
            <textarea
              id="log"
              name="log"
              className="form-control"
              value={client.log || ""}
              readOnly
              tabIndex="-1"
              style={{
                resize: "none",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                backgroundColor: "#f8f9fa",
                minHeight: "100px",
              }}
            ></textarea>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="cancel"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button variant="save" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
        onConfirm={() => {
          if (alert.onConfirm) {
            alert.onConfirm();
          }
          setAlert((prev) => ({ ...prev, show: false }));
        }}
      />
    </div>
  );
};

export default EditClient;
