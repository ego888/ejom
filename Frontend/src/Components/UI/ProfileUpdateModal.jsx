import React, { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";
import { ServerIP } from "../../config";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";
import ModalAlert from "./ModalAlert";

const ProfileUpdateModal = ({ show, onClose, userId, onUpdate }) => {
  const [data, setData] = useState({
    fullName: "",
    email: "",
    cellNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [isNewUser, setIsNewUser] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });

  useEffect(() => {
    if (show && userId) {
      fetchUserData();
    }
  }, [show, userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${ServerIP}/auth/get_employee/${userId}`
      );
      console.log("RESPONSE:", response.data.Status);
      if (response.data.Status) {
        const userData = response.data.Result[0];
        const userFullName = userData.fullName || "";

        // Check if user is new (empty fullName) when data is first loaded
        setIsNewUser(!userFullName.trim());

        setData({
          fullName: userFullName,
          email: userData.email || "",
          cellNumber: userData.cellNumber || "",
          password: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to load user data",
        type: "alert",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!data.fullName.trim()) {
      newErrors.fullName = "Full Name is required";
    }

    if (!data.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      newErrors.email = "Email is invalid";
    }

    // Require password if user was originally a new user (had empty fullName when loaded)
    if (isNewUser && !data.password) {
      newErrors.password = "Password is required for new users";
    } else if (data.password && data.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (
      (isNewUser || data.password) &&
      data.password !== data.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({
      ...data,
      [name]: value,
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare update data - only include password if provided
      const updateData = {
        fullName: data.fullName,
        email: data.email,
        cellNumber: data.cellNumber,
      };

      if (data.password) {
        updateData.password = data.password;
      }

      const response = await axios.put(
        `${ServerIP}/auth/employee/update_profile/${userId}`,
        updateData
      );

      if (response.data.Status) {
        setAlert({
          show: true,
          title: "Success",
          message: "Profile updated successfully",
          type: "alert",
        });
        onUpdate(data.fullName);
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: response.data.Error || "Failed to update profile",
          type: "alert",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to update profile",
        type: "alert",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
    if (alert.title === "Success") {
      onClose();
    }
  };

  return (
    <>
      <Modal
        show={show}
        onClose={onClose}
        title="Update Profile"
        footer={
          <div className="d-flex gap-2 justify-content-end">
            <Button variant="save" onClick={handleSubmit} disabled={loading}>
              Save Changes
            </Button>
            <Button variant="cancel" onClick={onClose}>
              Cancel
            </Button>
          </div>
        }
      >
        {loading && <div className="text-center">Loading...</div>}

        {!loading && (
          <div className="profile-form">
            <div className="mb-3">
              <label htmlFor="fullName" className="form-label">
                Full Name
              </label>
              <input
                type="text"
                className="form-input"
                id="fullName"
                name="fullName"
                value={data.fullName}
                onChange={handleChange}
                required
              />
              {errors.fullName && (
                <div className="invalid-feedback d-block">
                  {errors.fullName}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                className="form-input"
                id="email"
                name="email"
                value={data.email}
                onChange={handleChange}
                required
              />
              {errors.email && (
                <div className="invalid-feedback d-block">{errors.email}</div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="cellNumber" className="form-label">
                Cell Number (use 0999-999-9999 format)
              </label>
              <input
                type="text"
                className="form-input"
                id="cellNumber"
                name="cellNumber"
                value={data.cellNumber}
                onChange={handleChange}
              />
              {errors.cellNumber && (
                <div className="invalid-feedback d-block">
                  {errors.cellNumber}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                {isNewUser
                  ? "New Password (required for first-time setup)"
                  : "New Password (leave blank to keep current)"}
              </label>
              <input
                type="password"
                className="form-input"
                id="password"
                name="password"
                value={data.password}
                onChange={handleChange}
                required={isNewUser}
              />
              {errors.password && (
                <div className="invalid-feedback d-block">
                  {errors.password}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-input"
                id="confirmPassword"
                name="confirmPassword"
                value={data.confirmPassword}
                onChange={handleChange}
                disabled={!data.password}
              />
              {errors.confirmPassword && (
                <div className="invalid-feedback d-block">
                  {errors.confirmPassword}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ModalAlert
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={handleCloseAlert}
      />
    </>
  );
};

export default ProfileUpdateModal;
