import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

const AddMaterial = () => {
  const [material, setMaterial] = useState({
    Material: "",
    Description: "",
    SqFtPerHour: "",
    MinimumPrice: "",
    FixWidth: "",
    FixHeight: "",
    Cost: "",
    UnitCost: false,
    noIncentive: false,
    MaterialType: "",
    MachineType: "",
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
      const response = await axios.get(`${ServerIP}/auth/material-types`);
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
      const response = await axios.get(`${ServerIP}/auth/machine-types`);
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
    if (!material.Material.trim()) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Material is required",
        type: "alert",
      });
      return;
    }
    if (!material.Description.trim()) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Description is required",
        type: "alert",
      });
      return;
    }

    const formData = {
      Material: material.Material || "",
      Description: material.Description || "",
      SqFtPerHour: material.SqFtPerHour || 0,
      MinimumPrice: material.MinimumPrice || 0,
      FixWidth: material.FixWidth || 0,
      FixHeight: material.FixHeight || 0,
      Cost: material.Cost || 0,
      UnitCost: material.UnitCost || false,
      noIncentive: material.noIncentive || false,
      MaterialType: material.MaterialType || "",
      MachineType: material.MachineType || "",
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
                setMaterial({ ...material, Material: e.target.value })
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
                setMaterial({ ...material, Description: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="sqft-per-hour">SqFt Per Hour:</label>
            <input
              id="sqft-per-hour"
              type="number"
              step="0.01"
              name="sqFtPerHour"
              placeholder="Enter SqFt Per Hour"
              className="form-control"
              value={material.SqFtPerHour === "" ? "" : material.SqFtPerHour}
              onChange={(e) =>
                setMaterial({ ...material, SqFtPerHour: e.target.value })
              }
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
              value={material.MinimumPrice === "" ? "" : material.MinimumPrice}
              onChange={(e) =>
                setMaterial({ ...material, MinimumPrice: e.target.value })
              }
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
              value={material.FixWidth === "" ? "" : material.FixWidth}
              onChange={(e) =>
                setMaterial({ ...material, FixWidth: e.target.value })
              }
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
              value={material.FixHeight === "" ? "" : material.FixHeight}
              onChange={(e) =>
                setMaterial({ ...material, FixHeight: e.target.value })
              }
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
              value={material.Cost === "" ? "" : material.Cost}
              onChange={(e) =>
                setMaterial({ ...material, Cost: e.target.value })
              }
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
                setMaterial({ ...material, UnitCost: e.target.checked })
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
              value={material.MaterialType}
              onChange={(e) =>
                setMaterial({ ...material, MaterialType: e.target.value })
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
              value={material.MachineType}
              onChange={(e) =>
                setMaterial({ ...material, MachineType: e.target.value })
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
