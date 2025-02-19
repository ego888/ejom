import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const permissions = {
      isAdmin: decoded.categoryId === 1,
      isSales: decoded.sales === 1,
      isAccounting: decoded.accounting === 1,
      isArtist: decoded.artist === 1,
      isOperator: decoded.operator === 1,
      isActive: decoded.active === 1,
      categoryId: decoded.categoryId,
    };

    // Get the current route from pathname
    const route = location.pathname.split("/")[2] || "";

    // Check route access
    const hasAccess = checkRouteAccess(route, permissions);

    if (!hasAccess) {
      // Redirect to appropriate route based on permissions
      const redirectTo = getDefaultRoute(permissions);
      return <Navigate to={redirectTo} replace />;
    }

    return children;
  } catch (error) {
    console.error("Token validation error:", error);
    return <Navigate to="/" replace />;
  }
};

// Helper function to check route access
const checkRouteAccess = (route, permissions) => {
  if (permissions.categoryId === 1) return true;
  if (!permissions.isActive) return false;

  switch (route) {
    case "quotes":
    case "orders":
    case "client":
      return permissions.isSales;
    case "prod":
    case "payment":
      return permissions.isAccounting;
    case "artistlog":
      return permissions.isArtist;
    case "printlog":
      return permissions.isOperator;
    case "": // dashboard route
    case "material":
    case "employee":
    case "category":
    case "profile":
      return permissions.categoryId === 1;
    default:
      return false;
  }
};

// Helper function to get default route based on permissions
const getDefaultRoute = (permissions) => {
  if (permissions.categoryId === 1) return "/dashboard";
  if (permissions.isSales) return "/dashboard/quotes";
  if (permissions.isAccounting) return "/dashboard/prod";
  if (permissions.isArtist) return "/dashboard/artistlog";
  if (permissions.isOperator) return "/dashboard/printlog";
  return "/"; // fallback to login
};

export default PrivateRoute;
