"use client";
import React from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto px-6 py-6">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Welcome to SynapseAI. Monitor and manage your AI orchestration
            platform.
          </p>
        </div>
        <DashboardOverview />
      </div>
    </AdminLayout>
  );
}
