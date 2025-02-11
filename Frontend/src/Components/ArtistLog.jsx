import React, { useState, useEffect } from "react";
import Button from "./UI/Button";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { formatDateTime, formatNumber } from "../utils/orderUtils";
import "./ArtistLog.css";
import ModalAlert from "./UI/ModalAlert";

function ArtistLog() {
  const [orders, setOrders] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "info",
  });
  const [editedFields, setEditedFields] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [changedOrders, setChangedOrders] = useState([]);

  // Move fetchData outside useEffect so it can be reused
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      // Fetch orders and artists in parallel
      const [ordersResponse, artistsResponse] = await Promise.all([
        axios.get(`${ServerIP}/auth/orders-details-artistIncentive`),
        axios.get(`${ServerIP}/auth/artists`, config),
      ]);

      if (ordersResponse.data.Status) {
        setOrders(ordersResponse.data.Result);
        if (!ordersResponse.data.Result.length) {
          setAlert({
            show: true,
            title: "No Prod Orders",
            message: "There are no orders for Artist logging at this time.",
            type: "info",
          });
        }
      }

      if (artistsResponse.data.Status) {
        setArtists(artistsResponse.data.Result);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Group orders by orderId (not by order_details.id)
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.orderId]) {
      acc[order.orderId] = [];
    }
    acc[order.orderId].push(order);
    return acc;
  }, {});

  const handleArtistChange = (orderId, artistId) => {
    // Implement the logic to update the artist for the given order
    console.log(`Changing artist for order ${orderId} to ${artistId}`);
  };

  // Modify handleFieldChange to use order_details id
  const handleFieldChange = (detailId, field, value) => {
    // detailId here is od.id (order_details.id)
    const orderDetail = orders.find((detail) => detail.Id === detailId);
    if (!orderDetail) return;

    const newValue = field === "artistIncentive" ? value : Number(value);

    // Validation rules
    const errors = {};

    // Get current or edited values for validation
    const major =
      field === "major"
        ? newValue
        : editedFields[detailId]?.major || orderDetail.major || 0;
    const minor =
      field === "minor"
        ? newValue
        : editedFields[detailId]?.minor || orderDetail.minor || 0;
    const quantity = orderDetail.quantity;

    // Validation checks
    if (field === "major" && newValue < 0) {
      errors.major = "Major must be positive";
    }
    if (field === "minor" && newValue < 0) {
      errors.minor = "Minor must be positive";
    }
    if (major + minor > quantity) {
      errors.total = "Major + Minor cannot exceed Quantity";
    }

    // Update validation errors
    setValidationErrors((prev) => ({
      ...prev,
      [detailId]: errors,
    }));

    // Only proceed if no validation errors
    if (Object.keys(errors).length === 0) {
      // Update editedFields for form values
      setEditedFields((prev) => ({
        ...prev,
        [detailId]: {
          ...prev[detailId],
          [field]: newValue,
        },
      }));

      // Update changedOrders array
      setChangedOrders((prev) => {
        // Remove any existing entry for this detail
        const filtered = prev.filter((item) => item.Id !== detailId);

        // Create new detail entry with latest values
        const updatedDetail = {
          Id: detailId, // This is od.id for updating order_details table
          orderId: orderDetail.orderId, // This is o.orderId for reference
          artistIncentive:
            field === "artistIncentive"
              ? newValue
              : editedFields[detailId]?.artistIncentive ||
                orderDetail.artistIncentive,
          major:
            field === "major"
              ? newValue
              : editedFields[detailId]?.major || orderDetail.major,
          minor:
            field === "minor"
              ? newValue
              : editedFields[detailId]?.minor || orderDetail.minor,
        };

        // Only add to changes if values are different from original
        const hasChanges =
          updatedDetail.artistIncentive !== orderDetail.artistIncentive ||
          updatedDetail.major !== orderDetail.major ||
          updatedDetail.minor !== orderDetail.minor;

        console.log("Updated Detail:", updatedDetail);
        console.log("Original Detail:", orderDetail);
        console.log("Has Changes:", hasChanges);

        return hasChanges ? [...filtered, updatedDetail] : filtered;
      });
    }
  };

  // Modify handleUpdate to use changedOrders array
  const handleUpdate = async () => {
    try {
      console.log("Changed Orders:", changedOrders);
      if (changedOrders.length === 0) {
        setAlert({
          show: true,
          title: "Info",
          message: "No changes to update",
          type: "alert",
        });
        return;
      }

      const response = await axios.put(
        `${ServerIP}/auth/order_details/update_incentives`,
        changedOrders,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.data.Status) {
        setAlert({
          show: true,
          title: "Success",
          message: "Artist incentives updated successfully",
          type: "alert",
        });
        setEditedFields({}); // Clear form values
        setChangedOrders([]); // Clear changes array
        fetchData(); // Refresh data
      } else {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to update artist incentives",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Error updating artist incentives:", err);
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to update artist incentives",
        type: "error",
      });
    }
  };

  return (
    <div className="artist-theme">
      <div className="artist-page-background px-5">
        <div className="artist-header text-center mb-4">
          <h3>Artist Log</h3>
        </div>
        <div className="table-responsive">
          <div className="d-flex mb-3">
            <Button
              variant="add"
              disabled={changedOrders.length === 0}
              onClick={handleUpdate}
              aria-label="Save Changes"
            >
              Save
            </Button>
          </div>
          <table className="table table-striped table-hover">
            <thead>
              <tr className="table-header">
                <th aria-label="order-id">Order ID</th>
                <th aria-label="project">Project</th>
                <th aria-label="client">Client</th>
                <th aria-label="due-date">Due Date</th>
                <th aria-label="production-date">Production Date</th>
                <th aria-label="status">Status</th>
                <th aria-label="qty">Qty</th>
                <th aria-label="width">Width</th>
                <th aria-label="height">Height</th>
                <th aria-label="unit">Unit</th>
                <th aria-label="material">Material</th>
                <th aria-label="artist-incentive">Artist</th>
                <th aria-label="major">Major</th>
                <th aria-label="minor">Minor</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedOrders).map(([orderId, items]) =>
                items.map((item, index) => (
                  <tr
                    key={`${orderId}-${index}`}
                    className="table-row"
                    data-first-row={index === 0 ? "true" : "false"}
                  >
                    <td
                      className="text-center order-id"
                      id={`order-id-${index}`}
                    >
                      {index === 0 ? item.orderId : ""}
                    </td>
                    <td className="project-name" id={`project-${index}`}>
                      {index === 0 ? item.projectName : ""}
                    </td>
                    <td className="client-name" id={`client-${index}`}>
                      {index === 0 ? item.clientName : ""}
                    </td>
                    <td className="due-date" id={`due-datetime-${index}`}>
                      {index === 0 && item.dueDate
                        ? `${new Date(item.dueDate).toLocaleDateString()} ${
                            item.dueTime || ""
                          }`
                        : ""}
                    </td>
                    <td
                      className="production-date"
                      id={`production-date-${index}`}
                    >
                      {index === 0 && item.productionDate
                        ? formatDateTime(item.productionDate)
                        : ""}
                    </td>
                    <td className="status-cell" id={`status-${index}`}>
                      {index === 0 && (
                        <span className={`status-badge ${item.status}`}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="text-center quantity" id={`qty-${index}`}>
                      {item.quantity}
                    </td>
                    <td
                      className="text-center dimensions"
                      id={`width-${index}`}
                    >
                      {item.width}
                    </td>
                    <td
                      className="text-center dimensions"
                      id={`height-${index}`}
                    >
                      {item.height}
                    </td>
                    <td className="text-center unit" id={`unit-${index}`}>
                      {item.unit}
                    </td>
                    <td className="material" id={`material-${index}`}>
                      {item.material}
                    </td>
                    <td className="artist-incentive">
                      <select
                        className={`form-select form-select-sm ${
                          validationErrors[item.Id]?.artist ? "is-invalid" : ""
                        }`}
                        value={
                          editedFields[item.Id]?.artistIncentive ||
                          item.artistIncentive ||
                          ""
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            item.Id,
                            "artistIncentive",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Select Artist</option>
                        {artists.map((artist) => (
                          <option key={artist.id} value={artist.name}>
                            {artist.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="major">
                      <input
                        type="number"
                        min="0"
                        className={`form-control form-control-sm ${
                          validationErrors[item.Id]?.major ||
                          validationErrors[item.Id]?.total
                            ? "is-invalid"
                            : ""
                        }`}
                        value={editedFields[item.Id]?.major || item.major || ""}
                        onChange={(e) =>
                          handleFieldChange(item.Id, "major", e.target.value)
                        }
                      />
                    </td>
                    <td className="minor">
                      <input
                        type="number"
                        min="0"
                        className={`form-control form-control-sm ${
                          validationErrors[item.Id]?.minor ||
                          validationErrors[item.Id]?.total
                            ? "is-invalid"
                            : ""
                        }`}
                        value={editedFields[item.Id]?.minor || item.minor || ""}
                        onChange={(e) =>
                          handleFieldChange(item.Id, "minor", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <ModalAlert
            show={alert.show}
            title={alert.title}
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
          />
        </div>
      </div>
    </div>
  );
}

export default ArtistLog;
