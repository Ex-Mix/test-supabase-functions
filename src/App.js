// App.js
import { AuthProvider } from "./contexts/AuthContext";
import { Routes, Route, Link } from "react-router-dom";
import MonthlySales from "./MonthlySales";
import SalesByLocation from "./SalesByLocation";
import SalesByProduct from "./SalesByProduct";
import Stock from "./Stock";
import Dashboard from "./Dashboard";

function App() {
  return (
    <AuthProvider>
      <div>
        <h1>Test Supabase Tables</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/dashboard">Dashboard</Link> | 
          <Link to="/monthly-sales">Monthly Sales</Link> | 
          <Link to="/sales-by-location">Sales by Location</Link> | 
          <Link to="/sales-by-product">Sales by Product</Link> | 
          <Link to="/stock">Stock</Link>
        </nav>

        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monthly-sales" element={<MonthlySales />} />
          <Route path="/sales-by-location" element={<SalesByLocation />} />
          <Route path="/sales-by-product" element={<SalesByProduct />} />
          <Route path="/stock" element={<Stock />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;