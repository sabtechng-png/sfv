import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

/**
 * Reusable metric card for dashboard tiles.
 * Props:
 *  - title: string
 *  - value: number | string
 *  - subtitle: string (optional)
 *  - icon: JSX element
 *  - color: string (primary accent)
 *  - to: route path
 */
const DashboardCard = ({ title, value, subtitle, icon, color, to }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(to)}
      sx={{
        cursor: "pointer",
        borderRadius: 3,
        boxShadow: 2,
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: 6,
        },
        backgroundColor: "#ffffff",
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Icon container */}
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: color + "22", // light tint
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
            fontSize: 32,
          }}
        >
          {icon}
        </Box>

        {/* Text section */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#0d1b2a" }}>
            {title}
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color, mt: 0.5, lineHeight: 1.2 }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: "gray", mt: 0.3 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
