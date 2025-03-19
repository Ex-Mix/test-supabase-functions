import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { fetchSalesData, fetchImportsData, fetchLocationsData } from "./utils/fetchData";
import { getCachedData, setCachedData } from "./utils/cache";

function Stock() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [stockData, setStockData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Define the stock thresholds for different locations
  const getStockThreshold = (locationName) => {
    // EmQuartier has a stock threshold of 15, others have 10
    return locationName.includes("เอ็มควอเทียร์") || locationName.includes("EmQuartier") || 
           locationName.includes("ซุปเปอร์มาร์เก็ต") || locationName.includes("Supermarket") ? 15 : 10;
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
          setCachedData({ sales: rawSalesData, imports: rawImportsData, locations: rawLocationsData });
        }

        const stockByLocation = {};

        rawImportsData.forEach((importItem) => {
          const locationId = importItem.location_id;
          const productId = importItem.product_id || "Unknown";
          const key = `${locationId}-${productId}`;
          const importDate = new Date(importItem.import_date || importItem.created_at);

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

          if (!current.lastImportDate || importDate > new Date(current.lastImportDate)) {
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
              .filter(sale => 
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
          locationName: rawLocationsData.find(loc => loc.location_id === item.locationId)?.location || "Unknown",
          productId: item.productId,
          imported: item.imported,
          sold: item.sold,
          remaining: item.imported - item.sold,
          lastImportDate: item.lastImportDate ? item.lastImportDate.toLocaleDateString("th-TH") : "N/A",
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
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getClassNamesFor = (name) => {
    if (!sortConfig) {
      return;
    }
    return sortConfig.key === name ? sortConfig.direction : undefined;
  };

  const handleLocationChange = (event) => setSelectedLocation(event.target.value);

  // Get sorted data
  const getSortedData = () => {
    const filteredData = stockData.filter(item => 
      selectedLocation === "all" || item.locationId === selectedLocation
    );
    
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedData = getSortedData();
  const formatNumber = (num) => Number(num).toLocaleString("en-US", { minimumFractionDigits: 0 });

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Stock by Location</h1>
      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="locationSelect">Select Location: </label>
        <select id="locationSelect" value={selectedLocation} onChange={handleLocationChange}>
          <option value="all">ทุกสาขา</option>
          {locations.map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.location}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <span>Stock Status Legend:</span>
          <span style={{ color: "#FF0000", fontWeight: "bold", display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#FF0000", marginRight: "5px" }}></div>
            Critical (&lt;= 20%)
          </span>
          <span style={{ color: "#FFA500", fontWeight: "bold", display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#FFA500", marginRight: "5px" }}></div>
            Warning (&lt;= 50%)
          </span>
          <span style={{ color: "#008000", fontWeight: "bold", display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#008000", marginRight: "5px" }}></div>
            Normal (&gt; 50%)
          </span>
        </div>
        <div style={{ marginTop: "5px" }}>
          <p><small>Note: EmQuartier Supermarket max stock: 15, Other locations max stock: 10</small></p>
        </div>
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "1000px" }}>
        <thead>
          <tr>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('locationName')}
              className={getClassNamesFor('locationName')}
            >
              Location {sortConfig.key === 'locationName' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('productId')}
              className={getClassNamesFor('productId')}
            >
              Product ID {sortConfig.key === 'productId' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('imported')}
              className={getClassNamesFor('imported')}
            >
              Imported {sortConfig.key === 'imported' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('sold')}
              className={getClassNamesFor('sold')}
            >
              Sold {sortConfig.key === 'sold' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('remaining')}
              className={getClassNamesFor('remaining')}
            >
              Remaining {sortConfig.key === 'remaining' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('lastImportDate')}
              className={getClassNamesFor('lastImportDate')}
            >
              Last Import Date {sortConfig.key === 'lastImportDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('stockAtLastImport')}
              className={getClassNamesFor('stockAtLastImport')}
            >
              Stock at Last Import {sortConfig.key === 'stockAtLastImport' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
            <th 
              style={{ 
                border: "1px solid black", 
                padding: "8px", 
                cursor: "pointer",
                backgroundColor: "#f2f2f2"
              }} 
              onClick={() => requestSort('soldAfterLastImport')}
              className={getClassNamesFor('soldAfterLastImport')}
            >
              Sold After Last Import {sortConfig.key === 'soldAfterLastImport' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => {
            const statusColor = getStockStatusColor(item.remaining, item.locationName);
            const maxStock = getStockThreshold(item.locationName);
            const stockPercentage = Math.round((item.remaining / maxStock) * 100);
            
            return (
              <tr key={index}>
                <td style={{ border: "1px solid black", padding: "8px" }}>{item.locationName}</td>
                <td style={{ border: "1px solid black", padding: "8px" }}>{item.productId}</td>
                <td style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>{formatNumber(item.imported)}</td>
                <td style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>{formatNumber(item.sold)}</td>
                <td style={{ 
                  border: "1px solid black", 
                  padding: "8px", 
                  color: statusColor,
                  fontWeight: "bold",
                  backgroundColor: statusColor === "#FF0000" ? "#FFEEEE" : 
                                  statusColor === "#008000" ? "#F0FFF0" : "transparent",
                  textAlign: "right"
                }}>
                  {formatNumber(item.remaining)}
                </td>
                <td style={{ border: "1px solid black", padding: "8px" }}>{item.lastImportDate}</td>
                <td style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>{formatNumber(item.stockAtLastImport)}</td>
                <td style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>{formatNumber(item.soldAfterLastImport)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Stock;