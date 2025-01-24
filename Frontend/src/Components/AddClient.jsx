import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";

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

  useEffect(() => {
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
  }, []);

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

    const formData = {
      ...client,
      salesId: client.salesId || null,
      creditLimit: client.creditLimit || 0,
    };

    axios
      .post("http://localhost:3000/auth/add_client", formData)
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
        <h3 className="text-center">Add Client</h3>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="clientName">Client Name:</label>
              <input
                type="text"
                name="clientName"
                className="form-control rounded-0"
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
                className="form-control rounded-0"
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
                className="form-control rounded-0"
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
                className="form-control rounded-0"
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
                className="form-control rounded-0"
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
              className="form-control rounded-0"
              onChange={(e) => setClient({ ...client, email: e.target.value })}
            />
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="arContact">AR Contact:</label>
              <input
                type="text"
                name="arContact"
                className="form-control rounded-0"
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
                className="form-control rounded-0"
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
                className="form-control rounded-0"
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
                className="form-control rounded-0"
                onChange={(e) =>
                  setClient({ ...client, tinNumber: e.target.value })
                }
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="terms">Terms:</label>
              <select
                name="terms"
                className="form-select rounded-0"
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
                className="form-select rounded-0"
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
      </div>
    </div>
  );
};

export default AddClient;
