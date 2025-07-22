import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '@database/entities';
import { IOrganization, SubscriptionPlan } from '@shared/interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType } from '@shared/enums';

interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logo?: string;
  plan?: SubscriptionPlan;
}

interface UpdateOrganizationData {
  name?: string;
  description?: string;
  website?: string;
  logo?: string;
  plan?: SubscriptionPlan;
  settings?: Record<string, any>;
  quotas?: Record<string, number>;
  isActive?: boolean;
}

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organizationData: CreateOrganizationData,
  ): Promise<IOrganization> {
    // Check if organization with slug already exists
    const existingOrg = await this.findBySlug(organizationData.slug);
    if (existingOrg) {
      throw new ConflictException('Organization with this slug already exists');
    }

    // Set default quotas based on plan
    const defaultQuotas = this.getDefaultQuotas(
      organizationData.plan || SubscriptionPlan.FREE,
    );

    const organization = this.organizationRepository.create({
      ...organizationData,
      plan: organizationData.plan || SubscriptionPlan.FREE,
      quotas: defaultQuotas,
      settings: {
        allowUserRegistration: true,
        requireEmailVerification: true,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        maxFailedLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
        ...organizationData.settings,
      },
      isActive: true,
    });

    const savedOrganization =
      await this.organizationRepository.save(organization);

    // Emit organization created event
    this.eventEmitter.emit(EventType.ORGANIZATION_CREATED, {
      organizationId: savedOrganization.id,
      name: savedOrganization.name,
      slug: savedOrganization.slug,
      plan: savedOrganization.plan,
      timestamp: new Date(),
    });

    return savedOrganization;
  }

  async findById(id: string): Promise<IOrganization | null> {
    if (!id) {
      return null;
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    return organization;
  }

  async findBySlug(slug: string): Promise<IOrganization | null> {
    if (!slug) {
      return null;
    }

    const organization = await this.organizationRepository.findOne({
      where: { slug: slug.toLowerCase() },
      relations: ['users'],
    });

    return organization;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    plan?: SubscriptionPlan;
    isActive?: boolean;
  }): Promise<{ organizations: IOrganization[]; total: number }> {
    const { page = 1, limit = 10, plan, isActive } = options || {};

    const whereConditions: any = {};

    if (plan !== undefined) {
      whereConditions.plan = plan;
    }

    if (isActive !== undefined) {
      whereConditions.isActive = isActive;
    }

    const [organizations, total] =
      await this.organizationRepository.findAndCount({
        where: whereConditions,
        relations: ['users'],
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
      });

    return { organizations, total };
  }

  async update(
    id: string,
    updateData: UpdateOrganizationData,
  ): Promise<IOrganization> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Update quotas if plan is changing
    if (updateData.plan && updateData.plan !== organization.plan) {
      updateData.quotas = {
        ...organization.quotas,
        ...this.getDefaultQuotas(updateData.plan),
        ...updateData.quotas,
      };
    }

    await this.organizationRepository.update(id, updateData);

    const updatedOrganization = await this.findById(id);

    // Emit organization updated event
    this.eventEmitter.emit(EventType.ORGANIZATION_UPDATED, {
      organizationId: id,
      changes: updateData,
      timestamp: new Date(),
    });

    return updatedOrganization;
  }

  async deactivate(id: string): Promise<void> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationRepository.update(id, { isActive: false });

    // Emit organization deleted event (soft delete)
    this.eventEmitter.emit(EventType.ORGANIZATION_DELETED, {
      organizationId: id,
      timestamp: new Date(),
    });
  }

  async activate(id: string): Promise<void> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationRepository.update(id, { isActive: true });
  }

  async updateQuotas(
    id: string,
    quotas: Record<string, number>,
  ): Promise<void> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updatedQuotas = {
      ...organization.quotas,
      ...quotas,
    };

    await this.organizationRepository.update(id, { quotas: updatedQuotas });
  }

  async checkQuota(
    organizationId: string,
    resourceType: string,
    requestedAmount: number = 1,
  ): Promise<boolean> {
    const organization = await this.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const quota = organization.quotas?.[resourceType];
    if (quota === undefined) {
      return true; // No quota limit set
    }

    // In a real implementation, you would check current usage against quota
    // For now, we'll assume the quota check passes
    return true;
  }

  private getDefaultQuotas(plan: SubscriptionPlan): Record<string, number> {
    const quotasByPlan = {
      [SubscriptionPlan.FREE]: {
        agents: 3,
        tools: 5,
        workflows: 2,
        executions: 100,
        storage: 100 * 1024 * 1024, // 100MB
        apiCalls: 1000,
      },
      [SubscriptionPlan.STARTER]: {
        agents: 10,
        tools: 20,
        workflows: 10,
        executions: 1000,
        storage: 1024 * 1024 * 1024, // 1GB
        apiCalls: 10000,
      },
      [SubscriptionPlan.PROFESSIONAL]: {
        agents: 50,
        tools: 100,
        workflows: 50,
        executions: 10000,
        storage: 10 * 1024 * 1024 * 1024, // 10GB
        apiCalls: 100000,
      },
      [SubscriptionPlan.ENTERPRISE]: {
        agents: -1, // Unlimited
        tools: -1,
        workflows: -1,
        executions: -1,
        storage: -1,
        apiCalls: -1,
      },
    };

    return quotasByPlan[plan] || quotasByPlan[SubscriptionPlan.FREE];
  }
}
