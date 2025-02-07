import axios from "../utils/axiosConfig"; // Import configured axios
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";

const EditCategory = () => {
  const { id } = useParams(); // Get the category ID from the URL
  const [category, setCategory] = useState({
    name: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Fetching category with id:", id); // Debugging log
    // Fetch category data by ID
    axios
      //    .get(`${ServerIP}/auth/employee/" + id)
      //      .get(`${ServerIP}/auth/category/" + id)
      .get(`${ServerIP}/auth/category/${id}`)
      .then((result) => {
        console.log(result); // Log the result to check if data is returned
        if (result.data.Status) {
          setCategory(result.data.Result[0]); // Set the category data
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => console.log("Error fetching category:", err));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Updating category:", category);
    // Update category data
    axios
      .put(`${ServerIP}/auth/category/edit/${id}`, { name: category })
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/category"); // Redirect after successful update
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => console.log("Error updating category:", err));
  };

  const handleCancel = () => {
    navigate("/dashboard/category"); // Navigate to the manage category screen without making any changes
  };

  return (
    <div className="d-flex justify-content-center align-items-center mt-3">
      <div className="p-3 rounded w-50 border">
        <h3 className="text-center">Edit Category</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="categoryName" className="form-label">
              Category Name
            </label>
            <input
              type="text"
              className="form-control rounded-0"
              id="categoryName"
              value={category.name}
              onChange={(e) =>
                setCategory({ ...category, name: e.target.value })
              }
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="cancel" onClick={handleCancel}>
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

export default EditCategory;
