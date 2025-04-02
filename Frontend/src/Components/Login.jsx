import axios from "axios";
import React, { useState } from "react";
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
    setError(null);

    axios
      .post(`${ServerIP}/auth/login`, values)
      .then((result) => {
        if (result.data.loginStatus) {
          const receivedToken = result.data.token;
          const decoded = jwtDecode(receivedToken);
          const userId = decoded.id;

          // ✅ Store token and username early
          localStorage.setItem("token", receivedToken);
          localStorage.setItem("userName", values.name);

          setUserId(userId);
          checkUserProfile(userId);
        } else {
          setError(result.data.Error);
        }
      })
      .catch((err) => {
        console.error("Login error:", err);
        setError("An error occurred during login");
      });
  };

  const checkUserProfile = (userId) => {
    const token = localStorage.getItem("token");

    axios
      .get(`${ServerIP}/auth/get_employee/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (response.data.Status) {
          const userData = response.data.Result[0];

          if (!userData.fullName || userData.fullName.trim() === "") {
            // Require profile update before proceeding
            setShowProfileModal(true);
          } else {
            // Profile already complete — complete login
            completeLogin();
          }
        } else {
          setError("Failed to fetch user profile");
        }
      })
      .catch((err) => {
        console.error("Error fetching user profile:", err);
        setError("An error occurred checking user profile");
      });
  };

  const completeLogin = () => {
    localStorage.setItem("valid", "true");
    navigate("/dashboard");
  };

  const handleProfileUpdate = () => {
    setShowProfileModal(false);
    completeLogin();
  };

  const handleProfileCancel = () => {
    setShowProfileModal(false);
    setUserId(null);
    localStorage.clear(); // Cancel login
    setError("Login cancelled — profile update required.");
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
          userId={userId}
          onUpdate={handleProfileUpdate}
          onClose={handleProfileCancel}
        />
      )}
    </div>
  );
};

export default Login;
