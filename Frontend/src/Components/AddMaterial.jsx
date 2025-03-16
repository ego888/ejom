import axios from "axios";
import React, { useState, useEffect } from "react";
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
    unitCost: false,
    noIncentive: false,
    materialType: "",
    machineType: "",
  });
  const [materialTypes, setMaterialTypes] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const navigate = useNavigate();
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  useEffect(() => {
    // Fetch unique material types and machine types when component mounts
    fetchMaterialTypes();
    fetchMachineTypes();
  }, []);

  // Function to fetch unique material types
  const fetchMaterialTypes = async () => {
    try {
      const response = await axios.get(
        `${ServerIP}/auth/unique-material-types`
      );
      if (response.data.Status) {
        setMaterialTypes(response.data.Result || []);
      }
    } catch (error) {
      console.error("Error fetching material types:", error);
    }
  };

  // Function to fetch unique machine types
  const fetchMachineTypes = async () => {
    try {
      const response = await axios.get(`${ServerIP}/auth/unique-machine-types`);
      if (response.data.Status) {
        setMachineTypes(response.data.Result || []);
      }
    } catch (error) {
      console.error("Error fetching machine types:", error);
    }
  };

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
      unitCost: material.unitCost || false,
      noIncentive: material.noIncentive || false,
      materialType: material.materialType || "",
      machineType: material.machineType || "",
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
          <div className="mb-3">
            <label htmlFor="unit-cost" className="me-2">
              Cost per Unit:
            </label>
            <input
              id="unit-cost"
              type="checkbox"
              name="unitCost"
              onChange={(e) =>
                setMaterial({ ...material, unitCost: e.target.checked })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="material-type">Material Type:</label>
            <input
              id="material-type"
              type="text"
              name="materialType"
              list="materialTypeList"
              placeholder="Enter Material Type"
              className="form-control"
              value={material.materialType}
              onChange={(e) =>
                setMaterial({ ...material, materialType: e.target.value })
              }
              autoComplete="off"
            />
            <datalist id="materialTypeList">
              {materialTypes.map((type, index) => (
                <option key={index} value={type} />
              ))}
            </datalist>
          </div>
          <div className="mb-3">
            <label htmlFor="machine-type">Machine Type:</label>
            <input
              id="machine-type"
              type="text"
              name="machineType"
              list="machineTypeList"
              placeholder="Enter Machine Type"
              className="form-control"
              value={material.machineType}
              onChange={(e) =>
                setMaterial({ ...material, machineType: e.target.value })
              }
              autoComplete="off"
            />
            <datalist id="machineTypeList">
              {machineTypes.map((type, index) => (
                <option key={index} value={type} />
              ))}
            </datalist>
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
