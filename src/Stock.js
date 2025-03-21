import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import {
  fetchSalesData,
  fetchImportsData,
  fetchLocationsData,
} from "./utils/fetchData";
import { getCachedData, setCachedData } from "./utils/cache";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Container,
  Card,
  CardContent,
  Grid,
} from "@mui/material";

function Stock() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [stockData, setStockData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  // Define the stock thresholds for different locations
  const getStockThreshold = (locationName) => {
    // EmQuartier has a stock threshold of 15, others have 10
    return locationName.includes("เอ็มควอเทียร์") ||
      locationName.includes("EmQuartier") ||
      locationName.includes("ซุปเปอร์มาร์เก็ต") ||
      locationName.includes("Supermarket")
      ? 15
      : 10;
  };

  // Function to determine the status color based on remaining stock
  const getStockStatusColor = (remaining, locationName) => {
    const maxStock = getStockThreshold(locationName);
    const percentage = (remaining / maxStock) * 100;

    if (percentage <= 20) {
      return "#FF0000"; // Critical - Red
    } else if (percentage <= 50) {
      return "#FFA500"; // Warning - Orange
    } else {
      return "#008000"; // Normal - Green
    }
  };

  useEffect(() => {
    if (!user || authLoading) return;

    const loadData = async () => {
      try {
        const cached = getCachedData();
        let rawSalesData = cached?.sales;
        let rawImportsData = cached?.imports;
        let rawLocationsData = cached?.locations;

        if (!rawSalesData || !rawImportsData || !rawLocationsData) {
          rawSalesData = await fetchSalesData();
          rawImportsData = await fetchImportsData();
          rawLocationsData = await fetchLocationsData();
          setCachedData({
            sales: rawSalesData,
            imports: rawImportsData,
            locations: rawLocationsData,
          });
        }

        const stockByLocation = {};

        rawImportsData.forEach((importItem) => {
          const locationId = importItem.location_id;
          const productId = importItem.product_id || "Unknown";
          const key = `${locationId}-${productId}`;
          const importDate = new Date(
            importItem.import_date || importItem.created_at
          );

          if (!stockByLocation[key]) {
            stockByLocation[key] = {
              locationId,
              productId,
              imported: 0,
              sold: 0,
              lastImportDate: null,
              stockAtLastImport: 0,
              soldAfterLastImport: 0,
            };
          }

          const current = stockByLocation[key];
          current.imported += Number(importItem.quantity);

          if (
            !current.lastImportDate ||
            importDate > new Date(current.lastImportDate)
          ) {
            current.lastImportDate = importDate;
          }
        });

        rawSalesData.forEach((sale) => {
          const locationId = sale.location_id;
          const productId = sale.product_id || "Unknown";
          const key = `${locationId}-${productId}`;
          const saleDate = new Date(sale.sale_date);

          if (!stockByLocation[key]) {
            stockByLocation[key] = {
              locationId,
              productId,
              imported: 0,
              sold: 0,
              lastImportDate: null,
              stockAtLastImport: 0,
              soldAfterLastImport: 0,
            };
          }

          const current = stockByLocation[key];
          current.sold += Number(sale.quantity);

          if (current.lastImportDate && saleDate >= current.lastImportDate) {
            current.soldAfterLastImport += Number(sale.quantity);
          }
        });

        Object.values(stockByLocation).forEach((item) => {
          if (item.lastImportDate) {
            const dayBeforeLastImport = new Date(item.lastImportDate);
            dayBeforeLastImport.setDate(dayBeforeLastImport.getDate() - 1);

            const salesBeforeLastImport = rawSalesData
              .filter(
                (sale) =>
                  sale.location_id === item.locationId &&
                  sale.product_id === item.productId &&
                  new Date(sale.sale_date) <= dayBeforeLastImport
              )
              .reduce((sum, sale) => sum + Number(sale.quantity), 0);

            item.stockAtLastImport = item.imported - salesBeforeLastImport;
          } else {
            item.stockAtLastImport = item.imported;
          }
        });

        const stockArray = Object.values(stockByLocation).map((item) => ({
          locationId: item.locationId,
          locationName:
            rawLocationsData.find((loc) => loc.location_id === item.locationId)
              ?.location || "Unknown",
          productId: item.productId,
          imported: item.imported,
          sold: item.sold,
          remaining: item.imported - item.sold,
          lastImportDate: item.lastImportDate
            ? item.lastImportDate.toLocaleDateString("th-TH")
            : "N/A",
          stockAtLastImport: item.stockAtLastImport,
          soldAfterLastImport: item.soldAfterLastImport,
        }));

        setStockData(stockArray);
        setLocations(rawLocationsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, authLoading]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const handleLocationChange = (event) =>
    setSelectedLocation(event.target.value);

  // Get sorted data
  const getSortedData = () => {
    const filteredData = stockData.filter(
      (item) =>
        selectedLocation === "all" || item.locationId === selectedLocation
    );

    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedData = getSortedData();
  const formatNumber = (num) =>
    Number(num).toLocaleString("en-US", { minimumFractionDigits: 0 });

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Stock by Location
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Location</InputLabel>
                  <Select
                    value={selectedLocation}
                    onChange={handleLocationChange}
                    label="Select Location"
                  >
                    <MenuItem value="all">ทุกสาขา</MenuItem>
                    {locations.map((loc) => (
                      <MenuItem key={loc.location_id} value={loc.location_id}>
                        {loc.location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="subtitle1">
                    Stock Status Legend:
                  </Typography>
                  {[
                    {
                      color: "#FF0000",
                      label: "Critical (≤ 20%)",
                      bg: "#FFEEEE",
                    },
                    {
                      color: "#FFA500",
                      label: "Warning (≤ 50%)",
                      bg: "#FFF3E0",
                    },
                    {
                      color: "#008000",
                      label: "Normal (> 50%)",
                      bg: "#F0FFF0",
                    },
                  ].map((status) => (
                    <Box
                      key={status.color}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        bgcolor: status.bg,
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          bgcolor: status.color,
                          borderRadius: "2px",
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: status.color, fontWeight: "bold" }}
                      >
                        {status.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                  Note: EmQuartier Supermarket max stock: 15, Other locations
                  max stock: 10
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  { key: "locationName", label: "Location" },
                  { key: "productId", label: "Product ID" },
                  { key: "imported", label: "Imported" },
                  { key: "sold", label: "Sold" },
                  { key: "remaining", label: "Remaining" },
                  { key: "lastImportDate", label: "Last Import Date" },
                  { key: "stockAtLastImport", label: "Stock at Last Import" },
                  {
                    key: "soldAfterLastImport",
                    label: "Sold After Last Import",
                  },
                ].map((column) => (
                  <TableCell
                    key={column.key}
                    onClick={() => requestSort(column.key)}
                    sx={{
                      cursor: "pointer",
                      fontWeight: "bold",
                      bgcolor: "grey.100",
                      "&:hover": {
                        bgcolor: "grey.200",
                      },
                    }}
                  >
                    {column.label}
                    {sortConfig.key === column.key && (
                      <Box component="span" sx={{ ml: 1 }}>
                        {sortConfig.direction === "ascending" ? "↑" : "↓"}
                      </Box>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((item, index) => {
                const statusColor = getStockStatusColor(
                  item.remaining,
                  item.locationName
                );
                

                return (
                  <TableRow key={index}>
                    <TableCell>{item.locationName}</TableCell>
                    <TableCell>{item.productId}</TableCell>
                    <TableCell align="right">
                      {formatNumber(item.imported)}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(item.sold)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: statusColor,
                        fontWeight: "bold",
                        bgcolor:
                          statusColor === "#FF0000"
                            ? "#FFEEEE"
                            : statusColor === "#008000"
                            ? "#F0FFF0"
                            : "transparent",
                      }}
                    >
                      {formatNumber(item.remaining)}
                    </TableCell>
                    <TableCell>{item.lastImportDate}</TableCell>
                    <TableCell align="right">
                      {formatNumber(item.stockAtLastImport)}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(item.soldAfterLastImport)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}

export default Stock;
