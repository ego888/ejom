import React, { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const PRODUCTION_STATUSES = ["Prod", "Finished", "Delivered"];

const PRODUCTION_STATUS_LABELS = {
  Prod: "In Production",
  Finished: "Finished",
  Delivered: "Delivered",
};

const createEmptyProductionGroups = () =>
  PRODUCTION_STATUSES.reduce((groups, status) => {
    groups[status] = [];
    return groups;
  }, {});

const getProductionDisplayDate = (order) =>
  order?.productionDate || order?.orderDate || null;

const getProductionDateValue = (order) => {
  const dateString = getProductionDisplayDate(order);
  return dateString ? new Date(dateString).getTime() : Number.MAX_SAFE_INTEGER;
};

const DashProd = () => {
  const [productionStats, setProductionStats] = useState({
    total: 0,
    printed: 0,
    inProduction: 0,
    finished: 0,
    delivered: 0,
    billed: 0,
  });

  const [recentProductions, setRecentProductions] = useState(
    createEmptyProductionGroups()
  );

  useEffect(() => {
    // Fetch dashboard data
    fetchProductionStats();
    fetchRecentProductions();
  }, []);

  const fetchProductionStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${ServerIP}/auth/order_stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.Status) {
        const stats = response.data.Result || {};
        const printed = Number(stats.printed) || 0;
        const inProduction = Number(stats.prod) || 0;
        const finished = Number(stats.finished) || 0;
        const delivered = Number(stats.delivered) || 0;
        const billed = Number(stats.billed) || 0;
        const total = [
          Number(stats.open) || 0,
          printed,
          inProduction,
          finished,
          delivered,
          billed,
        ].reduce((sum, value) => sum + value, 0);

        setProductionStats({
          total,
          printed,
          inProduction,
          finished,
          delivered,
          billed,
        });
      }
    } catch (error) {
      console.error("Error fetching production stats:", error);
    }
  };

  const fetchRecentProductions = async () => {
    try {
      const token = localStorage.getItem("token");
      const requests = PRODUCTION_STATUSES.map((status) =>
        axios.get(`${ServerIP}/auth/orders`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: 1,
            limit: 5,
            statuses: status,
            sortBy: "productionDate",
            sortDirection: "asc",
          },
        })
      );

      const responses = await Promise.all(requests);
      const groupedProductions = createEmptyProductionGroups();

      responses.forEach((response, index) => {
        const status = PRODUCTION_STATUSES[index];
        if (response?.data?.Status) {
          const orders = response.data.Result?.orders || [];
          const normalisedOrders = orders
            .map((order) => ({
              ...order,
              orderID: order.orderID || order.id,
            }))
            .sort(
              (a, b) => getProductionDateValue(a) - getProductionDateValue(b)
            );

          groupedProductions[status] = normalisedOrders;
        }
      });

      setRecentProductions(groupedProductions);
    } catch (error) {
      console.error("Error fetching recent productions:", error);
      setRecentProductions(createEmptyProductionGroups());
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="dashboard-container p-4">
      <h2 className="mb-4">Production Dashboard</h2>

      {/* Production Status Cards */}
      <div className="row g-3 mb-4 justify-content-center">
        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Prod">
            <div className="card-value">{productionStats.inProduction}</div>
            <div className="card-label">In Production</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Finished">
            <div className="card-value">{productionStats.finished}</div>
            <div className="card-label">Finished</div>
            <Link to="/dashboard/prod" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Delivered">
            <div className="card-value">{productionStats.delivered}</div>
            <div className="card-label">Delivered</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge Billed">
            <div className="card-value">{productionStats.billed}</div>
            <div className="card-label">Billed</div>
            <Link to="/dashboard/payment" className="stretched-link" />
          </div>
        </div>

        <div className="col-md-4 col-lg-2">
          <div className="dashboard-card status-badge default">
            <div className="card-value">{productionStats.total}</div>
            <div className="card-label">Total Orders</div>
            <Link to="/dashboard/orders" className="stretched-link" />
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div className="dashboard-section h-100 p-3">
            <h4 className="section-title">Recent Productions</h4>
            <div className="row g-3">
              {PRODUCTION_STATUSES.map((status) => {
                const orders = recentProductions[status] || [];
                return (
                  <div className="col-12 col-lg-4" key={status}>
                    <div className="border rounded p-3 h-100 bg-white">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="fw-semibold">
                          {PRODUCTION_STATUS_LABELS[status]}
                        </span>
                        <span className={`status-badge ${status}`}>{status}</span>
                      </div>
                      {orders.length ? (
                        <ul className="list-unstyled mb-0 recent-prod-list">
                          {orders.map((production, index) => {
                            const isLast = index === orders.length - 1;
                            const itemClass = isLast
                              ? "recent-prod-item small"
                              : "recent-prod-item small pb-2 mb-2 border-bottom";
                            const orderLink = `/dashboard/prod/view/${production.orderID}`;

                            return (
                              <li key={production.orderID} className={itemClass}>
                                <div className="d-flex justify-content-between align-items-start">
                                  <Link to={orderLink}>{production.orderID}</Link>
                                  <div className="text-end small">
                                    <span className="d-block text-muted">
                                      {formatDate(
                                        getProductionDisplayDate(production)
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <div className="fw-semibold text-truncate mt-1 d-flex justify-content-between align-items-center">
                                  <span className="text-truncate">
                                    {production.clientName || "-"}
                                  </span>
                                  <span className="text-muted ms-2 text-truncate">
                                    {production.salesName || "-"}
                                  </span>
                                </div>
                                <div className="text-muted text-truncate">
                                  {production.projectName || "-"}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-muted small mb-0">
                          No orders in this stage
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashProd;
