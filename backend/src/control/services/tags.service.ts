import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

const TAG_COLORS = ['blue', 'green', 'red', 'amber', 'purple', 'pink', 'gray', 'teal'];

@Injectable()
export class TagsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.tagName) {
      throw new BadRequestException('tagName is required');
    }
    if (data.tagColor && !TAG_COLORS.includes(data.tagColor)) {
      throw new BadRequestException(`Invalid tagColor: ${data.tagColor}`);
    }
    const existing = await this.database.tags
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'tagName', operator: 'eq', value: data.tagName }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      throw new BadRequestException(`Tag "${data.tagName}" already exists`);
    }
    const tag = await this.database.tags.create({
      ...data,
      id: undefined,
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'tag.created',
      resource: 'tags',
      action: 'create',
      details: { tagId: tag.id, tagName: tag.tagName },
    });
    return tag;
  }

  async findAll(query: { search?: string; isActive?: boolean }) {
    const res = await this.database.tags
      .findAll({
        page: 1,
        pageSize: 500,
        ...(query.search ? { search: query.search, searchFields: ['tagName', 'description'] } : {}),
      } as any)
      .catch(() => ({ data: [] }));
    let rows = res.data || [];
    if (query.isActive !== undefined) {
      rows = rows.filter((t: any) => t.isActive === query.isActive);
    }
    return rows;
  }

  async update(id: string, data: any, userId: string) {
    const tag = await this.database.tags.findById(id);
    if (!tag || tag.isDeleted) {
      throw new NotFoundException('Tag not found');
    }
    await this.database.tags.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'tag.updated',
      resource: 'tags',
      action: 'update',
      details: { tagId: id },
    });
    return { updated: true, id };
  }

  async delete(id: string, userId: string) {
    await this.database.tags.softDelete(id);
    const assignments = await this.database.recordTags
      .findAll({
        page: 1,
        pageSize: 5000,
        filters: [{ field: 'tagId', operator: 'eq', value: id }],
      } as any)
      .catch(() => ({ data: [] }));
    for (const a of assignments.data || []) {
      await this.database.recordTags.softDelete(a.id).catch(() => undefined);
    }
    await this.audit.log({
      userId,
      event: 'tag.deleted',
      resource: 'tags',
      action: 'delete',
      details: { tagId: id },
    });
    return { deleted: true };
  }

  // ── Record assignments ─────────────────────────────────
  async assign(tagId: string, recordType: string, recordId: string, userId: string) {
    const tag = await this.database.tags.findById(tagId);
    if (!tag || tag.isDeleted) {
      throw new NotFoundException('Tag not found');
    }
    const existing = await this.database.recordTags
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'tagId', operator: 'eq', value: tagId },
          { field: 'recordType', operator: 'eq', value: recordType },
          { field: 'recordId', operator: 'eq', value: recordId },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      return existing.data[0]; // idempotent
    }
    const assignment = await this.database.recordTags.create({
      tagId,
      recordType,
      recordId,
      assignedBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'tag.assigned',
      resource: 'tags',
      action: 'assign',
      details: { tagId, recordType, recordId },
    });
    return assignment;
  }

  async unassign(tagId: string, recordType: string, recordId: string, userId: string) {
    const existing = await this.database.recordTags
      .findAll({
        page: 1,
        pageSize: 50,
        filters: [
          { field: 'tagId', operator: 'eq', value: tagId },
          { field: 'recordType', operator: 'eq', value: recordType },
          { field: 'recordId', operator: 'eq', value: recordId },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    for (const a of existing.data || []) {
      await this.database.recordTags.softDelete(a.id);
    }
    await this.audit.log({
      userId,
      event: 'tag.unassigned',
      resource: 'tags',
      action: 'unassign',
      details: { tagId, recordType, recordId },
    });
    return { unassigned: true };
  }

  /** Tags for a specific record with tag details. */
  async getTagsForRecord(recordType: string, recordId: string) {
    const assignments = await this.database.recordTags
      .findAll({
        page: 1,
        pageSize: 100,
        filters: [
          { field: 'recordType', operator: 'eq', value: recordType },
          { field: 'recordId', operator: 'eq', value: recordId },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    const tagIds = [...new Set((assignments.data || []).map((a: any) => a.tagId))];
    if (tagIds.length === 0) {
      return [];
    }
    const tags = await this.database.tags
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'id', operator: 'in', value: tagIds.join(',') }],
      } as any)
      .catch(() => ({ data: [] }));
    const tagMap = new Map((tags.data || []).map((t: any) => [t.id, t]));
    return (assignments.data || [])
      .map((a: any) => tagMap.get(a.tagId))
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, tagName: t.tagName, tagColor: t.tagColor }));
  }

  /** Records (ids) tagged with a given tag — for filtering/search. */
  async getRecordsByTag(tagId: string, recordType?: string) {
    const filters: any[] = [{ field: 'tagId', operator: 'eq', value: tagId }];
    if (recordType) {
      filters.push({ field: 'recordType', operator: 'eq', value: recordType });
    }
    const res = await this.database.recordTags
      .findAll({ page: 1, pageSize: 5000, filters } as any)
      .catch(() => ({ data: [] }));
    return (res.data || []).map((a: any) => ({ recordType: a.recordType, recordId: a.recordId }));
  }
}
