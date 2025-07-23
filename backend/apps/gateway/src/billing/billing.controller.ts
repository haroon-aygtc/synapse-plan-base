import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get usage metrics for organization' })
  @ApiResponse({
    status: 200,
    description: 'Usage metrics retrieved successfully',
  })
  async getUsageMetrics(@Request() req: any) {
    try {
      const usage = await this.billingService.getUsageMetrics(
        req.user.organizationId,
      );
      return {
        success: true,
        data: usage,
        message: 'Usage metrics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get billing statistics' })
  @ApiResponse({
    status: 200,
    description: 'Billing statistics retrieved successfully',
  })
  async getBillingStats(@Request() req: any) {
    try {
      const stats = await this.billingService.getBillingStats(
        req.user.organizationId,
      );
      return {
        success: true,
        data: stats,
        message: 'Billing statistics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subscription')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async createSubscription(
    @Body() body: { planType: string; paymentMethodId: string },
    @Request() req: any,
  ) {
    try {
      const subscription = await this.billingService.createSubscription(
        req.user.organizationId,
        body.planType,
        body.paymentMethodId,
      );
      return {
        success: true,
        data: subscription,
        message: 'Subscription created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('subscription')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  async updateSubscription(
    @Body() body: { planType: string },
    @Request() req: any,
  ) {
    try {
      const subscription = await this.billingService.updateSubscription(
        req.user.organizationId,
        body.planType,
      );
      return {
        success: true,
        data: subscription,
        message: 'Subscription updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('subscription')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
  })
  async cancelSubscription(@Request() req: any) {
    try {
      const subscription = await this.billingService.cancelSubscription(
        req.user.organizationId,
      );
      return {
        success: true,
        data: subscription,
        message: 'Subscription canceled successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get billing invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoices(@Request() req: any) {
    try {
      const invoices = await this.billingService.getInvoices(
        req.user.organizationId,
      );
      return {
        success: true,
        data: invoices,
        message: 'Invoices retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available billing plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'usd',
        interval: 'month',
        features: [
          '100 agent executions/month',
          '500 tool executions/month',
          '1GB knowledge storage',
          '1,000 API calls/month',
          'Basic support',
        ],
        limits: {
          agentExecutions: 100,
          toolExecutions: 500,
          knowledgeStorage: 1,
          apiCalls: 1000,
        },
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 29,
        currency: 'usd',
        interval: 'month',
        features: [
          '1,000 agent executions/month',
          '5,000 tool executions/month',
          '10GB knowledge storage',
          '10,000 API calls/month',
          'Email support',
          'Basic analytics',
        ],
        limits: {
          agentExecutions: 1000,
          toolExecutions: 5000,
          knowledgeStorage: 10,
          apiCalls: 10000,
        },
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 99,
        currency: 'usd',
        interval: 'month',
        features: [
          '10,000 agent executions/month',
          '50,000 tool executions/month',
          '100GB knowledge storage',
          '100,000 API calls/month',
          'Priority support',
          'Advanced analytics',
          'Custom integrations',
        ],
        limits: {
          agentExecutions: 10000,
          toolExecutions: 50000,
          knowledgeStorage: 100,
          apiCalls: 100000,
        },
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 299,
        currency: 'usd',
        interval: 'month',
        features: [
          'Unlimited agent executions',
          'Unlimited tool executions',
          '1TB knowledge storage',
          'Unlimited API calls',
          '24/7 dedicated support',
          'Custom analytics',
          'White-label options',
          'SLA guarantee',
        ],
        limits: {
          agentExecutions: -1, // -1 means unlimited
          toolExecutions: -1,
          knowledgeStorage: 1000,
          apiCalls: -1,
        },
      },
    ];

    return {
      success: true,
      data: plans,
      message: 'Plans retrieved successfully',
    };
  }
}
