import axios from "axios";
import { ServerIP } from "../config";

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: ServerIP,
});

// Add a response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Create a modal dialog
      const modalDiv = document.createElement("div");
      modalDiv.className = "modal fade show";
      modalDiv.style.display = "block";
      modalDiv.style.backgroundColor = "rgba(0,0,0,0.5)";

      modalDiv.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Session Expired</h5>
            </div>
            <div class="modal-body">
              <p>Your session has expired. Please log out and log in again.</p>
            </div>
            <div class="modal-footer">
              <button 
                type="button" 
                class="btn btn-primary" 
                onclick="localStorage.removeItem('token'); window.location.href='/'">
                Logout
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalDiv);

      // Remove any existing modal backdrop
      const existingBackdrop = document.querySelector(".modal-backdrop");
      if (existingBackdrop) {
        existingBackdrop.remove();
      }

      // Add modal backdrop
      const backdropDiv = document.createElement("div");
      backdropDiv.className = "modal-backdrop fade show";
      document.body.appendChild(backdropDiv);
    }
    return Promise.reject(error);
  }
);

// Add a request interceptor to add the auth token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
