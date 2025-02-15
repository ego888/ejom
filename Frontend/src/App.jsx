import "./Components/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./Components/Login";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Components/Dashboard";
import Home from "./Components/Home";
import Employee from "./Components/Employee";
import Category from "./Components/Category";
import EditCategory from "./Components/EditCategory";
import Profile from "./Components/Profile";
import AddCategory from "./Components/AddCategory";
import AddEmployee from "./Components/AddEmployee";
import EditEmployee from "./Components/EditEmployee";
import Material from "./Components/Material";
import AddMaterial from "./Components/AddMaterial";
import EditMaterial from "./Components/EditMaterial";
import Client from "./Components/Client";
import AddClient from "./Components/AddClient";
import EditClient from "./Components/EditClient";
import Orders from "./Components/Orders";
import AddOrder from "./Components/AddOrder";
import OrderView from "./Components/OrderView";
import PaymentView from "./Components/PaymentView";
import PrintOrder from "./Components/PrintOrder";
import Quotes from "./Components/Quotes";
import AddQuote from "./Components/AddQuote";
import PrivateRoute from "./Components/PrivateRoute";
import PrintQuote from "./Components/PrintQuote";
import Prod from "./Components/Prod";
import ArtistLog from "./Components/ArtistLog";
import PrintLog from "./Components/PrintLog";
import Payment from "./Components/Payment";
import ProdPrintProduction from "./Components/ProdPrintProduction";
import ProdPrintDR from "./Components/ProdPrintDR";
import ProdPrintOneDR from "./Components/ProdPrintOneDR";
import EmployeeLogin from "./Components/EmployeeLogin";
import axios from "./utils/axiosConfig";
import SOA from "./Components/Reports/SOA";
import ArtistIncentives from "./Components/Reports/ReportArtistIncentives";
import SalesIncentives from "./Components/Reports/ReportSalesIncentives";
import ReportSales from "./Components/Reports/ReportSales";
import Reports from "./Components/Reports/Reports";

// Replace the global axios with our configured instance
window.axios = axios;

// Add future flags configuration
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

function App() {
  return (
    <BrowserRouter {...routerOptions}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/employeelogin" element={<EmployeeLogin />} />
        <Route
          path="/dashboard/print_order/:id"
          element={
            <PrivateRoute>
              <PrintOrder />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/print_production"
          element={
            <PrivateRoute>
              <ProdPrintProduction />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/prod_print_dr"
          element={
            <PrivateRoute>
              <ProdPrintDR />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/prod_print_one_dr"
          element={
            <PrivateRoute>
              <ProdPrintOneDR />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/print_quote/:id"
          element={
            <PrivateRoute>
              <PrintQuote />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        >
          <Route
            path=""
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route path="/dashboard/employee" element={<Employee />}></Route>
          <Route path="/dashboard/category" element={<Category />}></Route>
          <Route path="/dashboard/profile" element={<Profile />}></Route>
          <Route
            path="/dashboard/category/add"
            element={<AddCategory />}
          ></Route>
          <Route
            path="/dashboard/category/edit/:id"
            element={<EditCategory />}
          />
          <Route
            path="/dashboard/employee/add"
            element={<AddEmployee />}
          ></Route>
          <Route
            path="/dashboard/employee/edit/:id"
            element={<EditEmployee />}
          ></Route>
          <Route path="/dashboard/material" element={<Material />} />
          <Route path="/dashboard/material/add" element={<AddMaterial />} />
          <Route
            path="/dashboard/material/edit/:id"
            element={<EditMaterial />}
          />
          <Route path="/dashboard/client" element={<Client />} />
          <Route path="/dashboard/client/add" element={<AddClient />} />
          <Route path="/dashboard/client/edit/:id" element={<EditClient />} />
          <Route
            path="quotes"
            element={
              <PrivateRoute>
                <Quotes />
              </PrivateRoute>
            }
          />
          <Route path="/dashboard/quotes/add" element={<AddQuote />}></Route>
          <Route
            path="/dashboard/quotes/edit/:id"
            element={<AddQuote />}
          ></Route>
          <Route
            path="orders"
            element={
              <PrivateRoute>
                <Orders />
              </PrivateRoute>
            }
          />
          <Route path="/dashboard/orders/add" element={<AddOrder />}></Route>
          <Route
            path="/dashboard/prod/view/:id"
            element={<OrderView />}
          ></Route>
          <Route
            path="/dashboard/payment/view/:id"
            element={<PaymentView />}
          ></Route>
          <Route
            path="/dashboard/artistlog/view/:id"
            element={<OrderView />}
          ></Route>
          <Route
            path="/dashboard/printlog/view/:id"
            element={<OrderView />}
          ></Route>
          <Route
            path="/dashboard/orders/edit/:id"
            element={<AddOrder />}
          ></Route>
          <Route path="/dashboard/prod" element={<Prod />}></Route>
          <Route path="/dashboard/artistlog" element={<ArtistLog />}></Route>
          <Route path="/dashboard/printlog" element={<PrintLog />}></Route>
          <Route path="/dashboard/payment" element={<Payment />}></Route>
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:type" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
