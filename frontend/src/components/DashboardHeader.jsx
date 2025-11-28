import React, { useEffect } from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { setPageTitle } from "../utils/setPageTitle";

const DashboardHeader = () => {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) setPageTitle(`${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard`);
  }, [user]);

  return (
    <AppBar position="static" sx={{ mb: 3 }}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h6">⚡ SFV Tech Dashboard</Typography>
          {user && (
            <Typography variant="body2">
              Logged in as: <strong>{user.name}</strong> ({user.role})
            </Typography>
          )}
        </Box>
        <Button color="inherit" onClick={logout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default DashboardHeader;
