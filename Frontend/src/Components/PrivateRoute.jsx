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
      isProduction: decoded.production === 1,
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
    case "dashsales":
    case "quotes":
    case "print_quote":
    case "orders":
    case "print_order":
    case "reports":
    case "sales-report":
      return permissions.isSales;
    case "soa":
    case "print_soa":
    case "client":
      return (
        permissions.isSales ||
        permissions.isAccounting ||
        permissions.isProduction
      );
    case "prod":
    case "print_production":
    case "prod_print_dr":
    case "prod_print_one_dr":
      return permissions.isProduction;
    case "wiplog":
      return permissions.isProduction || permissions.isOperator;
    case "billing":
      return permissions.isProduction || permissions.isAccounting;
    case "payment":
    case "receive-payment":
    case "payment-inquiry":
    case "invoice-inquiry":
      return permissions.isAccounting;
    case "artistlog":
      return permissions.isArtist;
    case "printlog":
      return permissions.isOperator;
    case "material":
    case "employee":
    case "category":
    case "profile":
    case "check-order-total":
    case "material-usage-report":
      return permissions.categoryId === 1 || permissions.isProduction;
    default:
      return false;
  }
};

// Helper function to get default route based on permissions
const getDefaultRoute = (permissions) => {
  if (permissions.categoryId === 1) return "/dashboard";
  if (permissions.isSales) return "/dashboard/dashsales";
  if (permissions.isAccounting) return "/dashboard/payment";
  if (permissions.isProduction) return "/dashboard/prod";
  if (permissions.isArtist) return "/dashboard/artistlog";
  if (permissions.isOperator) return "/dashboard/printlog";
  return "/"; // fallback to login
};

export default PrivateRoute;
