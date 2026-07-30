import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { SalesApprovalEngineService, type DocumentType, type ApprovalStatus, type BulkActionDto } from './approval-engine.service';

// ═════════════════════════════════════════════════════════
// DTOs
// ═════════════════════════════════════════════════════════

class SubmitApprovalDto {
  documentType!: DocumentType;
  documentId!: string;
  documentNumber!: string;
  customerId!: string;
  customerName!: string;
  amount!: number;
  discountAmount!: number;
  discountPercent!: number;
  gstAmount!: number;
  priority?: string;
}

class ApproveRejectDto {
  comment!: string;
  reason?: string;
}

class SendBackDto {
  comment!: string;
  reason!: string;
  targetLevel?: number;
}

class AssignDto {
  assignToUserId!: string;
  assignToUserName!: string;
  comment?: string;
}

class AddCommentDto {
  comment!: string;
  isInternal?: boolean;
}

@ApiTags('Sales - Approval Workflow')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sales/approvals/workflow')
export class SalesApprovalController {
  constructor(private readonly engine: SalesApprovalEngineService) {}

  // ═════════════════════════════════════════════════════════
  // LIST & SEARCH
  // ═════════════════════════════════════════════════════════

  @Get()
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all approval records with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'pending', 'under_review', 'approved', 'rejected', 'cancelled', 'posted', 'closed'], description: 'Filter by status' })
  @ApiQuery({ name: 'documentType', required: false, description: 'Filter by document type' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by document number or customer name' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filter by assigned user' })
  @ApiResponse({ status: 200, description: 'Returns paginated approval records' })
  async findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('status') status?: string,
    @Query('documentType') documentType?: string,
    @Query('search') search?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.engine.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as ApprovalStatus,
      documentType: documentType as DocumentType,
      search,
      assignedTo,
    });
  }

  // ═════════════════════════════════════════════════════════
  // GET SINGLE
  // ═════════════════════════════════════════════════════════

  @Get(':id')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get approval record by ID' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiResponse({ status: 200, description: 'Returns approval record with history and comments' })
  @ApiResponse({ status: 404, description: 'Approval record not found' })
  async findOne(@Param('id') id: string) {
    const record = await this.engine.findById(id);
    if (!record) {
      return { success: false, message: 'Approval record not found' };
    }
    const history = await this.engine.getHistory(id);
    const comments = await this.engine.getComments(id);
    return { ...record, history, comments };
  }

  // ═════════════════════════════════════════════════════════
  // SUBMIT FOR APPROVAL
  // ═════════════════════════════════════════════════════════

  @Post()
  @Roles('admin', 'manager')
  @Permissions('sales.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a document for approval' })
  @ApiBody({ description: 'Approval submission payload', required: true })
  @ApiResponse({ status: 201, description: 'Document submitted for approval' })
  @ApiResponse({ status: 400, description: 'Document already in workflow or no matrix found' })
  async submit(@Body() dto: SubmitApprovalDto, @CurrentUser() u: { id: string; name?: string }) {
    return this.engine.submitForApproval({
      documentType: dto.documentType,
      documentId: dto.documentId,
      documentNumber: dto.documentNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      amount: dto.amount,
      discountAmount: dto.discountAmount,
      discountPercent: dto.discountPercent,
      gstAmount: dto.gstAmount,
      priority: (dto.priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
      createdBy: u.id,
      createdByName: u.name || u.id,
    });
  }

  // ═════════════════════════════════════════════════════════
  // APPROVE
  // ═════════════════════════════════════════════════════════

  @Post(':id/approve')
  @Roles('admin', 'manager')
  @Permissions('sales.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve at current level' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiBody({ description: 'Approval comment', required: true })
  @ApiResponse({ status: 200, description: 'Approved successfully' })
  @ApiResponse({ status: 400, description: 'Already approved/rejected/cancelled' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @CurrentUser() u: { id: string; name?: string },
  ) {
    return this.engine.approve(id, u.id, u.name || u.id, dto);
  }

  // ═════════════════════════════════════════════════════════
  // REJECT
  // ═════════════════════════════════════════════════════════

  @Post(':id/reject')
  @Roles('admin', 'manager')
  @Permissions('sales.reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject with mandatory comment' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiBody({ description: 'Rejection reason and comment (comment is mandatory)', required: true })
  @ApiResponse({ status: 200, description: 'Rejected successfully' })
  @ApiResponse({ status: 400, description: 'Comment is mandatory or invalid state' })
  async reject(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @CurrentUser() u: { id: string; name?: string },
  ) {
    return this.engine.reject(id, u.id, u.name || u.id, dto);
  }

  // ═════════════════════════════════════════════════════════
  // SEND BACK
  // ═════════════════════════════════════════════════════════

  @Post(':id/send-back')
  @Roles('admin', 'manager')
  @Permissions('sales.reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send back to previous level or creator' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiBody({ description: 'Send back reason, comment, and optional target level', required: true })
  @ApiResponse({ status: 200, description: 'Sent back successfully' })
  async sendBack(
    @Param('id') id: string,
    @Body() dto: SendBackDto,
    @CurrentUser() u: { id: string; name?: string },
  ) {
    return this.engine.sendBack(id, u.id, u.name || u.id, dto);
  }

  // ═════════════════════════════════════════════════════════
  // ASSIGN
  // ═════════════════════════════════════════════════════════

  @Post(':id/assign')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign approval to a different user' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiBody({ description: 'Assign to user payload', required: true })
  @ApiResponse({ status: 200, description: 'Assigned successfully' })
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignDto,
    @CurrentUser() u: { id: string; name?: string },
  ) {
    return this.engine.assign(id, u.id, u.name || u.id, dto);
  }

  // ═════════════════════════════════════════════════════════
  // COMMENTS
  // ═════════════════════════════════════════════════════════

  @Post(':id/comments')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to an approval' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiBody({ description: 'Comment payload', required: true })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() u: { id: string; name?: string },
  ) {
    return this.engine.addComment(id, u.id, u.name || u.id, dto.comment, dto.isInternal);
  }

  @Get(':id/comments')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comments for an approval' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiResponse({ status: 200, description: 'Returns comments list' })
  async getComments(@Param('id') id: string) {
    return this.engine.getComments(id);
  }

  // ═════════════════════════════════════════════════════════
  // HISTORY
  // ═════════════════════════════════════════════════════════

  @Get(':id/history')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get approval history/timeline' })
  @ApiParam({ name: 'id', description: 'Approval record ID' })
  @ApiResponse({ status: 200, description: 'Returns approval history/timeline' })
  async getHistory(@Param('id') id: string) {
    return this.engine.getHistory(id);
  }

  @Get('history/all')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all approval history' })
  async getAllHistory() {
    return this.engine.getHistory('*');
  }

  // ═════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═════════════════════════════════════════════════════════

  @Get('notifications/mine')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my approval notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Filter unread only' })
  @ApiResponse({ status: 200, description: 'Returns user notifications' })
  async getMyNotifications(
    @CurrentUser() u: { id: string },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.engine.getNotifications(u.id, unreadOnly === 'true');
  }

  @Post('notifications/:id/read')
  @Roles('admin', 'manager', 'accountant', 'employee')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  async markNotificationRead(@Param('id') id: string) {
    await this.engine.markNotificationRead(id);
    return { success: true };
  }

  // ═════════════════════════════════════════════════════════
  // DASHBOARD
  // ═════════════════════════════════════════════════════════

  @Get('dashboard/stats')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get approval dashboard stats' })
  async getDashboardStats() {
    return this.engine.getDashboardStats();
  }

  // ═════════════════════════════════════════════════════════
  // MATRIX & SETTINGS
  // ═════════════════════════════════════════════════════════

  @Get('settings/matrices')
  @Roles('admin')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all approval matrices' })
  @ApiResponse({ status: 200, description: 'Returns approval matrices' })
  async getMatrices() {
    return this.engine.getMatrices();
  }

  @Post('settings/matrices/:id')
  @Roles('admin')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an approval matrix' })
  @ApiParam({ name: 'id', description: 'Matrix ID' })
  @ApiResponse({ status: 200, description: 'Matrix updated' })
  async updateMatrix(@Param('id') id: string, @Body() data: any) {
    return this.engine.updateMatrix(id, data);
  }

  @Get('settings/rules')
  @Roles('admin')
  @Permissions('sales.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all approval rules' })
  @ApiResponse({ status: 200, description: 'Returns approval rules' })
  async getRules() {
    return this.engine.getRules();
  }

  // ═════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ═════════════════════════════════════════════════════════

  @Post('bulk-approve')
  @Roles('admin', 'manager')
  @Permissions('sales.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve multiple approvals' })
  async bulkApprove(@Body() dto: BulkActionDto, @CurrentUser() u: { id: string; name?: string }) {
    return this.engine.bulkApprove(dto.approvalIds, u.id, u.name || u.id, dto.comment);
  }

  @Post('bulk-reject')
  @Roles('admin', 'manager')
  @Permissions('sales.reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk reject multiple approvals' })
  async bulkReject(@Body() dto: BulkActionDto, @CurrentUser() u: { id: string; name?: string }) {
    return this.engine.bulkReject(dto.approvalIds, u.id, u.name || u.id, dto.comment);
  }

  @Post('bulk-assign')
  @Roles('admin', 'manager')
  @Permissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk assign approvals to a user' })
  async bulkAssign(
    @Body() dto: BulkActionDto & { assignToUserId: string; assignToUserName?: string },
    @CurrentUser() u: { id: string; name?: string },
  ) {
    return this.engine.bulkAssign(dto.approvalIds, u.id, u.name || u.id, dto.assignToUserId, dto.assignToUserName || dto.assignToUserId, dto.comment);
  }
}
