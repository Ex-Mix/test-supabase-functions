import { useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./Login";
import MonthlySales from "./MonthlySales";
import SalesByLocation from "./SalesByLocation";
import SalesByProduct from "./SalesByProduct";
import Stock from "./Stock";
import Dashboard from "./Dashboard";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <nav style={styles.nav}>
        <Link to="/" style={styles.link}>Dashboard</Link> |{" "}
        
        <Link to="/monthly-sales" style={styles.link}>Monthly Sales</Link> |{" "}
        <Link to="/sales-by-location" style={styles.link}>Sales by Location</Link> |{" "}
        <Link to="/sales-by-product" style={styles.link}>Sales by Product</Link> |{" "}
        <Link to="/stock" style={styles.link}>Stock</Link>
      </nav>

      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/monthly-sales"
          element={user ? <MonthlySales /> : <Navigate to="/" />}
        />
        <Route
          path="/sales-by-location"
          element={user ? <SalesByLocation /> : <Navigate to="/" />}
        />
        <Route
          path="/sales-by-product"
          element={user ? <SalesByProduct /> : <Navigate to="/" />}
        />
        <Route
          path="/stock"
          element={user ? <Stock /> : <Navigate to="/" />}
        />
      </Routes>
    </div>
  );
}

const styles = {
  nav: {
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #ddd",
    textAlign: "center",
  },
  link: {
    margin: "0 10px",
    textDecoration: "none",
    color: "#007bff",
  },
};

export default App;