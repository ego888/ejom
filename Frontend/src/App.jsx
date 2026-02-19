import "bootstrap/dist/css/bootstrap.min.css";
import "./Components/style.css";
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
import ReceivePayment from "./Components/ReceivePayment";
import ProdPrintProduction from "./Components/ProdPrintProduction";
import ProdPrintDR from "./Components/ProdPrintDR";
import ProdPrintOneDR from "./Components/ProdPrintOneDR";
import Billing from "./Components/Billing";
import EmployeeLogin from "./Components/EmployeeLogin";
import axios from "./utils/axiosConfig";
import ReportSales from "./Components/Reports/ReportSales";
import ReportArtistIncentives from "./Components/Reports/ReportArtistIncentives";
import ReportSalesIncentives from "./Components/Reports/ReportSalesIncentives";
import ReportCheckTotal from "./Components/Reports/ReportCheckTotal";
import SOA from "./Components/Reports/SOA";
import SOAPrint from "./Components/Reports/SOAPrint";
import WIPLog from "./Components/WIPLog";
import DashSales from "./Components/DashSales";
import DashProd from "./Components/DashProd";
import DTR from "./Components/DTR";
import MaterialUsageReport from "./Components/Reports/MaterialUsageReport";
import AveragePrice from "./Components/Reports/AveragePrice";
import NotYetClosed from "./Components/Reports/NotYetClosed";
import DTRAbsences from "./Components/Reports/DTRAbsences";
import DTRMonthly from "./Components/Reports/DTRMonthly";
import PaymentInquiry from "./Components/PaymentInquiry";
import InvoiceInquiry from "./Components/InvoiceInquiry";
import DeliveryQR from "./Components/deliveryQR";
import EditControl from "./Components/EditControl";
import SessionTimeoutManager from "./Components/SessionTimeoutManager";

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
      <SessionTimeoutManager />
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
          path="/dashboard/print_soa/:clientId"
          element={
            <PrivateRoute>
              <SOAPrint />
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
          <Route
            path="/dashboard/edit-control"
            element={
              <PrivateRoute>
                <EditControl />
              </PrivateRoute>
            }
          />
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
          <Route
            path="/dashboard/client"
            element={
              <PrivateRoute>
                <Client />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/client/add"
            element={
              <PrivateRoute>
                <AddClient />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/client/edit/:id"
            element={
              <PrivateRoute>
                <EditClient />
              </PrivateRoute>
            }
          />
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
            path="/dashboard/payment-inquiry"
            element={<PaymentInquiry />}
          ></Route>
          <Route
            path="/dashboard/invoice-inquiry"
            element={<InvoiceInquiry />}
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
          <Route
            path="/dashboard/receive-payment"
            element={<ReceivePayment />}
          ></Route>
          <Route path="/dashboard/dtr" element={<DTR />}></Route>
          <Route path="/dashboard/sales-report" element={<ReportSales />} />
          <Route path="/dashboard/soa" element={<SOA />} />
          <Route
            path="/dashboard/artist-incentives"
            element={<ReportArtistIncentives />}
          />
          <Route
            path="/dashboard/sales-incentives"
            element={<ReportSalesIncentives />}
          />
          <Route path="wiplog" element={<WIPLog />} />
          <Route path="dashsales" element={<DashSales />} />
          <Route
            path="material-usage-report"
            element={<MaterialUsageReport />}
          />
          <Route path="average-price-report" element={<AveragePrice />} />
          <Route path="dtr-absences" element={<DTRAbsences />} />
          <Route path="dtr-monthly" element={<DTRMonthly />} />
          <Route path="not-close" element={<NotYetClosed />} />
          <Route path="dashprod" element={<DashProd />} />
          <Route path="check-order-total" element={<ReportCheckTotal />} />
          <Route
            path="billing"
            element={
              <PrivateRoute>
                <Billing />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/delivery-qr"
            element={
              <PrivateRoute>
                <DeliveryQR />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
