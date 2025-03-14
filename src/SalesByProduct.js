// SalesByProduct.js
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { fetchSalesData } from "./utils/fetchData";
import { getCachedData, setCachedData } from "./utils/cache";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

function SalesByProduct() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [salesByProduct, setSalesByProduct] = useState([]);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayUnit, setDisplayUnit] = useState("Total Sales");

  const thaiMonths = ["มค.", "กพ.", "มีค.", "เมย.", "พค.", "มิย.", "กค.", "สค.", "กย.", "ตค.", "พย.", "ธค."];

  useEffect(() => {
    if (!user || authLoading) return;

    const loadData = async () => {
      try {
        const cached = getCachedData();
        let rawSalesData = cached?.sales;

        if (!rawSalesData) {
          rawSalesData = await fetchSalesData();
          setCachedData({ sales: rawSalesData });
        }

        setSalesData(rawSalesData);

        const uniqueYears = [...new Set(rawSalesData.map(sale => new Date(sale.sale_date).getFullYear()))].sort();
        const uniqueMonths = [...new Set(rawSalesData.map(sale => String(new Date(sale.sale_date).getMonth() + 1).padStart(2, "0")))].sort();

        setYears(uniqueYears);
        setMonths(uniqueMonths);
        setSelectedYear(uniqueYears[0]?.toString() || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, authLoading]);

  useEffect(() => {
    if (!salesData.length || !selectedYear) return;

    const salesByProd = salesData.reduce((acc, sale) => {
      const date = new Date(sale.sale_date);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (year === selectedYear && (selectedMonth === "all" || month === selectedMonth)) {
        const productId = sale.product_id || "Unknown";
        if (!acc[productId]) acc[productId] = { total: 0, quantity: 0 };
        acc[productId].total += Number(sale.total_price);
        acc[productId].quantity += Number(sale.quantity);
      }
      return acc;
    }, {});

    const salesByProductArray = Object.entries(salesByProd).map(([productId, data]) => ({
      productId,
      total: data.total.toFixed(2),
      quantity: data.quantity,
    }));
    setSalesByProduct(salesByProductArray);
  }, [salesData, selectedYear, selectedMonth]);

  const handleYearChange = (event) => setSelectedYear(event.target.value);
  const handleMonthChange = (event) => setSelectedMonth(event.target.value);
  const handleUnitChange = (unit) => setDisplayUnit(unit);

  const formatNumber = (num) => Number(num).toLocaleString("en-US", { minimumFractionDigits: num.toString().includes(".") ? 2 : 0 });

  const chartData = {
    labels: salesByProduct.map(item => item.productId),
    datasets: [{
      label: displayUnit,
      data: salesByProduct.map(item => (displayUnit === "Total Sales" ? item.total : item.quantity)),
      backgroundColor: displayUnit === "Total Sales" ? "rgba(75, 192, 192, 0.6)" : "rgba(255, 99, 132, 0.6)",
      borderColor: displayUnit === "Total Sales" ? "rgba(75, 192, 192, 1)" : "rgba(255, 99, 132, 1)",
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `${displayUnit} by Product for ${selectedMonth === "all" ? "ทั้งปี" : thaiMonths[parseInt(selectedMonth) - 1]} ${selectedYear}` },
      datalabels: { anchor: "end", align: "top", color: "black", font: { weight: "bold" }, formatter: value => value > 0 ? formatNumber(value) : "" },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: displayUnit === "Total Sales" ? "Total Sales (Baht)" : "Quantity (Units)" } },
      x: { title: { display: true, text: "Product ID" } },
    },
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Sales by Product</h1>
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="yearSelect">Select Year: </label>
        <select id="yearSelect" value={selectedYear} onChange={handleYearChange} style={{ marginRight: "20px" }}>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
        <label htmlFor="monthSelect">Select Month: </label>
        <select id="monthSelect" value={selectedMonth} onChange={handleMonthChange} style={{ marginRight: "20px" }}>
          <option value="all">ทั้งหมด</option>
          {months.map(month => <option key={month} value={month}>{thaiMonths[parseInt(month) - 1]}</option>)}
        </select>
        <button onClick={() => handleUnitChange("Total Sales")} style={{ marginRight: "10px", backgroundColor: displayUnit === "Total Sales" ? "#4bc0c0" : "#ccc" }}>Total Sales</button>
        <button onClick={() => handleUnitChange("Quantity")} style={{ backgroundColor: displayUnit === "Quantity" ? "#ff6384" : "#ccc" }}>Quantity</button>
      </div>
      <div style={{ marginTop: "20px", maxWidth: "800px" }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "600px", marginTop: "20px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "8px" }}>Product ID</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Total Sales</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {salesByProduct.map((item, index) => (
            <tr key={index}>
              <td style={{ border: "1px solid black", padding: "8px" }}>{item.productId}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.total)}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesByProduct;