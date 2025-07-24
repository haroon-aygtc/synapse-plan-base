"use client";

import React from "react";
import { HITLDashboard } from "@/components/hitl/HITLDashboard";

export default function HITLPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <HITLDashboard />
      </div>
    </div>
  );
}
