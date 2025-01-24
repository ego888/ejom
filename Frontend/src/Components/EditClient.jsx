import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "./UI/Button";

const EditClient = () => {
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
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch client data
    axios.get("http://localhost:3000/auth/client/" + id).then((result) => {
      if (result.data.Status) {
        setClient({
          ...result.data.Result,
        });
      }
    });

    // Fetch sales employees
    axios
      .get("http://localhost:3000/auth/sales_employees")
      .then((result) => {
        if (result.data.Status) {
          setSalesPeople(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));

    // Fetch payment terms
    axios
      .get("http://localhost:3000/auth/payment_terms")
      .then((result) => {
        if (result.data.Status) {
          setPaymentTerms(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend validation
    if (!client.clientName.trim()) {
      alert("Client Name is required");
      return;
    }
    if (!client.contact.trim()) {
      alert("Contact Person is required");
      return;
    }

    axios
      .put("http://localhost:3000/auth/edit_client/" + id, client)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/client");
        } else {
          alert(result.data.Error);
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
                name="clientName"
                className="form-control"
                value={client.clientName}
                onChange={(e) =>
                  setClient({ ...client, clientName: e.target.value })
                }
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="contact">Contact Person:</label>
              <input
                type="text"
                name="contact"
                className="form-control"
                value={client.contact}
                onChange={(e) =>
                  setClient({ ...client, contact: e.target.value })
                }
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="telNo">Telephone No:</label>
              <input
                type="text"
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
                name="celNo"
                className="form-control"
                value={client.celNo}
                onChange={(e) =>
                  setClient({ ...client, celNo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={client.email}
              onChange={(e) => setClient({ ...client, email: e.target.value })}
            />
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="arContact">AR Contact:</label>
              <input
                type="text"
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
              <select
                name="terms"
                className="form-select"
                value={client.terms || ""}
                onChange={(e) =>
                  setClient({ ...client, terms: e.target.value })
                }
              >
                <option value="">Select Terms</option>
                {paymentTerms.map((term) => (
                  <option key={term.terms} value={term.terms}>
                    {term.terms}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="salesId">Sales Person:</label>
              <select
                name="salesId"
                className="form-select"
                value={client.salesId || ""}
                onChange={(e) =>
                  setClient({ ...client, salesId: e.target.value })
                }
              >
                <option value="">Select Sales Person</option>
                {salesPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="creditLimit">Credit Limit:</label>
              <input
                type="number"
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
    </div>
  );
};

export default EditClient;
