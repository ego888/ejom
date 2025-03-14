import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import { ServerIP } from "../config";

const AddCategory = () => {
  const [category, setCategory] = useState();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post(`${ServerIP}/auth/category/add`, { category })
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/category");
        } else {
          setAlert({
            show: true,
            title: "Error",
            message: result.data.Error,
            type: "alert",
          });
        }
      })
      .catch((err) => console.log(err));
  };
  return (
    <div className="d-flex justify-content-center align-items-center mt-5">
      <div className="p-3 rounded w-25 border">
        <h2>Add Category</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-label">
            <label>Category:</label>
            <input
              id="category-input"
              type="text"
              name="category"
              placeholder="Enter Category"
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button
              variant="cancel"
              onClick={() => navigate("/dashboard/category")}
            >
              Cancel
            </Button>
            <Button variant="save" type="submit">
              Add Category
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategory;
