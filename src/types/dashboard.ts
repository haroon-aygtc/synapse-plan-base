export interface DashboardStats {
    activeAgents: {
      count: number;
      trend: {
        value: number;
        isPositive: boolean;
      };
    };
    toolExecutions: {
      count: number;
      cost: number;
      trend: {
        value: number;
        isPositive: boolean;
      };
    };
    workflowCompletions: {
      count: number;
      successRate: number;
      trend: {
        value: number;
        isPositive: boolean;
      };
    };
    knowledgeBase: {
      documentCount: number;
      searchCount: number;
      trend: {
        value: number;
        isPositive: boolean;
      };
    };
  }
  
  export interface ActivityItem {
    id: string;
    type: "agent" | "workflow" | "tool" | "system";
    title: string;
    status: "completed" | "in_progress" | "failed";
    timestamp: string;
    duration?: string;
    message?: string;
  }
  
  export interface ResourceUsage {
    agentExecutions: {
      used: number;
      limit: number;
    };
    toolExecutions: {
      used: number;
      limit: number;
    };
    knowledgeStorage: {
      used: number; // in GB
      limit: number; // in GB
    };
    apiCalls: {
      used: number;
      limit: number;
    };
    billing: {
      currentPlan: string;
      billingPeriod: string;
      currentUsage: number;
      projectedTotal: number;
    };
  }
  
  export interface DashboardData {
    stats: DashboardStats;
    activities: ActivityItem[];
    resourceUsage: ResourceUsage;
  }
  