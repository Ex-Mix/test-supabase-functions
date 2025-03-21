// SalesByLocation.js
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { fetchSalesData, fetchLocationsData } from "./utils/fetchData";
import { getCachedData, setCachedData } from "./utils/cache";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
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
        let rawLocationsData = cached?.locations;

        if (!rawSalesData || !rawLocationsData) {
          rawSalesData = await fetchSalesData();
          rawLocationsData = await fetchLocationsData();
          setCachedData({ sales: rawSalesData, locations: rawLocationsData });
        }

        setSalesData(rawSalesData);
        setLocationsData(rawLocationsData);

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
    if (!salesData.length || !locationsData.length || !selectedYear) return;

    const salesByLoc = salesData.reduce((acc, sale) => {
      const date = new Date(sale.sale_date);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (
        year === selectedYear &&
        (selectedMonth === "all" || month === selectedMonth)
      ) {
        const location =
          locationsData.find((loc) => loc.location_id === sale.location_id)
            ?.location || "Unknown";
        if (!acc[location]) acc[location] = { total: 0, quantity: 0 };
        acc[location].total += Number(sale.total_price);
        acc[location].quantity += Number(sale.quantity);
      }
      return acc;
    }, {});

    const salesByLocationArray = Object.entries(salesByLoc).map(
      ([location, data]) => ({
        location,
        total: data.total.toFixed(2),
        quantity: data.quantity,
      })
    );
    setSalesByLocation(salesByLocationArray);
  }, [salesData, locationsData, selectedYear, selectedMonth]);

  const handleYearChange = (event) => setSelectedYear(event.target.value);
  const handleMonthChange = (event) => setSelectedMonth(event.target.value);
  const handleUnitChange = (unit) => setDisplayUnit(unit);

  const formatNumber = (num) =>
    Number(num).toLocaleString("en-US", {
      minimumFractionDigits: num.toString().includes(".") ? 2 : 0,
    });

  const totalQuantity = salesByLocation.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const chartData = {
    labels: salesByLocation.map((item) => item.location),
    datasets: [
      {
        label: displayUnit === "quantity" ? "Quantity" : "Percentage",
        data:
          displayUnit === "quantity"
            ? salesByLocation.map((item) => item.quantity)
            : salesByLocation.map((item) =>
                totalQuantity > 0
                  ? ((item.quantity / totalQuantity) * 100).toFixed(1)
                  : 0
              ),
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

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: `${
          displayUnit === "quantity" ? "Quantity" : "Percentage"
        } by Location for ${
          selectedMonth === "all"
            ? "ทั้งปี"
            : thaiMonths[parseInt(selectedMonth) - 1]
        } ${selectedYear}`,
      },
      datalabels: {
        color: "black",
        font: { weight: "bold" },
        formatter: (value) =>
          value > 0
            ? displayUnit === "quantity"
              ? formatNumber(value)
              : `${value}%`
            : "",
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.label}: ${
              displayUnit === "quantity"
                ? formatNumber(context.raw)
                : `${context.raw}%`
            }`,
        },
      },
    },
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sales by Location
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
                      displayUnit === "quantity" ? "contained" : "outlined"
                    }
                    onClick={() => handleUnitChange("quantity")}
                    color="primary"
                  >
                    Quantity
                  </Button>
                  <Button
                    variant={
                      displayUnit === "percentage" ? "contained" : "outlined"
                    }
                    onClick={() => handleUnitChange("percentage")}
                    color="secondary"
                  >
                    Percentage
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ height: 400 }}>
                <Pie data={chartData} options={chartOptions} />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Total Sales</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesByLocation.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.location}</TableCell>
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
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default SalesByLocation;
