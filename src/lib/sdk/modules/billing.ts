/**
 * Billing Module
 * Manages usage tracking, quotas, and billing operations
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  UsageMetric,
  BillingUsage,
  ResourceType,
  SubscriptionPlan,
  RequestOptions,
} from "../types";

export interface UsageQuery {
  resourceType?: ResourceType;
  resourceId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  granularity?: "hour" | "day" | "week" | "month";
}

export interface QuotaStatus {
  resourceType: ResourceType;
  used: number;
  limit: number;
  percentage: number;
  resetDate: Date;
  isExceeded: boolean;
  warningThreshold: number;
}

export interface BillingPeriod {
  start: Date;
  end: Date;
  status: "current" | "past" | "future";
}

export interface Invoice {
  id: string;
  organizationId: string;
  period: BillingPeriod;
  totalAmount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  lineItems: Array<{
    resourceType: ResourceType;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: Date;
  dueDate: Date;
  paidAt?: Date;
}

export interface PlanLimits {
  [ResourceType.AGENT_EXECUTION]: number;
  [ResourceType.TOOL_EXECUTION]: number;
  [ResourceType.WORKFLOW_EXECUTION]: number;
  [ResourceType.KNOWLEDGE_SEARCH]: number;
  [ResourceType.STORAGE]: number;
  [ResourceType.API_CALL]: number;
}

export interface BillingAlert {
  id: string;
  type:
    | "quota_warning"
    | "quota_exceeded"
    | "cost_threshold"
    | "payment_failed";
  resourceType?: ResourceType;
  threshold: number;
  currentValue: number;
  message: string;
  isActive: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
}

/**
 * Billing Module Class
 */
export class BillingModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/billing");
  }

  /**
   * Get current usage for organization
   */
  async getCurrentUsage(
    options: RequestOptions = {},
  ): Promise<APIResponse<BillingUsage>> {
    this.debug("Getting current usage");

    return this.get<BillingUsage>("/usage/current", options);
  }

  /**
   * Get usage metrics with filtering
   */
  async getUsageMetrics(
    query: UsageQuery = {},
    options: RequestOptions = {},
  ): Promise<APIResponse<UsageMetric[]>> {
    this.debug("Getting usage metrics", query);

    const params: Record<string, any> = {
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      userId: query.userId,
      granularity: query.granularity || "day",
    };

    if (query.startDate) {
      params.startDate = query.startDate.toISOString();
    }

    if (query.endDate) {
      params.endDate = query.endDate.toISOString();
    }

    return this.get<UsageMetric[]>(
      `/usage/metrics${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Get usage for specific period
   */
  async getUsageForPeriod(
    period: BillingPeriod,
    options: RequestOptions = {},
  ): Promise<APIResponse<BillingUsage>> {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting usage for period", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<BillingUsage>(
      `/usage/period${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Get quota status for all resources
   */
  async getQuotaStatus(
    options: RequestOptions = {},
  ): Promise<APIResponse<QuotaStatus[]>> {
    this.debug("Getting quota status");

    return this.get<QuotaStatus[]>("/quotas/status", options);
  }

  /**
   * Get quota status for specific resource type
   */
  async getResourceQuota(
    resourceType: ResourceType,
    options: RequestOptions = {},
  ): Promise<APIResponse<QuotaStatus>> {
    this.validateRequired({ resourceType }, ["resourceType"]);

    this.debug("Getting resource quota", { resourceType });

    return this.get<QuotaStatus>(`/quotas/${resourceType}`, options);
  }

  /**
   * Update quota limits (admin only)
   */
  async updateQuotaLimits(
    limits: Partial<PlanLimits>,
    options: RequestOptions = {},
  ): Promise<APIResponse<PlanLimits>> {
    this.validateRequired({ limits }, ["limits"]);

    this.debug("Updating quota limits", limits);

    const response = await this.put<PlanLimits>(
      "/quotas/limits",
      limits,
      options,
    );

    this.emit("billing:quotas_updated", response.data);
    return response;
  }

  /**
   * Track usage (internal use)
   */
  async trackUsage(
    usage: {
      resourceType: ResourceType;
      resourceId: string;
      quantity: number;
      cost?: number;
      metadata?: Record<string, any>;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<UsageMetric>> {
    this.validateRequired(usage, ["resourceType", "resourceId", "quantity"]);

    this.debug("Tracking usage", usage);

    const response = await this.post<UsageMetric>(
      "/usage/track",
      {
        ...usage,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
        timestamp: new Date(),
      },
      options,
    );

    this.emit("billing:usage_tracked", response.data);
    return response;
  }

  /**
   * Get billing history
   */
  async getBillingHistory(
    query: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<BillingUsage>> {
    this.debug("Getting billing history", query);

    const params: Record<string, any> = {
      page: query.page,
      limit: query.limit,
    };

    if (query.startDate) {
      params.startDate = query.startDate.toISOString();
    }

    if (query.endDate) {
      params.endDate = query.endDate.toISOString();
    }

    return this.getPaginated<BillingUsage>("/history", params, options);
  }

  /**
   * Get invoices
   */
  async getInvoices(
    query: {
      page?: number;
      limit?: number;
      status?: Invoice["status"];
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<Invoice>> {
    this.debug("Getting invoices", query);

    const params: Record<string, any> = {
      page: query.page,
      limit: query.limit,
      status: query.status,
    };

    if (query.startDate) {
      params.startDate = query.startDate.toISOString();
    }

    if (query.endDate) {
      params.endDate = query.endDate.toISOString();
    }

    return this.getPaginated<Invoice>("/invoices", params, options);
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(
    invoiceId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<Invoice>> {
    this.validateRequired({ invoiceId }, ["invoiceId"]);

    this.debug("Getting invoice", { invoiceId });

    return this.get<Invoice>(`/invoices/${invoiceId}`, options);
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(
    invoiceId: string,
    options: RequestOptions = {},
  ): Promise<Blob> {
    this.validateRequired({ invoiceId }, ["invoiceId"]);

    this.debug("Downloading invoice", { invoiceId });

    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/billing/invoices/${invoiceId}/download`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to download invoice: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Get current subscription plan
   */
  async getCurrentPlan(options: RequestOptions = {}): Promise<
    APIResponse<{
      plan: SubscriptionPlan;
      limits: PlanLimits;
      features: string[];
      billingCycle: "monthly" | "yearly";
      nextBillingDate: Date;
      cancelledAt?: Date;
    }>
  > {
    this.debug("Getting current plan");

    return this.get("/plan/current", options);
  }

  /**
   * Get available plans
   */
  async getAvailablePlans(options: RequestOptions = {}): Promise<
    APIResponse<
      Array<{
        plan: SubscriptionPlan;
        name: string;
        description: string;
        limits: PlanLimits;
        features: string[];
        pricing: {
          monthly: number;
          yearly: number;
          currency: string;
        };
      }>
    >
  > {
    this.debug("Getting available plans");

    return this.get("/plans", options);
  }

  /**
   * Upgrade/downgrade subscription plan
   */
  async changePlan(
    data: {
      plan: SubscriptionPlan;
      billingCycle: "monthly" | "yearly";
      effectiveDate?: Date;
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      success: boolean;
      effectiveDate: Date;
      prorationAmount?: number;
    }>
  > {
    this.validateRequired(data, ["plan", "billingCycle"]);

    this.debug("Changing subscription plan", data);

    const response = await this.post(
      "/plan/change",
      {
        ...data,
        effectiveDate: data.effectiveDate?.toISOString(),
      },
      options,
    );

    this.emit("billing:plan_changed", response.data);
    return response;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    data: {
      reason?: string;
      effectiveDate?: Date;
      feedback?: string;
    } = {},
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      success: boolean;
      effectiveDate: Date;
      accessUntil: Date;
    }>
  > {
    this.debug("Cancelling subscription", data);

    const response = await this.post(
      "/plan/cancel",
      {
        ...data,
        effectiveDate: data.effectiveDate?.toISOString(),
      },
      options,
    );

    this.emit("billing:subscription_cancelled", response.data);
    return response;
  }

  /**
   * Get billing alerts
   */
  async getBillingAlerts(
    query: {
      page?: number;
      limit?: number;
      type?: BillingAlert["type"];
      isActive?: boolean;
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<BillingAlert>> {
    this.debug("Getting billing alerts", query);

    return this.getPaginated<BillingAlert>("/alerts", query, options);
  }

  /**
   * Create billing alert
   */
  async createBillingAlert(
    data: {
      type: BillingAlert["type"];
      resourceType?: ResourceType;
      threshold: number;
      message?: string;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<BillingAlert>> {
    this.validateRequired(data, ["type", "threshold"]);

    this.debug("Creating billing alert", data);

    const response = await this.post<BillingAlert>("/alerts", data, options);

    this.emit("billing:alert_created", response.data);
    return response;
  }

  /**
   * Acknowledge billing alert
   */
  async acknowledgeBillingAlert(
    alertId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<BillingAlert>> {
    this.validateRequired({ alertId }, ["alertId"]);

    this.debug("Acknowledging billing alert", { alertId });

    const response = await this.post<BillingAlert>(
      `/alerts/${alertId}/acknowledge`,
      {},
      options,
    );

    this.emit("billing:alert_acknowledged", response.data);
    return response;
  }

  /**
   * Get cost breakdown
   */
  async getCostBreakdown(
    period: BillingPeriod,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      totalCost: number;
      currency: string;
      breakdown: Array<{
        resourceType: ResourceType;
        cost: number;
        quantity: number;
        unitCost: number;
        percentage: number;
      }>;
      trends: Array<{
        date: string;
        cost: number;
        resourceBreakdown: Record<ResourceType, number>;
      }>;
    }>
  > {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting cost breakdown", period);

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get(
      `/costs/breakdown${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Estimate cost for usage
   */
  async estimateCost(
    usage: Record<ResourceType, number>,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      totalCost: number;
      currency: string;
      breakdown: Array<{
        resourceType: ResourceType;
        quantity: number;
        unitCost: number;
        totalCost: number;
      }>;
    }>
  > {
    this.validateRequired({ usage }, ["usage"]);

    this.debug("Estimating cost", usage);

    return this.post("/costs/estimate", { usage }, options);
  }

  /**
   * Export usage data
   */
  async exportUsageData(
    period: BillingPeriod,
    format: "csv" | "json" | "xlsx" = "csv",
    options: RequestOptions = {},
  ): Promise<Blob> {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Exporting usage data", { period, format });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      format,
    };

    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/billing/usage/export${this.buildQueryString(params)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to export usage data: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Subscribe to quota alerts
   */
  onQuotaAlert(callback: (alert: BillingAlert) => void): () => void {
    return this.subscribe("billing:quota_alert", callback);
  }

  /**
   * Subscribe to usage updates
   */
  onUsageUpdate(callback: (usage: BillingUsage) => void): () => void {
    return this.subscribe("billing:usage_update", callback);
  }

  /**
   * Subscribe to billing events
   */
  onBillingEvent(
    callback: (event: { type: string; data: any }) => void,
  ): () => void {
    return this.subscribe("billing:event", callback);
  }
}
