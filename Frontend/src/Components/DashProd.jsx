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

const getOrderSalesValue = (order) => {
  const value = Number(order?.grandTotal ?? order?.totalAmount ?? 0);
  return Number.isFinite(value) ? value : 0;
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
  const [expandedDeliveredClients, setExpandedDeliveredClients] = useState({});
  const [deliveredSort, setDeliveredSort] = useState({
    key: "clientName",
    direction: "asc",
  });

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
            limit: 9999,
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

  const formatCurrency = (value) =>
    (Number(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getDeliveredGroups = (orders) => {
    const grouped = orders.reduce((acc, order) => {
      const clientName = (order?.clientName || "-").trim() || "-";
      if (!acc[clientName]) {
        acc[clientName] = [];
      }
      acc[clientName].push(order);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([clientA], [clientB]) => clientA.localeCompare(clientB))
      .map(([clientName, clientOrders]) => {
        const sortedOrders = [...clientOrders].sort(
          (a, b) => getProductionDateValue(a) - getProductionDateValue(b)
        );
        const validDates = sortedOrders
          .map((order) => getProductionDisplayDate(order))
          .filter(Boolean);

        return {
          clientName,
          orders: sortedOrders,
          totalJO: sortedOrders.length,
          totalSales: sortedOrders.reduce(
            (sum, order) => sum + getOrderSalesValue(order),
            0
          ),
          oldestDate: validDates[0] || null,
          newestDate: validDates[validDates.length - 1] || null,
        };
      });
  };

  const toggleDeliveredClient = (clientName) => {
    setExpandedDeliveredClients((prev) => ({
      ...prev,
      [clientName]: !prev[clientName],
    }));
  };

  const handleDeliveredSort = (key) => {
    setDeliveredSort((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortDeliveredGroups = (groups) => {
    const sorted = [...groups];
    sorted.sort((a, b) => {
      if (deliveredSort.key === "totalJO") {
        return a.totalJO - b.totalJO;
      }
      if (deliveredSort.key === "clientName") {
        return a.clientName.localeCompare(b.clientName);
      }
      if (deliveredSort.key === "dateRange") {
        const oldestDiff =
          (a.oldestDate ? new Date(a.oldestDate).getTime() : Number.MAX_SAFE_INTEGER) -
          (b.oldestDate ? new Date(b.oldestDate).getTime() : Number.MAX_SAFE_INTEGER);
        if (oldestDiff !== 0) return oldestDiff;
        return (
          (a.newestDate ? new Date(a.newestDate).getTime() : Number.MAX_SAFE_INTEGER) -
          (b.newestDate ? new Date(b.newestDate).getTime() : Number.MAX_SAFE_INTEGER)
        );
      }
      return 0;
    });

    return deliveredSort.direction === "desc" ? sorted.reverse() : sorted;
  };

  const getDeliveredSortIndicator = (key) => {
    if (deliveredSort.key !== key) return "";
    return deliveredSort.direction === "asc" ? " ▲" : " ▼";
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
                const deliveredGroups =
                  status === "Delivered"
                    ? sortDeliveredGroups(getDeliveredGroups(orders))
                    : [];
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
                        <div className="table-responsive">
                          <table className="table table-sm align-middle recent-prod-table">
                            <thead>
                              <tr>
                                {status === "Delivered" ? (
                                  <>
                                    <th
                                      scope="col"
                                      role="button"
                                      onClick={() => handleDeliveredSort("totalJO")}
                                    >
                                      JO{getDeliveredSortIndicator("totalJO")}
                                    </th>
                                    <th
                                      scope="col"
                                      role="button"
                                      onClick={() => handleDeliveredSort("clientName")}
                                    >
                                      Client / Total Sales
                                      {getDeliveredSortIndicator("clientName")}
                                    </th>
                                    <th
                                      scope="col"
                                      className="text-end"
                                      role="button"
                                      onClick={() => handleDeliveredSort("dateRange")}
                                    >
                                      Prod Date Range
                                      {getDeliveredSortIndicator("dateRange")}
                                    </th>
                                  </>
                                ) : (
                                  <>
                                    <th scope="col">Order #</th>
                                    <th scope="col">Client / Sales / Project</th>
                                    <th scope="col" className="text-end">
                                      Production Date
                                    </th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {status === "Delivered"
                                ? deliveredGroups.map((group) => {
                                    const isExpanded =
                                      !!expandedDeliveredClients[group.clientName];
                                    return (
                                      <React.Fragment key={group.clientName}>
                                        <tr
                                          role="button"
                                          onClick={() =>
                                            toggleDeliveredClient(group.clientName)
                                          }
                                        >
                                          <td className="fw-semibold text-nowrap">
                                            {group.totalJO}
                                          </td>
                                          <td>
                                            <div className="d-flex justify-content-between align-items-center recent-prod-client">
                                              <span className="text-truncate fw-semibold">
                                                {group.clientName}
                                              </span>
                                              <span className="text-muted small ms-2 text-nowrap">
                                                {formatCurrency(group.totalSales)}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="text-end text-muted small text-nowrap">
                                            {`${formatDate(
                                              group.oldestDate
                                            )} to ${formatDate(group.newestDate)}`}
                                          </td>
                                        </tr>
                                        {isExpanded &&
                                          group.orders.map((production) => {
                                            const orderLink = `/dashboard/prod/view/${production.orderID}`;
                                            return (
                                              <tr key={production.orderID}>
                                                <td>
                                                  <Link
                                                    to={orderLink}
                                                    className="recent-prod-link"
                                                  >
                                                    {production.orderID}
                                                  </Link>
                                                </td>
                                                <td>
                                                  <div className="d-flex justify-content-between align-items-center recent-prod-client">
                                                    <span className="text-truncate">
                                                      {production.salesName || "-"}
                                                    </span>
                                                    <span className="text-muted small ms-2 text-nowrap">
                                                      {formatCurrency(
                                                        getOrderSalesValue(production)
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div className="text-muted small text-truncate recent-prod-project">
                                                    {production.projectName || "-"}
                                                  </div>
                                                </td>
                                                <td className="text-end text-muted small text-nowrap">
                                                  {formatDate(
                                                    getProductionDisplayDate(production)
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                      </React.Fragment>
                                    );
                                  })
                                : orders.map((production) => {
                                    const orderLink = `/dashboard/prod/view/${production.orderID}`;
                                    return (
                                      <tr key={production.orderID}>
                                        <td>
                                          <Link
                                            to={orderLink}
                                            className="recent-prod-link"
                                          >
                                            {production.orderID}
                                          </Link>
                                        </td>
                                        <td>
                                          <div className="d-flex justify-content-between align-items-center recent-prod-client">
                                            <span className="text-truncate">
                                              {production.clientName || "-"}
                                            </span>
                                            <span className="text-muted small ms-2 text-truncate">
                                              {production.salesName || "-"}
                                            </span>
                                          </div>
                                          <div className="text-muted small text-truncate recent-prod-project">
                                            {production.projectName || "-"}
                                          </div>
                                        </td>
                                        <td className="text-end text-muted small text-nowrap">
                                          {formatDate(
                                            getProductionDisplayDate(production)
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                            </tbody>
                          </table>
                        </div>
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
