// Dashboard.js
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

function Dashboard() {
  const [monthlySales, setMonthlySales] = useState([]);
  const [salesByLocation, setSalesByLocation] = useState([]);
  const [salesByProduct, setSalesByProduct] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [displayUnit, setDisplayUnit] = useState("Total Sales"); // เพิ่ม state สำหรับหน่วย
  const [percentBase, setPercentBase] = useState("Total Sales"); // เพิ่ม state เพื่อกำหนดฐานของ %
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const thaiMonths = [
    "มค.", "กพ.", "มีค.", "เมย.", "พค.", "มิย.",
    "กค.", "สค.", "กย.", "ตค.", "พย.", "ธค."
  ];

  useEffect(() => {
    const fetchData = async () => {
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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!salesData.length || !locationsData.length || !selectedYear) return;

    // คำนวณ Monthly Sales (ทั้งปี ไม่สนใจ selectedMonth)
    const salesByMonth = salesData.reduce((acc, sale) => {
      const date = new Date(sale.sale_date);
      const year = date.getFullYear().toString();
      if (year === selectedYear) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        if (!acc[month]) {
          acc[month] = { total: 0, quantity: 0 };
        }
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

    // คำนวณ Sales by Location (ตาม selectedYear และ selectedMonth)
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

    // คำนวณ Sales by Product (ตาม selectedYear และ selectedMonth)
    const salesByProd = salesData.reduce((acc, sale) => {
      const date = new Date(sale.sale_date);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      if (year === selectedYear && (selectedMonth === "all" || month === selectedMonth)) {
        const productId = sale.product_id || "Unknown";
        if (!acc[productId]) {
          acc[productId] = { total: 0, quantity: 0 };
        }
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
  }, [salesData, locationsData, selectedYear, selectedMonth]);

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const handleUnitChange = (event) => {
    const unit = event.target.value;
    setDisplayUnit(unit);
    if (unit !== "Percentage") {
      setPercentBase(unit); // อัปเดตฐานของ % เมื่อเลือก Total Sales หรือ Quantity
    }
  };

  const formatNumber = (num) => {
    return Number(num).toLocaleString("en-US", { minimumFractionDigits: num.toString().includes(".") ? 2 : 0 });
  };


  // คำนวณผลรวม
  const totalMonthlySales = monthlySales.reduce((sum, item) => sum + Number(item.total), 0);
  const totalMonthlyQuantity = monthlySales.reduce((sum, item) => sum + item.quantity, 0);
  const totalLocationSales = salesByLocation.reduce((sum, item) => sum + Number(item.total), 0);
  const totalLocationQuantity = salesByLocation.reduce((sum, item) => sum + item.quantity, 0);
  const totalProductSales = salesByProduct.reduce((sum, item) => sum + Number(item.total), 0);
  const totalProductQuantity = salesByProduct.reduce((sum, item) => sum + item.quantity, 0);
  // กราฟ Monthly Sales
  const monthlySalesData = {
    labels: monthlySales.map(item => item.month),
    datasets: [
      {
        label: displayUnit,
        data: monthlySales.map(item => {
          if (displayUnit === "Total Sales") return item.total;
          if (displayUnit === "Quantity") return item.quantity;
          if (displayUnit === "Percentage") {
            const total = percentBase === "Total Sales" ? totalMonthlySales : totalMonthlyQuantity;
            return total > 0 ? (Number(item[percentBase === "Total Sales" ? "total" : "quantity"]) / total * 100).toFixed(1) : 0;
          }
          return item.total;
        }),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const monthlySalesOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `Monthly ${displayUnit} for ${selectedYear}` },
      datalabels: {
        anchor: "end",
        align: "top",
        color: "black",
        font: { weight: "bold" },
        formatter: (value) => value > 0 ? (displayUnit === "Percentage" ? `${value}%` : formatNumber(value)) : "",
      },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { 
          display: true, 
          text: displayUnit === "Total Sales" ? "Total Sales (Baht)" : displayUnit === "Quantity" ? "Quantity (Units)" : "Percentage (%)" 
        } 
      },
      x: { title: { display: true, text: "Month" } },
    },
  };

  // กราฟ Sales by Location
  const salesByLocationData = {
    labels: salesByLocation.map(item => item.location),
    datasets: [
      {
        label: displayUnit,
        data: salesByLocation.map(item => {
          if (displayUnit === "Total Sales") return item.total;
          if (displayUnit === "Quantity") return item.quantity;
          if (displayUnit === "Percentage") {
            const total = percentBase === "Total Sales" ? totalLocationSales : totalLocationQuantity;
            return total > 0 ? (Number(item[percentBase === "Total Sales" ? "total" : "quantity"]) / total * 100).toFixed(1) : 0;
          }
          return item.quantity;
        }),
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

  const salesByLocationOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { 
        display: true, 
        text: `${displayUnit} by Location for ${selectedMonth === "all" ? "ทั้งปี" : thaiMonths[parseInt(selectedMonth) - 1]} ${selectedYear}` 
      },
      datalabels: {
        color: "black",
        font: { weight: "bold" },
        formatter: (value) => value > 0 ? (displayUnit === "Percentage" ? `${value}%` : formatNumber(value)) : "",
      },
    },
  };

  // กราฟ Sales by Product
  const salesByProductData = {
    labels: salesByProduct.map(item => item.productId),
    datasets: [
      {
        label: displayUnit,
        data: salesByProduct.map(item => {
          if (displayUnit === "Total Sales") return item.total;
          if (displayUnit === "Quantity") return item.quantity;
          if (displayUnit === "Percentage") {
            const total = percentBase === "Total Sales" ? totalProductSales : totalProductQuantity;
            return total > 0 ? (Number(item[percentBase === "Total Sales" ? "total" : "quantity"]) / total * 100).toFixed(1) : 0;
          }
          return item.total;
        }),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const salesByProductOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { 
        display: true, 
        text: `${displayUnit} by Product for ${selectedMonth === "all" ? "ทั้งปี" : thaiMonths[parseInt(selectedMonth) - 1]} ${selectedYear}` 
      },
      datalabels: {
        anchor: "end",
        align: "top",
        color: "black",
        font: { weight: "bold" },
        formatter: (value) => value > 0 ? (displayUnit === "Percentage" ? `${value}%` : formatNumber(value)) : "",
      },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { 
          display: true, 
          text: displayUnit === "Total Sales" ? "Total Sales (Baht)" : displayUnit === "Quantity" ? "Quantity (Units)" : "Percentage (%)" 
        } 
      },
      x: { title: { display: true, text: "Product ID" } },
    },
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard</h1>
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="yearSelect">Select Year: </label>
        <select 
          id="yearSelect" 
          value={selectedYear} 
          onChange={handleYearChange} 
          style={{ marginRight: "20px" }}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <label htmlFor="monthSelect">Select Month: </label>
        <select 
          id="monthSelect" 
          value={selectedMonth} 
          onChange={handleMonthChange}
          style={{ marginRight: "20px" }}
        >
          <option value="all">ทั้งหมด</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {thaiMonths[parseInt(month) - 1]}
            </option>
          ))}
        </select>
        <label htmlFor="unitSelect">Display Unit: </label>
        <select 
          id="unitSelect" 
          value={displayUnit} 
          onChange={handleUnitChange}
        >
          <option value="Total Sales">เงิน</option>
          <option value="Quantity">จำนวน</option>
          <option value="Percentage">%</option>
        </select>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {/* กรอบสำหรับ Monthly Sales และ Sales by Product */}
        <div style={{ flex: "1 1 65%", minWidth: "400px", border: "1px solid #ccc", padding: "10px", borderRadius: "5px" }}>
          <div style={{ marginBottom: "20px" }}>
            <Bar data={monthlySalesData} options={monthlySalesOptions} />
          </div>
          <div>
            <Bar data={salesByProductData} options={salesByProductOptions} />
          </div>
        </div>

        {/* กรอบสำหรับ Sales by Location */}
        <div style={{ flex: "1 1 30%", minWidth: "300px", border: "1px solid #ccc", padding: "10px", borderRadius: "5px" }}>
          <Pie data={salesByLocationData} options={salesByLocationOptions} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;