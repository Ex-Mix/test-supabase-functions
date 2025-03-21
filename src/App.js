import { useContext, useState } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { supabase } from "./supabaseClient"; // เพิ่มบรรทัดนี้
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Login from "./Login";
import MonthlySales from "./MonthlySales";
import SalesByLocation from "./SalesByLocation";
import SalesByProduct from "./SalesByProduct";
import Stock from "./Stock";
import Dashboard from "./Dashboard";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShowChart as ShowChartIcon,
  LocationOn as LocationIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  LogoutRounded as LogoutIcon,
} from "@mui/icons-material";

function App() {
  const { user, loading } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setDrawerOpen(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const menuItems = [
    { text: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { text: "Monthly Sales", path: "/monthly-sales", icon: <ShowChartIcon /> },
    {
      text: "Sales by Location",
      path: "/sales-by-location",
      icon: <LocationIcon />,
    },
    {
      text: "Sales by Product",
      path: "/sales-by-product",
      icon: <CategoryIcon />,
    },
    { text: "Stock", path: "/stock", icon: <InventoryIcon /> },
  ];

  const drawer = (
    <div>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              "&.Mui-selected": {
                backgroundColor: "primary.light",
                "&:hover": {
                  backgroundColor: "primary.light",
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color:
                  location.pathname === item.path ? "primary.main" : "inherit",
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      {user && (
        <>
          <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }} // ลบ display none สำหรับหน้าจอใหญ่
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{ flexGrow: 1 }}
              >
                Sales Dashboard
              </Typography>
              <IconButton color="inherit" onClick={handleLogout} title="Logout">
                <LogoutIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
          <Drawer
            variant={isMobile ? "temporary" : "persistent"}
            open={isMobile ? drawerOpen : drawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              width: 240,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: 240,
                boxSizing: "border-box",
              },
            }}
          >
            {drawer}
          </Drawer>
        </>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: "100%",
          marginLeft: !isMobile && drawerOpen ? "240px" : 0,
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/" />}
          />
          <Route
            path="/monthly-sales"
            element={user ? <MonthlySales /> : <Navigate to="/" />}
          />
          <Route
            path="/sales-by-location"
            element={user ? <SalesByLocation /> : <Navigate to="/" />}
          />
          <Route
            path="/sales-by-product"
            element={user ? <SalesByProduct /> : <Navigate to="/" />}
          />
          <Route
            path="/stock"
            element={user ? <Stock /> : <Navigate to="/" />}
          />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
