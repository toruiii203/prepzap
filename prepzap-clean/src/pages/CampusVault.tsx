import React from "react";
import { Navigate } from "react-router-dom";

/**
 * CampusVault is now seamlessly unified into the Community Hub under the "Campus Study Vault" tab.
 * This route redirects to /community?tab=vault for backward compatibility.
 */
export default function CampusVault() {
  return <Navigate to="/community?tab=vault" replace />;
}
