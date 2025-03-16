import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";
import ModalAlert from "./UI/ModalAlert";

const EditMaterial = () => {
  const [material, setMaterial] = useState({
    material: "",
    description: "",
    sqFtPerHour: "",
    minimumPrice: "",
    fixWidth: "",
    fixHeight: "",
    cost: "",
    unitCost: "",
    noIncentive: false,
    materialType: "",
    machineType: "",
  });
  const [materialTypes, setMaterialTypes] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch material data
    axios
      .get(`${ServerIP}/auth/material/${id}`)
      .then((result) => {
        setMaterial({
          material: result.data.Result.Material,
          description: result.data.Result.Description,
          sqFtPerHour: result.data.Result.SqFtPerHour,
          minimumPrice: result.data.Result.MinimumPrice,
          fixWidth: result.data.Result.FixWidth,
          fixHeight: result.data.Result.FixHeight,
          cost: result.data.Result.Cost,
          unitCost: result.data.Result.UnitCost,
          noIncentive: result.data.Result.NoIncentive,
          materialType: result.data.Result.MaterialType,
          machineType: result.data.Result.MachineType,
        });
      })
      .catch((err) => console.log(err));

    // Fetch unique material types and machine types
    fetchMaterialTypes();
    fetchMachineTypes();
  }, [id]);

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
    console.log("Form submitted with data:", material);

    // Frontend validation
    if (!material.material.trim()) {
      console.log("Validation error: Material is required");
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Material is required",
        type: "alert",
      });
      return;
    }
    if (!material.description.trim()) {
      console.log("Validation error: Description is required");
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Description is required",
        type: "alert",
      });
      return;
    }

    console.log("Attempting to save material with ID:", id);
    axios
      .put(`${ServerIP}/auth/material/edit/${id}`, material)
      .then((result) => {
        console.log("Save result:", result.data);
        if (result.data.Status) {
          navigate("/dashboard/material");
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => {
        console.error("Error saving material:", err);
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to save material. Please try again.",
          type: "alert",
        });
      });
  };

  return (
    <div className="d-flex justify-content-center align-items-center mt-3">
      <div className="p-3 rounded w-50 border">
        <h3 className="text-center">Edit Material</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="material">Material:</label>
            <input
              type="text"
              id="material"
              name="material"
              placeholder="Enter Material"
              className="form-control"
              maxLength={12}
              value={material.material}
              onChange={(e) =>
                setMaterial({ ...material, material: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description">Description:</label>
            <input
              type="text"
              id="description"
              name="description"
              placeholder="Enter Description"
              className="form-control"
              value={material.description}
              onChange={(e) =>
                setMaterial({ ...material, description: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="sqFtPerHour">SqFt Per Hour:</label>
            <input
              type="number"
              id="sqFtPerHour"
              name="sqFtPerHour"
              placeholder="Enter SqFt Per Hour"
              className="form-control"
              value={material.sqFtPerHour}
              onChange={(e) =>
                setMaterial({ ...material, sqFtPerHour: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="minimumPrice">Minimum Price:</label>
            <input
              type="number"
              id="minimumPrice"
              name="minimumPrice"
              placeholder="Enter Minimum Price"
              className="form-control"
              value={material.minimumPrice}
              onChange={(e) =>
                setMaterial({ ...material, minimumPrice: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="fixWidth">Fix Width:</label>
            <input
              type="number"
              id="fixWidth"
              name="fixWidth"
              placeholder="Enter Fix Width"
              className="form-control"
              value={material.fixWidth}
              onChange={(e) =>
                setMaterial({ ...material, fixWidth: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="fixHeight">Fix Height:</label>
            <input
              type="number"
              id="fixHeight"
              name="fixHeight"
              placeholder="Enter Fix Height"
              className="form-control"
              value={material.fixHeight}
              onChange={(e) =>
                setMaterial({ ...material, fixHeight: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="cost">Cost:</label>
            <input
              type="number"
              id="cost"
              name="cost"
              placeholder="Enter Cost"
              className="form-control"
              value={material.cost}
              onChange={(e) =>
                setMaterial({ ...material, cost: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="unitCost" className="me-2">
              Cost per Unit:
            </label>
            <input
              type="checkbox"
              id="unitCost"
              name="unitCost"
              checked={material.unitCost}
              onChange={(e) =>
                setMaterial({ ...material, unitCost: e.target.checked })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="noIncentive" className="me-2">
              No Incentive:
            </label>
            <input
              type="checkbox"
              id="noIncentive"
              name="noIncentive"
              checked={material.noIncentive}
              onChange={(e) =>
                setMaterial({ ...material, noIncentive: e.target.checked })
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="materialType">Material Type:</label>
            <input
              type="text"
              id="materialType"
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
            <label htmlFor="machineType">Machine Type:</label>
            <input
              type="text"
              id="machineType"
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
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default EditMaterial;
