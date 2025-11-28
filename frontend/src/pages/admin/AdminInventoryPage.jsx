import React from "react";
import StorekeeperInventoryPage from "../storekeeper/StorekeeperInventoryPage"; // adjust the path as needed

const AdminHome = () => {
  return (
    <div>
    
      <StorekeeperInventoryPage/> {/* 👈 this includes your materials logic & UI */}
    </div>
  );
};

export default AdminHome;
