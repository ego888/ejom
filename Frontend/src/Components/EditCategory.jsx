import axios from "axios";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
      //    .get("http://localhost:3000/auth/employee/" + id)
      //      .get("http://localhost:3000/auth/category/" + id)
      .get(`http://localhost:3000/auth/category/${id}`)
      .then((result) => {
        console.log(result); // Log the result to check if data is returned
        if (result.data.Status) {
          setCategory(result.data.Result[0]); // Set the category data
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log("Error fetching category:", err));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Updating category:", category);
    // Update category data
    axios
      .put("http://localhost:3000/auth/category/edit/" + id, { name: category })
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/category"); // Redirect after successful update
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log("Error updating category:", err));
  };

  const handleCancel = () => {
    navigate("/dashboard/category"); // Navigate to the manage category screen without making any changes
  };

  return (
    <div className="px-5 mt-3">
      <h3>Edit Category</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="categoryName" className="form-label">
            Category Name
          </label>
          <input
            type="text"
            className="form-control"
            id="categoryName"
            value={category.name}
            onChange={(e) => setCategory({ ...category, name: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="btn btn-warning w-48"
          onClick={handleCancel}
        >
          Cancel
        </button>

        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditCategory;
