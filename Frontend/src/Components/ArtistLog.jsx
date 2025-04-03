import React, { useState, useEffect } from "react";
import Button from "./UI/Button";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { formatDateTime, formatNumber, formatPeso } from "../utils/orderUtils";
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
        // if (!ordersResponse.data.Result.length) {
        //   setAlert({
        //     show: true,
        //     title: "No Prod Orders",
        //     message: "There are no orders for Artist logging at this time.",
        //     type: "alert",
        //   });
        // }
      }
      console.log("order Response:", ordersResponse.data);
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
    const orderDetail = orders.find((detail) => detail.Id === detailId);
    if (!orderDetail) return;

    const newValue = field === "artistIncentive" ? value : Number(value);

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
      const filtered = prev.filter((item) => item.Id !== detailId);
      const updatedDetail = {
        Id: detailId,
        orderId: orderDetail.orderId,
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

      const hasChanges =
        updatedDetail.artistIncentive !== orderDetail.artistIncentive ||
        updatedDetail.major !== orderDetail.major ||
        updatedDetail.minor !== orderDetail.minor;

      return hasChanges ? [...filtered, updatedDetail] : filtered;
    });
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

      // All validations in one place
      for (const order of changedOrders) {
        // Check artist not empty
        if (!order.artistIncentive || order.artistIncentive.trim() === "") {
          setAlert({
            show: true,
            title: "Validation Error",
            message: "Artist cannot be empty.",
            type: "alert",
          });
          document.getElementById(`artist-select-${order.Id}`)?.focus();
          return;
        }

        // Check major and minor not both zero
        if (
          (order.major === 0 || order.major === "") &&
          (order.minor === 0 || order.minor === "")
        ) {
          setAlert({
            show: true,
            title: "Validation Error",
            message: "Major and minor cannot both be zero.",
            type: "alert",
          });
          document.getElementById(`major-input-${order.Id}`)?.focus();
          return;
        }

        // Check major is positive
        if (order.major < 0) {
          setAlert({
            show: true,
            title: "Validation Error",
            message: "Major must be positive",
            type: "alert",
          });
          document.getElementById(`major-input-${order.Id}`)?.focus();
          return;
        }

        // Check minor is positive
        if (order.minor < 0) {
          setAlert({
            show: true,
            title: "Validation Error",
            message: "Minor must be positive",
            type: "alert",
          });
          document.getElementById(`minor-input-${order.Id}`)?.focus();
          return;
        }

        // Check total doesn't exceed quantity
        const orderDetail = orders.find((detail) => detail.Id === order.Id);
        if (orderDetail && order.major + order.minor > orderDetail.quantity) {
          setAlert({
            show: true,
            title: "Validation Error",
            message: "Major + Minor cannot exceed Quantity",
            type: "alert",
          });
          document.getElementById(`major-input-${order.Id}`)?.focus();
          return;
        }
      }

      // If we get here, all validations passed
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
        setEditedFields({});
        setChangedOrders([]);
        fetchData();
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
                <th aria-label="order-id" className="text-center">
                  JO #
                </th>
                <th aria-label="client" className="text-center">
                  Client
                </th>
                <th aria-label="project" className="text-center">
                  Project
                </th>
                <th aria-label="due-date" className="text-center">
                  Due Date
                </th>
                <th aria-label="production-date" className="text-center">
                  Production Date
                </th>
                <th aria-label="status" className="text-center">
                  Status
                </th>
                <th aria-label="width" className="text-center">
                  Quantity
                </th>
                <th aria-label="width" className="text-center">
                  Width
                </th>
                <th aria-label="height" className="text-center">
                  Height
                </th>
                <th aria-label="unit" className="text-center">
                  Unit
                </th>
                <th aria-label="material" className="text-center">
                  Material
                </th>
                <th aria-label="width" className="text-center">
                  Artist
                </th>
                <th aria-label="major" className="text-center">
                  Major
                </th>
                <th aria-label="minor" className="text-center">
                  Minor
                </th>
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
                      {index === 0
                        ? item.orderId +
                          (item.revision ? `-${item.revision}` : "")
                        : ""}
                    </td>
                    <td className="client-cell">
                      <div>{item.clientName}</div>
                      {item.customerName && (
                        <div className="small text-muted">
                          {item.customerName}
                        </div>
                      )}
                    </td>
                    <td className="project-name" id={`project-${index}`}>
                      {index === 0 ? item.projectName : ""}
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
                    <td className="text-center">
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
                        id={`artist-select-${item.Id}`}
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
                        <option value="">Select</option>
                        {artists.map((artist) => (
                          <option key={artist.id} value={artist.name}>
                            {artist.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="major">
                      <input
                        id={`major-input-${item.Id}`}
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
                        id={`minor-input-${item.Id}`}
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
