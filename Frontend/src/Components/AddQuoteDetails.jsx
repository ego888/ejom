import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import {
  validateDetail,
  calculateArea,
  calculatePrice,
  calculateAmount,
  formatNumber,
  handleApiError,
  calculateTotals,
  calculatePerSqFt,
  calculatePrintHrs,
} from "../utils/orderUtils";
import { ServerIP } from "../config";

function AddQuoteDetails({ quoteId, onDetailAdded }) {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState({});
  const [nextDisplayOrder, setNextDisplayOrder] = useState(5);

  const [detail, setDetail] = useState({
    quoteId: quoteId,
    displayOrder: 5,
    quantity: "",
    width: "",
    height: "",
    unit: "",
    material: "",
    itemDescription: "",
    unitPrice: "",
    discount: "",
    amount: "",
    squareFeet: "",
    materialUsage: "",
    printHours: "",
    perSqFt: "",
  });

  const getNextDisplayOrder = async () => {
    try {
      const response = await axios.get(
        `${ServerIP}/auth/next_display_quote/${quoteId}`
      );

      if (response.data.Status) {
        const nextOrder = response.data.Result;
        return nextOrder;
      }
      return 5;
    } catch (error) {
      return 5;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      axios.get(`${ServerIP}/auth/units`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${ServerIP}/auth/materials`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      getNextDisplayOrder(),
    ])
      .then(([unitsRes, materialsRes, nextOrder]) => {
        if (unitsRes.data.Status) {
          setUnits(unitsRes.data.Result);
        }
        if (materialsRes.data.Status) {
          setMaterials(materialsRes.data.Result);
        }
        setNextDisplayOrder(nextOrder);
        setDetail((prev) => ({
          ...prev,
          displayOrder: nextOrder,
        }));
      })
      .catch((err) => handleApiError(err, navigate));
  }, [quoteId, navigate]);

  const handleInputChange = (field, value) => {
    setDetail((prev) => {
      const updatedDetail = { ...prev, [field]: value };

      // Calculate area when width, height, unit, or quantity changes
      if (["width", "height", "unit", "quantity"].includes(field)) {
        if (updatedDetail.width && updatedDetail.height && updatedDetail.unit) {
          const area = calculateArea(
            updatedDetail.width,
            updatedDetail.height,
            updatedDetail.unit,
            updatedDetail.quantity || 1
          );
          updatedDetail.squareFeet = area.squareFeet;
          updatedDetail.materialUsage = area.materialUsage;

          // If we have perSqFt, calculate price and amount
          if (updatedDetail.perSqFt) {
            const price = calculatePrice(
              updatedDetail.squareFeet,
              updatedDetail.perSqFt
            );
            updatedDetail.unitPrice = price.toFixed(2);

            const amount = calculateAmount(
              price,
              updatedDetail.discount || 0,
              updatedDetail.quantity || 1
            );
            updatedDetail.amount = amount.toFixed(2);
          }
        }
      }

      // When unit price changes
      if (field === "unitPrice") {
        if (updatedDetail.squareFeet) {
          const perSqFt = calculatePerSqFt(value, updatedDetail.squareFeet);
          updatedDetail.perSqFt = perSqFt.toFixed(2);
        }

        const amount = calculateAmount(
          value,
          updatedDetail.discount || 0,
          updatedDetail.quantity || 1
        );
        updatedDetail.amount = amount.toFixed(2);
      }

      // When perSqFt changes
      if (field === "perSqFt") {
        if (updatedDetail.squareFeet) {
          const price = calculatePrice(updatedDetail.squareFeet, value);
          updatedDetail.unitPrice = price.toFixed(2);

          const amount = calculateAmount(
            price,
            updatedDetail.discount || 0,
            updatedDetail.quantity || 1
          );
          updatedDetail.amount = amount.toFixed(2);
        }
      }

      // When discount changes
      if (field === "discount") {
        if (updatedDetail.unitPrice && updatedDetail.quantity) {
          const amount = calculateAmount(
            updatedDetail.unitPrice,
            value || 0,
            updatedDetail.quantity
          );
          updatedDetail.amount = amount.toFixed(2);
        }
      }

      return updatedDetail;
    });

    // Clear error for the field if it exists
    if (error[field]) {
      setError((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation 1: Check if at least one field is filled
    const isAllEmpty =
      !detail.quantity &&
      !detail.width &&
      !detail.height &&
      !detail.unit &&
      !detail.material &&
      !detail.itemDescription &&
      !detail.unitPrice &&
      !detail.discount;

    if (isAllEmpty) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Please fill at least one field",
        type: "alert",
      });
      return;
    }

    // Validation 2: If width or height exists, validate required fields
    if (detail.width || detail.height) {
      if (!detail.width || !detail.height || !detail.unit || !detail.material) {
        setAlert({
          show: true,
          title: "Error",
          message:
            "When entering dimensions, Width, Height, Unit, and Material are required",
          type: "alert",
        });
        return;
      }
    }

    try {
      const nextOrder = await getNextDisplayOrder();

      if (!nextOrder) {
        console.error("Failed to get next display order");
        return;
      }

      // Calculate area
      const area = calculateArea(
        detail.width,
        detail.height,
        detail.unit,
        detail.quantity
      );

      // Calculate price and amount
      const price = calculatePrice(area.squareFeet, detail.perSqFt);
      const amount = calculateAmount(price, detail.discount, detail.quantity);

      // Calculate print hours
      const printHrs = calculatePrintHrs(
        area.squareFeet,
        detail.quantity,
        detail.material,
        materials
      );

      console.log("Calculated values:", {
        area,
        price,
        amount,
        printHrs,
        detail,
      });

      const dataToSend = {
        quoteId,
        displayOrder: nextOrder,
        quantity: detail.quantity || 0,
        width: detail.width || 0,
        height: detail.height || 0,
        unit: detail.unit || "",
        material: detail.material || "",
        itemDescription: detail.itemDescription || "",
        unitPrice: price.toFixed(2),
        discount: detail.discount || 0,
        amount: amount.toFixed(2),
        squareFeet: area.squareFeet,
        materialUsage: area.materialUsage,
        printHours: printHrs,
        perSqFt: detail.perSqFt || 0,
      };

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${ServerIP}/auth/add_quote_detail`,
        dataToSend,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.Status) {
        console.log("Quote detail added successfully");
        onDetailAdded(quoteId);
        const nextDisplayOrder = await getNextDisplayOrder();
        setNextDisplayOrder(nextDisplayOrder);
        resetForm();
      } else {
        console.error("Failed to add quote detail:", response.data.Error);
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to add quote detail: " + response.data.Error,
          type: "alert",
        });
      }
    } catch (error) {
      console.error("Error submitting quote detail:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to add quote detail: " + error.message,
        type: "alert",
      });
    }
  };

  const resetForm = () => {
    setDetail({
      quoteId: quoteId,
      displayOrder: 5,
      quantity: "",
      width: "",
      height: "",
      unit: "",
      material: "",
      itemDescription: "",
      unitPrice: "",
      discount: "",
      amount: "",
      squareFeet: "",
      materialUsage: "",
      printHours: "",
      perSqFt: "",
    });
    setNextDisplayOrder(5);
    setError({});
  };

  return (
    <div className="quote-details-form">
      <form onSubmit={handleSubmit} className="row g-2">
        <div className="col-1">
          <label className="form-label">Qty</label>
          <input
            type="number"
            step="0.01"
            className={`form-control form-control-sm ${
              error.quantity ? "is-invalid" : ""
            }`}
            value={detail.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
          />
          {error.quantity && (
            <div className="invalid-feedback">Quantity is required</div>
          )}
        </div>
        <div className="col-1">
          <label className="form-label">Width</label>
          <input
            type="number"
            step="0.01"
            className={`form-control form-control-sm ${
              error.width ? "is-invalid" : ""
            }`}
            value={detail.width}
            onChange={(e) => handleInputChange("width", e.target.value)}
          />
          {error.width && (
            <div className="invalid-feedback">Width is required</div>
          )}
        </div>
        <div className="col-1">
          <label className="form-label">Height</label>
          <input
            type="number"
            step="0.01"
            className={`form-control form-control-sm ${
              error.height ? "is-invalid" : ""
            }`}
            value={detail.height}
            onChange={(e) => handleInputChange("height", e.target.value)}
          />
          {error.height && (
            <div className="invalid-feedback">Height is required</div>
          )}
        </div>
        <div className="col-1">
          <label className="form-label">Unit</label>
          <Dropdown
            variant="form-sm"
            value={detail.unit}
            onChange={(e) => handleInputChange("unit", e.target.value)}
            options={units}
            error={error.unit}
            required
            labelKey="unit"
            valueKey="unit"
          />
        </div>
        <div className="col-2">
          <label className="form-label">Material</label>
          <Dropdown
            variant="form-sm"
            value={detail.material}
            onChange={(e) => handleInputChange("material", e.target.value)}
            options={materials}
            error={error.material}
            required
            labelKey="Material"
            valueKey="Material"
          />
        </div>
        <div className="col-1">
          <label className="form-label">Per SqFt</label>
          <input
            type="number"
            step="0.01"
            className="form-control form-control-sm"
            value={detail.perSqFt}
            onChange={(e) => handleInputChange("perSqFt", e.target.value)}
          />
        </div>
        <div className="col-2">
          <label className="form-label">Description</label>
          <input
            type="text"
            maxLength="20"
            className="form-control form-control-sm"
            value={detail.itemDescription}
            onChange={(e) =>
              handleInputChange("itemDescription", e.target.value)
            }
          />
        </div>
        <div className="col-1">
          <label className="form-label">Price</label>
          <input
            type="number"
            step="0.01"
            className={`form-control form-control-sm ${
              error.unitPrice ? "is-invalid" : ""
            }`}
            value={detail.unitPrice}
            onChange={(e) => handleInputChange("unitPrice", e.target.value)}
          />
          {error.unitPrice && (
            <div className="invalid-feedback">Price is required</div>
          )}
        </div>
        <div className="col-1">
          <label className="form-label">Disc%</label>
          <input
            type="number"
            step="0.01"
            className="form-control form-control-sm"
            value={detail.discount}
            onChange={(e) => handleInputChange("discount", e.target.value)}
          />
        </div>
        <div className="col-1">
          <label className="form-label">Amount</label>
          <input
            type="number"
            step="0.01"
            className="form-control form-control-sm"
            value={detail.amount}
            readOnly
          />
        </div>
        <div className="col-12 mt-3">
          <Button variant="save" type="submit">
            Add Detail
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddQuoteDetails;
