import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentEventType } from '@shared/enums';

@EventSubscriber()
export class OrganizationSubscriber implements EntitySubscriberInterface<Organization> {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  listenTo() {
    return Organization;
  }

  afterInsert(event: InsertEvent<Organization>) {
    this.eventEmitter.emit(AgentEventType.ORGANIZATION_CREATED, {
      organizationId: event.entity.id,
      name: event.entity.name,
      slug: event.entity.slug,
      plan: event.entity.plan,
      timestamp: new Date(),
    });
  }

  afterUpdate(event: UpdateEvent<Organization>) {
    if (event.entity) {
      this.eventEmitter.emit(AgentEventType.ORGANIZATION_UPDATED, {
        organizationId: event.entity?.id,
        changes: event.updatedColumns.reduce((acc: Record<string, any>, column) => {
          if (event.entity) {
            acc[column.propertyName] = event.entity[column.propertyName];
          }
          return acc;
        }, {}),
        timestamp: new Date(),
      });
    }
  }

  afterRemove(event: RemoveEvent<Organization>) {
    if (event.entity) {
      this.eventEmitter.emit(AgentEventType.ORGANIZATION_DELETED, {
        organizationId: event.entity.id,
        timestamp: new Date(),
      });
    }
  }
}
