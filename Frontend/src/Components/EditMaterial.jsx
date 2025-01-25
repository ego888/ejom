import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";

const EditMaterial = () => {
  const [material, setMaterial] = useState({
    material: "",
    description: "",
    sqFtPerHour: "",
    minimumPrice: "",
    fixWidth: "",
    fixHeight: "",
    cost: "",
    noIncentive: false,
  });
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
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
          noIncentive: result.data.Result.NoIncentive,
        });
      })
      .catch((err) => console.log(err));
  }, [id]);

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

    axios
      .put(`${ServerIP}/auth/material/edit/${id}`, material)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/material");
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));
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
              step="0.01"
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
              step="0.01"
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
              step="0.01"
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
              step="0.01"
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
            <label htmlFor="noIncentive" className="me-2">
              No Incentive:
            </label>
            <input
              type="checkbox"
              name="noIncentive"
              checked={material.noIncentive}
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMaterial;
