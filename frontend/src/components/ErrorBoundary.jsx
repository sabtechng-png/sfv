// src/components/ErrorBoundary.jsx
import React from "react";
import { Typography, Box, Button } from "@mui/material";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError)
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" color="error" mb={2}>
            ⚠️ Something went wrong.
          </Typography>
          <Button onClick={() => window.location.reload()} variant="contained">
            Reload
          </Button>
        </Box>
      );
    return this.props.children;
  }
}
