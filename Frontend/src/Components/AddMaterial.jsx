import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";

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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend validation
    if (!material.material.trim()) {
      alert("Material is required");
      return;
    }
    if (!material.description.trim()) {
      alert("Description is required");
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
      .post(`${ServerIP}/auth/add_material`, formData)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/material");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));
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
            <label htmlFor="material">Material:</label>
            <input
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
            <label htmlFor="description">Description:</label>
            <input
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
            <label htmlFor="sqFtPerHour">SqFt Per Hour:</label>
            <input
              type="number"
              name="sqFtPerHour"
              placeholder="Enter SqFt Per Hour"
              className="form-control"
              value={material.sqFtPerHour}
              onChange={handleNumberChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="minimumPrice">Minimum Price:</label>
            <input
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
            <label htmlFor="fixWidth">Fix Width:</label>
            <input
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
            <label htmlFor="fixHeight">Fix Height:</label>
            <input
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
            <label htmlFor="noIncentive" className="me-2">
              No Incentive:
            </label>
            <input
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
      </div>
    </div>
  );
};

export default AddMaterial;
