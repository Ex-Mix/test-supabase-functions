// App.js
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Routes, Route, Link } from "react-router-dom";
import MonthlySales from "./MonthlySales";
import SalesByLocation from "./SalesByLocation";
import SalesByProduct from "./SalesByProduct";
import Stock from "./Stock";
import Dashboard from "./Dashboard"; // เพิ่ม import

function App() {
  const [data, setData] = useState({
    sales: [],
    locations: [],
    imports: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = sessionStorage.getItem("supabaseData");
        const cachedTimestamp = sessionStorage.getItem("supabaseTimestamp");
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;

        if (cachedData && cachedTimestamp && now - parseInt(cachedTimestamp) < thirtyMinutes) {
          setData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }

        const { data: userData } = await supabase.auth.signInWithPassword({
          email: "mickeytytnc2@gmail.com",
          password: "12345678",
        });
        if (!userData.user) throw new Error("Login failed");

        const [salesData, locationsData, importsData] = await Promise.all([
          supabase.from("Sale").select("*"),
          supabase.from("Location").select("*"),
          supabase.from("Import").select("*"),
        ]);

        if (salesData.error) throw salesData.error;
        if (locationsData.error) throw locationsData.error;
        if (importsData.error) throw importsData.error;

        const newData = {
          sales: salesData.data,
          locations: locationsData.data,
          imports: importsData.data,
        };

        setData(newData);
        sessionStorage.setItem("supabaseData", JSON.stringify(newData));
        sessionStorage.setItem("supabaseTimestamp", now.toString());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
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
        <Route
          path="/"
          element={
            <>
              <div>
                <h2>Sales</h2>
                <pre>{JSON.stringify(data.sales, null, 2)}</pre>
              </div>
              <div>
                <h2>Locations</h2>
                <pre>{JSON.stringify(data.locations, null, 2)}</pre>
              </div>
              <div>
                <h2>Imports</h2>
                <pre>{JSON.stringify(data.imports, null, 2)}</pre>
              </div>
            </>
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/monthly-sales" element={<MonthlySales />} />
        <Route path="/sales-by-location" element={<SalesByLocation />} />
        <Route path="/sales-by-product" element={<SalesByProduct />} />
        <Route path="/stock" element={<Stock />} />
      </Routes>
    </div>
  );
}

export default App;