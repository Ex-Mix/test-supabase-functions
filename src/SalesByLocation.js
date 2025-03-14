// SalesByLocation.js
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function SalesByLocation() {
  const [salesByLocation, setSalesByLocation] = useState([]);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayUnit, setDisplayUnit] = useState("quantity"); // เพิ่ม state ควบคุมหน่วย (% หรือ quantity)

  const thaiMonths = [
    "มค.", "กพ.", "มีค.", "เมย.", "พค.", "มิย.",
    "กค.", "สค.", "กย.", "ตค.", "พย.", "ธค."
  ];

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const cachedData = sessionStorage.getItem("supabaseData");
        const cachedTimestamp = sessionStorage.getItem("supabaseTimestamp");
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;

        let rawSalesData, rawLocationsData;
        if (cachedData && cachedTimestamp && now - parseInt(cachedTimestamp) < thirtyMinutes) {
          const cached = JSON.parse(cachedData);
          rawSalesData = cached.sales;
          rawLocationsData = cached.locations;
        } else {
          const { data: userData } = await supabase.auth.signInWithPassword({
            email: "mickeytytnc2@gmail.com",
            password: "12345678",
          });
          if (!userData.user) throw new Error("Login failed");

          const [salesResponse, locationsResponse] = await Promise.all([
            supabase.from("Sale").select("*"),
            supabase.from("Location").select("*"),
          ]);

          if (salesResponse.error) throw salesResponse.error;
          if (locationsResponse.error) throw locationsResponse.error;

          rawSalesData = salesResponse.data;
          rawLocationsData = locationsResponse.data;

          const newData = {
            sales: rawSalesData,
            locations: rawLocationsData,
            imports: JSON.parse(cachedData)?.imports || [],
          };
          sessionStorage.setItem("supabaseData", JSON.stringify(newData));
          sessionStorage.setItem("supabaseTimestamp", now.toString());
        }

        setSalesData(rawSalesData);
        setLocationsData(rawLocationsData);

        const uniqueYears = [...new Set(rawSalesData.map(sale => new Date(sale.sale_date).getFullYear()))].sort();
        const uniqueMonths = [...new Set(rawSalesData.map(sale => String(new Date(sale.sale_date).getMonth() + 1).padStart(2, "0")))].sort();

        setYears(uniqueYears);
        setMonths(uniqueMonths);
        setSelectedYear(uniqueYears[0]?.toString() || "");
        setSelectedMonth("all");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  useEffect(() => {
    if (!salesData.length || !locationsData.length || !selectedYear) return;

    const salesByLoc = salesData.reduce((acc, sale) => {
      const date = new Date(sale.sale_date);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      if (year === selectedYear && (selectedMonth === "all" || month === selectedMonth)) {
        const location = locationsData.find(loc => loc.location_id === sale.location_id)?.location || "Unknown";
        if (!acc[location]) {
          acc[location] = { total: 0, quantity: 0 };
        }
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

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const handleUnitChange = (unit) => {
    setDisplayUnit(unit); // เปลี่ยนหน่วยการแสดงผล
  };

  const formatNumber = (num) => {
    return Number(num).toLocaleString("en-US", { minimumFractionDigits: num.toString().includes(".") ? 2 : 0 });
  };

  // คำนวณผลรวมของ quantity เพื่อใช้คำนวณเปอร์เซ็นต์
  const totalQuantity = salesByLocation.reduce((sum, item) => sum + item.quantity, 0);

  // ข้อมูลสำหรับกราฟ (เลือกหน่วยระหว่าง quantity หรือ percentage)
  const chartData = {
    labels: salesByLocation.map(item => item.location),
    datasets: [
      {
        label: displayUnit === "quantity" ? "Quantity" : "Percentage",
        data: displayUnit === "quantity"
          ? salesByLocation.map(item => item.quantity)
          : salesByLocation.map(item => totalQuantity > 0 ? (item.quantity / totalQuantity * 100).toFixed(1) : 0),
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // ตั้งค่ากราฟ
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `${displayUnit === "quantity" ? "Quantity" : "Percentage"} by Location for ${selectedMonth === "all" ? "ทั้งปี" : thaiMonths[parseInt(selectedMonth) - 1]} ${selectedYear}`,
      },
      datalabels: {
        color: "black",
        font: {
          weight: "bold",
        },
        formatter: (value) => {
          if (displayUnit === "quantity") {
            return value > 0 ? formatNumber(value) : "";
          } else {
            return value > 0 ? `${value}%` : "";
          }
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw;
            return displayUnit === "quantity" ? `${label}: ${formatNumber(value)}` : `${label}: ${value}%`;
          },
        },
      },
    },
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Sales by Location</h1>
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="yearSelect">Select Year: </label>
        <select id="yearSelect" value={selectedYear} onChange={handleYearChange} style={{ marginRight: "20px" }}>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <label htmlFor="monthSelect">Select Month: </label>
        <select id="monthSelect" value={selectedMonth} onChange={handleMonthChange} style={{ marginRight: "20px" }}>
          <option value="all">ทั้งหมด</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {thaiMonths[parseInt(month) - 1]}
            </option>
          ))}
        </select>
        {/* ปุ่มเลือกหน่วย */}
        <button
          onClick={() => handleUnitChange("quantity")}
          style={{ marginRight: "10px", backgroundColor: displayUnit === "quantity" ? "#4bc0c0" : "#ccc" }}
        >
          Quantity
        </button>
        <button
          onClick={() => handleUnitChange("percentage")}
          style={{ backgroundColor: displayUnit === "percentage" ? "#ff6384" : "#ccc" }}
        >
          Percentage
        </button>
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