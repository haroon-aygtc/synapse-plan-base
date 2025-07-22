
"use client";
import React from "react";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6 bg-background">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to SynapseAI. Monitor and manage your AI orchestration
          platform.
        </p>
      </div>

      <DashboardOverview />
    </div>
  );
}
