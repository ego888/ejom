import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

const AddMaterial = () => {
  const [material, setMaterial] = useState({
    material: "",
    description: "",
    sqFtPerHour: 0,
    minimumPrice: 0,
    fixWidth: 0,
    fixHeight: 0,
    cost: 0,
    noIncentive: false,
  });
  const navigate = useNavigate();
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend validation
    if (!material.material.trim()) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Material is required",
        type: "alert",
      });
      return;
    }
    if (!material.description.trim()) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Description is required",
        type: "alert",
      });
      return;
    }

    const formData = {
      ...material,
      sqFtPerHour: material.sqFtPerHour || 0,
      minimumPrice: material.minimumPrice || 0,
      fixWidth: material.fixWidth || 0,
      fixHeight: material.fixHeight || 0,
      cost: material.cost || 0,
    };

    axios
      .post(`${ServerIP}/auth/material/add`, formData)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/material");
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error || "Failed to add material",
            type: "alert",
          });
        }
      })
      .catch((err) => {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to add material",
          type: "alert",
        });
      });
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setMaterial({
      ...material,
      [name]: value === "" ? 0 : parseFloat(value),
    });
  };

  return (
    <div className="d-flex justify-content-center align-items-center mt-3">
      <div className="p-3 rounded w-50 border">
        <h3 className="text-center">Add Material</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="material-name">Material:</label>
            <input
              id="material-name"
              type="text"
              name="material"
              placeholder="Enter Material"
              className="form-control"
              maxLength={12}
              onChange={(e) =>
                setMaterial({ ...material, material: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="material-desc">Description:</label>
            <input
              id="material-desc"
              type="text"
              name="description"
              placeholder="Enter Description"
              className="form-control"
              onChange={(e) =>
                setMaterial({ ...material, description: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="sqft-per-hour">SqFt Per Hour:</label>
            <input
              id="sqft-per-hour"
              type="number"
              name="sqFtPerHour"
              placeholder="Enter SqFt Per Hour"
              className="form-control"
              value={material.sqFtPerHour}
              onChange={handleNumberChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="minimum-price">Minimum Price:</label>
            <input
              id="minimum-price"
              type="number"
              step="0.01"
              name="minimumPrice"
              placeholder="Enter Minimum Price"
              className="form-control"
              value={material.minimumPrice}
              onChange={handleNumberChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="fix-width">Fix Width:</label>
            <input
              id="fix-width"
              type="number"
              step="0.01"
              name="fixWidth"
              placeholder="Enter Fix Width"
              className="form-control"
              value={material.fixWidth}
              onChange={handleNumberChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="fix-height">Fix Height:</label>
            <input
              id="fix-height"
              type="number"
              step="0.01"
              name="fixHeight"
              placeholder="Enter Fix Height"
              className="form-control"
              value={material.fixHeight}
              onChange={handleNumberChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="cost">Cost:</label>
            <input
              id="cost"
              type="number"
              step="0.01"
              name="cost"
              placeholder="Enter Cost"
              className="form-control"
              value={material.cost}
              onChange={handleNumberChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="no-incentive" className="me-2">
              No Incentive:
            </label>
            <input
              id="no-incentive"
              type="checkbox"
              name="noIncentive"
              onChange={(e) =>
                setMaterial({ ...material, noIncentive: e.target.checked })
              }
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="cancel"
              onClick={() => navigate("/dashboard/material")}
            >
              Cancel
            </Button>
            <Button variant="save" type="submit">
              Add Material
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

export default AddMaterial;
