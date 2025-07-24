"use client";
import React from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="h-full w-full p-6">
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
