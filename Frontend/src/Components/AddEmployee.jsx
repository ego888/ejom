import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./UI/Button";
import Dropdown from "./UI/Dropdown";
import { ServerIP } from "../config";

const AddEmployee = () => {
  const [employee, setEmployee] = useState({
    name: "",
    email: "",
    password: "",
    salary: "",
    address: "",
    category_id: 1,
    image: "",
    active: true,
    sales: false,
    accounting: false,
    artist: false,
    production: false,
    operator: false,
  });
  const [category, setCategory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${ServerIP}/auth/category`)
      .then((result) => {
        if (result.data.Status) {
          setCategory(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", employee.name);
    formData.append("email", employee.email);
    formData.append("password", employee.password);
    formData.append("salary", employee.salary);
    formData.append("address", employee.address);
    formData.append("category_id", employee.category_id);
    formData.append("image", employee.image); // Image handling using FormData
    formData.append("active", employee.active);
    formData.append("sales", employee.sales);
    formData.append("accounting", employee.accounting);
    formData.append("artist", employee.artist);
    formData.append("production", employee.production);
    formData.append("operator", employee.operator);

    // Sending the formData via POST request
    axios
      .post(`${ServerIP}/auth/employee/add`, formData)
      .then((result) => {
        if (result.data.Status) {
          navigate("/dashboard/employee"); // Redirect after successful employee creation
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));
  };

  const handleCancel = () => {
    navigate("/dashboard/employee"); // Navigate back without saving
  };
  return (
    <div className="d-flex justify-content-center align-items-center mt-3">
      <div className="p-3 rounded w-50 border">
        <h3 className="text-center">Add Employee</h3>
        <form className="row g-1" onSubmit={handleSubmit}>
          <div className="col-12">
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              type="text"
              name="name"
              className="form-control rounded-0"
              placeholder="Enter Name"
              onChange={(e) =>
                setEmployee({ ...employee, name: e.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              name="email"
              className="form-control rounded-0"
              placeholder="Enter Email"
              autoComplete="off"
              onChange={(e) =>
                setEmployee({ ...employee, email: e.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              name="password"
              className="form-control rounded-0"
              placeholder="Enter Password"
              onChange={(e) =>
                setEmployee({ ...employee, password: e.target.value })
              }
            />
            <label htmlFor="salary" className="form-label">
              Salary
            </label>
            <input
              type="text"
              name="salary"
              className="form-control rounded-0"
              placeholder="Enter Salary"
              autoComplete="off"
              onChange={(e) =>
                setEmployee({ ...employee, salary: e.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="address" className="form-label">
              Address
            </label>
            <input
              type="text"
              name="address"
              className="form-control rounded-0"
              placeholder="1234 Main St"
              autoComplete="off"
              onChange={(e) =>
                setEmployee({ ...employee, address: e.target.value })
              }
            />
          </div>
          <div className="col-12">
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <Dropdown
              variant="form"
              id="category"
              name="category"
              value={employee.category_id || ""}
              onChange={(e) =>
                setEmployee({
                  ...employee,
                  category_id: parseInt(e.target.value),
                })
              }
              options={category}
              placeholder="Select Category"
              labelKey="name"
              valueKey="id"
            />
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="active"
                checked={employee.active}
                onChange={(e) =>
                  setEmployee({ ...employee, active: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="active">
                Active
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="sales"
                checked={employee.sales}
                onChange={(e) =>
                  setEmployee({ ...employee, sales: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="sales">
                Sales
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="accounting"
                checked={employee.accounting}
                onChange={(e) =>
                  setEmployee({ ...employee, accounting: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="accounting">
                Accounting
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="artist"
                checked={employee.artist}
                onChange={(e) =>
                  setEmployee({ ...employee, artist: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="artist">
                Artist
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="production"
                checked={employee.production}
                onChange={(e) =>
                  setEmployee({ ...employee, production: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="production">
                Production
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="operator"
                checked={employee.operator}
                onChange={(e) =>
                  setEmployee({ ...employee, operator: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="operator">
                Operator
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="admin"
                checked={employee.admin}
                onChange={(e) =>
                  setEmployee({ ...employee, admin: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="admin">
                Admin
              </label>
            </div>
          </div>
          <div className="col-12 mb-3">
            <label htmlFor="image" className="form-label">
              Select Image
            </label>
            <input
              type="file"
              name="image"
              className="form-control rounded-0"
              onChange={(e) =>
                setEmployee({ ...employee, image: e.target.files[0] })
              }
            />
          </div>
          <div className="col-12 d-flex justify-content-end gap-2">
            <Button
              variant="cancel"
              onClick={() => navigate("/dashboard/employee")}
            >
              Cancel
            </Button>
            <Button variant="save" type="submit">
              Add Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;
