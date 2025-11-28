import React from "react";
import { Card, CardContent, Grid, MenuItem, TextField, Typography } from "@mui/material";

const PROJECT_TYPES = [
  "Solar Installation",
  "Gate / Fabrication",
  "CCTV / Security",
  "Automation",
  "Electrical Works",
  "Other",
];

const CustomerForm = ({ customerInfo, onChange }) => {
  const handleChange = (field) => (e) => {
    onChange(field, e.target.value);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Customer Information
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Customer Name"
              fullWidth
              required
              value={customerInfo.customer_name}
              onChange={handleChange("customer_name")}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Phone"
              fullWidth
              value={customerInfo.phone}
              onChange={handleChange("phone")}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Project Type"
              required
              fullWidth
              value={customerInfo.project_type}
              onChange={handleChange("project_type")}
            >
              {PROJECT_TYPES.map((pt) => (
                <MenuItem key={pt} value={pt}>
                  {pt}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Address / Installation Location"
              fullWidth
              multiline
              minRows={2}
              value={customerInfo.address}
              onChange={handleChange("address")}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Notes / Scope of Work"
              fullWidth
              multiline
              minRows={3}
              placeholder="E.g., 3-bedroom flat solar backup, welding of main gate..."
              value={customerInfo.notes}
              onChange={handleChange("notes")}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CustomerForm;
