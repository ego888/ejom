import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

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
  });
  const [salesPeople, setSalesPeople] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch client data
    axios.get(`${ServerIP}/auth/client/${id}`).then((result) => {
      if (result.data.Status) {
        setClient({
          ...result.data.Result,
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

    axios
      .put(`${ServerIP}/auth/edit_client/${id}`, client)
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
      .catch((err) => console.log(err));
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
                className={"form-input"}
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
                className={"form-input"}
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
              value={client.notes}
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
