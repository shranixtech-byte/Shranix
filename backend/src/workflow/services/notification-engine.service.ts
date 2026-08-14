import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface CreateNotificationDto {
  userId?: string;
  title: string;
  message: string;
  type?: string;
  module?: string;
  documentId?: string;
  documentType?: string;
  instanceId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationEngineService {
  private readonly logger = new Logger(NotificationEngineService.name);

  constructor(private readonly database: DatabaseService) {}

  async createNotification(dto: CreateNotificationDto) {
    if (!dto.userId) {
      return null;
    }

    return this.database.notifications.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type || 'info',
      module: dto.module || null,
      documentId: dto.documentId || null,
      documentType: dto.documentType || null,
      instanceId: dto.instanceId || null,
      taskId: dto.taskId || null,
      isRead: false,
      isEmailSent: false,
      isSmsSent: false,
      isPushSent: false,
      emailReady: null,
      smsReady: null,
      pushReady: null,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    } as any);
  }

  async notifyAction(instance: any, dto: any, _transition: any, nextState: string) {
    const module = instance.module;
    const docType = instance.documentType;
    const docNumber = instance.documentNumber || instance.documentId;

    // Notify initiator
    if (instance.initiatorId && instance.initiatorId !== dto.userId) {
      await this.createNotification({
        userId: instance.initiatorId,
        title: `Workflow ${dto.action}`,
        message: `${docType} #${docNumber} was ${dto.action}d: ${instance.currentState} → ${nextState}`,
        type: dto.action === 'approved' ? 'info' : dto.action === 'rejected' ? 'info' : 'info',
        module,
        documentId: instance.documentId,
        documentType: docType,
        instanceId: instance.id,
      });
    }

    // Notify approvers
    if (dto.action === 'submit') {
      // Find all users with matching roles for the next level — `filters` array
      // form (a plain `filter` object is silently ignored and would notify
      // approvers of OTHER modules' rules, H2).
      const nextLevel = (instance.approvalLevel || 0) + 1;
      const matrixResult = await this.database.approvalMatrix.findAll({
        page: 1,
        pageSize: 10,
        filters: [
          { field: 'module', operator: 'eq', value: module },
          { field: 'documentType', operator: 'eq', value: docType },
          { field: 'level', operator: 'eq', value: nextLevel },
          { field: 'isActive', operator: 'eq', value: true },
        ],
      } as any);

      if (matrixResult.data) {
        for (const rule of matrixResult.data as any[]) {
          if (rule.approverUserId) {
            await this.createNotification({
              userId: rule.approverUserId,
              title: `Approval Required — ${docType}`,
              message: `${docType} #${docNumber} requires your approval`,
              type: 'approval',
              module,
              documentId: instance.documentId,
              documentType: docType,
              instanceId: instance.id,
            });
          }
        }
      }
    }

    this.logger.log(`Notifications sent for ${instance.id}: ${dto.action}`);
  }

  async notifyEscalation(instance: any, escalationRule: any) {
    const module = instance.module;
    const docType = instance.documentType;

    // Notify initiator
    if (escalationRule.notifyInitiator && instance.initiatorId) {
      await this.createNotification({
        userId: instance.initiatorId,
        title: 'Escalation Notice',
        message: `${docType} #${instance.documentNumber || instance.documentId} has been escalated`,
        type: 'escalation',
        module,
        documentId: instance.documentId,
        documentType: docType,
        instanceId: instance.id,
      });
    }

    // Notify escalator
    if (escalationRule.escalateToUserId) {
      await this.createNotification({
        userId: escalationRule.escalateToUserId,
        title: `Escalated — ${docType}`,
        message: `${docType} #${instance.documentNumber || instance.documentId} has been escalated to you`,
        type: 'escalation',
        module,
        documentId: instance.documentId,
        documentType: docType,
        instanceId: instance.id,
      });
    }
  }

  async getUserNotifications(userId: string, page = 1, pageSize = 20, unreadOnly = false) {
    // `filters` array form — a plain `filter` object is silently ignored and
    // would return every user's notifications (H2 tenant-isolation fix).
    const filters: any[] = [{ field: 'userId', operator: 'eq', value: userId }];
    if (unreadOnly) {
      filters.push({ field: 'isRead', operator: 'eq', value: false });
    }
    return this.database.notifications.findAll({ page, pageSize, filters } as any);
  }

  async markAsRead(notificationId: string) {
    return this.database.notifications.update(notificationId, {
      isRead: true,
      readAt: new Date().toISOString(),
    } as any);
  }

  async markAllAsRead(userId: string) {
    const result = await this.database.notifications.findAll({
      page: 1,
      pageSize: 100,
      filters: [
        { field: 'userId', operator: 'eq', value: userId },
        { field: 'isRead', operator: 'eq', value: false },
      ],
    } as any);
    if (result.data) {
      for (const notif of result.data as any[]) {
        await this.database.notifications.update(notif.id, {
          isRead: true,
          readAt: new Date().toISOString(),
        } as any);
      }
    }
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const result = await this.database.notifications.findAll({
      page: 1,
      pageSize: 1,
      filters: [
        { field: 'userId', operator: 'eq', value: userId },
        { field: 'isRead', operator: 'eq', value: false },
      ],
    } as any);
    return { count: (result as any).total || 0 };
  }

  async prepareEmail(notificationId: string) {
    return this.database.notifications.update(notificationId, {
      emailReady: JSON.stringify({ ready: true, preparedAt: new Date().toISOString() }),
      isEmailSent: false,
    } as any);
  }

  async prepareSms(notificationId: string) {
    return this.database.notifications.update(notificationId, {
      smsReady: JSON.stringify({ ready: true, preparedAt: new Date().toISOString() }),
      isSmsSent: false,
    } as any);
  }

  async preparePush(notificationId: string) {
    return this.database.notifications.update(notificationId, {
      pushReady: JSON.stringify({ ready: true, preparedAt: new Date().toISOString() }),
      isPushSent: false,
    } as any);
  }
}
