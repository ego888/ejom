import axios from "axios";
import React, { useState } from "react";
//import "./style.css";
import { useNavigate } from "react-router-dom";
import { ServerIP } from "../config";
import { jwtDecode } from "jwt-decode";
import ProfileUpdateModal from "./UI/ProfileUpdateModal";

const Login = () => {
  const [values, setValues] = useState({
    name: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Attempting login...", ServerIP);
    axios
      .post(`${ServerIP}/auth/login`, values)
      .then((result) => {
        console.log("Login response:", result.data);
        if (result.data.loginStatus) {
          console.log("VALUES:", values);
          const token = result.data.token;
          localStorage.setItem("valid", "true");
          localStorage.setItem("token", token);
          localStorage.setItem("userName", values.name);

          // Get user ID from token
          const decoded = jwtDecode(token);
          const userId = decoded.id;
          setUserId(userId);

          // Check if user has fullName
          checkUserProfile(userId, token);
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

  const checkUserProfile = (userId, token) => {
    axios
      .get(`${ServerIP}/auth/get_employee/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (response.data.Status) {
          const userData = response.data.Result[0];

          // Check if fullName is empty
          if (!userData.fullName || userData.fullName.trim() === "") {
            setShowProfileModal(true);
          } else {
            // Navigate to dashboard if fullName exists
            console.log("Login successful, navigating to dashboard...");
            navigate("/dashboard");
          }
        } else {
          console.log("Failed to fetch user data:", response.data.Error);
          navigate("/dashboard");
        }
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
        navigate("/dashboard");
      });
  };

  const handleProfileUpdate = (updatedName) => {
    console.log("Profile updated, navigating to dashboard...");
    navigate("/dashboard");
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 loginPage">
      <div className="p-3 rounded-3 w-25 border loginForm">
        <h2 className="text-center">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name">
              <strong>Username: </strong>
            </label>
            <input
              type="text"
              name="name"
              autoComplete="off"
              placeholder="Enter Username"
              className="login-input rounded-2"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password">
              <strong>Password: </strong>
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              className="login-input rounded-2"
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
            />
          </div>
          <button className="btn btn-success w-100 rounded-2 mb-2">
            Log in
          </button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>
      </div>

      {showProfileModal && userId && (
        <ProfileUpdateModal
          show={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            navigate("/dashboard");
          }}
          userId={userId}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Login;
