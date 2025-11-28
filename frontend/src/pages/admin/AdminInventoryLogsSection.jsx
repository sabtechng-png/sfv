import React from "react";
import InventoryLogsSection from "../storekeeper/InventoryLogsSection"; // adjust the path as needed

const AdminHome = () => {
  return (
    <div>
    
      <InventoryLogsSection /> {/* 👈 this includes your materials logic & UI */}
    </div>
  );
};

export default AdminHome;
