import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface CreateCommentDto {
  instanceId: string;
  documentId?: string;
  documentType?: string;
  userId: string;
  userName?: string;
  commentType?: string;
  message: string;
  mentions?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  isInternal?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly database: DatabaseService) {}

  async findByInstance(instanceId: string) {
    // `filters` array form — a plain `filter` object is silently ignored and
    // would expose comments from every instance (H2 tenant-isolation fix).
    const result = await this.database.workflowComments.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'instanceId', operator: 'eq', value: instanceId }],
    } as any);
    return result.data || [];
  }

  async createComment(dto: CreateCommentDto) {
    const record = await this.database.workflowComments.create({
      instanceId: dto.instanceId,
      documentId: dto.documentId || null,
      documentType: dto.documentType || null,
      userId: dto.userId,
      userName: dto.userName || null,
      commentType: dto.commentType || 'comment',
      message: dto.message,
      mentions: dto.mentions ? JSON.stringify(dto.mentions) : null,
      attachmentUrl: dto.attachmentUrl || null,
      attachmentName: dto.attachmentName || null,
      isInternal: dto.isInternal || false,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    } as any);

    // If mentions exist, notify mentioned users
    if (dto.mentions && dto.mentions.length > 0) {
      await this.database.workflowInstances.findById(dto.instanceId);
      for (const mentionedUserId of dto.mentions) {
        await this.database.notifications.create({
          userId: mentionedUserId,
          title: 'You were mentioned',
          message: `${dto.userName || 'Someone'} mentioned you in a comment on ${dto.documentType || 'a document'}`,
          type: 'info',
          instanceId: dto.instanceId,
          documentId: dto.documentId,
          documentType: dto.documentType,
        } as any);
      }
    }

    this.logger.log(`Comment added to instance ${dto.instanceId} by ${dto.userId}`);
    return record;
  }

  async deleteComment(id: string) {
    return this.database.workflowComments.softDelete(id);
  }
}
