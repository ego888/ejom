import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

const AddClient = () => {
  const [client, setClient] = useState({
    clientName: "",
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
  });
  const [salesPeople, setSalesPeople] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const navigate = useNavigate();
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  useEffect(() => {
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
  }, []);

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

    const formData = {
      ...client,
      salesId: client.salesId || null,
      creditLimit: client.creditLimit || 0,
    };

    axios
      .post(`${ServerIP}/auth/client/add`, formData)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/client");
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error || "Failed to add client",
            type: "alert",
          });
        }
      })
      .catch((err) => {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to add client",
          type: "alert",
        });
      });
  };

  return (
    <div className="d-flex justify-content-center align-items-center mt-3">
      <div className="p-3 rounded w-75 border">
        <h3 className="text-center">Add Client</h3>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="client-name">Client Name:</label>
              <input
                id="client-name"
                type="text"
                name="clientName"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, clientName: e.target.value })
                }
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="contact-person">Contact Person:</label>
              <input
                id="contact-person"
                type="text"
                name="contact"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, contact: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="tel-number">Telephone No:</label>
              <input
                id="tel-number"
                type="text"
                name="telNo"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, telNo: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="fax-number">Fax No:</label>
              <input
                id="fax-number"
                type="text"
                name="faxNo"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, faxNo: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="cell-number">Cell No:</label>
              <input
                id="cell-number"
                type="text"
                name="celNo"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, celNo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="tin-number">TIN Number:</label>
              <input
                id="tin-number"
                type="text"
                name="tinNumber"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, tinNumber: e.target.value })
                }
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="payment-terms">Terms:</label>
              <Dropdown
                variant="form"
                id="payment-terms"
                name="terms"
                value={client.terms}
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

          <div className="mb-3">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-control rounded-0"
              onChange={(e) => setClient({ ...client, email: e.target.value })}
              autoComplete="email"
            />
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="ar-contact">AR Contact:</label>
              <input
                id="ar-contact"
                type="text"
                name="arContact"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, arContact: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="ar-tel">AR Tel No:</label>
              <input
                id="ar-tel"
                type="text"
                name="arTelNo"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, arTelNo: e.target.value })
                }
              />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="ar-fax">AR Fax No:</label>
              <input
                id="ar-fax"
                type="text"
                name="arFaxNo"
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, arFaxNo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="salesId">Sales Person:</label>
              <Dropdown
                variant="form"
                id="salesId"
                name="salesId"
                value={client.salesId}
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
              <label htmlFor="credit-limit">Credit Limit:</label>
              <input
                id="credit-limit"
                type="number"
                name="creditLimit"
                className="form-control rounded-0"
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
              className="form-control rounded-0"
              rows="3"
              onChange={(e) => setClient({ ...client, notes: e.target.value })}
            ></textarea>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="cancel"
              onClick={() => navigate("/dashboard/client")}
            >
              Cancel
            </Button>
            <Button variant="save" type="submit">
              Add Client
            </Button>
          </div>
        </form>
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
    </div>
  );
};

export default AddClient;
