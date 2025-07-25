import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, Organization, User } from '@database/entities';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface UsageMetrics {
  agentExecutions: { used: number; limit: number };
  toolExecutions: { used: number; limit: number };
  knowledgeStorage: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
  billing: {
    currentPlan: string;
    billingPeriod: string;
    currentUsage: number;
    projectedTotal: number;
  };
}

export interface BillingStats {
  totalRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  monthlyRecurringRevenue: number;
}

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2024-06-20',
      },
    );
  }

  async getUsageMetrics(organizationId: string): Promise<UsageMetrics> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['subscription'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const subscription = organization.subscription;
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    // Get current usage from organization quotas
    const quotas = organization.quotas || {
      agentExecutions: 1000,
      toolExecutions: 5000,
      knowledgeStorage: 10,
      apiCalls: 10000,
    };

    const usage = organization.usage || {
      agentExecutions: 0,
      toolExecutions: 0,
      knowledgeStorage: 0,
      apiCalls: 0,
    };

    return {
      agentExecutions: {
        used: usage.agentExecutions,
        limit: quotas.agentExecutions,
      },
      toolExecutions: {
        used: usage.toolExecutions,
        limit: quotas.toolExecutions,
      },
      knowledgeStorage: {
        used: usage.knowledgeStorage,
        limit: quotas.knowledgeStorage,
      },
      apiCalls: {
        used: usage.apiCalls,
        limit: quotas.apiCalls,
      },
      billing: {
        currentPlan: subscription?.planType || 'free',
        billingPeriod: this.getBillingPeriod(startOfMonth),
        currentUsage: this.calculateCurrentUsage(usage),
        projectedTotal: this.calculateProjectedTotal(usage, quotas),
      },
    };
  }

  async getBillingStats(organizationId?: string): Promise<BillingStats> {
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.organization', 'organization');

    if (organizationId) {
      queryBuilder.where('organization.id = :organizationId', {
        organizationId,
      });
    }

    const subscriptions = await queryBuilder.getMany();
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'active',
    );

    const totalRevenue = activeSubscriptions.reduce((sum, sub) => {
      return sum + (sub.amount || 0);
    }, 0);

    const averageRevenuePerUser =
      activeSubscriptions.length > 0
        ? totalRevenue / activeSubscriptions.length
        : 0;

    return {
      totalRevenue,
      activeSubscriptions: activeSubscriptions.length,
      churnRate: this.calculateChurnRate(subscriptions),
      averageRevenuePerUser,
      monthlyRecurringRevenue: totalRevenue,
    };
  }

  async createSubscription(
    organizationId: string,
    planType: string,
    paymentMethodId: string,
  ) {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Create Stripe customer if not exists
    let customerId = organization.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: organization.name,
        metadata: {
          organizationId,
        },
      });
      customerId = customer.id;

      await this.organizationRepository.update(organizationId, {
        stripeCustomerId: customerId,
      });
    }

    // Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Create subscription
    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: this.getPriceIdForPlan(planType),
        },
      ],
      default_payment_method: paymentMethodId,
    });

    // Save subscription to database
    const subscription = this.subscriptionRepository.create({
      organizationId,
      stripeSubscriptionId: stripeSubscription.id,
      planType,
      status: stripeSubscription.status,
      amount: stripeSubscription.items.data[0]?.price.unit_amount || 0,
      currency: stripeSubscription.items.data[0]?.price.currency || 'usd',
      currentPeriodStart: new Date(
        stripeSubscription.current_period_start * 1000,
      ),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    });

    return this.subscriptionRepository.save(subscription);
  }

  async updateSubscription(organizationId: string, planType: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organizationId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Update Stripe subscription
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: this.getPriceIdForPlan(planType),
        },
      ],
    });

    // Update local subscription
    subscription.planType = planType;
    subscription.updatedAt = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(organizationId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organizationId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Cancel Stripe subscription
    await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    // Update local subscription
    subscription.status = 'canceled';
    subscription.updatedAt = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async getInvoices(organizationId: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization?.stripeCustomerId) {
      return [];
    }

    const invoices = await this.stripe.invoices.list({
      customer: organization.stripeCustomerId,
      limit: 100,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: new Date(invoice.created * 1000),
      pdfUrl: invoice.invoice_pdf,
    }));
  }

  private getBillingPeriod(startDate: Date): string {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);

    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }

  private calculateCurrentUsage(usage: any): number {
    // Simple calculation - in production, this would be more sophisticated
    const agentCost = usage.agentExecutions * 0.01;
    const toolCost = usage.toolExecutions * 0.005;
    const storageCost = usage.knowledgeStorage * 0.1;
    const apiCost = usage.apiCalls * 0.001;

    return agentCost + toolCost + storageCost + apiCost;
  }

  private calculateProjectedTotal(usage: any, quotas: any): number {
    const currentUsage = this.calculateCurrentUsage(usage);
    const daysInMonth = new Date().getDate();
    const totalDaysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    ).getDate();

    return (currentUsage / daysInMonth) * totalDaysInMonth;
  }

  private calculateChurnRate(subscriptions: any[]): number {
    const canceledThisMonth = subscriptions.filter(
      (s) =>
        s.status === 'canceled' &&
        new Date(s.updatedAt).getMonth() === new Date().getMonth(),
    ).length;

    const totalSubscriptions = subscriptions.length;
    return totalSubscriptions > 0
      ? (canceledThisMonth / totalSubscriptions) * 100
      : 0;
  }

  private getPriceIdForPlan(planType: string): string {
    const priceIds = {
      starter:
        this.configService.get<string>('STRIPE_STARTER_PRICE_ID') ||
        'price_starter',
      professional:
        this.configService.get<string>('STRIPE_PROFESSIONAL_PRICE_ID') ||
        'price_professional',
      enterprise:
        this.configService.get<string>('STRIPE_ENTERPRISE_PRICE_ID') ||
        'price_enterprise',
    };

    return priceIds[planType] || priceIds.starter;
  }
}
