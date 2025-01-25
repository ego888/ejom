import axios from "axios";
import React, { useState } from "react";
import "./style.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [values, setValues] = useState({
    name: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Attempting login...");
    axios
      .post("http://localhost:3000/auth/login", values)
      .then((result) => {
        console.log("Login response:", result.data);
        if (result.data.loginStatus) {
          localStorage.setItem("valid", "true");
          localStorage.setItem("token", result.data.token);
          console.log("Login successful, navigating to dashboard...");
          navigate("/dashboard");
        } else {
          console.log("Login failed:", result.data.Error);
          setError(result.data.Error);
        }
      })
      .catch((err) => {
        console.error("Login error:", err);
        setError("An error occurred during login");
      });
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 loginPage">
      <div className="p-3 rounded w-25 border loginForm">
        <h2 className="text-center">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name">
              <strong>Username:</strong>
            </label>
            <input
              type="text"
              name="name"
              autoComplete="off"
              placeholder="Enter Username"
              className="form-control rounded-0"
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password">
              <strong>Password:</strong>
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              className="form-control rounded-0"
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
            />
          </div>
          <button className="btn btn-success w-100 rounded-0 mb-2">
            Log in
          </button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default Login;
