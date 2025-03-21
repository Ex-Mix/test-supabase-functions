// MonthlySales.js
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

function MonthlySales() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [monthlySales, setMonthlySales] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
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

  const formatNumber = (num) =>
    Number(num).toLocaleString("en-US", {
      minimumFractionDigits: num.toString().includes(".") ? 2 : 0,
    });

  const chartData = {
    labels: monthlySales.map((item) => item.month),
    datasets: [
      {
        label: displayUnit,
        data: monthlySales.map((item) =>
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
        text: `Monthly ${displayUnit} for ${selectedYear}`,
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
      x: { title: { display: true, text: "Month" } },
    },
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Monthly Sales Report
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Year</InputLabel>
                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
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
              <Grid item xs={12} md={8}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant={
                      displayUnit === "Total Sales" ? "contained" : "outlined"
                    }
                    onClick={() => setDisplayUnit("Total Sales")}
                    color="primary"
                  >
                    Total Sales
                  </Button>
                  <Button
                    variant={
                      displayUnit === "Quantity" ? "contained" : "outlined"
                    }
                    onClick={() => setDisplayUnit("Quantity")}
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
                <TableCell>Month</TableCell>
                <TableCell align="right">Total Sales</TableCell>
                <TableCell align="right">Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlySales.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.month}</TableCell>
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

export default MonthlySales;
