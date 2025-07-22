"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Bot, Cog, FileText, LineChart, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import QuickAccessPanel from "./QuickAccessPanel";

interface ActivityItem {
  id: string;
  type: "agent" | "workflow" | "tool" | "system";
  title: string;
  status: "completed" | "in_progress" | "failed";
  timestamp: string;
  duration?: string;
  message?: string;
}

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard = ({
  title,
  value,
  description,
  icon,
  trend,
}: StatsCardProps) => {
  return (
    <Card className="bg-background">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div
            className={`mt-2 flex items-center text-xs ${trend.isPositive ? "text-green-500" : "text-red-500"}`}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}%
            <span className="text-muted-foreground ml-1">
              {trend.isPositive ? "increase" : "decrease"} from last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ActivityFeed = ({ activities }: { activities: ActivityItem[] }) => {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start space-x-4 rounded-md border p-3 bg-background"
        >
          <div className="rounded-full p-2 bg-muted">
            {activity.type === "agent" && <Bot size={16} />}
            {activity.type === "workflow" && <Activity size={16} />}
            {activity.type === "tool" && <Cog size={16} />}
            {activity.type === "system" && <Zap size={16} />}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{activity.title}</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {activity.message || `${activity.type} execution`}
              </p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${activity.status === "completed" ? "bg-green-100 text-green-800" : activity.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}
              >
                {activity.status === "completed"
                  ? "Completed"
                  : activity.status === "in_progress"
                    ? "In Progress"
                    : "Failed"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{activity.timestamp}</span>
              {activity.duration && <span>{activity.duration}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ResourceUsage = () => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Agent Executions</span>
          <span className="text-sm text-muted-foreground">2,450 / 5,000</span>
        </div>
        <Progress value={49} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Tool Executions</span>
          <span className="text-sm text-muted-foreground">1,280 / 10,000</span>
        </div>
        <Progress value={12.8} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Knowledge Base Storage</span>
          <span className="text-sm text-muted-foreground">1.2 GB / 5 GB</span>
        </div>
        <Progress value={24} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">API Calls</span>
          <span className="text-sm text-muted-foreground">8,920 / 50,000</span>
        </div>
        <Progress value={17.8} className="h-2" />
      </div>

      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium">Billing Summary</h4>
        <div className="rounded-md border p-4 bg-background">
          <div className="flex items-center justify-between">
            <span className="text-sm">Current Plan</span>
            <span className="text-sm font-medium">Professional</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Billing Period</span>
            <span className="text-sm">May 1 - May 31, 2023</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Current Usage</span>
            <span className="text-sm font-medium">$124.50</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Projected Total</span>
            <span className="text-sm font-medium">$189.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardOverview = () => {
  // Mock data for the dashboard
  const recentActivities: ActivityItem[] = [
    {
      id: "1",
      type: "agent",
      title: "Customer Support Agent",
      status: "completed",
      timestamp: "2 minutes ago",
      duration: "3.2s",
      message: "Resolved customer inquiry about billing",
    },
    {
      id: "2",
      type: "workflow",
      title: "Order Processing Workflow",
      status: "in_progress",
      timestamp: "15 minutes ago",
      message: "Processing new order #12345",
    },
    {
      id: "3",
      type: "tool",
      title: "Email Notification Tool",
      status: "completed",
      timestamp: "1 hour ago",
      duration: "1.5s",
      message: "Sent order confirmation email",
    },
    {
      id: "4",
      type: "agent",
      title: "Data Analysis Agent",
      status: "failed",
      timestamp: "2 hours ago",
      message: "Error processing sales data",
    },
    {
      id: "5",
      type: "system",
      title: "System Notification",
      status: "completed",
      timestamp: "3 hours ago",
      message: "Automatic backup completed",
    },
  ];

  return (
    <div className="flex flex-col space-y-6 bg-muted/40 p-6 rounded-lg">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Agents"
          value="24"
          description="Total active AI agents"
          icon={<Bot size={16} />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Tool Executions"
          value="1,280"
          description="This month with $45.20 cost"
          icon={<Cog size={16} />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Workflow Completions"
          value="342"
          description="95.8% success rate"
          icon={<Activity size={16} />}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Knowledge Base"
          value="156"
          description="Documents with 432 searches"
          icon={<FileText size={16} />}
          trend={{ value: 24, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tabs defaultValue="activity" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="activity">Activity Feed</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              <select className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <TabsContent value="activity" className="mt-4 space-y-4">
              <ActivityFeed activities={recentActivities} />
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="flex flex-col items-center text-center text-muted-foreground">
                    <LineChart className="h-16 w-16 mb-2" />
                    <p>Analytics visualization would appear here</p>
                    <p className="text-sm">
                      Showing agent performance, tool usage, and workflow
                      efficiency
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <QuickAccessPanel />

          <Card className="bg-background">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Resource Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResourceUsage />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
