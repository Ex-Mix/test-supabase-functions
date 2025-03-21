// SalesByProduct.js
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { fetchSalesData } from "./utils/fetchData";
import { getCachedData, setCachedData } from "./utils/cache";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from "@mui/material";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

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

  const thaiMonths = [
    "มค.",
    "กพ.",
    "มีค.",
    "เมย.",
    "พค.",
    "มิย.",
    "กค.",
    "สค.",
    "กย.",
    "ตค.",
    "พย.",
    "ธค.",
  ];

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

        const uniqueYears = [
          ...new Set(
            rawSalesData.map((sale) => new Date(sale.sale_date).getFullYear())
          ),
        ].sort();
        const uniqueMonths = [
          ...new Set(
            rawSalesData.map((sale) =>
              String(new Date(sale.sale_date).getMonth() + 1).padStart(2, "0")
            )
          ),
        ].sort();

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
      if (
        year === selectedYear &&
        (selectedMonth === "all" || month === selectedMonth)
      ) {
        const productId = sale.product_id || "Unknown";
        if (!acc[productId]) acc[productId] = { total: 0, quantity: 0 };
        acc[productId].total += Number(sale.total_price);
        acc[productId].quantity += Number(sale.quantity);
      }
      return acc;
    }, {});

    const salesByProductArray = Object.entries(salesByProd).map(
      ([productId, data]) => ({
        productId,
        total: data.total.toFixed(2),
        quantity: data.quantity,
      })
    );
    setSalesByProduct(salesByProductArray);
  }, [salesData, selectedYear, selectedMonth]);

  const handleYearChange = (event) => setSelectedYear(event.target.value);
  const handleMonthChange = (event) => setSelectedMonth(event.target.value);
  const handleUnitChange = (unit) => setDisplayUnit(unit);

  const formatNumber = (num) =>
    Number(num).toLocaleString("en-US", {
      minimumFractionDigits: num.toString().includes(".") ? 2 : 0,
    });

  const chartData = {
    labels: salesByProduct.map((item) => item.productId),
    datasets: [
      {
        label: displayUnit,
        data: salesByProduct.map((item) =>
          displayUnit === "Total Sales" ? item.total : item.quantity
        ),
        backgroundColor:
          displayUnit === "Total Sales"
            ? "rgba(75, 192, 192, 0.6)"
            : "rgba(255, 99, 132, 0.6)",
        borderColor:
          displayUnit === "Total Sales"
            ? "rgba(75, 192, 192, 1)"
            : "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: `${displayUnit} by Product for ${
          selectedMonth === "all"
            ? "ทั้งปี"
            : thaiMonths[parseInt(selectedMonth) - 1]
        } ${selectedYear}`,
      },
      datalabels: {
        anchor: "end",
        align: "top",
        color: "black",
        font: { weight: "bold" },
        formatter: (value) => (value > 0 ? formatNumber(value) : ""),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text:
            displayUnit === "Total Sales"
              ? "Total Sales (Baht)"
              : "Quantity (Units)",
        },
      },
      x: { title: { display: true, text: "Product ID" } },
    },
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sales by Product
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Year</InputLabel>
                  <Select
                    value={selectedYear}
                    onChange={handleYearChange}
                    label="Select Year"
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    label="Select Month"
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    {months.map((month) => (
                      <MenuItem key={month} value={month}>
                        {thaiMonths[parseInt(month) - 1]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant={
                      displayUnit === "Total Sales" ? "contained" : "outlined"
                    }
                    onClick={() => handleUnitChange("Total Sales")}
                    color="primary"
                  >
                    Total Sales
                  </Button>
                  <Button
                    variant={
                      displayUnit === "Quantity" ? "contained" : "outlined"
                    }
                    onClick={() => handleUnitChange("Quantity")}
                    color="secondary"
                  >
                    Quantity
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, p: 2 }}>
          <Box sx={{ height: 400 }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
        </Card>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product ID</TableCell>
                <TableCell align="right">Total Sales</TableCell>
                <TableCell align="right">Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesByProduct.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productId}</TableCell>
                  <TableCell align="right">
                    {formatNumber(item.total)}
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}

export default SalesByProduct;
