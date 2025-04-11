import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import Dropdown from "./Dropdown";
import Input from "./Input";
import ModalAlert from "./ModalAlert";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";

function InvoiceModal({ show, onClose, orderId, onSave, grandTotal }) {
  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("0");
  const [invoiceRemarks, setInvoiceRemarks] = useState("");
  const [prefixes, setPrefixes] = useState([]);
  const [isInvoiceNumberManuallyChanged, setIsInvoiceNumberManuallyChanged] =
    useState(false);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });

  useEffect(() => {
    if (show) {
      fetchPrefixes();
      setIsInvoiceNumberManuallyChanged(false);
    }
  }, [show]);

  const fetchPrefixes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/invoice_prefixes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Prefixes API Response:", response.data);

      if (response.data.Status) {
        setPrefixes(response.data.Result);
        console.log("Set prefixes:", response.data.Result);
        // Set default prefix and invoice number if available
        if (response.data.Result.length > 0) {
          const defaultPrefix = response.data.Result[0];
          setInvoicePrefix(defaultPrefix.invoicePrefix);
          console.log("Set default prefix:", defaultPrefix.invoicePrefix);
          // Set default invoice number to lastNumberUsed + 1
          setInvoiceNumber(
            (parseInt(defaultPrefix.lastNumberUsed) + 1).toString()
          );
        }
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to fetch invoice prefixes",
          type: "alert",
        });
      }
    } catch (error) {
      console.error("Error fetching prefixes:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to fetch invoice prefixes",
        type: "alert",
      });
    }
  };

  const handlePrefixChange = (e) => {
    const newPrefix = e.target.value;
    setInvoicePrefix(newPrefix);

    // Only update invoice number if it hasn't been manually changed
    if (!isInvoiceNumberManuallyChanged) {
      const selectedPrefix = prefixes.find(
        (p) => p.invoicePrefix === newPrefix
      );
      if (selectedPrefix) {
        setInvoiceNumber(
          (parseInt(selectedPrefix.lastNumberUsed) + 1).toString()
        );
      }
    }
  };

  const handleInvoiceNumberChange = (e) => {
    setInvoiceNumber(e.target.value);
    setIsInvoiceNumberManuallyChanged(true);
  };

  const handleSave = async () => {
    // Validate fields
    if (!invoicePrefix || !invoiceNumber || !invoiceAmount) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Please fill in all required fields",
        type: "alert",
      });
      return;
    }

    if (parseFloat(invoiceAmount) <= 0) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Invoice amount must be greater than 0",
        type: "alert",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // Check if total invoice amount exceeds order grand total
      const existingInvoicesResponse = await axios.get(
        `${ServerIP}/auth/invoice_total/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Existing invoices response:", existingInvoicesResponse.data);
      let existingTotal = 0;
      if (existingInvoicesResponse.data.Status) {
        existingTotal =
          parseFloat(existingInvoicesResponse.data.Result[0].totalAmount) || 0;
      }

      const newTotal = existingTotal + parseFloat(invoiceAmount);

      console.log("Order ID:", orderId);
      console.log("Existing total:", existingTotal);
      console.log("New total:", newTotal);
      console.log("Grand total:", grandTotal);

      if (newTotal > parseFloat(grandTotal)) {
        setAlert({
          show: true,
          title: "Validation Error",
          message: `Total invoice amount (${newTotal.toFixed(
            2
          )}) exceeds order grand total (${parseFloat(grandTotal).toFixed(2)})`,
          type: "alert",
        });
        return;
      }

      // First check if invoice number exists
      // const checkResponse = await axios.get(`${ServerIP}/auth/check_invoice`, {
      //   params: { invoicePrefix, invoiceNumber },
      //   headers: { Authorization: `Bearer ${token}` },
      // });

      // if (checkResponse.data.Status && checkResponse.data.exists) {
      //   setAlert({
      //     show: true,
      //     title: "Error",
      //     message: "Invoice number already exists",
      //     type: "alert",
      //   });
      //   return;
      // }

      // Save invoice
      const saveResponse = await axios.post(
        `${ServerIP}/auth/save_invoice`,
        {
          orderId,
          invoicePrefix,
          invoiceNumber,
          invoiceAmount,
          invoiceRemarks,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (saveResponse.data.Status) {
        onSave();
        onClose();
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: saveResponse.data.Error || "Failed to save invoice",
          type: "alert",
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to save invoice",
        type: "alert",
      });
    }
  };

  return (
    <>
      <Modal
        show={show}
        onClose={onClose}
        title="Enter Invoice Information"
        footer={
          <div className="d-flex gap-2">
            <Button variant="save" onClick={handleSave}>
              Save
            </Button>
            <Button variant="cancel" onClick={onClose}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="row g-3">
          <div className="col-md-4">
            <div className="d-flex flex-column">
              <label htmlFor="invoicePrefix" className="form-label">
                Invoice Prefix <span className="text-danger">*</span>
              </label>
              <Dropdown
                id="invoicePrefix"
                variant="form"
                value={invoicePrefix}
                onChange={handlePrefixChange}
                options={prefixes}
                labelKey="invoicePrefix"
                valueKey="invoicePrefix"
                placeholder="Select Prefix"
                required
              />
              {console.log("Current prefixes state:", prefixes)}
              {console.log("Current selected prefix:", invoicePrefix)}
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex flex-column">
              <label htmlFor="invoiceNumber" className="form-label">
                Invoice Number <span className="text-danger">*</span>
              </label>
              <Input
                id="invoiceNumber"
                variant="form"
                type="text"
                value={invoiceNumber}
                onChange={handleInvoiceNumberChange}
                placeholder="Enter Invoice Number"
                required
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex flex-column">
              <label htmlFor="invoiceAmount" className="form-label">
                Invoice Amount <span className="text-danger">*</span>
              </label>
              <Input
                id="invoiceAmount"
                variant="form"
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="Enter Invoice Amount"
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="col-12">
            <div className="d-flex flex-column">
              <label htmlFor="invoiceRemarks" className="form-label">
                Remarks
              </label>
              <Input
                id="invoiceRemarks"
                variant="form"
                type="text"
                value={invoiceRemarks}
                onChange={(e) => setInvoiceRemarks(e.target.value)}
                placeholder="Enter Remarks (Optional)"
              />
            </div>
          </div>
        </div>
      </Modal>

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </>
  );
}

export default InvoiceModal;
