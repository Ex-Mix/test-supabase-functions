// MonthlySales.js
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { fetchSalesData } from "./utils/fetchData";
import { getCachedData, setCachedData } from "./utils/cache";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

function MonthlySales() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [monthlySales, setMonthlySales] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
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
        setYears(uniqueYears);
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

    const salesByMonth = salesData.reduce((acc, sale) => {
      const date = new Date(sale.sale_date);
      const year = date.getFullYear().toString();
      if (year === selectedYear) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        if (!acc[month]) acc[month] = { total: 0, quantity: 0 };
        acc[month].total += Number(sale.total_price);
        acc[month].quantity += Number(sale.quantity);
      }
      return acc;
    }, {});

    const monthlySalesArray = Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, "0");
      return {
        month: thaiMonths[i],
        total: (salesByMonth[monthNum]?.total || 0).toFixed(2),
        quantity: salesByMonth[monthNum]?.quantity || 0,
      };
    });
    setMonthlySales(monthlySalesArray);
  }, [salesData, selectedYear]);

  const formatNumber = (num) => Number(num).toLocaleString("en-US", { minimumFractionDigits: num.toString().includes(".") ? 2 : 0 });

  const chartData = {
    labels: monthlySales.map(item => item.month),
    datasets: [{
      label: displayUnit,
      data: monthlySales.map(item => (displayUnit === "Total Sales" ? item.total : item.quantity)),
      backgroundColor: displayUnit === "Total Sales" ? "rgba(75, 192, 192, 0.6)" : "rgba(255, 99, 132, 0.6)",
      borderColor: displayUnit === "Total Sales" ? "rgba(75, 192, 192, 1)" : "rgba(255, 99, 132, 1)",
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `Monthly ${displayUnit} for ${selectedYear}` },
      datalabels: { anchor: "end", align: "top", color: "black", font: { weight: "bold" }, formatter: value => value > 0 ? formatNumber(value) : "" },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: displayUnit === "Total Sales" ? "Total Sales (Baht)" : "Quantity (Units)" } },
      x: { title: { display: true, text: "Month" } },
    },
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Monthly Sales Report</h1>
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="yearSelect">Select Year: </label>
        <select id="yearSelect" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ marginRight: "20px" }}>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
        <button onClick={() => setDisplayUnit("Total Sales")} style={{ marginRight: "10px", backgroundColor: displayUnit === "Total Sales" ? "#4bc0c0" : "#ccc" }}>Total Sales</button>
        <button onClick={() => setDisplayUnit("Quantity")} style={{ backgroundColor: displayUnit === "Quantity" ? "#ff6384" : "#ccc" }}>Quantity</button>
      </div>
      <div style={{ marginTop: "20px", maxWidth: "800px" }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "600px", marginTop: "20px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "8px" }}>Month</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Total Sales</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {monthlySales.map((item, index) => (
            <tr key={index}>
              <td style={{ border: "1px solid black", padding: "8px" }}>{item.month}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.total)}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MonthlySales;