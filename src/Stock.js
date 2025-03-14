// Stock.js
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
  const [filters, setFilters] = useState({ locationName: "", productId: "" });

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

  const handleLocationChange = (event) => setSelectedLocation(event.target.value);
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value.toLowerCase() }));
  };

  const filteredStock = stockData
    .filter(item => selectedLocation === "all" || item.locationId === selectedLocation)
    .filter(item => 
      item.locationName.toLowerCase().includes(filters.locationName) &&
      item.productId.toLowerCase().includes(filters.productId)
    );

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
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "1000px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "8px" }}>
              Location
              <br />
              <input type="text" name="locationName" value={filters.locationName} onChange={handleFilterChange} placeholder="Filter Location" style={{ width: "90%", marginTop: "5px" }} />
            </th>
            <th style={{ border: "1px solid black", padding: "8px" }}>
              Product ID
              <br />
              <input type="text" name="productId" value={filters.productId} onChange={handleFilterChange} placeholder="Filter Product ID" style={{ width: "90%", marginTop: "5px" }} />
            </th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Imported</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Sold</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Remaining</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Last Import Date</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Stock at Last Import</th>
            <th style={{ border: "1px solid black", padding: "8px" }}>Sold After Last Import</th>
          </tr>
        </thead>
        <tbody>
          {filteredStock.map((item, index) => (
            <tr key={index}>
              <td style={{ border: "1px solid black", padding: "8px" }}>{item.locationName}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{item.productId}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.imported)}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.sold)}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.remaining)}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{item.lastImportDate}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.stockAtLastImport)}</td>
              <td style={{ border: "1px solid black", padding: "8px" }}>{formatNumber(item.soldAfterLastImport)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Stock;