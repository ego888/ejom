import "./Components/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./Components/Login";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
import PrintOrder from "./Components/PrintOrder";
import PrivateRoute from "./Components/PrivateRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard/print_order/:id"
          element={
            <PrivateRoute>
              <PrintOrder />
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
          <Route path="" element={<Home />}></Route>
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
          <Route path="/dashboard/orders" element={<Orders />}></Route>
          <Route path="/dashboard/orders/add" element={<AddOrder />}></Route>
          <Route
            path="/dashboard/orders/edit/:id"
            element={<AddOrder />}
          ></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
