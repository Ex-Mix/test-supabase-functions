// SalesByLocation.js
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { fetchSalesData, fetchLocationsData } from "./utils/fetchData";
import { getCachedData, setCachedData } from "./utils/cache";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function SalesByLocation() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [salesByLocation, setSalesByLocation] = useState([]);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [salesData, setSalesData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayUnit, setDisplayUnit] = useState("quantity");

  const thaiMonths = ["มค.", "กพ.", "มีค.", "เมย.", "พค.", "มิย.", "กค.", "สค.", "กย.", "ตค.", "พย.", "ธค."];

  useEffect(() => {
    if (!user || authLoading) return;

    const loadData = async () => {
      try {
        const cached = getCachedData();
        let rawSalesData = cached?.sales;
        let rawLocationsData = cached?.locations;

        if (!rawSalesData || !rawLocationsData) {
          rawSalesData = await fetchSalesData();
          rawLocationsData = await fetchLocationsData();
          setCachedData({ sales: rawSalesData, locations: rawLocationsData });
        }

        setSalesData(rawSalesData);
        setLocationsData(rawLocationsData);

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
    if (!salesData.length || !locationsData.length || !selectedYear) return;

    const salesByLoc = salesData.reduce((acc, sale) => {
      const date = new Date(sale.sale_date);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (year === selectedYear && (selectedMonth === "all" || month === selectedMonth)) {
        const location = locationsData.find(loc => loc.location_id === sale.location_id)?.location || "Unknown";
        if (!acc[location]) acc[location] = { total: 0, quantity: 0 };
        acc[location].total += Number(sale.total_price);
        acc[location].quantity += Number(sale.quantity);
      }
      return acc;
    }, {});

    const salesByLocationArray = Object.entries(salesByLoc).map(([location, data]) => ({
      location,
      total: data.total.toFixed(2),
      quantity: data.quantity,
    }));
    setSalesByLocation(salesByLocationArray);
  }, [salesData, locationsData, selectedYear, selectedMonth]);

  const handleYearChange = (event) => setSelectedYear(event.target.value);
  const handleMonthChange = (event) => setSelectedMonth(event.target.value);
  const handleUnitChange = (unit) => setDisplayUnit(unit);

  const formatNumber = (num) => Number(num).toLocaleString("en-US", { minimumFractionDigits: num.toString().includes(".") ? 2 : 0 });

  const totalQuantity = salesByLocation.reduce((sum, item) => sum + item.quantity, 0);

  const chartData = {
    labels: salesByLocation.map(item => item.location),
    datasets: [{
      label: displayUnit === "quantity" ? "Quantity" : "Percentage",
      data: displayUnit === "quantity" ? salesByLocation.map(item => item.quantity) : salesByLocation.map(item => totalQuantity > 0 ? (item.quantity / totalQuantity * 100).toFixed(1) : 0),
      backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)", "rgba(54, 162, 235, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(153, 102, 255, 0.6)", "rgba(255, 159, 64, 0.6)"],
      borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(255, 159, 64, 1)"],
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `${displayUnit === "quantity" ? "Quantity" : "Percentage"} by Location for ${selectedMonth === "all" ? "ทั้งปี" : thaiMonths[parseInt(selectedMonth) - 1]} ${selectedYear}` },
      datalabels: { color: "black", font: { weight: "bold" }, formatter: value => value > 0 ? (displayUnit === "quantity" ? formatNumber(value) : `${value}%`) : "" },
      tooltip: { callbacks: { label: context => `${context.label}: ${displayUnit === "quantity" ? formatNumber(context.raw) : `${context.raw}%`}` } },
    },
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Sales by Location</h1>
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
        <button onClick={() => handleUnitChange("quantity")} style={{ marginRight: "10px", backgroundColor: displayUnit === "quantity" ? "#4bc0c0" : "#ccc" }}>Quantity</button>
        <button onClick={() => handleUnitChange("percentage")} style={{ backgroundColor: displayUnit === "percentage" ? "#ff6384" : "#ccc" }}>Percentage</button>
      </div>
      <div style={{ marginTop: "20px", maxWidth: "400px", textAlign: "left" }}>
        <Pie data={chartData} options={chartOptions} />
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "600px", marginTop: "20px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "8px" }}>Location</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Total Sales</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {salesByLocation.map((item, index) => (
            <tr key={index}>
              <td style={{ border: "1px solid black", padding: "8px" }}>{item.location}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.total)}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesByLocation;